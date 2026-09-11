/**
 * Keep one public Blob copy of each Instagram / TikTok mp4.
 * Phones then load the CDN URL. Streaming the file through /api/ig-media
 * is what ran the Vercel bill up (function CPU + Fast Data Transfer on
 * every Range request from Safari).
 */

import { createHash } from 'node:crypto'
import { readBin, readJson, writeBin, writePublicBin } from './persist.ts'
import { socialVideoKey } from '../src/lib/socialUrls.ts'

const INDEX = 'data/ig-media-index.json'
const MAX_BYTES = 40 * 1024 * 1024

const mem = new Map<string, string>()
let disk: Record<string, string> | null = null
let writing = false

function hashSrc(src: string): string {
  const bare = src.split('?')[0] || src
  return createHash('sha1').update(bare).digest('hex').slice(0, 24)
}

export function igMediaKeys(pageUrl: string | undefined, src: string): string[] {
  const keys = [hashSrc(src)]
  if (pageUrl) {
    const social = socialVideoKey(pageUrl)
    if (social) keys.push(social)
    keys.push(pageUrl)
  }
  return [...new Set(keys)]
}

async function loadIndex(): Promise<Record<string, string>> {
  if (disk) return disk
  disk = await readJson<Record<string, string>>(INDEX, {})
  for (const [k, v] of Object.entries(disk)) {
    if (typeof v === 'string' && v.startsWith('https://')) mem.set(k, v)
  }
  return disk
}

async function saveIndex(next: Record<string, string>) {
  disk = next
  if (writing) return
  writing = true
  try {
    await writeBin(INDEX, Buffer.from(JSON.stringify(next)), 'application/json')
  } catch {
    /* keep memory */
  } finally {
    writing = false
  }
}

export async function lookupIgPublicUrl(
  pageUrl: string | undefined,
  src: string,
): Promise<string | null> {
  const keys = igMediaKeys(pageUrl, src)
  for (const key of keys) {
    const hit = mem.get(key)
    if (hit) return hit
  }
  const index = await loadIndex()
  for (const key of keys) {
    const hit = index[key]
    if (hit) {
      mem.set(key, hit)
      return hit
    }
  }
  return null
}

export async function storeIgPublicMedia(
  src: string,
  buf: Buffer,
  contentType: string,
  pageUrl?: string,
): Promise<string | null> {
  if (buf.length < 800 || buf.length > MAX_BYTES) return null
  const existing = await lookupIgPublicUrl(pageUrl, src)
  if (existing) return existing
  const rel = `data/ig-media/${hashSrc(src)}.${contentType.startsWith('image/') ? 'jpg' : 'mp4'}`
  const publicUrl = await writePublicBin(rel, buf, contentType)
  if (!publicUrl) return null
  const index = { ...(await loadIndex()) }
  for (const key of igMediaKeys(pageUrl, src)) {
    mem.set(key, publicUrl)
    index[key] = publicUrl
  }
  void saveIndex(index)
  return publicUrl
}

function igDiskRel(src: string, contentType = 'video/mp4'): string {
  return `data/ig-media/${hashSrc(src)}.${contentType.startsWith('image/') ? 'jpg' : 'mp4'}`
}

/** Home gym: serve a copy from disk so the tunnel does not refetch Instagram. */
export async function cachedIgFile(src: string): Promise<{ buf: Buffer; type: string } | null> {
  for (const [ext, type] of [
    ['mp4', 'video/mp4'],
    ['jpg', 'image/jpeg'],
  ] as const) {
    const buf = await readBin(`data/ig-media/${hashSrc(src)}.${ext}`)
    if (buf && buf.length > 800) return { buf, type }
  }
  return null
}

export async function storeIgDiskMedia(
  src: string,
  buf: Buffer,
  contentType: string,
): Promise<void> {
  if (buf.length < 800 || buf.length > MAX_BYTES) return
  await writeBin(igDiskRel(src, contentType), buf, contentType)
}
