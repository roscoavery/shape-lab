#!/usr/bin/env node
/**
 * Copy the live Vercel gym onto this computer's data/ folder
 * using the public Production URL (no Blob token required).
 */

import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const BASE = (
  process.env.GYM_PULL_URL ||
  'https://temporary-racing-sulfur-78x9doy.vercel.app'
).replace(/\/$/, '')

const JSON_ENDPOINTS = [
  ['/api/roster', 'data/roster.json'],
  ['/api/roster-photos', 'data/roster-photos.json'],
  ['/api/revision', 'data/revision.json'],
  ['/api/feed', 'data/feed-posts.json'],
  ['/api/coach-classes', 'data/coach-classes.json'],
  ['/api/coach-content', 'data/coach-content.json'],
  ['/api/chalkboards', 'data/chalkboards.json'],
  ['/api/notices', 'data/notices.json'],
  ['/api/lessons', 'data/lessons.json'],
  ['/api/research', 'data/research.json'],
  ['/api/social', 'data/social.json'],
  ['/api/discuss', 'data/discuss.json'],
  ['/api/library', 'data/library.json'],
  ['/api/clip-loops', 'data/clip-loops.json'],
  ['/api/favorites', 'data/favorites.json'],
  ['/api/collages', 'data/collages.json'],
  ['/api/training-events', 'data/training-events.json'],
  ['/api/stories', 'data/stories.json'],
  ['/api/athlete-videos', 'data/athlete-videos.json'],
  ['/api/coach-stills', 'data/coach-stills.json'],
  ['/api/learn-notes', 'data/learn-notes.json'],
  ['/api/shape-copy', 'data/shape-copy.json'],
  ['/api/still-crops', 'data/still-crops.json'],
  ['/api/coach-library', 'data/coach-libraries.json'],
  ['/api/coach-media', 'data/coach-media.json'],
  ['/api/ig-stills', 'data/ig-stills.json'],
]

async function getJson(path) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { Accept: 'application/json' },
    cache: 'no-store',
  })
  if (!res.ok) throw new Error(`${path} ${res.status}`)
  return res.json()
}

async function getBytes(url) {
  const res = await fetch(url, { cache: 'no-store', redirect: 'follow' })
  if (!res.ok) return null
  const buf = Buffer.from(await res.arrayBuffer())
  return buf.length >= 32 ? buf : null
}

function writeJsonFile(rel, data) {
  const dest = join(ROOT, rel)
  mkdirSync(dirname(dest), { recursive: true })
  writeFileSync(dest, JSON.stringify(data, null, 2) + '\n')
}

function writeBinFile(rel, buf) {
  const dest = join(ROOT, rel)
  mkdirSync(dirname(dest), { recursive: true })
  writeFileSync(dest, buf)
}

let files = 0
let bytes = 0

console.log(`Pulling gym from ${BASE}`)

for (const [path, rel] of JSON_ENDPOINTS) {
  try {
    const data = await getJson(path)
    writeJsonFile(rel, data)
    files += 1
    console.log(`saved ${rel}`)
  } catch (err) {
    console.warn(`skipped ${path}: ${err instanceof Error ? err.message : err}`)
  }
}

const photoIndexPath = join(ROOT, 'data', 'roster-photos.json')
if (existsSync(photoIndexPath)) {
  const index = JSON.parse((await import('node:fs')).readFileSync(photoIndexPath, 'utf8'))
  const photos = index.photos && typeof index.photos === 'object' ? index.photos : {}
  const ids = new Set([
    ...(Array.isArray(index.ids) ? index.ids : []),
    ...Object.keys(photos),
  ])
  for (const id of ids) {
    if (!id || /[^a-zA-Z0-9_-]/.test(id)) continue
    const raw = photos[id]
    const url =
      typeof raw === 'string' && /^https:\/\//i.test(raw)
        ? raw
        : raw && typeof raw === 'object' && typeof raw.url === 'string' && /^https:\/\//i.test(raw.url)
          ? raw.url
          : `${BASE}/api/roster-photo-file?id=${encodeURIComponent(id)}`
    const buf = await getBytes(url)
    if (!buf) {
      console.warn(`skipped photo ${id}`)
      continue
    }
    writeBinFile(`data/roster-photos/${id}.bin`, buf)
    files += 1
    bytes += buf.length
    const stamp =
      (raw && typeof raw === 'object' && typeof raw.updatedAt === 'string' && raw.updatedAt) ||
      (typeof index.exportedAt === 'string' ? index.exportedAt : '')
    photos[id] = {
      url: `/api/roster-photo-file?id=${encodeURIComponent(id)}${stamp ? `&v=${encodeURIComponent(stamp)}` : ''}`,
      mime: (raw && typeof raw === 'object' && raw.mime) || 'image/jpeg',
      updatedAt: stamp || new Date().toISOString(),
    }
    console.log(`saved data/roster-photos/${id}.bin (${buf.length} bytes)`)
  }
  index.photos = photos
  index.ids = Object.keys(photos)
  writeJsonFile('data/roster-photos.json', index)
}

async function pullFileList(metaRel, listKey, fileUrl, destDir) {
  const dest = join(ROOT, metaRel)
  if (!existsSync(dest)) return
  const data = JSON.parse((await import('node:fs')).readFileSync(dest, 'utf8'))
  const rows = Array.isArray(data[listKey]) ? data[listKey] : []
  for (const row of rows) {
    if (!row || typeof row !== 'object') continue
    const id = typeof row.id === 'string' ? row.id : ''
    if (!id || /[^a-zA-Z0-9_-]/.test(id)) continue
    if (row.publicUrl && /^https:\/\//i.test(row.publicUrl)) continue
    const file = typeof row.file === 'string' && row.file ? row.file : `${id}.bin`
    const url = `${BASE}${fileUrl}?id=${encodeURIComponent(id)}`
    const buf = await getBytes(url)
    if (!buf) continue
    writeBinFile(`${destDir}/${file}`, buf)
    files += 1
    bytes += buf.length
    console.log(`saved ${destDir}/${file} (${buf.length} bytes)`)
  }
}

await pullFileList('data/feed-posts.json', 'posts', '/api/feed-file', 'data/feed-blobs')
await pullFileList('data/athlete-videos.json', 'videos', '/api/athlete-video-file', 'data/athlete-video-blobs')
await pullFileList('data/stories.json', 'stories', '/api/story-file', 'data/story-blobs')

console.log('')
console.log(`Pulled ${files} gym files (${Math.round(bytes / 1024)} KB binaries) into ${join(ROOT, 'data')}.`)
console.log('Next: npm run gym')
