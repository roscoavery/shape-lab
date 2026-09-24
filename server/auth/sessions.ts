/**
 * Server-managed sessions. Session ids live in HTTP-only cookies.
 */

import { randomBytes } from 'node:crypto'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { readJson, writeJson } from '../persist.ts'
import { findAccountById, publicUserFromAccount } from './accounts.ts'
import { clampMaxDevices, type AuthUser, type SessionRecord } from './types.ts'

const FILE = 'data/sessions.json'
export const SESSION_COOKIE = 'shape_lab_session'
const SESSION_DAYS = 7

type SessionFile = {
  kind: 'shape-lab-sessions'
  version: 1
  sessions: SessionRecord[]
}

const EMPTY: SessionFile = {
  kind: 'shape-lab-sessions',
  version: 1,
  sessions: [],
}

function cookieSecure(req: IncomingMessage): boolean {
  const proto =
    (typeof req.headers['x-forwarded-proto'] === 'string' && req.headers['x-forwarded-proto']) ||
    ''
  return proto.split(',')[0]?.trim() === 'https'
}

function parseCookieHeader(header: string | undefined, name: string): string | null {
  if (!header) return null
  for (const part of header.split(';')) {
    const [rawKey, ...rest] = part.split('=')
    if (rawKey?.trim() === name) return decodeURIComponent(rest.join('=').trim())
  }
  return null
}

async function readFile(): Promise<SessionFile> {
  const stored = await readJson<SessionFile>(FILE, EMPTY)
  if (!stored || stored.kind !== 'shape-lab-sessions' || !Array.isArray(stored.sessions)) {
    return { ...EMPTY }
  }
  return stored
}

async function writeFile(sessions: SessionRecord[]): Promise<void> {
  await writeJson(FILE, { kind: 'shape-lab-sessions', version: 1, sessions } satisfies SessionFile)
}

function stillValid(row: SessionRecord, now = Date.now()): boolean {
  return Date.parse(row.expiresAt) > now
}

function newCsrfToken(): string {
  return randomBytes(32).toString('hex')
}

export async function createSession(accountId: string): Promise<SessionRecord> {
  const now = Date.now()
  const session: SessionRecord = {
    id: randomBytes(32).toString('hex'),
    accountId,
    csrf: newCsrfToken(),
    createdAt: new Date(now).toISOString(),
    expiresAt: new Date(now + SESSION_DAYS * 24 * 60 * 60 * 1000).toISOString(),
  }
  const file = await readFile()
  const account = await findAccountById(accountId)
  const cap = clampMaxDevices(account?.maxDevices)
  const live = file.sessions.filter((row) => stillValid(row, now))
  const others = live.filter((row) => row.accountId !== accountId)
  const mine = live
    .filter((row) => row.accountId === accountId)
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
    .slice(0, Math.max(0, cap - 1))
  await writeFile([...others, ...mine, session])
  return session
}

export async function destroySession(sessionId: string): Promise<void> {
  const file = await readFile()
  await writeFile(file.sessions.filter((row) => row.id !== sessionId))
}

export async function destroySessionsForAccount(accountId: string): Promise<void> {
  const file = await readFile()
  await writeFile(file.sessions.filter((row) => row.accountId !== accountId))
}

export function readSessionId(req: IncomingMessage): string | null {
  const header = typeof req.headers.cookie === 'string' ? req.headers.cookie : ''
  const id = parseCookieHeader(header, SESSION_COOKIE)
  return id && /^[a-f0-9]{32,128}$/i.test(id) ? id : null
}

export function setSessionCookie(req: IncomingMessage, res: ServerResponse, sessionId: string): void {
  const parts = [
    `${SESSION_COOKIE}=${sessionId}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    `Max-Age=${SESSION_DAYS * 24 * 60 * 60}`,
  ]
  if (cookieSecure(req)) parts.push('Secure')
  res.setHeader('Set-Cookie', parts.join('; '))
}

export function clearSessionCookie(req: IncomingMessage, res: ServerResponse): void {
  const parts = [`${SESSION_COOKIE}=`, 'Path=/', 'HttpOnly', 'SameSite=Lax', 'Max-Age=0']
  if (cookieSecure(req)) parts.push('Secure')
  res.setHeader('Set-Cookie', parts.join('; '))
}

export async function sessionFromRequest(req: IncomingMessage): Promise<SessionRecord | null> {
  const sessionId = readSessionId(req)
  if (!sessionId) return null
  const file = await readFile()
  const now = Date.now()
  const idx = file.sessions.findIndex((row) => row.id === sessionId && stillValid(row, now))
  if (idx < 0) return null
  const session = file.sessions[idx]
  if (!session) return null
  if (session.csrf && session.csrf.length >= 32) return session
  const next = { ...session, csrf: newCsrfToken() }
  const sessions = file.sessions.slice()
  sessions[idx] = next
  await writeFile(sessions)
  return next
}

export async function userFromRequest(req: IncomingMessage): Promise<AuthUser | null> {
  const session = await sessionFromRequest(req)
  if (!session) return null
  const account = await findAccountById(session.accountId)
  if (!account) return null
  return { ...publicUserFromAccount(account), kiosk: session.kiosk === true }
}

export type PublicSession = {
  accountId: string
  email: string
  displayName: string
  role: string
  createdAt: string
  expiresAt: string
  kiosk: boolean
}

/** Live logins. Session ids stay on the server. */
export async function listLiveSessions(): Promise<PublicSession[]> {
  const file = await readFile()
  const now = Date.now()
  const rows: PublicSession[] = []
  for (const session of file.sessions) {
    if (!stillValid(session, now)) continue
    const account = await findAccountById(session.accountId)
    if (!account) continue
    rows.push({
      accountId: account.id,
      email: account.email,
      displayName: account.displayName,
      role: account.role,
      createdAt: session.createdAt,
      expiresAt: session.expiresAt,
      kiosk: session.kiosk === true,
    })
  }
  return rows.sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
}

export async function setSessionKiosk(sessionId: string, kiosk: boolean): Promise<boolean> {
  const file = await readFile()
  const now = Date.now()
  const idx = file.sessions.findIndex((row) => row.id === sessionId && stillValid(row, now))
  if (idx < 0) return false
  const next = file.sessions.slice()
  next[idx] = { ...next[idx], kiosk }
  await writeFile(next)
  return true
}
