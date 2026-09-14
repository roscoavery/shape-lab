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
import { readAudit, writeAudit } from './audit.ts'
import { stampGuardianLinks } from './familyLinks.ts'
import { createInvite, peekInvite, redeemInvite } from './invites.ts'
import { isAdmin, isKiosk } from './permissions.ts'
import { mailEnabledFor, sendInviteEmail } from './mail.ts'
import {
  clearSessionCookie,
  createSession,
  destroySession,
  destroySessionsForAccount,
  listLiveSessions,
  readSessionId,
  sessionFromRequest,
  setSessionCookie,
  setSessionKiosk,
  userFromRequest,
} from './sessions.ts'
import { isAccountRole, isAdminRole } from './types.ts'
import { ipKey, tooMany } from './rateLimit.ts'
import { requestWriteOriginForbidden } from './origin.ts'
import { authWriteNeedsCsrf, csrfForbidden, readCsrfHeader } from './csrf.ts'

const LOGIN_WINDOW_MS = 15 * 60 * 1000
const AUTH_WRITE_WINDOW_MS = 15 * 60 * 1000
const AUTH_WRITE_MAX = 40

function denyAuthWriteFlood(res: ServerResponse, user: { accountId: string }): boolean {
  if (tooMany(`authwrite:${user.accountId}`, AUTH_WRITE_MAX, AUTH_WRITE_WINDOW_MS)) {
    sendJson(res, 429, { error: 'Too many account changes. Wait a few minutes.' })
    return true
  }
  return false
}

export async function handleAuthRoutes(
  req: IncomingMessage,
  res: ServerResponse,
  path: string,
): Promise<boolean> {
  if (requestWriteOriginForbidden(req)) {
    sendJson(res, 403, { error: 'That request did not come from this gym.' })
    return true
  }
  if (authWriteNeedsCsrf(req.method, path)) {
    const marked = await sessionFromRequest(req)
    if (marked && csrfForbidden(readCsrfHeader(req.headers), marked.csrf)) {
      sendJson(res, 403, { error: 'That request did not come from this gym.' })
      return true
    }
  }

  if (path === '/api/auth/me') {
    if (req.method !== 'GET') {
      sendJson(res, 405, { error: 'Use GET' })
      return true
    }
    await ensureBootstrapAdmin()
    const session = await sessionFromRequest(req)
    const user = await userFromRequest(req)
    sendJson(res, 200, {
      authenticated: Boolean(user),
      user: user ?? null,
      bootstrapAllowed: !(await hasAdminAccount()) && allowFirstAdmin(),
      mailEnabled: mailEnabledFor(user),
      csrf: session?.csrf,
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
    if (tooMany(`login:${email || 'unknown'}`, 12, LOGIN_WINDOW_MS)) {
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
    sendJson(res, 200, {
      authenticated: true,
      user,
      mailEnabled: mailEnabledFor(user),
      csrf: session.csrf,
    })
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

  if (path === '/api/auth/unlock') {
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
      sendJson(res, 403, { error: 'Leave floor mode to unlock the office screen.' })
      return true
    }
    let body: { password?: string } = {}
    try {
      body = JSON.parse(await readRequestBody(req)) as typeof body
    } catch {
      sendJson(res, 400, { error: 'Could not read that request.' })
      return true
    }
    if (tooMany(`unlock:${user.accountId}`, 12, LOGIN_WINDOW_MS)) {
      sendJson(res, 429, { error: 'Too many tries. Wait a few minutes.' })
      return true
    }
    const ok = await accountPasswordMatches(user.accountId, body.password || '')
    if (!ok) {
      sendJson(res, 401, { error: 'Password is wrong.' })
      return true
    }
    sendJson(res, 200, { ok: true, csrf: (await sessionFromRequest(req))?.csrf })
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
      sendJson(res, 200, { authenticated: true, user, csrf: session.csrf })
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
    if (denyAuthWriteFlood(res, user)) return true
    if (req.method === 'POST') {
      let body: {
        email?: string
        password?: string
        role?: string
        displayName?: string
        rosterProfileId?: string
        linkedAthleteIds?: string[]
        sendEmail?: boolean
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
        if (created.role === 'parent') {
          await stampGuardianLinks({
            accountId: created.accountId,
            rosterProfileId: created.rosterProfileId,
            linkedAthleteIds: created.linkedAthleteIds,
          })
        }
        const invite = !body.password?.trim()
          ? await createInvite(created.accountId, req)
          : null
        let mailed = false
        if (invite && body.sendEmail) {
          const sent = await sendInviteEmail({
            to: created.email,
            url: invite.url,
            displayName: created.displayName,
          })
          mailed = sent.mailed
        }
        await writeAudit('auth.account_create', user, {
          detail: `${created.role} ${created.email}`,
        })
        sendJson(res, 200, { account: created, inviteUrl: invite?.url, mailed })
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
        if (saved.role === 'parent') {
          await stampGuardianLinks({
            accountId: saved.id,
            rosterProfileId: saved.rosterProfileId,
            linkedAthleteIds: saved.linkedAthleteIds,
          })
        }
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
    if (denyAuthWriteFlood(res, user)) return true
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
      let csrf: string | undefined
      if (!resettingOther) {
        const session = await createSession(user.accountId)
        setSessionCookie(req, res, session.id)
        csrf = session.csrf
      } else {
        csrf = (await sessionFromRequest(req))?.csrf
      }
      await writeAudit('role.change', user, {
        detail: resettingOther ? `password reset ${targetId}` : 'password change',
      })
      sendJson(res, 200, { ok: true, signedOutOthers: true, csrf })
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
    if (denyAuthWriteFlood(res, user)) return true
    let body: { accountId?: string; sendEmail?: boolean } = {}
    try {
      body = JSON.parse(await readRequestBody(req)) as typeof body
    } catch {
      sendJson(res, 400, { error: 'Could not read that request.' })
      return true
    }
    try {
      const invite = await createInvite(body.accountId || '', req)
      let mailed = false
      let mailError: string | undefined
      if (body.sendEmail) {
        const account = await findAccountById(body.accountId || '')
        const sent = await sendInviteEmail({
          to: account?.email || '',
          url: invite.url,
          displayName: account?.displayName || '',
        })
        mailed = sent.mailed
        mailError = sent.error
      }
      await writeAudit('auth.invite', user, {
        athleteId: body.accountId,
        detail: mailed ? 'emailed sign-in link' : 'create sign-in link',
      })
      sendJson(res, 200, { ...invite, mailed, mailError })
    } catch (err) {
      sendJson(res, 400, {
        error: err instanceof Error ? err.message : 'Could not make that sign-in link.',
      })
    }
    return true
  }

  if (path === '/api/auth/invite') {
    if (req.method === 'GET') {
      if (tooMany(ipKey(req, 'peek'), 90, 60_000)) {
        sendJson(res, 429, { error: 'Too many tries. Wait a minute.' })
        return true
      }
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
    if (tooMany(`invite:${token.slice(0, 12) || 'unknown'}`, 12, LOGIN_WINDOW_MS)) {
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
      sendJson(res, 200, { authenticated: Boolean(user), user, csrf: session.csrf })
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
    if (denyAuthWriteFlood(res, user)) return true
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
    const csrf = (await sessionFromRequest(req))?.csrf
    if (body.enabled) {
      if (user.kiosk) {
        sendJson(res, 200, { authenticated: true, user, csrf })
        return true
      }
      await setSessionKiosk(sessionId, true)
      const next = { ...user, kiosk: true }
      await writeAudit('auth.kiosk', next, { detail: 'enter floor' })
      sendJson(res, 200, { authenticated: true, user: next, csrf })
      return true
    }
    if (!user.kiosk) {
      sendJson(res, 200, { authenticated: true, user, csrf })
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
    sendJson(res, 200, { authenticated: true, user: next, csrf })
    return true
  }

  if (path === '/api/auth/audit') {
    if (req.method !== 'GET') {
      sendJson(res, 405, { error: 'Use GET' })
      return true
    }
    const user = await userFromRequest(req)
    if (!user) {
      sendJson(res, 401, { error: 'Sign in to continue.' })
      return true
    }
    if (!isAdmin(user)) {
      sendJson(res, 403, { error: 'Only gym admin can open the gym log.' })
      return true
    }
    const url = new URL(req.url || '/', 'http://127.0.0.1')
    const includeViews = url.searchParams.get('views') === '1'
    sendJson(res, 200, {
      kind: 'shape-lab-audit',
      events: await readAudit({ includeViews }),
    })
    return true
  }

  if (path === '/api/auth/sessions') {
    const user = await userFromRequest(req)
    if (!user) {
      sendJson(res, 401, { error: 'Sign in to continue.' })
      return true
    }
    if (!isAdmin(user)) {
      sendJson(res, 403, { error: 'Only gym admin can see who is signed in.' })
      return true
    }
    if (req.method === 'GET') {
      const sessions = (await listLiveSessions()).map((row) => ({
        ...row,
        self: row.accountId === user.accountId,
      }))
      sendJson(res, 200, { kind: 'shape-lab-sessions', sessions })
      return true
    }
    if (req.method !== 'POST') {
      sendJson(res, 405, { error: 'Use GET or POST' })
      return true
    }
    if (denyAuthWriteFlood(res, user)) return true
    let body: { accountId?: string } = {}
    try {
      body = JSON.parse(await readRequestBody(req)) as typeof body
    } catch {
      sendJson(res, 400, { error: 'Could not read that request.' })
      return true
    }
    if (!body.accountId) {
      sendJson(res, 400, { error: 'Which login?' })
      return true
    }
    if (body.accountId === user.accountId) {
      sendJson(res, 400, { error: 'Sign out to end your own login.' })
      return true
    }
    const target = await findAccountById(body.accountId)
    await destroySessionsForAccount(body.accountId)
    await writeAudit('auth.logout', user, {
      detail: target ? `ended login for ${target.email}` : 'ended a login',
    })
    sendJson(res, 200, { ok: true })
    return true
  }

  sendJson(res, 404, { error: 'Unknown auth route' })
  return true
}
