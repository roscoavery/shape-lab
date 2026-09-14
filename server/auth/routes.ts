/**
 * Email + password login, logout, session, and admin account create.
 */

import type { IncomingMessage, ServerResponse } from 'node:http'
import { sendJson } from '../instagramResolve.ts'
import { readRequestBody } from '../libraryStore.ts'
import {
  accountPasswordMatches,
  accountsWithoutSecrets,
  allowFirstAdmin,
  authenticateAccount,
  changeAccountPassword,
  createAccount,
  ensureBootstrapAdmin,
  findAccountById,
  hasAdminAccount,
  publicUserFromAccount,
  updateAccount,
} from './accounts.ts'
import { writeAudit } from './audit.ts'
import { createInvite, peekInvite, redeemInvite } from './invites.ts'
import { isAdmin, isKiosk } from './permissions.ts'
import {
  clearSessionCookie,
  createSession,
  destroySession,
  destroySessionsForAccount,
  readSessionId,
  setSessionCookie,
  setSessionKiosk,
  userFromRequest,
} from './sessions.ts'
import { isAccountRole, isAdminRole } from './types.ts'

const loginAttempts = new Map<string, { count: number; resetAt: number }>()

function tooManyAttempts(email: string): boolean {
  const now = Date.now()
  const row = loginAttempts.get(email)
  if (!row || now > row.resetAt) {
    loginAttempts.set(email, { count: 1, resetAt: now + 15 * 60 * 1000 })
    return false
  }
  row.count += 1
  return row.count > 12
}

export async function handleAuthRoutes(
  req: IncomingMessage,
  res: ServerResponse,
  path: string,
): Promise<boolean> {
  if (path === '/api/auth/me') {
    if (req.method !== 'GET') {
      sendJson(res, 405, { error: 'Use GET' })
      return true
    }
    await ensureBootstrapAdmin()
    const user = await userFromRequest(req)
    sendJson(res, 200, {
      authenticated: Boolean(user),
      user: user ?? null,
      bootstrapAllowed: !(await hasAdminAccount()) && allowFirstAdmin(),
    })
    return true
  }

  if (path === '/api/auth/login') {
    if (req.method !== 'POST') {
      sendJson(res, 405, { error: 'Use POST' })
      return true
    }
    await ensureBootstrapAdmin()
    let body: { email?: string; password?: string } = {}
    try {
      body = JSON.parse(await readRequestBody(req)) as typeof body
    } catch {
      sendJson(res, 400, { error: 'Could not read that login.' })
      return true
    }
    const email = (body.email || '').trim().toLowerCase()
    const password = body.password || ''
    if (tooManyAttempts(email || 'unknown')) {
      sendJson(res, 429, { error: 'Too many sign-in tries. Wait a few minutes.' })
      return true
    }
    const account = await authenticateAccount(email, password)
    if (!account) {
      sendJson(res, 401, { error: 'Email or password is wrong.' })
      return true
    }
    const session = await createSession(account.id)
    setSessionCookie(req, res, session.id)
    const user = { ...publicUserFromAccount(account), kiosk: false }
    await writeAudit('auth.login', user)
    sendJson(res, 200, { authenticated: true, user })
    return true
  }

  if (path === '/api/auth/logout') {
    if (req.method !== 'POST') {
      sendJson(res, 405, { error: 'Use POST' })
      return true
    }
    const user = await userFromRequest(req)
    const sessionId = readSessionId(req)
    if (sessionId) await destroySession(sessionId)
    clearSessionCookie(req, res)
    await writeAudit('auth.logout', user)
    sendJson(res, 200, { authenticated: false })
    return true
  }

  if (path === '/api/auth/bootstrap') {
    if (req.method !== 'POST') {
      sendJson(res, 405, { error: 'Use POST' })
      return true
    }
    if (await hasAdminAccount()) {
      sendJson(res, 403, { error: 'The first admin account is already set.' })
      return true
    }
    if (!allowFirstAdmin()) {
      sendJson(res, 403, { error: 'Set SHAPE_LAB_BOOTSTRAP_ADMIN_EMAIL and PASSWORD, or allow first-admin on the gym computer.' })
      return true
    }
    let body: { email?: string; password?: string; displayName?: string } = {}
    try {
      body = JSON.parse(await readRequestBody(req)) as typeof body
    } catch {
      sendJson(res, 400, { error: 'Could not read that request.' })
      return true
    }
    try {
      const user = await createAccount({
        email: body.email || '',
        password: body.password || '',
        role: 'admin',
        displayName: body.displayName || 'Gym admin',
        rosterProfileId: 'ath_ryan',
      })
      const session = await createSession(user.accountId)
      setSessionCookie(req, res, session.id)
      await writeAudit('auth.account_create', user, { detail: 'bootstrap admin' })
      sendJson(res, 200, { authenticated: true, user })
    } catch (err) {
      sendJson(res, 400, { error: err instanceof Error ? err.message : 'Could not create that account.' })
    }
    return true
  }

  if (path === '/api/auth/accounts') {
    const user = await userFromRequest(req)
    if (!user) {
      sendJson(res, 401, { error: 'Sign in to continue.' })
      return true
    }
    if (!isAdmin(user)) {
      sendJson(res, 403, { error: 'Only gym admin can manage accounts.' })
      return true
    }
    if (req.method === 'GET') {
      sendJson(res, 200, { kind: 'shape-lab-accounts', accounts: await accountsWithoutSecrets() })
      return true
    }
    if (req.method === 'POST') {
      let body: {
        email?: string
        password?: string
        role?: string
        displayName?: string
        rosterProfileId?: string
        linkedAthleteIds?: string[]
      } = {}
      try {
        body = JSON.parse(await readRequestBody(req)) as typeof body
      } catch {
        sendJson(res, 400, { error: 'Could not read that request.' })
        return true
      }
      if (!isAccountRole(body.role)) {
        sendJson(res, 400, { error: 'Pick a role: admin, coach, athlete, parent, or gymOwner.' })
        return true
      }
      try {
        const created = await createAccount({
          email: body.email || '',
          password: body.password || '',
          role: body.role,
          displayName: body.displayName || body.email || 'Account',
          rosterProfileId: body.rosterProfileId,
          linkedAthleteIds: body.linkedAthleteIds,
        })
        const invite = !body.password?.trim()
          ? await createInvite(created.accountId, req)
          : null
        await writeAudit('auth.account_create', user, {
          detail: `${created.role} ${created.email}`,
        })
        sendJson(res, 200, { account: created, inviteUrl: invite?.url })
      } catch (err) {
        sendJson(res, 400, {
          error: err instanceof Error ? err.message : 'Could not create that account.',
        })
      }
      return true
    }
    if (req.method === 'PATCH') {
      let body: {
        id?: string
        displayName?: string
        role?: string
        rosterProfileId?: string | null
        linkedAthleteIds?: string[]
      } = {}
      try {
        body = JSON.parse(await readRequestBody(req)) as typeof body
      } catch {
        sendJson(res, 400, { error: 'Could not read that request.' })
        return true
      }
      if (!body.id) {
        sendJson(res, 400, { error: 'Which account?' })
        return true
      }
      if (body.role && !isAccountRole(body.role)) {
        sendJson(res, 400, { error: 'Pick a role: admin, coach, athlete, parent, or gymOwner.' })
        return true
      }
      try {
        const saved = await updateAccount(body.id, {
          displayName: body.displayName,
          role: body.role && isAccountRole(body.role) ? body.role : undefined,
          rosterProfileId: body.rosterProfileId,
          linkedAthleteIds: body.linkedAthleteIds,
        })
        await writeAudit('role.change', user, {
          detail: `${saved.email} ${saved.role} ${saved.rosterProfileId ?? ''}`,
        })
        sendJson(res, 200, { account: saved })
      } catch (err) {
        sendJson(res, 400, {
          error: err instanceof Error ? err.message : 'Could not update that account.',
        })
      }
      return true
    }
    sendJson(res, 405, { error: 'Use GET, POST, or PATCH' })
    return true
  }

  if (path === '/api/auth/password') {
    if (req.method !== 'POST') {
      sendJson(res, 405, { error: 'Use POST' })
      return true
    }
    const user = await userFromRequest(req)
    if (!user) {
      sendJson(res, 401, { error: 'Sign in to continue.' })
      return true
    }
    if (isKiosk(user)) {
      sendJson(res, 403, { error: 'Leave floor mode before changing a password.' })
      return true
    }
    let body: { currentPassword?: string; newPassword?: string; accountId?: string } = {}
    try {
      body = JSON.parse(await readRequestBody(req)) as typeof body
    } catch {
      sendJson(res, 400, { error: 'Could not read that request.' })
      return true
    }
    const targetId = body.accountId || user.accountId
    const resettingOther = Boolean(body.accountId && body.accountId !== user.accountId)
    if (resettingOther && !isAdmin(user)) {
      sendJson(res, 403, { error: 'Only gym admin can reset another password.' })
      return true
    }
    if (!resettingOther) {
      const ok = await accountPasswordMatches(user.accountId, body.currentPassword || '')
      if (!ok) {
        sendJson(res, 401, { error: 'Current password is wrong.' })
        return true
      }
    }
    try {
      await changeAccountPassword(targetId, body.newPassword || '')
      await destroySessionsForAccount(targetId)
      if (!resettingOther) {
        const session = await createSession(user.accountId)
        setSessionCookie(req, res, session.id)
      }
      await writeAudit('role.change', user, {
        detail: resettingOther ? `password reset ${targetId}` : 'password change',
      })
      sendJson(res, 200, { ok: true, signedOutOthers: true })
    } catch (err) {
      sendJson(res, 400, {
        error: err instanceof Error ? err.message : 'Could not change that password.',
      })
    }
    return true
  }

  if (path === '/api/auth/invites') {
    if (req.method !== 'POST') {
      sendJson(res, 405, { error: 'Use POST' })
      return true
    }
    const user = await userFromRequest(req)
    if (!user) {
      sendJson(res, 401, { error: 'Sign in to continue.' })
      return true
    }
    if (!isAdmin(user)) {
      sendJson(res, 403, { error: 'Only gym admin can copy a sign-in link.' })
      return true
    }
    let body: { accountId?: string } = {}
    try {
      body = JSON.parse(await readRequestBody(req)) as typeof body
    } catch {
      sendJson(res, 400, { error: 'Could not read that request.' })
      return true
    }
    try {
      const invite = await createInvite(body.accountId || '', req)
      await writeAudit('auth.invite', user, {
        athleteId: body.accountId,
        detail: 'create sign-in link',
      })
      sendJson(res, 200, invite)
    } catch (err) {
      sendJson(res, 400, {
        error: err instanceof Error ? err.message : 'Could not make that sign-in link.',
      })
    }
    return true
  }

  if (path === '/api/auth/invite') {
    if (req.method === 'GET') {
      const url = new URL(req.url || '/', 'http://127.0.0.1')
      sendJson(res, 200, await peekInvite(url.searchParams.get('token') || ''))
      return true
    }
    if (req.method !== 'POST') {
      sendJson(res, 405, { error: 'Use GET or POST' })
      return true
    }
    let body: { token?: string; password?: string } = {}
    try {
      body = JSON.parse(await readRequestBody(req)) as typeof body
    } catch {
      sendJson(res, 400, { error: 'Could not read that request.' })
      return true
    }
    const token = body.token || ''
    if (tooManyAttempts(`invite:${token.slice(0, 12) || 'unknown'}`)) {
      sendJson(res, 429, { error: 'Too many tries. Wait a few minutes.' })
      return true
    }
    const redeemed = await redeemInvite(token)
    if (!redeemed) {
      sendJson(res, 401, { error: 'That sign-in link is wrong or already used.' })
      return true
    }
    try {
      await changeAccountPassword(redeemed.accountId, body.password || '')
      await destroySessionsForAccount(redeemed.accountId)
      const session = await createSession(redeemed.accountId)
      setSessionCookie(req, res, session.id)
      const account = await findAccountById(redeemed.accountId)
      const user = account ? { ...publicUserFromAccount(account), kiosk: false } : null
      await writeAudit('auth.invite', user, { detail: 'redeem sign-in link' })
      sendJson(res, 200, { authenticated: Boolean(user), user })
    } catch (err) {
      sendJson(res, 400, {
        error: err instanceof Error ? err.message : 'Could not set that password.',
      })
    }
    return true
  }

  if (path === '/api/auth/kiosk') {
    if (req.method !== 'POST') {
      sendJson(res, 405, { error: 'Use POST' })
      return true
    }
    const user = await userFromRequest(req)
    if (!user) {
      sendJson(res, 401, { error: 'Sign in to continue.' })
      return true
    }
    if (!isAdminRole(user.role)) {
      sendJson(res, 403, { error: 'Only gym admin can turn a device into a floor iPad.' })
      return true
    }
    let body: { enabled?: boolean; password?: string } = {}
    try {
      body = JSON.parse(await readRequestBody(req)) as typeof body
    } catch {
      sendJson(res, 400, { error: 'Could not read that request.' })
      return true
    }
    const sessionId = readSessionId(req)
    if (!sessionId) {
      sendJson(res, 401, { error: 'Sign in to continue.' })
      return true
    }
    if (body.enabled) {
      if (user.kiosk) {
        sendJson(res, 200, { authenticated: true, user })
        return true
      }
      await setSessionKiosk(sessionId, true)
      const next = { ...user, kiosk: true }
      await writeAudit('auth.kiosk', next, { detail: 'enter floor' })
      sendJson(res, 200, { authenticated: true, user: next })
      return true
    }
    if (!user.kiosk) {
      sendJson(res, 200, { authenticated: true, user })
      return true
    }
    const ok = await accountPasswordMatches(user.accountId, body.password || '')
    if (!ok) {
      sendJson(res, 401, { error: 'Type the admin password to leave the floor.' })
      return true
    }
    await setSessionKiosk(sessionId, false)
    const next = { ...user, kiosk: false }
    await writeAudit('auth.kiosk', next, { detail: 'leave floor' })
    sendJson(res, 200, { authenticated: true, user: next })
    return true
  }

  sendJson(res, 404, { error: 'Unknown auth route' })
  return true
}
