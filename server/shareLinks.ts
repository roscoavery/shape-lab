/**
 * Public shareable links — no sign-in required.
 *
 * Two link types, both gated by an unguessable 32-hex token:
 *
 * 1. Intake link (/intake/<token>): tied to ONE athlete's profile (created by
 *    the coach via quick-add). The athlete answers unanswered intake questions
 *    with no account. The link only ever touches that profile — no roster
 *    search, no name enumeration.
 *
 * 2. Study library link (/studylib/<token>): read-only shape library for
 *    athletes to study — shapes, stills, cues. No account needed.
 *
 * Token endpoints (NO AUTH — wired before the gate in apiHandler.ts):
 *   GET  /api/share/intake?token=          — validates token, returns athlete
 *   POST /api/share/intake-submit?token=   — { answers } → saved to the athlete
 *   GET  /api/share/library?token=         — validates token
 *
 * Authed endpoints (Ryan generates the links):
 *   POST /api/share-links/intake-token     — { athleteId } → { token, path }
 *   POST /api/share-links/library-token    — { token, path }
 */

import { randomBytes } from 'node:crypto'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { sendJson } from './instagramResolve.ts'
import { readJson, writeJson } from './persist.ts'

export type ShareLinkType = 'intake' | 'intake-open' | 'intake-group' | 'library'

type ShareTokenRecord = {
  token: string
  type: ShareLinkType
  coachId: string
  /** For intake tokens: the one athlete this link belongs to. */
  athleteId?: string
  /** For intake-group tokens: the training event/group new profiles join. */
  groupId?: string
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

/** Get or create the general new-athlete link for a coach (no group). */
export async function getOrCreateOpenIntakeToken(coachId: string): Promise<string> {
  const file = await readTokens()
  const existing = file.tokens.find(
    (t) => t.type === 'intake-open' && t.coachId === coachId,
  )
  if (existing && isValidTokenFormat(existing.token)) return existing.token
  const token = randomBytes(16).toString('hex')
  const next: ShareTokenFile = {
    ...file,
    tokens: [
      ...file.tokens.filter(
        (t) => !(t.type === 'intake-open' && t.coachId === coachId),
      ),
      { token, type: 'intake-open', coachId, createdAt: new Date().toISOString() },
    ],
  }
  await writeTokens(next)
  return token
}

/** Get or create the new-athlete link for a training group. */
export async function getOrCreateGroupIntakeToken(
  groupId: string,
  coachId: string,
): Promise<string> {
  const file = await readTokens()
  const existing = file.tokens.find(
    (t) => t.type === 'intake-group' && t.groupId === groupId,
  )
  if (existing && isValidTokenFormat(existing.token)) return existing.token
  const token = randomBytes(16).toString('hex')
  const next: ShareTokenFile = {
    ...file,
    tokens: [
      ...file.tokens.filter(
        (t) => !(t.type === 'intake-group' && t.groupId === groupId),
      ),
      { token, type: 'intake-group', coachId, groupId, createdAt: new Date().toISOString() },
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

/** GET /api/share/intake?token= — validates the link, returns mode + athlete/group. */
export async function handleShareIntake(
  _req: IncomingMessage,
  res: ServerResponse,
  url: URL,
): Promise<void> {
  const rec = await validateShareToken(url.searchParams.get('token') ?? '')
  if (!rec || !rec.type.startsWith('intake')) {
    sendJson(res, 404, { error: 'Invalid or expired link.' })
    return
  }
  const { readRosterFile } = await import('./rosterStore.ts')
  const roster = await readRosterFile()
  const athletes = roster.athletes as any[]
  const coach = athletes.find((a: any) => a.id === rec.coachId)

  if (rec.type === 'intake' && rec.athleteId) {
    const athlete = athletes.find((a: any) => a.id === rec.athleteId)
    if (!athlete) {
      sendJson(res, 404, { error: 'Invalid or expired link.' })
      return
    }
    const answered = new Set((athlete.intakeAnswers ?? []).map((a: any) => a.questionId))
    sendJson(res, 200, {
      ok: true,
      mode: 'athlete',
      coachName: coach?.name ?? 'Your coach',
      athleteName: athlete.name ?? '',
      answeredIds: [...answered],
    })
    return
  }

  // Open or group mode: new profile creation.
  let groupName: string | null = null
  if (rec.type === 'intake-group' && rec.groupId) {
    try {
      const { readTrainingEventsFile } = await import('./trainingEventStore.ts')
      const file = await readTrainingEventsFile()
      const group = (file.events as any[]).find((e: any) => e.id === rec.groupId)
      groupName = group?.name ?? null
    } catch {
      // group lookup is best-effort
    }
  }
  sendJson(res, 200, {
    ok: true,
    mode: rec.type === 'intake-group' ? 'group' : 'open',
    coachName: coach?.name ?? 'Your coach',
    groupName,
  })
}

/** POST /api/share/intake-submit?token= — { answers } → saved to the token's athlete. */
export async function handleShareIntakeSubmit(
  req: IncomingMessage,
  res: ServerResponse,
  url: URL,
): Promise<void> {
  const rec = await validateShareToken(url.searchParams.get('token') ?? '')
  if (!rec || !rec.type.startsWith('intake')) {
    sendJson(res, 404, { error: 'Invalid or expired link.' })
    return
  }
  const body = await readBody(req)
  const answers = Array.isArray(body.answers) ? body.answers : []
  const workingTowards: string[] = Array.isArray(body.workingTowards)
    ? body.workingTowards.filter((s: any) => typeof s === 'string')
    : []
  const { readRosterFile, writeRosterFile } = await import('./rosterStore.ts')
  const roster = await readRosterFile()
  const athletes = roster.athletes as any[]

  // Per-athlete mode: save to the existing profile.
  if (rec.type === 'intake' && rec.athleteId) {
    const athlete = athletes.find((a: any) => a.id === rec.athleteId)
    if (!athlete) {
      sendJson(res, 404, { error: 'Invalid or expired link.' })
      return
    }
    saveAnswersToAthlete(athlete, answers)
    if (workingTowards.length > 0) {
      athlete.acroWorkingTowards = workingTowards.slice(0, 3)
    }
    await writeRosterFile({ ...roster, athletes })
    sendJson(res, 200, { ok: true })
    return
  }

  // Open / group mode: create a new profile.
  const name = String(body.name ?? '').trim()
  if (!name) {
    sendJson(res, 400, { error: 'Please enter your name.' })
    return
  }
  const id = `ath_${randomBytes(8).toString('hex')}`
  const parts = name.split(/\s+/)
  const athlete: any = {
    id,
    name,
    firstName: parts[0] ?? name,
    lastName: parts.slice(1).join(' ') ?? '',
    role: 'athlete',
    createdAt: new Date().toISOString(),
    intakeAnswers: [],
  }
  saveAnswersToAthlete(athlete, answers)
  if (workingTowards.length > 0) {
    athlete.acroWorkingTowards = workingTowards.slice(0, 3)
  }
  athletes.push(athlete)

  // Group mode: add them to the training event.
  if (rec.type === 'intake-group' && rec.groupId) {
    try {
      const { readTrainingEventsFile, writeTrainingEventsFile } = await import('./trainingEventStore.ts')
      const file = await readTrainingEventsFile()
      const events = file.events as any[]
      const group = events.find((e: any) => e.id === rec.groupId)
      if (group && !group.athleteIds.includes(id)) {
        group.athleteIds.push(id)
        await writeTrainingEventsFile({ ...file, events })
      }
    } catch {
      // group join is best-effort
    }
  }

  await writeRosterFile({ ...roster, athletes })
  sendJson(res, 200, { ok: true, athleteId: id })
}

/** Save fresh (non-not_sure) answers to an athlete's intakeAnswers + profile fields. */
function saveAnswersToAthlete(athlete: any, answers: any[]): void {
  const existing = new Set((athlete.intakeAnswers ?? []).map((a: any) => a.questionId))
  const fresh = answers.filter(
    (a: any) => a?.questionId && !existing.has(a.questionId) && a.answer !== 'not_sure',
  )
  athlete.intakeAnswers = [...(athlete.intakeAnswers ?? []), ...fresh]
  const FIELD_MAP: Record<string, string> = {
    parentPhone: 'parentPhone',
    favoriteColor: 'favoriteColor',
    handstandFloor: 'handstandFloor',
    handstandWall: 'handstandWall',
    hollowHold: 'hollowHold',
    supermanHold: 'supermanHold',
    vUps: 'vUps',
    pushUps: 'pushUps',
    shoulderOpen: 'openShoulderHardness',
    cartwheelSide: 'cartwheelLeg',
    twistDirection: 'twistDirection',
    dominantHand: 'dominantHand',
    skateStance: 'skateStance',
    harderShape: 'harderShape',
  }
  const SHOULDER_NUM: Record<string, number> = { easy: 1, okay: 2, hard: 4, cant: 5 }
  for (const a of fresh) {
    const field = FIELD_MAP[a.questionId]
    if (!field || !a.answer || a.answer === 'not_sure') continue
    if (a.questionId === 'shoulderOpen') {
      const num = SHOULDER_NUM[a.answer]
      if (num) athlete[field] = num
    } else {
      athlete[field] = a.answer
    }
  }
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
