/**
 * Public shareable links — no sign-in required.
 *
 * Two link types, both gated by an unguessable 32-hex token:
 *
 * 1. Intake link (/intake/<token>): lets a prospective athlete fill out the
 *    intake questions + shape test without an account. They can create a new
 *    profile (goes to Ryan as pending approval) or pick their existing
 *    profile and answer unanswered questions.
 *
 * 2. Study library link (/studylib/<token>): read-only shape library for
 *    athletes to study — shapes, stills, cues. No account needed.
 *
 * Token endpoints (NO AUTH — wired before the gate in apiHandler.ts):
 *   GET  /api/share/intake?token=          — intake questions + still URLs
 *   POST /api/share/intake-search?token=   — { name } → matching profiles
 *   POST /api/share/intake-submit?token=   — { profileId? | newProfile, answers }
 *   GET  /api/share/library?token=         — shape library (shapes + stills)
 *
 * Authed endpoints (Ryan generates/regenerates the links):
 *   POST /api/share-links/intake-token     — { token, url }
 *   POST /api/share-links/library-token    — { token, url }
 */

import { randomBytes } from 'node:crypto'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { sendJson } from './instagramResolve.ts'
import { readJson, writeJson } from './persist.ts'

export type ShareLinkType = 'intake' | 'library'

type ShareTokenRecord = {
  token: string
  type: ShareLinkType
  coachId: string
  /** For intake tokens: the one athlete this link belongs to. */
  athleteId?: string
  createdAt: string
}

type ShareTokenFile = {
  kind: 'shape-lab-share-tokens'
  tokens: ShareTokenRecord[]
}

const TOKEN_FILE = 'data/share-tokens.json'
const EMPTY: ShareTokenFile = { kind: 'shape-lab-share-tokens', tokens: [] }

async function readTokens(): Promise<ShareTokenFile> {
  const data = await readJson<ShareTokenFile>(TOKEN_FILE, EMPTY)
  if (!data || data.kind !== 'shape-lab-share-tokens' || !Array.isArray(data.tokens)) {
    return { ...EMPTY }
  }
  return data
}

async function writeTokens(file: ShareTokenFile): Promise<void> {
  await writeJson(TOKEN_FILE, file)
}

function isValidTokenFormat(t: string): boolean {
  return /^[a-f0-9]{32}$/.test(t.trim())
}

/** Get or create the long-lived library token for a coach. */
export async function getOrCreateShareToken(
  type: 'library',
  coachId: string,
): Promise<string> {
  const file = await readTokens()
  const existing = file.tokens.find((t) => t.type === type && t.coachId === coachId)
  if (existing && isValidTokenFormat(existing.token)) return existing.token
  const token = randomBytes(16).toString('hex')
  const next: ShareTokenFile = {
    ...file,
    tokens: [
      ...file.tokens.filter((t) => !(t.type === type && t.coachId === coachId)),
      { token, type, coachId, createdAt: new Date().toISOString() },
    ],
  }
  await writeTokens(next)
  return token
}

/**
 * Get or create the intake token tied to one athlete. The link only ever
 * touches that athlete's profile — no roster search, no name enumeration.
 */
export async function getOrCreateIntakeToken(
  athleteId: string,
  coachId: string,
): Promise<string> {
  const file = await readTokens()
  const existing = file.tokens.find(
    (t) => t.type === 'intake' && t.athleteId === athleteId,
  )
  if (existing && isValidTokenFormat(existing.token)) return existing.token
  const token = randomBytes(16).toString('hex')
  const next: ShareTokenFile = {
    ...file,
    tokens: [
      ...file.tokens.filter(
        (t) => !(t.type === 'intake' && t.athleteId === athleteId),
      ),
      { token, type: 'intake', coachId, athleteId, createdAt: new Date().toISOString() },
    ],
  }
  await writeTokens(next)
  return token
}

/** Validate a public share token. Returns the record or null. */
export async function validateShareToken(token: string): Promise<ShareTokenRecord | null> {
  const t = token.trim()
  if (!isValidTokenFormat(t)) return null
  const file = await readTokens()
  return file.tokens.find((r) => r.token === t) ?? null
}

async function readBody(req: IncomingMessage): Promise<any> {
  const chunks: Buffer[] = []
  for await (const chunk of req) chunks.push(chunk as Buffer)
  const text = Buffer.concat(chunks).toString('utf8')
  if (!text) return {}
  try {
    return JSON.parse(text)
  } catch {
    return {}
  }
}

// ---------------------------------------------------------------------------
// Public handlers (no auth)
// ---------------------------------------------------------------------------

/** GET /api/share/intake?token= — validates the link, returns the athlete. */
export async function handleShareIntake(
  _req: IncomingMessage,
  res: ServerResponse,
  url: URL,
): Promise<void> {
  const rec = await validateShareToken(url.searchParams.get('token') ?? '')
  if (!rec || rec.type !== 'intake' || !rec.athleteId) {
    sendJson(res, 404, { error: 'Invalid or expired link.' })
    return
  }
  const { readRosterFile } = await import('./rosterStore.ts')
  const roster = await readRosterFile()
  const athletes = roster.athletes as any[]
  const athlete = athletes.find((a: any) => a.id === rec.athleteId)
  if (!athlete) {
    sendJson(res, 404, { error: 'Invalid or expired link.' })
    return
  }
  const coach = athletes.find((a: any) => a.id === rec.coachId)
  const answered = new Set((athlete.intakeAnswers ?? []).map((a: any) => a.questionId))
  sendJson(res, 200, {
    ok: true,
    coachName: coach?.name ?? 'Your coach',
    athleteName: athlete.name ?? '',
    answeredIds: [...answered],
  })
}

/** POST /api/share/intake-submit?token= — { answers } → saved to the token's athlete. */
export async function handleShareIntakeSubmit(
  req: IncomingMessage,
  res: ServerResponse,
  url: URL,
): Promise<void> {
  const rec = await validateShareToken(url.searchParams.get('token') ?? '')
  if (!rec || rec.type !== 'intake' || !rec.athleteId) {
    sendJson(res, 404, { error: 'Invalid or expired link.' })
    return
  }
  const body = await readBody(req)
  const answers = Array.isArray(body.answers) ? body.answers : []
  const { readRosterFile, writeRosterFile } = await import('./rosterStore.ts')
  const roster = await readRosterFile()
  const athletes = roster.athletes as any[]
  const athlete = athletes.find((a: any) => a.id === rec.athleteId)
  if (!athlete) {
    sendJson(res, 404, { error: 'Invalid or expired link.' })
    return
  }
  const existing = new Set((athlete.intakeAnswers ?? []).map((a: any) => a.questionId))
  const fresh = answers.filter((a: any) => a?.questionId && !existing.has(a.questionId))
  athlete.intakeAnswers = [...(athlete.intakeAnswers ?? []), ...fresh]
  // Apply profile fields directly so they show up on the athlete's card.
  const FIELD_MAP: Record<string, string> = {
    parentPhone: 'parentPhone',
    favoriteColor: 'favoriteColor',
    handstandFloor: 'handstandFloor',
    handstandWall: 'handstandWall',
    hollowHold: 'hollowHold',
    supermanHold: 'supermanHold',
    vUps: 'vUps',
    shoulderOpen: 'openShoulderHardness',
    cartwheelSide: 'cartwheelLeg',
    twistDirection: 'twistDirection',
    dominantHand: 'dominantHand',
    skateStance: 'skateStance',
    harderShape: 'harderShape',
  }
  for (const a of fresh) {
    const field = FIELD_MAP[a.questionId]
    if (field && a.answer) athlete[field] = a.answer
  }
  await writeRosterFile({ ...roster, athletes })
  sendJson(res, 200, { ok: true })
}

/** GET /api/share/library?token= — read-only shape library. */
export async function handleShareLibrary(
  _req: IncomingMessage,
  res: ServerResponse,
  url: URL,
): Promise<void> {
  const rec = await validateShareToken(url.searchParams.get('token') ?? '')
  if (!rec || rec.type !== 'library') {
    sendJson(res, 404, { error: 'Invalid or expired link.' })
    return
  }
  // Shape definitions + still file lists ship in the client bundle; the
  // public page imports them directly. This endpoint validates the token.
  sendJson(res, 200, { ok: true })
}
