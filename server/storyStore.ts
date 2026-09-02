/**
 * Instagram-style stories (24h) and highlights kept from those stories.
 * Blobs in data/story-blobs/; metadata in data/stories.json.
 */

import type { IncomingMessage, ServerResponse } from 'node:http'
import { readBin, readJson, writeBin, writeJson } from './persist.ts'

const META = 'data/stories.json'
const blobRel = (file: string) => `data/story-blobs/${file}`
const MAX_LIVE = 80
const MAX_HIGHLIGHTS = 40
const MAX_BYTES = 18 * 1024 * 1024
const LIFE_MS = 24 * 60 * 60 * 1000

export type DiskStory = {
  id: string
  authorId: string
  createdAt: string
  expiresAt: string
  caption: string
  mime: string
  file: string
  sizeBytes: number
  url?: string
  taggedIds?: string[]
}

export type DiskHighlight = {
  id: string
  ownerId: string
  title: string
  storyIds: string[]
  createdAt: string
  coverStoryId?: string
}

export type DiskStories = {
  kind: 'shape-lab-stories'
  version: 1
  exportedAt: string
  stories: DiskStory[]
  highlights: DiskHighlight[]
}

const EMPTY: DiskStories = {
  kind: 'shape-lab-stories',
  version: 1,
  exportedAt: '',
  stories: [],
  highlights: [],
}

function safeId(id: string): string | null {
  const s = id.trim()
  if (!s || s.length > 80) return null
  if (!/^[a-zA-Z0-9_-]+$/.test(s)) return null
  return s
}

function extForMime(mime: string): string {
  if (mime.includes('png')) return '.png'
  if (mime.includes('webp')) return '.webp'
  if (mime.includes('jpeg') || mime.includes('jpg')) return '.jpg'
  if (mime.includes('mp4')) return '.mp4'
  return '.webm'
}

function isLive(story: DiskStory, now = Date.now()): boolean {
  return new Date(story.expiresAt).getTime() > now
}

export async function readStoriesFile(): Promise<DiskStories> {
  const data = await readJson<DiskStories>(META, { ...EMPTY })
  if (!data || data.kind !== 'shape-lab-stories' || !Array.isArray(data.stories)) {
    return { ...EMPTY }
  }
  return {
    ...EMPTY,
    ...data,
    stories: data.stories.filter((s) => s && typeof s.id === 'string' && typeof s.file === 'string'),
    highlights: Array.isArray(data.highlights)
      ? data.highlights.filter((h) => h && typeof h.id === 'string' && Array.isArray(h.storyIds))
      : [],
  }
}

async function writeMeta(file: DiskStories): Promise<DiskStories> {
  const next: DiskStories = {
    kind: 'shape-lab-stories',
    version: 1,
    exportedAt: new Date().toISOString(),
    stories: file.stories.slice(0, 240),
    highlights: file.highlights.slice(0, MAX_HIGHLIGHTS),
  }
  await writeJson(META, next)
  return next
}

export function storyClientUrl(id: string): string {
  return `/api/story-file?id=${encodeURIComponent(id)}`
}

export async function storiesForClient(): Promise<{
  stories: Array<DiskStory & { url: string; live: boolean }>
  highlights: DiskHighlight[]
}> {
  const file = await readStoriesFile()
  const now = Date.now()
  const kept = new Set(file.highlights.flatMap((h) => h.storyIds))
  const stories = file.stories
    .filter((s) => isLive(s, now) || kept.has(s.id))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, MAX_LIVE + 80)
    .map((s) => ({ ...s, url: storyClientUrl(s.id), live: isLive(s, now) }))
  return { stories, highlights: file.highlights }
}

export async function addStoryFromBody(params: {
  id: string
  authorId: string
  caption?: string
  createdAt?: string
  mime: string
  buf: Buffer
  taggedIds?: string[]
}): Promise<(DiskStory & { url: string; live: boolean }) | null> {
  const id = safeId(params.id)
  const authorId = safeId(params.authorId)
  if (!id || !authorId || !params.buf.length || params.buf.length > MAX_BYTES) return null
  const mime = params.mime.includes('image/')
    ? params.mime.includes('png')
      ? 'image/png'
      : 'image/jpeg'
    : params.mime.includes('mp4')
      ? 'video/mp4'
      : 'video/webm'
  const file = `${id}${extForMime(mime)}`
  await writeBin(blobRel(file), params.buf, mime)
  const createdAt = params.createdAt || new Date().toISOString()
  const story: DiskStory = {
    id,
    authorId,
    createdAt,
    expiresAt: new Date(new Date(createdAt).getTime() + LIFE_MS).toISOString(),
    caption: (params.caption || '').trim().slice(0, 200),
    mime,
    file,
    sizeBytes: params.buf.length,
    taggedIds: (params.taggedIds ?? [])
      .map((id) => safeId(id))
      .filter((id): id is string => Boolean(id))
      .slice(0, 12),
  }
  const meta = await readStoriesFile()
  const next = await writeMeta({
    ...meta,
    stories: [story, ...meta.stories.filter((s) => s.id !== id)],
  })
  const saved = next.stories.find((s) => s.id === id) ?? story
  return { ...saved, url: storyClientUrl(id), live: true }
}

export async function addHighlight(params: {
  id: string
  ownerId: string
  title: string
  storyIds: string[]
}): Promise<DiskHighlight | null> {
  const id = safeId(params.id)
  const ownerId = safeId(params.ownerId)
  const title = params.title.trim().slice(0, 40)
  const storyIds = [...new Set(params.storyIds.map((s) => safeId(s)).filter((s): s is string => Boolean(s)))]
  if (!id || !ownerId || !title || storyIds.length === 0) return null
  const meta = await readStoriesFile()
  const known = new Set(meta.stories.map((s) => s.id))
  const kept = storyIds.filter((s) => known.has(s)).slice(0, 24)
  if (kept.length === 0) return null
  const row: DiskHighlight = {
    id,
    ownerId,
    title,
    storyIds: kept,
    createdAt: new Date().toISOString(),
    coverStoryId: kept[0],
  }
  const others = meta.highlights.filter((h) => h.id !== id && !(h.ownerId === ownerId && h.title === title))
  const existing = meta.highlights.find((h) => h.ownerId === ownerId && h.title === title)
  const merged: DiskHighlight = existing
    ? {
        ...existing,
        storyIds: [...new Set([...existing.storyIds, ...kept])].slice(0, 24),
        coverStoryId: existing.coverStoryId || kept[0],
      }
    : row
  await writeMeta({
    ...meta,
    highlights: [merged, ...others.filter((h) => h.id !== merged.id)].slice(0, MAX_HIGHLIGHTS),
  })
  return merged
}

export async function sendStoryFile(id: string, res: ServerResponse): Promise<boolean> {
  const sid = safeId(id)
  if (!sid) return false
  const found = (await readStoriesFile()).stories.find((s) => s.id === sid)
  if (!found) return false
  const buf = await readBin(blobRel(found.file))
  if (!buf) return false
  res.statusCode = 200
  res.setHeader('Content-Type', found.mime || 'video/webm')
  res.setHeader('Content-Length', String(buf.length))
  res.setHeader('Cache-Control', 'private, max-age=3600')
  res.end(buf)
  return true
}

export function readStoryRequestBuffer(
  req: IncomingMessage,
  max = MAX_BYTES,
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    let n = 0
    req.on('data', (c: Buffer) => {
      n += c.length
      if (n > max) {
        reject(new Error('That story is too large.'))
        req.destroy()
        return
      }
      chunks.push(c)
    })
    req.on('end', () => resolve(Buffer.concat(chunks)))
    req.on('error', reject)
  })
}
