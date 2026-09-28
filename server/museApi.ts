/**
 * Muse connection API — Bearer-token routes under /api/muse/*.
 *
 * These routes are deliberately exempt from the session gate in
 * server/auth/gate.ts: the API key IS the credential. Scopes on the key
 * decide what each caller may do. Parent-scoped keys carry an athleteId
 * and can only read that athlete's progress.
 *
 * Key management (/api/muse/keys*) stays session-gated and admin-only in
 * server/apiHandler.ts — it is not handled here.
 */

import type { IncomingMessage, ServerResponse } from 'node:http'
import { randomBytes } from 'node:crypto'
import { sendJson } from './instagramResolve.ts'
import { tooMany } from './auth/rateLimit.ts'
import {
  museKeyHasScope,
  museKeyMayReadAthlete,
  verifyMuseKey,
  type VerifiedMuseKey,
} from './auth/museKeys.ts'
import { readLibraryFile, readRequestBody, writeLibraryFile } from './libraryStore.ts'
import { canonicalSocialUrl, socialPlatform } from '../src/lib/socialUrls.ts'
import { readCoachInterviewFile } from './coachInterviewStore.ts'
import { readRosterFile } from './rosterStore.ts'
import { readFeedFile } from './feedStore.ts'

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
  scope: 'library:read' | 'library:add' | 'progress:read' | 'philosophy:read',
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

/**
 * Entry point from handleShapeLabApi. Returns true when the request was
 * handled here (including auth failures).
 */
export async function handleMuseApi(
  req: IncomingMessage,
  res: ServerResponse,
  path: string,
): Promise<boolean> {
  if (path === '/api/muse/library') return handleLibraryGet(req, res)
  if (path === '/api/muse/library/items') return handleLibraryAdd(req, res)
  if (path === '/api/muse/philosophy') return handlePhilosophy(req, res)
  if (path.startsWith('/api/muse/progress/')) return handleProgress(req, res, path)
  return false
}
