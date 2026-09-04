/**
 * JSON / binary storage that works on the gym computer (data/) and on Vercel.
 * Local: write data/*.json as today.
 * Production: Vercel Blob when a store is connected (private preferred);
 * otherwise /tmp plus an in-process cache so a warm function keeps writes.
 */

import fs from 'node:fs'
import path from 'node:path'
import { Readable } from 'node:stream'

const ROOT = process.cwd()
const TMP = path.join('/tmp', 'shape-lab-data')
const mem = new Map<string, Buffer>()

function diskPath(rel: string): string {
  return path.join(ROOT, rel)
}

function tmpPath(rel: string): string {
  return path.join(TMP, rel)
}

function canWrite(dir: string): boolean {
  try {
    fs.mkdirSync(dir, { recursive: true })
    fs.accessSync(dir, fs.constants.W_OK)
    return true
  } catch {
    return false
  }
}

function useBlob(): boolean {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN || process.env.BLOB_STORE_ID)
}

export type PersistMode = 'blob' | 'disk' | 'tmp'

/** Where gym JSON actually lasts. `tmp` is gone after a Vercel cold start. */
export function persistMode(): PersistMode {
  if (useBlob()) return 'blob'
  if (canWrite(path.dirname(diskPath('data/roster.json')))) return 'disk'
  return 'tmp'
}

async function streamToBuffer(stream: ReadableStream<Uint8Array>): Promise<Buffer> {
  const node = Readable.fromWeb(stream as import('node:stream/web').ReadableStream)
  const chunks: Buffer[] = []
  for await (const chunk of node) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
  }
  return Buffer.concat(chunks)
}

async function readBlob(rel: string): Promise<Buffer | null> {
  const { get } = await import('@vercel/blob')
  for (const access of ['private', 'public'] as const) {
    try {
      const hit = await get(rel, { access, useCache: false })
      if (hit?.statusCode === 200 && hit.stream) {
        return await streamToBuffer(hit.stream)
      }
    } catch {
      /* try the other access mode */
    }
  }
  return null
}

async function writeBlob(rel: string, body: string | Buffer, contentType: string): Promise<void> {
  const { put } = await import('@vercel/blob')
  const options = {
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType,
    cacheControlMaxAge: 0,
  } as const
  try {
    await put(rel, body, { ...options, access: 'private' })
  } catch {
    await put(rel, body, { ...options, access: 'public' })
  }
}

export async function readText(rel: string): Promise<string | null> {
  // Always hit Blob first. A warm function used to return its in-memory
  // copy and hide profiles / wins another device had just saved.
  if (useBlob()) {
    try {
      const buf = await readBlob(rel)
      if (buf) {
        mem.set(rel, buf)
        return buf.toString('utf8')
      }
    } catch {
      /* fall through to this instance's last write */
    }
    const cached = mem.get(rel)
    if (cached) return cached.toString('utf8')
  } else {
    const cached = mem.get(rel)
    if (cached) return cached.toString('utf8')
  }
  for (const p of [diskPath(rel), tmpPath(rel)]) {
    try {
      const text = fs.readFileSync(p, 'utf8')
      mem.set(rel, Buffer.from(text, 'utf8'))
      return text
    } catch {
      /* next */
    }
  }
  return null
}

function assertDurableWrite(): void {
  if (persistMode() === 'tmp' && process.env.VERCEL) {
    throw new Error(
      'Gym data cannot persist on this Vercel project without a Blob store. Connect Storage → Blob and redeploy Production on the same URL.',
    )
  }
}

export async function writeText(rel: string, text: string): Promise<void> {
  assertDurableWrite()
  const buf = Buffer.from(text, 'utf8')
  mem.set(rel, buf)
  if (useBlob()) {
    await writeBlob(rel, text, 'application/json')
  } else {
    const dest = canWrite(path.dirname(diskPath(rel))) ? diskPath(rel) : tmpPath(rel)
    fs.mkdirSync(path.dirname(dest), { recursive: true })
    fs.writeFileSync(dest, text)
  }
  await touchRevision(rel)
}

export async function readJson<T>(rel: string, fallback: T): Promise<T> {
  const text = await readText(rel)
  if (!text) return fallback
  try {
    return JSON.parse(text) as T
  } catch {
    return fallback
  }
}

/** Bundled `data/*.json` from the deploy — used when Blob is stale or smaller. */
export function readDiskJson<T>(rel: string, fallback: T): T {
  try {
    const text = fs.readFileSync(diskPath(rel), 'utf8')
    return JSON.parse(text) as T
  } catch {
    return fallback
  }
}

export async function writeJson(rel: string, data: unknown): Promise<void> {
  await writeText(rel, JSON.stringify(data, null, 2) + '\n')
}

export async function readBin(rel: string): Promise<Buffer | null> {
  if (useBlob()) {
    try {
      const buf = await readBlob(rel)
      if (buf) {
        mem.set(rel, buf)
        return buf
      }
    } catch {
      /* fall through */
    }
    const cached = mem.get(rel)
    if (cached) return cached
  } else {
    const cached = mem.get(rel)
    if (cached) return cached
  }
  for (const p of [diskPath(rel), tmpPath(rel)]) {
    try {
      const buf = fs.readFileSync(p)
      mem.set(rel, buf)
      return buf
    } catch {
      /* next */
    }
  }
  return null
}

export async function writeBin(rel: string, buf: Buffer, contentType: string): Promise<void> {
  assertDurableWrite()
  mem.set(rel, buf)
  if (useBlob()) {
    await writeBlob(rel, buf, contentType)
    return
  }
  const dest = canWrite(path.dirname(diskPath(rel))) ? diskPath(rel) : tmpPath(rel)
  fs.mkdirSync(path.dirname(dest), { recursive: true })
  fs.writeFileSync(dest, buf)
}

/**
 * Profile pics and win clips need a URL the phone can load like any
 * social app — not a multi-megabyte data URL stuffed through JSON.
 */
export async function writePublicBin(
  rel: string,
  buf: Buffer,
  contentType: string,
): Promise<string | null> {
  assertDurableWrite()
  mem.set(rel, buf)
  if (useBlob()) {
    const { put } = await import('@vercel/blob')
    const result = await put(rel, buf, {
      addRandomSuffix: false,
      allowOverwrite: true,
      contentType,
      access: 'public',
      cacheControlMaxAge: 31536000,
    })
    return typeof result.url === 'string' ? result.url : null
  }
  const dest = canWrite(path.dirname(diskPath(rel))) ? diskPath(rel) : tmpPath(rel)
  fs.mkdirSync(path.dirname(dest), { recursive: true })
  fs.writeFileSync(dest, buf)
  return null
}

export async function removeFile(rel: string): Promise<void> {
  mem.delete(rel)
  if (useBlob()) {
    try {
      const { del } = await import('@vercel/blob')
      await del(rel)
    } catch {
      /* ignore */
    }
  }
  for (const p of [diskPath(rel), tmpPath(rel)]) {
    try {
      fs.unlinkSync(p)
    } catch {
      /* ignore */
    }
  }
}

export type GymRevisionStores = {
  roster: string
  photos: string
  feed: string
  classes: string
  content: string
  chalkboards: string
}

export type GymRevision = {
  kind: 'shape-lab-revision'
  version: 1
  stores: GymRevisionStores
}

const REV_FILE = 'data/revision.json'

const FILE_TO_STORE: Record<string, keyof GymRevisionStores> = {
  'data/roster.json': 'roster',
  'data/roster-photos.json': 'photos',
  'data/feed-posts.json': 'feed',
  'data/coach-classes.json': 'classes',
  'data/coach-content.json': 'content',
  'data/chalkboards.json': 'chalkboards',
}

function emptyRevision(): GymRevision {
  return {
    kind: 'shape-lab-revision',
    version: 1,
    stores: {
      roster: '',
      photos: '',
      feed: '',
      classes: '',
      content: '',
      chalkboards: '',
    },
  }
}

let revMem: GymRevision | null = null

function stampFromJson(text: string | null): string {
  if (!text) return ''
  try {
    const row = JSON.parse(text) as { exportedAt?: unknown }
    return typeof row.exportedAt === 'string' ? row.exportedAt : ''
  } catch {
    return ''
  }
}

async function touchRevision(rel: string): Promise<void> {
  const store = FILE_TO_STORE[rel]
  if (!store) return
  const now = new Date().toISOString()
  const prev = revMem ?? emptyRevision()
  const next: GymRevision = {
    kind: 'shape-lab-revision',
    version: 1,
    stores: { ...emptyRevision().stores, ...prev.stores, [store]: now },
  }
  revMem = next
  const buf = Buffer.from(JSON.stringify(next) + '\n', 'utf8')
  mem.set(REV_FILE, buf)
  if (useBlob()) {
    try {
      await writeBlob(REV_FILE, buf.toString('utf8'), 'application/json')
    } catch {
      /* next poll still has this instance's stamp */
    }
    return
  }
  const dest = canWrite(path.dirname(diskPath(REV_FILE))) ? diskPath(REV_FILE) : tmpPath(REV_FILE)
  fs.mkdirSync(path.dirname(dest), { recursive: true })
  fs.writeFileSync(dest, buf)
}

export async function readRevision(): Promise<GymRevision> {
  const stored = await readJson<GymRevision>(REV_FILE, emptyRevision())
  const stores: GymRevisionStores = { ...emptyRevision().stores, ...(stored.stores ?? {}) }
  const hasAny = Object.values(stores).some(Boolean)
  if (!hasAny) {
    const [roster, photos, feed, classes, content, chalkboards] = await Promise.all([
      readText('data/roster.json'),
      readText('data/roster-photos.json'),
      readText('data/feed-posts.json'),
      readText('data/coach-classes.json'),
      readText('data/coach-content.json'),
      readText('data/chalkboards.json'),
    ])
    stores.roster = stampFromJson(roster)
    stores.photos = stampFromJson(photos)
    stores.feed = stampFromJson(feed)
    stores.classes = stampFromJson(classes)
    stores.content = stampFromJson(content)
    stores.chalkboards = stampFromJson(chalkboards)
  }
  const next: GymRevision = { kind: 'shape-lab-revision', version: 1, stores }
  revMem = next
  return next
}
