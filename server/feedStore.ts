/**
 * Gym feed posts: videos, caption-only thoughts, and shared collages.
 * Blobs in data/feed-blobs/; metadata in data/feed-posts.json.
 */

import type { IncomingMessage, ServerResponse } from 'node:http'
import { cleanCollageShare, type DiskCollageShare } from './collageStore.ts'
import { readBin, readJson, removeFile, writeBin, writeJson } from './persist.ts'

const META = 'data/feed-posts.json'
const blobRel = (file: string) => `data/feed-blobs/${file}`
const MAX_POSTS = 200
const MAX_BYTES = 48 * 1024 * 1024
export const CAPTION_MAX = 800

export type DiskFeedPost = {
  id: string
  authorId: string
  caption: string
  createdAt: string
  taggedIds: string[]
  mime: string
  sizeBytes: number
  file?: string
  kind?: 'video' | 'collage' | 'text'
  collage?: DiskCollageShare
  channels?: ('gym' | 'wins' | 'passes')[]
  likes?: string[]
  /** Profile ids who high-fived the athlete(s) on this post. */
  hi5s?: string[]
  sharedById?: string
  sharedByName?: string
  reposts?: string[]
}

type FeedChannel = 'gym' | 'wins' | 'passes'

function cleanChannels(raw: unknown): FeedChannel[] {
  const list = Array.isArray(raw)
    ? raw
    : typeof raw === 'string'
      ? raw.split(',')
      : []
  const next = list
    .map((x) => (typeof x === 'string' ? x.trim() : ''))
    .filter((x): x is FeedChannel => x === 'gym' || x === 'wins' || x === 'passes')
  return [...new Set(next.length ? next : (['gym'] as const))]
}

export type DiskFeed = {
  kind: 'shape-lab-feed'
  version: 1
  exportedAt: string
  posts: DiskFeedPost[]
  removedIds?: string[]
}

const EMPTY: DiskFeed = {
  kind: 'shape-lab-feed',
  version: 1,
  exportedAt: '',
  posts: [],
  removedIds: [],
}

function safeId(id: string): string | null {
  const s = id.trim()
  if (!s || s.length > 120) return null
  if (!/^[a-zA-Z0-9_-]+$/.test(s)) return null
  return s
}

function extForMime(mime: string): string {
  if (mime.includes('mp4')) return '.mp4'
  if (mime.includes('webm')) return '.webm'
  return '.webm'
}

function isFeedPost(p: unknown): p is DiskFeedPost {
  if (!p || typeof p !== 'object') return false
  const row = p as DiskFeedPost
  if (typeof row.id !== 'string') return false
  if (row.kind === 'collage' || row.collage) return Boolean(row.collage)
  if (row.kind === 'text') return Boolean((row.caption || '').trim())
  return typeof row.file === 'string'
}

function mergePosts(existing: DiskFeedPost[], incoming: DiskFeedPost[]): DiskFeedPost[] {
  const byId = new Map<string, DiskFeedPost>()
  for (const row of [...existing, ...incoming]) {
    if (!isFeedPost(row)) continue
    const keep = byId.get(row.id)
    if (!keep) {
      byId.set(row.id, row)
      continue
    }
    const newer = (row.createdAt || '') >= (keep.createdAt || '') ? row : keep
    const older = newer === row ? keep : row
    byId.set(row.id, {
      ...older,
      ...newer,
      channels: cleanChannels([...(older.channels ?? []), ...(newer.channels ?? [])]),
      likes: [...new Set([...(older.likes ?? []), ...(newer.likes ?? [])])],
      hi5s: [...new Set([...(older.hi5s ?? []), ...(newer.hi5s ?? [])])],
      reposts: [...new Set([...(older.reposts ?? []), ...(newer.reposts ?? [])])],
      taggedIds: [...new Set([...(older.taggedIds ?? []), ...(newer.taggedIds ?? [])])],
    })
  }
  return [...byId.values()].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

export async function readFeedFile(): Promise<DiskFeed> {
  const data = await readJson<DiskFeed>(META, { ...EMPTY })
  if (!data || data.kind !== 'shape-lab-feed' || !Array.isArray(data.posts)) {
    return { ...EMPTY }
  }
  const removed = new Set(
    Array.isArray(data.removedIds) ? data.removedIds.filter((id) => typeof id === 'string') : [],
  )
  return {
    ...EMPTY,
    ...data,
    removedIds: [...removed],
    posts: data.posts.filter((p) => isFeedPost(p) && !removed.has(p.id)),
  }
}

async function writeMeta(posts: DiskFeedPost[], removedIds: string[] = []): Promise<DiskFeed> {
  const next: DiskFeed = {
    kind: 'shape-lab-feed',
    version: 1,
    exportedAt: new Date().toISOString(),
    posts: posts.slice(0, MAX_POSTS),
    removedIds: [...new Set(removedIds)].slice(-400),
  }
  await writeJson(META, next)
  return next
}

export async function postsForClient(): Promise<Array<DiskFeedPost & { url: string }>> {
  return (await readFeedFile())
    .posts.slice()
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .map((p) => ({
      ...p,
      kind:
        p.kind === 'collage' || p.collage
          ? 'collage'
          : p.kind === 'text' || (!p.file && (p.caption || '').trim())
            ? 'text'
            : 'video',
      url: p.file ? `/api/feed-file?id=${encodeURIComponent(p.id)}` : '',
    }))
}

export function readRequestBuffer(
  req: IncomingMessage,
  max = MAX_BYTES,
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    let n = 0
    req.on('data', (c: Buffer) => {
      n += c.length
      if (n > max) {
        reject(new Error('Video is too large to post.'))
        req.destroy()
        return
      }
      chunks.push(c)
    })
    req.on('end', () => resolve(Buffer.concat(chunks)))
    req.on('error', reject)
  })
}

export async function addFeedPostFromBody(params: {
  id: string
  authorId: string
  caption: string
  taggedIds: string[]
  createdAt?: string
  mime: string
  buf: Buffer
  channels?: unknown
  sharedById?: string
  sharedByName?: string
}): Promise<DiskFeedPost | null> {
  const id = safeId(params.id)
  const authorId = safeId(params.authorId)
  if (!id || !authorId || !params.buf.length || params.buf.length > MAX_BYTES) return null
  const mime = params.mime.includes('mp4') ? 'video/mp4' : 'video/webm'
  const file = `${id}${extForMime(mime)}`
  await writeBin(blobRel(file), params.buf, mime)
  const taggedIds = params.taggedIds
    .map((x) => safeId(x))
    .filter((x): x is string => Boolean(x))
    .slice(0, 24)
  const post: DiskFeedPost = {
    id,
    authorId,
    caption: (params.caption || '').trim().slice(0, CAPTION_MAX),
    createdAt: params.createdAt || new Date().toISOString(),
    taggedIds,
    mime,
    sizeBytes: params.buf.length,
    file,
    kind: 'video',
    channels: cleanChannels(params.channels),
    ...(safeId(params.sharedById || '') ? { sharedById: safeId(params.sharedById || '')! } : {}),
    ...(typeof params.sharedByName === 'string' && params.sharedByName.trim()
      ? { sharedByName: params.sharedByName.trim().slice(0, 80) }
      : {}),
  }
  const meta = await readFeedFile()
  if ((meta.removedIds ?? []).includes(id)) return post
  const kept = mergePosts(meta.posts, [post])
  const pruned = kept.slice(MAX_POSTS)
  for (const drop of pruned) {
    if (!drop.file) continue
    await removeFile(blobRel(drop.file))
  }
  await writeMeta(kept.slice(0, MAX_POSTS), meta.removedIds)
  return post
}

export async function deleteFeedPost(
  id: string,
  actorId?: string,
  actorIsAdmin?: boolean,
): Promise<boolean> {
  const sid = safeId(id)
  if (!sid) return false
  const meta = await readFeedFile()
  const found = meta.posts.find((p) => p.id === sid)
  if (!found) return false
  if (!actorIsAdmin && actorId && found.authorId !== actorId) return false
  if (found.file) await removeFile(blobRel(found.file))
  await writeMeta(
    meta.posts.filter((p) => p.id !== sid),
    [...(meta.removedIds ?? []), sid],
  )
  return true
}

export async function addCollageFeedPost(params: {
  id: string
  authorId: string
  caption: string
  taggedIds: string[]
  createdAt?: string
  collage: unknown
  channels?: unknown
}): Promise<DiskFeedPost | null> {
  const id = safeId(params.id)
  const authorId = safeId(params.authorId)
  const collage = cleanCollageShare(params.collage)
  if (!id || !authorId || !collage) return null
  const taggedIds = params.taggedIds
    .map((x) => safeId(x))
    .filter((x): x is string => Boolean(x))
    .slice(0, 24)
  const post: DiskFeedPost = {
    id,
    authorId,
    caption: (params.caption || '').trim().slice(0, CAPTION_MAX),
    createdAt: params.createdAt || new Date().toISOString(),
    taggedIds,
    mime: 'application/json',
    sizeBytes: 0,
    kind: 'collage',
    collage,
    channels: cleanChannels(params.channels),
  }
  const meta = await readFeedFile()
  if ((meta.removedIds ?? []).includes(id)) return post
  const kept = mergePosts(meta.posts, [post])
  const pruned = kept.slice(MAX_POSTS)
  for (const drop of pruned) {
    if (!drop.file) continue
    await removeFile(blobRel(drop.file))
  }
  await writeMeta(kept.slice(0, MAX_POSTS), meta.removedIds)
  return post
}

export async function addTextFeedPost(params: {
  id: string
  authorId: string
  caption: string
  taggedIds: string[]
  createdAt?: string
  channels?: unknown
  sharedById?: string
  sharedByName?: string
}): Promise<DiskFeedPost | null> {
  const id = safeId(params.id)
  const authorId = safeId(params.authorId)
  const caption = (params.caption || '').trim().slice(0, CAPTION_MAX)
  if (!id || !authorId || !caption) return null
  const taggedIds = params.taggedIds
    .map((x) => safeId(x))
    .filter((x): x is string => Boolean(x))
    .slice(0, 24)
  const post: DiskFeedPost = {
    id,
    authorId,
    caption,
    createdAt: params.createdAt || new Date().toISOString(),
    taggedIds,
    mime: 'text/plain',
    sizeBytes: 0,
    kind: 'text',
    channels: cleanChannels(params.channels),
    likes: [],
    ...(safeId(params.sharedById || '') ? { sharedById: safeId(params.sharedById || '')! } : {}),
    ...(typeof params.sharedByName === 'string' && params.sharedByName.trim()
      ? { sharedByName: params.sharedByName.trim().slice(0, 80) }
      : {}),
  }
  const meta = await readFeedFile()
  if ((meta.removedIds ?? []).includes(id)) return post
  const kept = mergePosts(meta.posts, [post])
  await writeMeta(kept.slice(0, MAX_POSTS), meta.removedIds)
  return post
}

export async function toggleFeedLike(
  postId: string,
  actorId: string,
): Promise<DiskFeedPost | null> {
  return toggleFeedMark(postId, actorId, 'likes')
}

export async function toggleFeedHi5(
  postId: string,
  actorId: string,
): Promise<DiskFeedPost | null> {
  return toggleFeedMark(postId, actorId, 'hi5s')
}

export async function toggleFeedRepost(
  postId: string,
  actorId: string,
): Promise<DiskFeedPost | null> {
  return toggleFeedMark(postId, actorId, 'reposts')
}

async function toggleFeedMark(
  postId: string,
  actorId: string,
  field: 'likes' | 'hi5s' | 'reposts',
): Promise<DiskFeedPost | null> {
  const sid = safeId(postId)
  const who = safeId(actorId)
  if (!sid || !who) return null
  const meta = await readFeedFile()
  const found = meta.posts.find((p) => p.id === sid)
  if (!found) return null
  const set = new Set(found[field] ?? [])
  if (set.has(who)) set.delete(who)
  else set.add(who)
  found[field] = [...set]
  await writeMeta(meta.posts, meta.removedIds)
  return found
}

export async function sendFeedFile(id: string, res: ServerResponse): Promise<boolean> {
  const sid = safeId(id)
  if (!sid) return false
  const found = (await readFeedFile()).posts.find((p) => p.id === sid)
  if (!found || !found.file) return false
  const buf = await readBin(blobRel(found.file))
  if (!buf) return false
  res.statusCode = 200
  res.setHeader('Content-Type', found.mime || 'video/webm')
  res.setHeader('Content-Length', String(buf.length))
  res.setHeader('Cache-Control', 'private, max-age=3600')
  res.end(buf)
  return true
}
