/**
 * Public shareable skill cards (build 682).
 *
 * GET /api/share/card?id=<guideId|skillId> — NO AUTH REQUIRED.
 *
 * Returns only public-safe skill-card content: the card's guide prose
 * (Ryan's notes), its reference videos with pre-resolved playback URLs,
 * and nothing else. No athlete data, no roster, no notes, no edit paths.
 *
 * Wired into handleShapeLabApi BEFORE the auth gate in server/apiHandler.ts.
 * Social (Instagram/TikTok/Facebook) URLs are resolved server-side to direct
 * playable file URLs so the public page never needs an authenticated API.
 */

import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { UNIFIED_SKILL_SEED } from '../src/config/unifiedSkillSeed.ts'
import {
  FEATURED_PROOF,
  TECHNIQUE_EVIDENCE,
  type ProofVideo,
} from '../src/config/techniqueEvidence.ts'
import {
  isResolvableVideoUrl,
  resolveSocialSlides,
  sendJson,
} from './instagramResolve.ts'
import {
  isFacebookUrl,
  isInstagramUrl,
  isTikTokUrl,
  youtubeEmbedSrc,
} from '../src/lib/socialUrls.ts'

export type ShareVideo = {
  /** Original page or file URL. */
  url: string
  who: string
  watchFor: string
  platform: 'local' | 'youtube' | 'instagram' | 'tiktok' | 'facebook' | 'link'
  /** Direct playable URL (file or YouTube embed src). Null when unresolvable. */
  playUrl: string | null
  startAt?: number
  endAt?: number
  pinned: boolean
}

export type ShareCard = {
  id: string
  guideId: string | null
  name: string
  track: string
  guideNeeds: string[]
  canBend: string[]
  ask: string | null
  ryanNote: string | null
  noteBlocks: { kind: 'quote' | 'ryan'; text: string; source?: string }[]
  featured: ShareVideo | null
  videos: ShareVideo[]
}

async function readJsonFile<T>(name: string): Promise<T | null> {
  try {
    const raw = await readFile(join(process.cwd(), 'data', name), 'utf8')
    return JSON.parse(raw) as T
  } catch {
    return null
  }
}

function isLocalFile(url: string): boolean {
  return /\.(mp4|mov|webm)(\?|#|$)/i.test(url)
}

/** Cache of social URL -> direct playable file URL, so repeat views don't hammer Instagram. */
const resolveCache = new Map<string, { at: number; playUrl: string | null }>()
const RESOLVE_TTL_MS = 6 * 60 * 60 * 1000

async function resolvePlayableUrl(url: string): Promise<string | null> {
  const hit = resolveCache.get(url)
  if (hit && Date.now() - hit.at < RESOLVE_TTL_MS) return hit.playUrl
  let playUrl: string | null = null
  try {
    const resolved = await resolveSocialSlides(url)
    const firstVideo =
      resolved?.slides.find((s) => s.kind === 'video') ?? resolved?.slides[0]
    playUrl = firstVideo?.url ?? null
  } catch {
    playUrl = null
  }
  resolveCache.set(url, { at: Date.now(), playUrl })
  return playUrl
}

function detectPlatform(url: string): ShareVideo['platform'] {
  if (isLocalFile(url)) return 'local'
  if (youtubeEmbedSrc(url)) return 'youtube'
  if (isInstagramUrl(url)) return 'instagram'
  if (isTikTokUrl(url)) return 'tiktok'
  if (isFacebookUrl(url)) return 'facebook'
  return 'link'
}

async function toShareVideo(v: ProofVideo, pinned: boolean): Promise<ShareVideo> {
  const platform = detectPlatform(v.url)
  let playUrl: string | null = null
  if (platform === 'local') {
    playUrl = v.url
  } else if (platform === 'youtube') {
    playUrl = youtubeEmbedSrc(v.url)
  } else if (
    (platform === 'instagram' || platform === 'tiktok' || platform === 'facebook') &&
    isResolvableVideoUrl(v.url)
  ) {
    playUrl = await resolvePlayableUrl(v.url)
  }
  const out: ShareVideo = {
    url: v.url,
    who: v.who,
    watchFor: v.watchFor,
    platform,
    playUrl,
    pinned,
  }
  if (typeof v.startAt === 'number') out.startAt = v.startAt
  if (typeof v.endAt === 'number') out.endAt = v.endAt
  return out
}

export async function handleShareCard(
  req: IncomingMessage,
  res: ServerResponse,
  url: URL,
): Promise<boolean> {
  if (req.method !== 'GET') {
    sendJson(res, 405, { error: 'Use GET' })
    return true
  }
  const id = (url.searchParams.get('id') ?? '').trim()
  if (!id) {
    sendJson(res, 400, { error: 'Missing card id' })
    return true
  }
  const skill =
    UNIFIED_SKILL_SEED.find((s) => s.guideId === id) ??
    UNIFIED_SKILL_SEED.find((s) => s.id === id)
  if (!skill) {
    sendJson(res, 404, { error: 'No shared card with that id' })
    return true
  }

  // Ryan's latest guide prose lives in the skill-paths data file (builder edits).
  let guideNeeds = skill.guideNeeds ?? []
  let canBend = skill.canBend ?? []
  let ask = skill.ask ?? null
  let ryanNote = skill.ryanNote ?? null
  const pathsFile = await readJsonFile<{
    skills?: { id?: string; guideNeeds?: string[]; canBend?: string[]; ask?: string; ryanNote?: string }[]
  }>('skill-paths.json')
  const override = pathsFile?.skills?.find((s) => s?.id === skill.id)
  if (override) {
    if (Array.isArray(override.guideNeeds)) guideNeeds = override.guideNeeds
    if (Array.isArray(override.canBend)) canBend = override.canBend
    if (typeof override.ask === 'string') ask = override.ask || null
    if (typeof override.ryanNote === 'string') ryanNote = override.ryanNote || null
  }

  const evidenceKey = skill.guideId ?? ''
  const featuredRaw = evidenceKey ? FEATURED_PROOF[evidenceKey] : undefined
  const baseVideos = evidenceKey ? TECHNIQUE_EVIDENCE[evidenceKey] ?? [] : []
  const adminFile = await readJsonFile<Record<string, ProofVideo[]>>('skill-card-videos.json')
  const hiddenFile = await readJsonFile<Record<string, string[]>>('skill-card-hidden.json')
  const pinnedFile = await readJsonFile<Record<string, string[]>>('skill-card-pinned.json')
  const adminVideos = (evidenceKey && adminFile?.[evidenceKey]) || []
  const hidden = new Set((evidenceKey && hiddenFile?.[evidenceKey]) || [])
  const pinned = new Set(
    ((evidenceKey && pinnedFile?.[evidenceKey]) || []).filter((u) => typeof u === 'string'),
  )

  const videos = [
    ...baseVideos.filter((v) => !hidden.has(v.url) && v.url !== featuredRaw?.url),
    ...adminVideos,
  ]

  const [featured, resolvedVideos] = await Promise.all([
    featuredRaw ? toShareVideo(featuredRaw, false) : Promise.resolve(null),
    Promise.all(videos.map((v) => toShareVideo(v, pinned.has(v.url)))),
  ])
  // Pinned videos first, matching the in-app card order.
  resolvedVideos.sort((a, b) => Number(b.pinned) - Number(a.pinned))

  const card: ShareCard = {
    id: skill.id,
    guideId: skill.guideId ?? null,
    name: skill.name,
    track: skill.track,
    guideNeeds,
    canBend,
    ask,
    ryanNote,
    noteBlocks: (skill.noteBlocks ?? []).map((b) =>
      b.kind === 'quote'
        ? { kind: 'quote' as const, text: b.text, source: b.source }
        : { kind: 'ryan' as const, text: b.text },
    ),
    featured,
    videos: resolvedVideos,
  }
  res.setHeader('Cache-Control', 'public, max-age=60')
  sendJson(res, 200, card)
  return true
}
