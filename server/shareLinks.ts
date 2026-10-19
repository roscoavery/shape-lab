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
  const photoDataUrl = typeof body.photoDataUrl === 'string' && body.photoDataUrl.startsWith('data:image/')
    ? body.photoDataUrl.slice(0, 500000) // cap at ~500KB
    : null
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
      // Also save as skillGoals so they show in "Working towards" on the profile.
      const now = new Date().toISOString()
      const existing = new Set((athlete.skillGoals ?? []).map((g: any) => g.label?.toLowerCase()))
      const freshGoals = workingTowards
        .slice(0, 3)
        .filter((label) => !existing.has(label.toLowerCase()))
        .map((label) => ({
          id: `sg_${randomBytes(6).toString('hex')}`,
          label,
          setAt: now,
          source: 'intake',
        }))
      athlete.skillGoals = [...(athlete.skillGoals ?? []), ...freshGoals]
    }
    if (photoDataUrl) athlete.photoDataUrl = photoDataUrl
    await writeRosterFile({ ...roster, athletes })
    sendJson(res, 200, { ok: true })
    return
  }

  // Open / group mode: create a new profile.
  const firstName = String(body.firstName ?? '').trim()
  const lastName = String(body.lastName ?? '').trim()
  // Back-compat: older clients send a single name field.
  const legacyName = String(body.name ?? '').trim()
  const resolvedFirst = firstName || legacyName.split(/\s+/)[0] || ''
  const resolvedLast = lastName || legacyName.split(/\s+/).slice(1).join(' ') || ''
  if (!resolvedFirst) {
    sendJson(res, 400, { error: 'Please enter your first name.' })
    return
  }
  const id = `ath_${randomBytes(8).toString('hex')}`
  const athlete: any = {
    id,
    name: `${resolvedFirst} ${resolvedLast}`.trim(),
    firstName: resolvedFirst,
    lastName: resolvedLast,
    role: 'athlete',
    createdAt: new Date().toISOString(),
    intakeAnswers: [],
  }
  saveAnswersToAthlete(athlete, answers)
  if (workingTowards.length > 0) {
    athlete.acroWorkingTowards = workingTowards.slice(0, 3)
    const now = new Date().toISOString()
    athlete.skillGoals = workingTowards.slice(0, 3).map((label) => ({
      id: `sg_${randomBytes(6).toString('hex')}`,
      label,
      setAt: now,
      source: 'intake',
    }))
  }
  if (photoDataUrl) athlete.photoDataUrl = photoDataUrl
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
    twistBetter: 'twistBetterSide',
    dominantHand: 'dominantHand',
    skateStance: 'skateStance',
    harderShape: 'harderShape',
  }
  const SHOULDER_NUM: Record<string, number> = { '1': 1, '2': 2, '3': 3, '4': 4, '5': 5 }
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
  // public page imports them directly. This endpoint validates the token
  // and returns the still crops so Ryan's framing applies here too.
  let crops: Record<string, unknown> = {}
  let removedStillIds: string[] = []
  try {
    const { readStillCropFile } = await import('./stillCropStore.ts')
    const file = await readStillCropFile()
    crops = (file as any)?.crops ?? {}
  } catch {
    // crops are best-effort
  }
  try {
    const { readIgStillMeta } = await import('./igStillDisk.ts')
    const meta = await readIgStillMeta()
    const ids = (meta as any)?.removedStillIds
    if (Array.isArray(ids)) {
      removedStillIds = ids.filter((id): id is string => typeof id === 'string' && id.length > 0)
    }
  } catch {
    // removed stills are best-effort
  }
  let mainStills: Record<string, string> = {}
  try {
    const { readMainStillFile } = await import('./mainStillStore.ts')
    const file = await readMainStillFile()
    mainStills = (file as any)?.picks ?? {}
  } catch {
    // main stills are best-effort
  }
  // Coach-uploaded stills: copy the image files to public/references/ so they
  // serve as static files just like the shipped ones. This is bulletproof —
  // no ID lookup, no dynamic endpoint, just files.
  let coachStills: { shapeId: string; stillId: string; file: string }[] = []
  try {
    const { readCoachStillsFile } = await import('./coachStillStore.ts')
    const { readBin } = await import('./persist.ts')
    const fs = await import('fs')
    const path = await import('path')
    const file = await readCoachStillsFile()
    const extras = (file as any)?.extras
    if (Array.isArray(extras)) {
      // Ensure the public directory exists.
      const pubDir = path.join(process.cwd(), 'public', 'references')
      for (const e of extras) {
        if (!e?.shapeId || !e?.id) continue
        const shapeId = String(e.shapeId)
        const stillId = String(e.id)
        let publicFile: string | null = null
        // If it has a file on disk, copy it to public/references/.
        if (e.file) {
          try {
            const srcBuf = await readBin(`data/coach-blobs/${e.file}`)
            if (srcBuf) {
              // Use a stable name based on the still ID.
              const ext = e.file.includes('.') ? e.file.slice(e.file.lastIndexOf('.')) : '.jpg'
              publicFile = `coach_${stillId}${ext}`
              const dest = path.join(pubDir, publicFile)
              // Only copy if not already there (or if source is newer).
              if (!fs.existsSync(dest)) {
                fs.writeFileSync(dest, srcBuf)
              }
            }
          } catch {
            // skip this still
          }
        } else if (e.dataUrl && String(e.dataUrl).startsWith('data:image')) {
          // Data URL — decode and save as file.
          try {
            const m = /^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/.exec(String(e.dataUrl).trim())
            if (m) {
              const ext = m[1].includes('png') ? '.png' : '.jpg'
              publicFile = `coach_${stillId}${ext}`
              const dest = path.join(pubDir, publicFile)
              if (!fs.existsSync(dest)) {
                fs.writeFileSync(dest, Buffer.from(m[2], 'base64'))
              }
            }
          } catch {
            // skip
          }
        }
        if (publicFile) {
          coachStills.push({ shapeId, stillId, file: publicFile })
        }
      }
    }
  } catch {
    // coach stills are best-effort
  }
  // Coach-still tombstones (deleted extras and hidden shipped originals).
  let removedCoachStillIds: string[] = []
  try {
    const { readCoachStillsFile } = await import('./coachStillStore.ts')
    const file = await readCoachStillsFile()
    const ids = (file as any)?.removedCoachStillIds
    if (Array.isArray(ids)) {
      removedCoachStillIds = ids.filter((id): id is string => typeof id === 'string' && id.length > 0)
    }
  } catch {
    // tombstones are best-effort
  }
  // Gym shapes (custom shapes like lightning bolt, curl up) with their names.
  // Also returns the in-app order (from learnLibraryShapes) so the client matches exactly.
  let gymShapes: { id: string; name: string }[] = []
  let inAppOrder: string[] = []
  try {
    const { readCoachContentFile } = await import('./coachContentStore.ts')
    const file = await readCoachContentFile()
    const lib = (file as any)?.gymLibrary
    if (Array.isArray(lib)) {
      for (const g of lib) {
        if (g?.id && g?.name) {
          gymShapes.push({ id: String(g.id), name: String(g.name) })
        }
      }
    }
  } catch {
    // gym shapes are best-effort
  }
  // Get the exact in-app shape order from learnLibraryShapes.
  // This ensures the public link matches the Learn Shape Library order.
  try {
    // Import the TS module directly (server runs Node with TS support via tsx or similar).
    // Fallback: client will use its own learnLibraryShapes() if this fails.
    const edu = await import('../src/lib/educationCopy.ts')
    if (edu.learnLibraryShapes) {
      const shapes = edu.learnLibraryShapes()
      inAppOrder = shapes.map((s: any) => String(s.id))
    }
  } catch {
    // Client will fall back to its own ordering.
  }
  sendJson(res, 200, { ok: true, crops, removedStillIds, mainStills, coachStills, removedCoachStillIds, gymShapes, inAppOrder })
}

/**
 * Public shape test submission. Athletes identify themselves by name;
 * the result is saved to the server so the coach can see it.
 */
export async function handleShareQuizSubmit(
  req: IncomingMessage,
  res: ServerResponse,
  url: URL,
): Promise<void> {
  const rec = await validateShareToken(url.searchParams.get('token') ?? '')
  if (!rec || rec.type !== 'library') {
    sendJson(res, 404, { error: 'Invalid or expired link.' })
    return
  }
  if (req.method !== 'POST') {
    sendJson(res, 405, { error: 'Use POST' })
    return
  }
  let body: any
  try {
    body = await readBody(req)
  } catch {
    sendJson(res, 400, { error: 'Bad request.' })
    return
  }
  const firstName = String(body.firstName ?? '').trim()
  const lastName = String(body.lastName ?? '').trim()
  const score = Number(body.score)
  const total = Number(body.total)
  if (!firstName || !lastName || !Number.isFinite(score) || !Number.isFinite(total)) {
    sendJson(res, 400, { error: 'Name and score are required.' })
    return
  }
  const record = {
    id: `quiz_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    firstName,
    lastName,
    score,
    total,
    answers: Array.isArray(body.answers) ? body.answers : [],
    takenAt: new Date().toISOString(),
  }
  try {
    const { readQuizResultsFile, writeQuizResultsFile } = await import('./quizResultsStore.ts')
    const file = await readQuizResultsFile()
    const results = Array.isArray((file as any)?.results) ? (file as any).results : []
    results.push(record)
    await writeQuizResultsFile({ kind: 'shape-lab-quiz-results', version: 1, results })
  } catch {
    // best-effort
  }
  sendJson(res, 200, { ok: true })
}

/**
 * Serve a coach-uploaded or IG still file for the public study link.
 * Validates the library share token. (ID-based lookup, fallback.)
 */
export async function handleShareStillFile(
  _req: IncomingMessage,
  res: ServerResponse,
  url: URL,
): Promise<void> {
  const rec = await validateShareToken(url.searchParams.get('token') ?? '')
  if (!rec || rec.type !== 'library') {
    sendJson(res, 404, { error: 'Invalid or expired link.' })
    return
  }
  const id = url.searchParams.get('id') ?? ''
  if (!id) {
    sendJson(res, 400, { error: 'Missing still id.' })
    return
  }
  try {
    const { sendCoachStillFile } = await import('./coachStillStore.ts')
    if (await sendCoachStillFile(id, res)) return
  } catch {
    // fall through
  }
  sendJson(res, 404, { error: 'Still not found.' })
}

/**
 * Serve a coach-uploaded still file for the public study link by filename.
 * Validates the library share token. Simpler than ID lookup — direct file serve.
 */
export async function handleShareStillDirect(
  _req: IncomingMessage,
  res: ServerResponse,
  url: URL,
): Promise<void> {
  const rec = await validateShareToken(url.searchParams.get('token') ?? '')
  if (!rec || rec.type !== 'library') {
    sendJson(res, 404, { error: 'Invalid or expired link.' })
    return
  }
  const filename = url.searchParams.get('file') ?? ''
  if (!filename || filename.includes('..') || filename.includes('/')) {
    sendJson(res, 400, { error: 'Invalid filename.' })
    return
  }
  try {
    const { readBin } = await import('./persist.ts')
    const buf = await readBin(`data/coach-blobs/${filename}`)
    if (buf) {
      res.statusCode = 200
      res.setHeader('Content-Type', 'image/jpeg')
      res.setHeader('Cache-Control', 'public, max-age=86400')
      res.end(buf)
      return
    }
  } catch {
    // fall through
  }
  sendJson(res, 404, { error: 'Still not found.' })
}
