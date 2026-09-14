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

type InviteFile = {
  kind: 'shape-lab-invites'
  version: 1
  invites: InviteRecord[]
}

const EMPTY: InviteFile = { kind: 'shape-lab-invites', version: 1, invites: [] }

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
  return stored
}

async function writeFile(invites: InviteRecord[]): Promise<void> {
  await writeJson(FILE, { kind: 'shape-lab-invites', version: 1, invites } satisfies InviteFile)
}

function stillOpen(row: InviteRecord, now = Date.now()): boolean {
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
