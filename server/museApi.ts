/**
 * Muse connection API — Bearer-token routes under /api/muse/*.
 *
 * These routes are deliberately exempt from the session gate in
 * server/auth/gate.ts: the API key IS the credential. Scopes on the key
 * decide what each caller may do. Parent-scoped keys carry an athleteId
 * and can only read that athlete's progress. Coach-created keys carry the
 * creator's account id + role and can never reach past what that role could
 * touch in the app.
 *
 * Key management (/api/muse/keys*) stays session-gated in
 * server/apiHandler.ts — it is not handled here.
 */

import type { IncomingMessage, ServerResponse } from 'node:http'
import { randomBytes } from 'node:crypto'
import { sendJson } from './instagramResolve.ts'
import { tooMany } from './auth/rateLimit.ts'
import { findAccountById } from './auth/accounts.ts'
import { isAdminRole } from './auth/types.ts'
import { canCoachAthlete, type RosterAthlete } from './auth/permissions.ts'
import {
  museKeyHasScope,
  museKeyMayReadAthlete,
  verifyMuseKey,
  type MuseKeyRecord,
  type MuseScope,
  type VerifiedMuseKey,
} from './auth/museKeys.ts'
import { readLibraryFile, readRequestBody, writeLibraryFile } from './libraryStore.ts'
import { canonicalSocialUrl, socialPlatform } from '../src/lib/socialUrls.ts'
import { readCoachInterviewFile } from './coachInterviewStore.ts'
import { readRosterFile, writeRosterFile } from './rosterStore.ts'
import { readFeedFile, addTextFeedPost } from './feedStore.ts'
import { readCoachContentFile, writeCoachContentFile } from './coachContentStore.ts'
import { readCoachClassesFile, writeCoachClassesFile } from './coachClassStore.ts'
import { readSkillPathsFile, writeSkillPathsFile } from './skillPathStore.ts'
import { readChalkboardsFile, writeChalkboardsFile } from './chalkboardStore.ts'

const WINDOW_DAYS = 30

function bearerSecret(req: IncomingMessage): string | null {
  const header = req.headers.authorization
  if (typeof header !== 'string') return null
  const match = /^Bearer\s+(.+)$/i.exec(header.trim())
  return match ? match[1].trim() : null
}

async function authed(
  req: IncomingMessage,
  res: ServerResponse,
  scope: MuseScope,
): Promise<VerifiedMuseKey | null> {
  const verified = await verifyMuseKey(bearerSecret(req))
  if (!verified) {
    sendJson(res, 401, { error: 'A valid Muse connection key is required.' })
    return null
  }
  if (tooMany(`muse:${verified.key.id}`, 120, 60_000)) {
    sendJson(res, 429, { error: 'Too many requests. Wait a minute.' })
    return null
  }
  if (!museKeyHasScope(verified.key, scope)) {
    sendJson(res, 403, { error: 'This key is not allowed to do that.' })
    return null
  }
  return verified
}

/** Who created the key, resolved to app identity. Keys never escalate past this. */
type KeyCreator = {
  accountId: string | null
  role: string | null
  displayName: string
  rosterProfileId: string | null
  /** Owner/admin (or a pre-stamping owner key) — full reach. */
  privileged: boolean
}

/** Privilege for a stamped creator role when the account record is gone. */
function stampedIsAdmin(role: string | null): boolean {
  return role === 'admin' || role === 'gymOwner'
}

async function keyCreator(key: MuseKeyRecord): Promise<KeyCreator> {
  const accountId = key.createdByAccountId
  if (!accountId) {
    // Keys made before creator stamping were owner-created.
    return {
      accountId: null,
      role: 'gymOwner',
      displayName: 'Gym owner',
      rosterProfileId: null,
      privileged: true,
    }
  }
  try {
    const account = await findAccountById(accountId)
    if (!account) {
      // Account deleted since: trust the stamped role (keys can never
      // escalate past it anyway).
      return {
        accountId,
        role: key.createdByRole,
        displayName: key.createdByRole === 'gymOwner' ? 'Gym owner' : 'Coach',
        rosterProfileId: null,
        privileged: stampedIsAdmin(key.createdByRole),
      }
    }
    return {
      accountId,
      role: account.role,
      displayName: account.displayName || 'Coach',
      rosterProfileId: account.rosterProfileId ?? null,
      privileged: isAdminRole(account.role),
    }
  } catch {
    return {
      accountId,
      role: key.createdByRole,
      displayName: key.createdByRole === 'gymOwner' ? 'Gym owner' : 'Coach',
      rosterProfileId: null,
      privileged: stampedIsAdmin(key.createdByRole),
    }
  }
}

/** A coach-created key may only touch athletes its coach could touch in the app. */
async function coachMayTouchAthlete(
  creator: KeyCreator,
  athlete: Record<string, unknown>,
): Promise<boolean> {
  if (creator.privileged) return true
  if (creator.role !== 'coach' || !creator.rosterProfileId) return false
  try {
    return await canCoachAthlete(
      {
        accountId: creator.accountId ?? '',
        email: '',
        role: 'coach',
        displayName: creator.displayName,
        rosterProfileId: creator.rosterProfileId,
        linkedAthleteIds: [],
      },
      athlete as RosterAthlete,
    )
  } catch {
    return false
  }
}

async function readJsonBody(req: IncomingMessage): Promise<Record<string, unknown> | null> {
  try {
    const parsed = JSON.parse(await readRequestBody(req)) as unknown
    return parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : null
  } catch {
    return null
  }
}

function textField(body: Record<string, unknown>, name: string, max: number): string {
  const v = body[name]
  return typeof v === 'string' ? v.trim().slice(0, max) : ''
}

function sameName(a: unknown, b: string): boolean {
  return typeof a === 'string' && a.trim().toLowerCase() === b.toLowerCase()
}

function itemUrlKey(url: string): string {
  return canonicalSocialUrl(url).replace(/\/+$/, '')
}

function isHttpUrl(raw: string): boolean {
  try {
    const u = new URL(raw)
    return u.protocol === 'http:' || u.protocol === 'https:'
  } catch {
    return false
  }
}

async function handleLibraryGet(req: IncomingMessage, res: ServerResponse): Promise<boolean> {
  if (req.method !== 'GET') {
    sendJson(res, 405, { error: 'Use GET' })
    return true
  }
  const verified = await authed(req, res, 'library:read')
  if (!verified) return true
  sendJson(res, 200, await readLibraryFile())
  await verified.touch()
  return true
}

async function handleLibraryAdd(req: IncomingMessage, res: ServerResponse): Promise<boolean> {
  if (req.method !== 'POST') {
    sendJson(res, 405, { error: 'Use POST' })
    return true
  }
  const verified = await authed(req, res, 'library:add')
  if (!verified) return true
  let body: Record<string, unknown>
  try {
    body = JSON.parse(await readRequestBody(req)) as Record<string, unknown>
  } catch {
    sendJson(res, 400, { error: 'Send JSON with url and name.' })
    return true
  }
  const url = typeof body.url === 'string' ? body.url.trim() : ''
  const name = typeof body.name === 'string' ? body.name.trim() : ''
  if (!url || !isHttpUrl(url)) {
    sendJson(res, 400, { error: 'A valid http(s) video URL is required.' })
    return true
  }
  if (!name) {
    sendJson(res, 400, { error: 'A name for the video is required.' })
    return true
  }
  const collectionName =
    typeof body.collection === 'string' && body.collection.trim()
      ? body.collection.trim().slice(0, 80)
      : 'My references'
  const keywords = Array.isArray(body.keywords)
    ? body.keywords.filter((k): k is string => typeof k === 'string' && k.trim().length > 0).slice(0, 12)
    : []

  const canonical = canonicalSocialUrl(url)
  const key = itemUrlKey(canonical)
  const library = await readLibraryFile()
  // One-time backfill: connection-filed items never got a createdAt stamp,
  // so they sink to the bottom of "last added" sorts. Stamp the missing ones
  // now; afterwards this is a no-op because every item carries createdAt.
  const now = new Date().toISOString()
  for (const col of library.collections as Array<{ items?: Array<Record<string, unknown>> }>) {
    for (const item of col.items ?? []) {
      if (item && typeof item === 'object' && item.addedVia === 'muse-connection' && !item.createdAt) {
        item.createdAt = now
      }
    }
  }
  for (const col of library.collections as Array<{ items?: Array<{ url?: string }> }>) {
    for (const item of col.items ?? []) {
      if (typeof item.url === 'string' && itemUrlKey(item.url) === key) {
        sendJson(res, 409, { error: 'That video is already in the library.', url: item.url })
        return true
      }
    }
  }

  const platform = socialPlatform(canonical)
  const item = {
    id: `muse_${randomBytes(8).toString('hex')}`,
    url: canonical,
    name: name.slice(0, 120),
    ...(platform ? { kind: platform } : {}),
    ...(keywords.length > 0 ? { keywords } : {}),
    addedVia: 'muse-connection',
    createdAt: now,
  }

  const collections = library.collections as Array<{
    id?: string
    name: string
    items: unknown[]
  }>
  const target =
    collections.find((c) => c.name.trim().toLowerCase() === collectionName.toLowerCase()) ?? null
  const nextCollections = target
    ? collections.map((c) => (c === target ? { ...c, items: [...c.items, item] } : c))
    : [
        ...collections,
        { id: `col_muse_${randomBytes(6).toString('hex')}`, name: collectionName, items: [item] },
      ]

  await writeLibraryFile({ ...library, collections: nextCollections })
  await verified.touch()
  sendJson(res, 201, { item, collection: collectionName })
  return true
}

type AthleteSummary = {
  id: string
  name: string
  firstName?: string
  role?: string
  skillGoals?: Array<{ label?: string; setAt?: string }>
}

async function handleProgress(req: IncomingMessage, res: ServerResponse, path: string): Promise<boolean> {
  if (req.method !== 'GET') {
    sendJson(res, 405, { error: 'Use GET' })
    return true
  }
  const verified = await authed(req, res, 'progress:read')
  if (!verified) return true
  const athleteId = decodeURIComponent(path.slice('/api/muse/progress/'.length)).trim()
  if (!athleteId) {
    sendJson(res, 400, { error: 'An athlete id is required.' })
    return true
  }
  if (!museKeyMayReadAthlete(verified.key, athleteId)) {
    sendJson(res, 403, { error: 'This key may only read its own athlete.' })
    return true
  }
  const roster = await readRosterFile()
  const athletes = (Array.isArray(roster.athletes) ? roster.athletes : []) as AthleteSummary[]
  const athlete = athletes.find((a) => a && a.id === athleteId)
  if (!athlete) {
    sendJson(res, 404, { error: 'Athlete not found.' })
    return true
  }
  // Coach-created keys only see athletes their coach works with.
  const creator = await keyCreator(verified.key)
  if (!creator.privileged && !(await coachMayTouchAthlete(creator, athlete as unknown as Record<string, unknown>))) {
    sendJson(res, 403, { error: 'This key may not read that athlete.' })
    return true
  }

  const cutoff = Date.now() - WINDOW_DAYS * 86400000
  const logs = (Array.isArray(roster.homeworkLogs) ? roster.homeworkLogs : []).filter(
    (row): row is Record<string, unknown> => {
      if (!row || typeof row !== 'object') return false
      const l = row as Record<string, unknown>
      if (l.athleteId !== athleteId) return false
      const t = typeof l.date === 'string' ? Date.parse(l.date) : NaN
      return Number.isFinite(t) && t >= cutoff
    },
  )
  const recentLogs = logs
    .slice()
    .sort((a, b) => String(b.date ?? '').localeCompare(String(a.date ?? '')))
    .slice(0, 10)
    .map((l) => ({
      date: l.date,
      shapeId: l.shapeId,
      totalHoldSeconds: l.totalHoldSeconds,
      sourceLabel: l.sourceLabel,
    }))

  const taskProgress = (roster.taskProgress ?? {}) as Record<string, unknown>
  const mine = taskProgress[athleteId] as { completions?: Record<string, number> } | undefined
  const completions = mine && typeof mine.completions === 'object' ? mine.completions : {}
  const completedTasks = Object.entries(completions).filter(([, n]) => Number(n) > 0)

  const goal = (athlete.skillGoals ?? [])
    .filter((g) => g && g.label)
    .sort((a, b) => String(b.setAt ?? '').localeCompare(String(a.setAt ?? '')))[0]

  let latestWin: { caption?: string; createdAt?: string } | null = null
  try {
    const feed = await readFeedFile()
    const posts = Array.isArray(feed.posts) ? feed.posts : []
    const mine = posts
      .filter(
        (p) =>
          Array.isArray(p.channels) &&
          p.channels.includes('wins') &&
          Array.isArray(p.taggedIds) &&
          p.taggedIds.includes(athleteId),
      )
      .sort((a, b) => String(b.createdAt ?? '').localeCompare(String(a.createdAt ?? '')))
    if (mine[0]) latestWin = { caption: mine[0].caption, createdAt: mine[0].createdAt }
  } catch {
    /* wins are a bonus; never fail progress over them */
  }

  await verified.touch()
  sendJson(res, 200, {
    athlete: {
      id: athlete.id,
      name: athlete.name,
      currentGoal: goal?.label ?? null,
    },
    windowDays: WINDOW_DAYS,
    logCount: logs.length,
    recentLogs,
    curriculum: {
      tasksWithCompletions: completedTasks.length,
      totalCompletions: completedTasks.reduce((sum, [, n]) => sum + Number(n), 0),
    },
    latestWin,
  })
  return true
}

async function handlePhilosophy(req: IncomingMessage, res: ServerResponse): Promise<boolean> {
  if (req.method !== 'GET') {
    sendJson(res, 405, { error: 'Use GET' })
    return true
  }
  const verified = await authed(req, res, 'philosophy:read')
  if (!verified) return true
  const file = await readCoachInterviewFile()
  await verified.touch()
  sendJson(res, 200, { updatedAt: file.updatedAt, answers: file.answers })
  return true
}

/* ------------------------------------------------------------------ */
/* Coach endpoints — single-item writes on the gym's shared content.      */
/* ------------------------------------------------------------------ */

async function handleCoachShapes(req: IncomingMessage, res: ServerResponse): Promise<boolean> {
  if (req.method !== 'POST') {
    sendJson(res, 405, { error: 'Use POST' })
    return true
  }
  const verified = await authed(req, res, 'coach-shapes:write')
  if (!verified) return true
  const body = await readJsonBody(req)
  if (!body) {
    sendJson(res, 400, { error: 'Send JSON with a name for the shape.' })
    return true
  }
  const name = textField(body, 'name', 120)
  if (!name) {
    sendJson(res, 400, { error: 'A name for the shape is required.' })
    return true
  }
  const creator = await keyCreator(verified.key)
  const file = await readCoachContentFile()
  const shapes = (file.shapes ?? []) as Array<Record<string, unknown>>
  if (shapes.some((s) => sameName(s.name, name))) {
    sendJson(res, 409, { error: 'A coach shape with that name already exists.' })
    return true
  }
  const mediaUrl = textField(body, 'mediaUrl', 500)
  const now = new Date().toISOString()
  const shape = {
    id: `mcs_${randomBytes(8).toString('hex')}`,
    coachId: creator.rosterProfileId ?? creator.accountId ?? 'muse',
    coachName: creator.displayName,
    name,
    description: textField(body, 'description', 2000),
    bodyPosition: textField(body, 'bodyPosition', 200),
    progressions: [],
    media:
      mediaUrl && isHttpUrl(mediaUrl)
        ? [{ id: `mcsm_${randomBytes(6).toString('hex')}`, kind: 'video', src: mediaUrl }]
        : [],
    createdAt: now,
    updatedAt: now,
    addedVia: 'muse-connection',
    addedByAccountId: creator.accountId,
  }
  await writeCoachContentFile({ ...file, shapes: [...shapes, shape] })
  await verified.touch()
  sendJson(res, 201, { shape })
  return true
}

async function handleRosterAdd(req: IncomingMessage, res: ServerResponse): Promise<boolean> {
  if (req.method !== 'POST') {
    sendJson(res, 405, { error: 'Use POST' })
    return true
  }
  const verified = await authed(req, res, 'roster:write')
  if (!verified) return true
  const body = await readJsonBody(req)
  if (!body) {
    sendJson(res, 400, { error: 'Send JSON with a name for the athlete.' })
    return true
  }
  const name = textField(body, 'name', 120)
  if (!name) {
    sendJson(res, 400, { error: 'A name for the athlete is required.' })
    return true
  }
  const creator = await keyCreator(verified.key)
  const coachId = creator.rosterProfileId ?? creator.accountId ?? 'muse'
  const roster = await readRosterFile()
  const athletes = (Array.isArray(roster.athletes) ? roster.athletes : []) as Array<
    Record<string, unknown>
  >
  const existing = athletes.find((a) => sameName(a.name, name))
  if (existing) {
    sendJson(res, 409, { error: 'That athlete is already on the roster.', id: existing.id })
    return true
  }
  let firstName = textField(body, 'firstName', 60)
  let lastName = textField(body, 'lastName', 60)
  if (!firstName) {
    const parts = name.split(/\s+/)
    firstName = parts[0] ?? name
    if (!lastName && parts.length > 1) lastName = parts.slice(1).join(' ')
  }
  const now = new Date().toISOString()
  const athlete = {
    id: `ath_muse_${randomBytes(8).toString('hex')}`,
    name,
    firstName,
    lastName,
    role: 'athlete',
    createdAt: now,
    updatedAt: now,
    createdByCoachId: coachId,
    worksWithCoachIds: [coachId],
    needsOnboarding: true,
    profilePublic: false,
    addedVia: 'muse-connection',
    ...(textField(body, 'email', 120) ? { email: textField(body, 'email', 120) } : {}),
    ...(textField(body, 'phone', 40) ? { phone: textField(body, 'phone', 40) } : {}),
    ...(textField(body, 'notes', 2000) ? { notes: textField(body, 'notes', 2000) } : {}),
  }
  await writeRosterFile({ ...roster, athletes: [...athletes, athlete] })
  await verified.touch()
  sendJson(res, 201, { athlete: { id: athlete.id, name: athlete.name } })
  return true
}

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

async function handleClassesAdd(req: IncomingMessage, res: ServerResponse): Promise<boolean> {
  if (req.method !== 'POST') {
    sendJson(res, 405, { error: 'Use POST' })
    return true
  }
  const verified = await authed(req, res, 'classes:write')
  if (!verified) return true
  const body = await readJsonBody(req)
  if (!body) {
    sendJson(res, 400, { error: 'Send JSON with a name, weekday, and time.' })
    return true
  }
  const name = textField(body, 'name', 120)
  const weekday = textField(body, 'weekday', 20)
  const time = textField(body, 'time', 40)
  if (!name || !WEEKDAYS.includes(weekday) || !time) {
    sendJson(res, 400, { error: 'A name, a valid weekday, and a time are required.' })
    return true
  }
  const creator = await keyCreator(verified.key)
  const coachId = creator.rosterProfileId ?? creator.accountId ?? 'muse'
  const file = await readCoachClassesFile()
  const offerings = (file.offerings ?? []) as Array<Record<string, unknown>>
  if (offerings.some((o) => sameName(o.name, name) && o.weekday === weekday && o.time === time)) {
    sendJson(res, 409, { error: 'That class is already on the schedule.' })
    return true
  }
  const rosterIds = Array.isArray(body.rosterIds)
    ? body.rosterIds.filter((x): x is string => typeof x === 'string' && x.length > 0).slice(0, 200)
    : []
  const now = new Date().toISOString()
  const offering = {
    id: `cls_muse_${randomBytes(8).toString('hex')}`,
    coachId,
    coachIds: [coachId],
    name,
    weekday,
    time,
    rosterIds,
    createdAt: now,
    updatedAt: now,
    addedVia: 'muse-connection',
  }
  await writeCoachClassesFile({ ...file, offerings: [...offerings, offering] })
  await verified.touch()
  sendJson(res, 201, { class: offering })
  return true
}

async function handleAthleteNotes(req: IncomingMessage, res: ServerResponse): Promise<boolean> {
  if (req.method !== 'POST') {
    sendJson(res, 405, { error: 'Use POST' })
    return true
  }
  const verified = await authed(req, res, 'athlete-notes:write')
  if (!verified) return true
  const body = await readJsonBody(req)
  if (!body) {
    sendJson(res, 400, { error: 'Send JSON with an athleteId and note text.' })
    return true
  }
  const athleteId = textField(body, 'athleteId', 120)
  const text = textField(body, 'text', 2000)
  if (!athleteId || !text) {
    sendJson(res, 400, { error: 'An athleteId and note text are required.' })
    return true
  }
  const audience = body.audience === 'athlete' ? 'athlete' : 'coach'
  const creator = await keyCreator(verified.key)
  const roster = await readRosterFile()
  const athletes = (Array.isArray(roster.athletes) ? roster.athletes : []) as Array<
    Record<string, unknown>
  >
  const athlete = athletes.find((a) => a.id === athleteId)
  if (!athlete) {
    sendJson(res, 404, { error: 'Athlete not found.' })
    return true
  }
  if (!(await coachMayTouchAthlete(creator, athlete))) {
    sendJson(res, 403, { error: 'This key may not add notes for that athlete.' })
    return true
  }
  const now = new Date().toISOString()
  const note = {
    id: `acn_muse_${randomBytes(8).toString('hex')}`,
    authorId: creator.rosterProfileId ?? creator.accountId ?? 'muse',
    authorName: creator.displayName,
    text,
    createdAt: now,
    audience,
    ...(textField(body, 'topicLabel', 120) ? { topicLabel: textField(body, 'topicLabel', 120) } : {}),
    addedVia: 'muse-connection',
  }
  const notes = Array.isArray(athlete.coachNotes) ? athlete.coachNotes : []
  const next = athletes.map((a) =>
    a.id === athleteId ? { ...a, coachNotes: [...notes, note], updatedAt: now } : a,
  )
  await writeRosterFile({ ...roster, athletes: next })
  await verified.touch()
  sendJson(res, 201, { note: { id: note.id, athleteId, audience, createdAt: now } })
  return true
}

const FEED_CHANNELS = ['gym', 'wins', 'passes'] as const

async function handleStories(req: IncomingMessage, res: ServerResponse): Promise<boolean> {
  if (req.method !== 'POST') {
    sendJson(res, 405, { error: 'Use POST' })
    return true
  }
  const verified = await authed(req, res, 'stories:write')
  if (!verified) return true
  const body = await readJsonBody(req)
  if (!body) {
    sendJson(res, 400, { error: 'Send JSON with a caption.' })
    return true
  }
  const caption = textField(body, 'caption', 800)
  if (!caption) {
    sendJson(res, 400, { error: 'A caption is required.' })
    return true
  }
  const creator = await keyCreator(verified.key)
  const channels = Array.isArray(body.channels)
    ? body.channels.filter((c): c is (typeof FEED_CHANNELS)[number] =>
        typeof c === 'string' && (FEED_CHANNELS as readonly string[]).includes(c),
      )
    : []
  const taggedIds = Array.isArray(body.taggedIds)
    ? body.taggedIds.filter((x): x is string => typeof x === 'string' && x.length > 0).slice(0, 24)
    : []
  const post = await addTextFeedPost({
    id: `mfp_${randomBytes(8).toString('hex')}`,
    authorId: creator.rosterProfileId ?? creator.accountId ?? 'muse',
    caption,
    taggedIds,
    channels: channels.length > 0 ? channels : undefined,
    sharedByName: `${creator.displayName} via Muse`,
  })
  if (!post) {
    sendJson(res, 400, { error: 'Could not post that.' })
    return true
  }
  await verified.touch()
  sendJson(res, 201, { post: { id: post.id, caption: post.caption, channels: post.channels } })
  return true
}

async function handleDrills(req: IncomingMessage, res: ServerResponse): Promise<boolean> {
  if (req.method !== 'POST') {
    sendJson(res, 405, { error: 'Use POST' })
    return true
  }
  const verified = await authed(req, res, 'drills:write')
  if (!verified) return true
  const body = await readJsonBody(req)
  if (!body) {
    sendJson(res, 400, { error: 'Send JSON with a title for the drill.' })
    return true
  }
  const title = textField(body, 'title', 120)
  if (!title) {
    sendJson(res, 400, { error: 'A title for the drill is required.' })
    return true
  }
  const creator = await keyCreator(verified.key)
  const file = await readCoachContentFile()
  const drills = (file.drills ?? []) as Array<Record<string, unknown>>
  if (drills.some((d) => sameName(d.title, title))) {
    sendJson(res, 409, { error: 'A drill with that title already exists.' })
    return true
  }
  const src = textField(body, 'src', 500)
  const now = new Date().toISOString()
  const drill = {
    id: `mdr_${randomBytes(8).toString('hex')}`,
    title,
    notes: textField(body, 'notes', 2000),
    src: src && isHttpUrl(src) ? src : '',
    ...(textField(body, 'shapeId', 120) ? { shapeId: textField(body, 'shapeId', 120) } : {}),
    createdAt: now,
    updatedAt: now,
    addedVia: 'muse-connection',
    addedByAccountId: creator.accountId,
  }
  await writeCoachContentFile({ ...file, drills: [...drills, drill] })
  await verified.touch()
  sendJson(res, 201, { drill })
  return true
}

async function handleSkillMapsGet(req: IncomingMessage, res: ServerResponse): Promise<boolean> {
  if (req.method !== 'GET') {
    sendJson(res, 405, { error: 'Use GET' })
    return true
  }
  const verified = await authed(req, res, 'skill-maps:write')
  if (!verified) return true
  const file = await readSkillPathsFile()
  await verified.touch()
  sendJson(res, 200, { skills: file.skills })
  return true
}

async function handleSkillMapsPost(req: IncomingMessage, res: ServerResponse): Promise<boolean> {
  if (req.method !== 'POST') {
    sendJson(res, 405, { error: 'Use POST' })
    return true
  }
  const verified = await authed(req, res, 'skill-maps:write')
  if (!verified) return true
  const body = await readJsonBody(req)
  if (!body) {
    sendJson(res, 400, { error: 'Send JSON with a label for the skill map.' })
    return true
  }
  const label = textField(body, 'label', 120)
  if (!label) {
    sendJson(res, 400, { error: 'A label for the skill map is required.' })
    return true
  }
  const creator = await keyCreator(verified.key)
  const file = await readSkillPathsFile()
  const skills = (file.skills ?? []) as Array<Record<string, unknown>>
  const id = textField(body, 'id', 120)
  const now = new Date().toISOString()
  const patch = {
    ...(textField(body, 'description', 2000)
      ? { description: textField(body, 'description', 2000) }
      : {}),
    ...(textField(body, 'track', 80) ? { track: textField(body, 'track', 80) } : {}),
  }
  if (id) {
    const existing = skills.find((s) => s.id === id)
    if (!existing) {
      sendJson(res, 404, { error: 'No skill map with that id.' })
      return true
    }
    const updated = { ...existing, label, ...patch, updatedAt: now }
    const next = skills.map((s) => (s.id === id ? updated : s))
    await writeSkillPathsFile({ ...file, skills: next })
    await verified.touch()
    sendJson(res, 200, { map: updated, updated: true })
    return true
  }
  if (skills.some((s) => sameName(s.label, label))) {
    sendJson(res, 409, { error: 'A skill map with that label already exists.' })
    return true
  }
  const map = {
    id: `msm_${randomBytes(8).toString('hex')}`,
    label,
    ...patch,
    createdAt: now,
    updatedAt: now,
    addedVia: 'muse-connection',
    addedByAccountId: creator.accountId,
  }
  await writeSkillPathsFile({ ...file, skills: [...skills, map] })
  await verified.touch()
  sendJson(res, 201, { map })
  return true
}

/* ------------------------------------------------------------------ */
/* Chalkboards — list, read, add items, and tombstone deletes.            */
/* All writes go through writeChalkboardsFile so removedBoardIds /        */
/* removedItemIds tombstones merge monotonically and deletes stay gone.   */
/* ------------------------------------------------------------------ */

type ChalkboardRow = Record<string, unknown>

function chalkboardBoards(file: { boards: unknown[] }): ChalkboardRow[] {
  return (Array.isArray(file.boards) ? file.boards : []).filter(
    (b): b is ChalkboardRow => !!b && typeof b === 'object',
  )
}

function findBoard(boards: ChalkboardRow[], id: string): ChalkboardRow | null {
  return boards.find((b) => b.id === id) ?? null
}

function boardItems(board: ChalkboardRow): ChalkboardRow[] {
  return (Array.isArray(board.items) ? board.items : []).filter(
    (i): i is ChalkboardRow => !!i && typeof i === 'object',
  )
}

function boardSummary(board: ChalkboardRow): Record<string, unknown> {
  return {
    id: board.id,
    name: board.name,
    offeringId: board.offeringId,
    scope: board.scope ?? null,
    active: board.active === true,
    itemCount: boardItems(board).length,
    createdAt: board.createdAt ?? null,
    updatedAt: board.updatedAt ?? null,
  }
}

async function handleChalkboardsList(req: IncomingMessage, res: ServerResponse): Promise<boolean> {
  if (req.method !== 'GET') {
    sendJson(res, 405, { error: 'Use GET' })
    return true
  }
  const verified = await authed(req, res, 'chalkboards:read')
  if (!verified) return true
  const file = await readChalkboardsFile()
  const boards = chalkboardBoards(file).map(boardSummary)
  sendJson(res, 200, { boards })
  await verified.touch()
  return true
}

async function handleChalkboardDetail(
  req: IncomingMessage,
  res: ServerResponse,
  boardId: string,
): Promise<boolean> {
  if (req.method !== 'GET') {
    sendJson(res, 405, { error: 'Use GET' })
    return true
  }
  const verified = await authed(req, res, 'chalkboards:read')
  if (!verified) return true
  const file = await readChalkboardsFile()
  const board = findBoard(chalkboardBoards(file), boardId)
  if (!board) {
    sendJson(res, 404, { error: 'Chalkboard not found.' })
    return true
  }
  sendJson(res, 200, { board: { ...board, items: boardItems(board) } })
  await verified.touch()
  return true
}

const CHALKBOARD_ITEM_KINDS = [
  'clip',
  'loop',
  'still',
  'ig-still',
  'drill',
  'drill-list',
  'collage',
] as const

async function handleChalkboardAddItem(
  req: IncomingMessage,
  res: ServerResponse,
  boardId: string,
): Promise<boolean> {
  if (req.method !== 'POST') {
    sendJson(res, 405, { error: 'Use POST' })
    return true
  }
  const verified = await authed(req, res, 'chalkboards:write')
  if (!verified) return true
  const body = await readJsonBody(req)
  if (!body) {
    sendJson(res, 400, { error: 'Send JSON with a kind and a title for the item.' })
    return true
  }
  const kind = textField(body, 'kind', 40)
  if (!(CHALKBOARD_ITEM_KINDS as readonly string[]).includes(kind)) {
    sendJson(res, 400, {
      error: `A valid kind is required: ${CHALKBOARD_ITEM_KINDS.join(', ')}.`,
    })
    return true
  }
  const title = textField(body, 'title', 160)
  if (!title) {
    sendJson(res, 400, { error: 'A title for the item is required.' })
    return true
  }
  const file = await readChalkboardsFile()
  const boards = chalkboardBoards(file)
  const board = findBoard(boards, boardId)
  if (!board) {
    sendJson(res, 404, { error: 'Chalkboard not found.' })
    return true
  }
  const creator = await keyCreator(verified.key)
  const url = textField(body, 'url', 1000)
  const drillIds = Array.isArray(body.drillIds)
    ? body.drillIds.filter((x): x is string => typeof x === 'string' && x.length > 0).slice(0, 50)
    : []
  const numField = (name: string): number | null => {
    const v = body[name]
    return typeof v === 'number' && Number.isFinite(v) ? v : null
  }
  const loopA = numField('loopA')
  const loopB = numField('loopB')
  const now = new Date().toISOString()
  const item: ChalkboardRow = {
    id: `mcb_${randomBytes(8).toString('hex')}`,
    offeringId: board.offeringId,
    boardId: board.id,
    kind,
    title,
    ...(url && isHttpUrl(url) ? { url } : {}),
    ...(loopA != null ? { loopA } : {}),
    ...(loopB != null ? { loopB } : {}),
    ...(textField(body, 'stillId', 120) ? { stillId: textField(body, 'stillId', 120) } : {}),
    ...(textField(body, 'shapeId', 120) ? { shapeId: textField(body, 'shapeId', 120) } : {}),
    ...(textField(body, 'photoSrc', 1000) ? { photoSrc: textField(body, 'photoSrc', 1000) } : {}),
    ...(textField(body, 'drillId', 120) ? { drillId: textField(body, 'drillId', 120) } : {}),
    ...(drillIds.length > 0 ? { drillIds } : {}),
    ...(textField(body, 'collageId', 120) ? { collageId: textField(body, 'collageId', 120) } : {}),
    ...(textField(body, 'comment', 2000) ? { comment: textField(body, 'comment', 2000) } : {}),
    pinned: body.pinned === true,
    createdById: creator.rosterProfileId ?? creator.accountId ?? 'muse',
    createdByName: creator.displayName,
    createdAt: now,
    addedVia: 'muse-connection',
  }
  const nextBoards = boards.map((b) =>
    b.id === boardId ? { ...b, items: [...boardItems(b), item], updatedAt: now } : b,
  )
  await writeChalkboardsFile({ ...file, boards: nextBoards })
  await verified.touch()
  sendJson(res, 201, { item: { id: item.id, boardId, kind, title } })
  return true
}

async function handleChalkboardDelete(
  req: IncomingMessage,
  res: ServerResponse,
  boardId: string,
): Promise<boolean> {
  if (req.method !== 'DELETE') {
    sendJson(res, 405, { error: 'Use DELETE' })
    return true
  }
  const verified = await authed(req, res, 'chalkboards:write')
  if (!verified) return true
  const file = await readChalkboardsFile()
  const boards = chalkboardBoards(file)
  if (!findBoard(boards, boardId)) {
    sendJson(res, 404, { error: 'Chalkboard not found.' })
    return true
  }
  // Tombstone, never hard-delete: writeChalkboardsFile merges the tombstone
  // list monotonically and filters the board on every write and read.
  await writeChalkboardsFile({
    ...file,
    removedBoardIds: [...(file.removedBoardIds ?? []), boardId],
  })
  await verified.touch()
  sendJson(res, 200, { deleted: boardId })
  return true
}

async function handleChalkboardDeleteItem(
  req: IncomingMessage,
  res: ServerResponse,
  boardId: string,
  itemId: string,
): Promise<boolean> {
  if (req.method !== 'DELETE') {
    sendJson(res, 405, { error: 'Use DELETE' })
    return true
  }
  const verified = await authed(req, res, 'chalkboards:write')
  if (!verified) return true
  const file = await readChalkboardsFile()
  const boards = chalkboardBoards(file)
  const board = findBoard(boards, boardId)
  if (!board) {
    sendJson(res, 404, { error: 'Chalkboard not found.' })
    return true
  }
  if (!boardItems(board).some((i) => i.id === itemId)) {
    sendJson(res, 404, { error: 'Item not found on that chalkboard.' })
    return true
  }
  // Tombstone, never hard-delete: the item id joins removedItemIds, which
  // writeChalkboardsFile merges monotonically and honors on write and read.
  await writeChalkboardsFile({
    ...file,
    removedItemIds: [...(file.removedItemIds ?? []), itemId],
  })
  await verified.touch()
  sendJson(res, 200, { deleted: itemId, boardId })
  return true
}

/**
 * Entry point from handleShapeLabApi. Returns true when the request was
 * handled here (including auth failures).
 */
export async function handleMuseApi(  req: IncomingMessage,
  res: ServerResponse,
  path: string,
): Promise<boolean> {
  if (path === '/api/muse/library') return handleLibraryGet(req, res)
  if (path === '/api/muse/library/items') return handleLibraryAdd(req, res)
  if (path === '/api/muse/philosophy') return handlePhilosophy(req, res)
  if (path === '/api/muse/coach-shapes') return handleCoachShapes(req, res)
  if (path === '/api/muse/roster/athletes') return handleRosterAdd(req, res)
  if (path === '/api/muse/classes') return handleClassesAdd(req, res)
  if (path === '/api/muse/athlete-notes') return handleAthleteNotes(req, res)
  if (path === '/api/muse/stories') return handleStories(req, res)
  if (path === '/api/muse/drills') return handleDrills(req, res)
  if (path === '/api/muse/skill-maps') {
    return req.method === 'GET' ? handleSkillMapsGet(req, res) : handleSkillMapsPost(req, res)
  }
  if (path === '/api/muse/chalkboards') return handleChalkboardsList(req, res)
  const chalkboardItemsMatch = /^\/api\/muse\/chalkboards\/([^/]+)\/items$/.exec(path)
  if (chalkboardItemsMatch) {
    return handleChalkboardAddItem(req, res, decodeURIComponent(chalkboardItemsMatch[1]))
  }
  const chalkboardItemMatch = /^\/api\/muse\/chalkboards\/([^/]+)\/items\/([^/]+)$/.exec(path)
  if (chalkboardItemMatch) {
    return handleChalkboardDeleteItem(
      req,
      res,
      decodeURIComponent(chalkboardItemMatch[1]),
      decodeURIComponent(chalkboardItemMatch[2]),
    )
  }
  const chalkboardMatch = /^\/api\/muse\/chalkboards\/([^/]+)$/.exec(path)
  if (chalkboardMatch) {
    const boardId = decodeURIComponent(chalkboardMatch[1])
    if (req.method === 'GET') return handleChalkboardDetail(req, res, boardId)
    if (req.method === 'DELETE') return handleChalkboardDelete(req, res, boardId)
    sendJson(res, 405, { error: 'Use GET or DELETE' })
    return true
  }
  if (path.startsWith('/api/muse/progress/')) return handleProgress(req, res, path)
  return false
}
