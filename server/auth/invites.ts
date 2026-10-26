/**
 * One-time sign-in links. Admin copies the URL, or emails it when SMTP is set.
 * Tokens are stored as SHA-256 hashes in gitignored data/invites.json.
 */

import { createHash, randomBytes } from 'node:crypto'
import type { IncomingMessage } from 'node:http'
import { readJson, writeJson } from '../persist.ts'
import { readRosterFile } from '../rosterStore.ts'
import { findAccountById } from './accounts.ts'

const FILE = 'data/invites.json'
const LIFE_MS = 7 * 24 * 60 * 60 * 1000
const MAX = 400

export type InviteRecord = {
  id: string
  accountId: string
  tokenHash: string
  createdAt: string
  expiresAt: string
  usedAt?: string
}

/** Account-creation invite: authorizes creating a new account with a specific role. */
export type AccountCreationInvite = {
  id: string
  /** Role the invite authorizes. Cannot be changed by the invitee. */
  role: 'coach' | 'parent' | 'athlete'
  /** For parent/athlete invites: the athlete profile IDs this account links to. */
  athleteIds: string[]
  /** Admin account that created the invite. */
  createdBy: string
  tokenHash: string
  createdAt: string
  expiresAt: string
  usedAt?: string
}

type InviteFile = {
  kind: 'shape-lab-invites'
  version: 1
  invites: InviteRecord[]
  accountInvites?: AccountCreationInvite[]
}

const EMPTY: InviteFile = { kind: 'shape-lab-invites', version: 1, invites: [], accountInvites: [] }

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

function publicOrigin(req: IncomingMessage): string {
  const host =
    (typeof req.headers.host === 'string' && req.headers.host) || '127.0.0.1'
  const protoRaw =
    (typeof req.headers['x-forwarded-proto'] === 'string' && req.headers['x-forwarded-proto']) ||
    'http'
  const proto = protoRaw.split(',')[0]?.trim() || 'http'
  return `${proto}://${host}`
}

async function readFile(): Promise<InviteFile> {
  const stored = await readJson<InviteFile>(FILE, EMPTY)
  if (!stored || stored.kind !== 'shape-lab-invites' || !Array.isArray(stored.invites)) {
    return { ...EMPTY }
  }
  return {
    ...stored,
    accountInvites: Array.isArray(stored.accountInvites) ? stored.accountInvites : [],
  }
}

async function writeFile(invites: InviteRecord[], accountInvites?: AccountCreationInvite[]): Promise<void> {
  const current = await readFile()
  await writeJson(
    FILE,
    {
      kind: 'shape-lab-invites',
      version: 1,
      invites,
      accountInvites: accountInvites ?? current.accountInvites ?? [],
    } satisfies InviteFile,
  )
}

function stillOpen(row: InviteRecord | AccountCreationInvite, now = Date.now()): boolean {
  return !row.usedAt && Date.parse(row.expiresAt) > now
}

export async function createInvite(
  accountId: string,
  req: IncomingMessage,
): Promise<{ url: string; expiresAt: string }> {
  const account = await findAccountById(accountId)
  if (!account) throw new Error('That account is gone.')
  const now = Date.now()
  const token = randomBytes(32).toString('hex')
  const invite: InviteRecord = {
    id: `inv_${randomBytes(8).toString('hex')}`,
    accountId: account.id,
    tokenHash: hashToken(token),
    createdAt: new Date(now).toISOString(),
    expiresAt: new Date(now + LIFE_MS).toISOString(),
  }
  const file = await readFile()
  const kept = file.invites.filter((row) => stillOpen(row, now) && row.accountId !== account.id)
  await writeFile([invite, ...kept].slice(0, MAX))
  return {
    url: `${publicOrigin(req)}/?invite=${token}`,
    expiresAt: invite.expiresAt,
  }
}

export async function peekInvite(token: string): Promise<{
  valid: boolean
  email?: string
  displayName?: string
}> {
  const raw = token.trim()
  if (!raw || raw.length < 32) return { valid: false }
  const file = await readFile()
  const now = Date.now()
  const row = file.invites.find((invite) => invite.tokenHash === hashToken(raw) && stillOpen(invite, now))
  if (!row) return { valid: false }
  const account = await findAccountById(row.accountId)
  if (!account) return { valid: false }
  return { valid: true, email: account.email, displayName: account.displayName }
}

export async function redeemInvite(token: string): Promise<{ accountId: string } | null> {
  const raw = token.trim()
  if (!raw || raw.length < 32) return null
  const file = await readFile()
  const now = Date.now()
  const idx = file.invites.findIndex(
    (invite) => invite.tokenHash === hashToken(raw) && stillOpen(invite, now),
  )
  if (idx < 0) return null
  const row = file.invites[idx]
  if (!row) return null
  const account = await findAccountById(row.accountId)
  if (!account) return null
  const next = file.invites.slice()
  next[idx] = { ...row, usedAt: new Date(now).toISOString() }
  await writeFile(next)
  return { accountId: account.id }
}

/**
 * Create an account-creation invite. The invite authorizes creating ONE new
 * account with the specified role. For parent/athlete roles, the athleteIds
 * bind the new account to existing athlete profiles.
 *
 * Binding rules (beta-readiness fix): an athlete invite binds exactly ONE
 * existing athlete profile (that login IS that athlete, via rosterProfileId
 * at redemption); a parent invite binds one or more existing athletes; a
 * coach invite carries no athlete links at all. Every linked id must name
 * an athlete row that exists right now, so an invite can never bind a
 * login to a phantom or a non-athlete profile.
 */
export async function createAccountInvite(
  role: 'coach' | 'parent' | 'athlete',
  athleteIds: string[],
  createdBy: string,
  req: IncomingMessage,
): Promise<{ url: string; expiresAt: string; id: string }> {
  if (role !== 'coach' && role !== 'parent' && role !== 'athlete') {
    throw new Error('Invalid role for invitation.')
  }
  const ids = [...new Set(
    (Array.isArray(athleteIds) ? athleteIds : []).filter(
      (id): id is string => typeof id === 'string' && id.trim().length > 0,
    ),
  )]
  if (role === 'athlete' && ids.length !== 1) {
    throw new Error('An athlete invitation must choose exactly one existing athlete profile.')
  }
  if (role === 'parent' && ids.length === 0) {
    throw new Error('Parent and athlete invitations must link to an athlete profile.')
  }
  // Coach invites never carry athlete links, even if the caller passed some.
  const linked = role === 'coach' ? [] : ids
  if (linked.length > 0) {
    const roster = await readRosterFile()
    const rows = new Map(
      (Array.isArray(roster.athletes) ? roster.athletes : []).map((row) => {
        const r = row as { id?: unknown; role?: unknown }
        return [typeof r.id === 'string' ? r.id : '', typeof r.role === 'string' ? r.role : 'athlete']
      }),
    )
    for (const id of linked) {
      const rowRole = rows.get(id)
      if (rowRole === undefined || rowRole === 'parent' || rowRole === 'coach' || rowRole === 'gym_owner') {
        throw new Error('That athlete profile no longer exists.')
      }
    }
  }
  const now = Date.now()
  const token = randomBytes(32).toString('hex')
  const invite: AccountCreationInvite = {
    id: `ainv_${randomBytes(8).toString('hex')}`,
    role,
    athleteIds: [...linked],
    createdBy,
    tokenHash: hashToken(token),
    createdAt: new Date(now).toISOString(),
    expiresAt: new Date(now + LIFE_MS).toISOString(),
  }
  const file = await readFile()
  const kept = (file.accountInvites ?? []).filter((row) => stillOpen(row, now))
  await writeFile(file.invites, [invite, ...kept].slice(0, MAX))
  return {
    url: `${publicOrigin(req)}/?invite=${token}&new=1`,
    expiresAt: invite.expiresAt,
    id: invite.id,
  }
}

/**
 * Peek at an account-creation invite. Returns the authorized role and athlete
 * IDs. The server determines these from the stored invite, never from client input.
 */
export async function peekAccountInvite(token: string): Promise<{
  valid: boolean
  role?: 'coach' | 'parent' | 'athlete'
  athleteIds?: string[]
}> {
  const raw = token.trim()
  if (!raw || raw.length < 32) return { valid: false }
  const file = await readFile()
  const now = Date.now()
  const row = (file.accountInvites ?? []).find(
    (invite) => invite.tokenHash === hashToken(raw) && stillOpen(invite, now),
  )
  if (!row) return { valid: false }
  return { valid: true, role: row.role, athleteIds: [...row.athleteIds] }
}

/**
 * In-process invite lock. The gym server is a single Node process, so
 * serializing the validate → create-account → consume sequence here is
 * what makes a one-time invite actually one-time: two concurrent
 * redemptions cannot both pass the still-open check before either writes.
 * The lock is held only for the redemption sequence, never for peeking.
 */
let inviteLock: Promise<void> = Promise.resolve()
export async function withInviteLock<T>(fn: () => Promise<T>): Promise<T> {
  let release!: () => void
  const gate = new Promise<void>((resolve) => {
    release = resolve
  })
  const previous = inviteLock
  inviteLock = previous.then(() => gate)
  await previous
  try {
    return await fn()
  } finally {
    release()
  }
}

/**
 * Consume an account-creation invite. Marks it used and returns the
 * authorized role and athlete IDs. Call this ONLY after account creation
 * has succeeded, inside withInviteLock, so a failed creation never burns
 * the invite and a concurrent redemption cannot slip through.
 */
export async function consumeAccountInvite(token: string): Promise<{
  role: 'coach' | 'parent' | 'athlete'
  athleteIds: string[]
} | null> {
  const raw = token.trim()
  if (!raw || raw.length < 32) return null
  const file = await readFile()
  const now = Date.now()
  const idx = (file.accountInvites ?? []).findIndex(
    (invite) => invite.tokenHash === hashToken(raw) && stillOpen(invite, now),
  )
  if (idx < 0) return null
  const row = file.accountInvites![idx]
  if (!row) return null
  const next = file.accountInvites!.slice()
  next[idx] = { ...row, usedAt: new Date(now).toISOString() }
  await writeFile(file.invites, next)
  return { role: row.role, athleteIds: [...row.athleteIds] }
}

/**
 * Redeem an account-creation invite. Marks it used and returns the authorized
 * role and athlete IDs. Kept for the module-level probe only: the live
 * redeem flow must NOT use this (it would burn the invite before account
 * creation). It peeks, creates the account, then consumes, all inside
 * withInviteLock. See server/auth/routes.ts.
 */
export async function redeemAccountInvite(token: string): Promise<{
  role: 'coach' | 'parent' | 'athlete'
  athleteIds: string[]
} | null> {
  return consumeAccountInvite(token)
}
