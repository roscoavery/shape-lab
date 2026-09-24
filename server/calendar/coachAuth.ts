import { createHmac, timingSafeEqual } from 'node:crypto'
import type { IncomingMessage } from 'node:http'
import { readRosterFile } from '../rosterStore.ts'
import type { Athlete } from '../../src/types.ts'

const TOKEN_TTL_MS = 12 * 60 * 60 * 1000
const RYAN_PROFILE_ID = 'ath_ryan'
const RYAN_PASSCODE = '2223'

function apiSecret(): string {
  const key = process.env.CALENDAR_CREDENTIAL_KEY?.trim()
  if (!key) throw new Error('CALENDAR_CREDENTIAL_KEY_MISSING')
  return key
}

async function hashPasscode(athleteId: string, passcode: string): Promise<string> {
  const trimmed = passcode.trim()
  const data = new TextEncoder().encode(`shape-lab:${athleteId}:${trimmed}`)
  const buf = await crypto.subtle.digest('SHA-256', data)
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

function isCoachAthlete(a: Athlete): boolean {
  if (a.id === RYAN_PROFILE_ID) return true
  return a.role === 'coach' || a.role === 'gym_owner'
}

async function expectedPasscodeHash(athlete: Athlete): Promise<string | null> {
  if (athlete.passcodeHash) return athlete.passcodeHash
  if (athlete.id === RYAN_PROFILE_ID) return hashPasscode(athlete.id, RYAN_PASSCODE)
  return null
}

export async function verifyCoachPasscode(
  coachId: string,
  passcode: string,
): Promise<{ ok: true; coach: Athlete } | { ok: false; code: string }> {
  const roster = await readRosterFile()
  const athletes = (roster.athletes ?? []) as Athlete[]
  const coach = athletes.find((a) => a.id === coachId)
  if (!coach || !isCoachAthlete(coach)) return { ok: false, code: 'NOT_COACH' }
  const hash = await hashPasscode(coachId, passcode)
  const expected = await expectedPasscodeHash(coach)
  if (!expected || hash !== expected) return { ok: false, code: 'INVALID_PASSCODE' }
  return { ok: true, coach }
}

export function issueCalendarToken(coachId: string): string {
  const exp = Date.now() + TOKEN_TTL_MS
  const payload = `${coachId}:${exp}`
  const sig = createHmac('sha256', apiSecret()).update(payload).digest('base64url')
  return Buffer.from(`${payload}:${sig}`).toString('base64url')
}

export function verifyCalendarToken(token: string): { coachId: string } | null {
  try {
    const decoded = Buffer.from(token, 'base64url').toString('utf8')
    const lastColon = decoded.lastIndexOf(':')
    if (lastColon < 0) return null
    const sig = decoded.slice(lastColon + 1)
    const payload = decoded.slice(0, lastColon)
    const secondColon = payload.lastIndexOf(':')
    if (secondColon < 0) return null
    const coachId = payload.slice(0, secondColon)
    const exp = Number(payload.slice(secondColon + 1))
    if (!coachId || !Number.isFinite(exp) || exp < Date.now()) return null
    const expectedSig = createHmac('sha256', apiSecret()).update(payload).digest('base64url')
    const a = Buffer.from(sig)
    const b = Buffer.from(expectedSig)
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null
    return { coachId }
  } catch {
    return null
  }
}

export function readBearerToken(req: IncomingMessage): string | null {
  const auth = req.headers.authorization
  if (!auth || typeof auth !== 'string') return null
  const m = /^Bearer\s+(.+)$/i.exec(auth.trim())
  return m?.[1]?.trim() || null
}

export async function authorizeCalendarRequest(
  req: IncomingMessage,
): Promise<{ coachId: string } | { error: string; status: number }> {
  const token = readBearerToken(req)
  if (!token) return { error: 'UNAUTHORIZED', status: 401 }
  const parsed = verifyCalendarToken(token)
  if (!parsed) return { error: 'UNAUTHORIZED', status: 401 }
  return { coachId: parsed.coachId }
}
