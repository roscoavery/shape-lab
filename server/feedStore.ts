/**
 * Gym feed posts: accomplishment videos with author + tags.
 * Blobs in data/feed-blobs/; metadata in data/feed-posts.json.
 */

import fs from 'node:fs'
import path from 'node:path'
import type { IncomingMessage, ServerResponse } from 'node:http'

const META = path.join(process.cwd(), 'data', 'feed-posts.json')
const BLOBS = path.join(process.cwd(), 'data', 'feed-blobs')
const MAX_POSTS = 200
const MAX_BYTES = 48 * 1024 * 1024

export type DiskFeedPost = {
  id: string
  authorId: string
  caption: string
  createdAt: string
  taggedIds: string[]
  mime: string
  sizeBytes: number
  file: string
}

export type DiskFeed = {
  kind: 'shape-lab-feed'
  version: 1
  exportedAt: string
  posts: DiskFeedPost[]
}

const EMPTY: DiskFeed = {
  kind: 'shape-lab-feed',
  version: 1,
  exportedAt: '',
  posts: [],
}

function safeId(id: string): string | null {
  const s = id.trim()
  if (!s || s.length > 80) return null
  if (!/^[a-zA-Z0-9_-]+$/.test(s)) return null
  return s
}

function extForMime(mime: string): string {
  if (mime.includes('mp4')) return '.mp4'
  if (mime.includes('webm')) return '.webm'
  return '.webm'
}

export function readFeedFile(): DiskFeed {
  try {
    const data = JSON.parse(fs.readFileSync(META, 'utf8')) as DiskFeed
    if (!data || data.kind !== 'shape-lab-feed' || !Array.isArray(data.posts)) {
      return { ...EMPTY }
    }
    return {
      ...EMPTY,
      ...data,
      posts: data.posts.filter((p) => p && typeof p.id === 'string' && typeof p.file === 'string'),
    }
  } catch {
    return { ...EMPTY }
  }
}

function writeMeta(posts: DiskFeedPost[]): DiskFeed {
  const next: DiskFeed = {
    kind: 'shape-lab-feed',
    version: 1,
    exportedAt: new Date().toISOString(),
    posts,
  }
  fs.mkdirSync(path.dirname(META), { recursive: true })
  fs.writeFileSync(META, JSON.stringify(next, null, 2) + '\n')
  return next
}

export function postsForClient(): Array<DiskFeedPost & { url: string }> {
  return readFeedFile()
    .posts.slice()
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .map((p) => ({ ...p, url: `/api/feed-file?id=${encodeURIComponent(p.id)}` }))
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

export function addFeedPostFromBody(params: {
  id: string
  authorId: string
  caption: string
  taggedIds: string[]
  createdAt?: string
  mime: string
  buf: Buffer
}): DiskFeedPost | null {
  const id = safeId(params.id)
  const authorId = safeId(params.authorId)
  if (!id || !authorId || !params.buf.length || params.buf.length > MAX_BYTES) return null
  const mime = params.mime.includes('mp4') ? 'video/mp4' : 'video/webm'
  const file = `${id}${extForMime(mime)}`
  fs.mkdirSync(BLOBS, { recursive: true })
  fs.writeFileSync(path.join(BLOBS, file), params.buf)
  const taggedIds = params.taggedIds
    .map((x) => safeId(x))
    .filter((x): x is string => Boolean(x))
    .slice(0, 24)
  const post: DiskFeedPost = {
    id,
    authorId,
    caption: (params.caption || '').trim().slice(0, 280),
    createdAt: params.createdAt || new Date().toISOString(),
    taggedIds,
    mime,
    sizeBytes: params.buf.length,
    file,
  }
  const others = readFeedFile().posts.filter((p) => p.id !== id)
  const kept = [post, ...others].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  const pruned = kept.slice(MAX_POSTS)
  for (const drop of pruned) {
    try {
      fs.unlinkSync(path.join(BLOBS, drop.file))
    } catch {
      /* missing */
    }
  }
  writeMeta(kept.slice(0, MAX_POSTS))
  return post
}

export function deleteFeedPost(id: string, actorId?: string, actorIsAdmin?: boolean): boolean {
  const sid = safeId(id)
  if (!sid) return false
  const meta = readFeedFile()
  const found = meta.posts.find((p) => p.id === sid)
  if (!found) return false
  if (!actorIsAdmin && actorId && found.authorId !== actorId) return false
  try {
    fs.unlinkSync(path.join(BLOBS, found.file))
  } catch {
    /* missing */
  }
  writeMeta(meta.posts.filter((p) => p.id !== sid))
  return true
}

export function sendFeedFile(id: string, res: ServerResponse): boolean {
  const sid = safeId(id)
  if (!sid) return false
  const found = readFeedFile().posts.find((p) => p.id === sid)
  if (!found) return false
  const file = path.join(BLOBS, found.file)
  if (!fs.existsSync(file)) return false
  const buf = fs.readFileSync(file)
  res.statusCode = 200
  res.setHeader('Content-Type', found.mime || 'video/webm')
  res.setHeader('Content-Length', String(buf.length))
  res.setHeader('Cache-Control', 'private, max-age=3600')
  res.end(buf)
  return true
}
