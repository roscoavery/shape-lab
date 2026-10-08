/**
 * One-time sign-in links. Admin copies the URL, or emails it when SMTP is set.
 * Tokens are stored as SHA-256 hashes in gitignored data/invites.json.
 */

import { createHash, randomBytes } from 'node:crypto'
import type { IncomingMessage } from 'node:http'
import { readJson, writeJson } from '../persist.ts'
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
  // Parent and athlete invites must bind to at least one existing athlete.
  if ((role === 'parent' || role === 'athlete') && athleteIds.length === 0) {
    throw new Error('Parent and athlete invitations must link to an athlete profile.')
  }
  const now = Date.now()
  const token = randomBytes(32).toString('hex')
  const invite: AccountCreationInvite = {
    id: `ainv_${randomBytes(8).toString('hex')}`,
    role,
    athleteIds: [...athleteIds],
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
 * Redeem an account-creation invite. Marks it used and returns the authorized
 * role and athlete IDs. The caller creates the account with these values.
 */
export async function redeemAccountInvite(token: string): Promise<{
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
