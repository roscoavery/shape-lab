#!/usr/bin/env node
/**
 * Read-only audit: where is every shape-library still, and what can come back?
 *
 * Run on the gym Mac (leaves everything untouched):
 *
 *   npm run gym:audit
 *
 * Checks, for every still the library expects:
 *   - shipped files in public/learn/coach-stills (in git — cannot be lost)
 *   - uploaded JPEGs in data/coach-blobs, .gym-park, and Vercel Blob
 *   - registry entries in data/coach-stills.json (local + Blob)
 *   - gym shapes hidden via removedGymShapeIds tombstones
 *   - orphan JPEGs on disk that no registry entry points at
 *   - still-crops.json timestamps (local vs Blob)
 */

import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join, resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')

function applyDotEnvFile(path) {
  if (!existsSync(path)) return
  for (const line of readFileSync(path, 'utf8').split(/\r?\n/)) {
    const t = line.trim()
    if (!t || t.startsWith('#')) continue
    const eq = t.indexOf('=')
    if (eq < 0) continue
    const key = t.slice(0, eq).trim()
    let value = t.slice(eq + 1).trim()
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1)
    }
    if (process.env[key] == null || process.env[key] === '') process.env[key] = value
  }
}
for (const n of ['.env', '.env.local', '.env.vercel', '.env.production']) applyDotEnvFile(join(ROOT, n))
const token = process.env.BLOB_READ_WRITE_TOKEN?.trim() || null

function readJson(path) {
  try {
    return JSON.parse(readFileSync(path, 'utf8'))
  } catch {
    return null
  }
}
function listJpegs(dir) {
  if (!existsSync(dir)) return []
  return readdirSync(dir).filter((n) => /\.(jpe?g|png|webp)$/i.test(n))
}
const idOf = (name) => name.replace(/\.(jpe?g|png|webp)$/i, '')

/* ---------- shipped stills + shape names (parsed out of the TS config) ---------- */
const shippedDir = join(ROOT, 'public', 'learn', 'coach-stills')
const shippedFiles = listJpegs(shippedDir)
const shapeNames = new Map()
try {
  const src = readFileSync(join(ROOT, 'src', 'config', 'shippedGymShapes.ts'), 'utf8')
  for (const m of src.matchAll(/gym\(\s*'([^']+)'\s*,\s*'([^']+)'/g)) shapeNames.set(m[1], m[2])
} catch { /* ignore */ }
const shapeName = (id) => shapeNames.get(id) ?? id

/* ---------- blob helpers ---------- */
let blobList = null
let blobGet = null
async function blobSetup() {
  if (!token) return false
  try {
    const mod = await import('@vercel/blob')
    blobList = mod.list
    blobGet = mod.get
    return true
  } catch {
    return false
  }
}
async function blobJson(pathname) {
  try {
    const hit = await blobGet(pathname, { access: 'private', token, useCache: false })
    if (hit?.statusCode === 200 && hit.stream) {
      const chunks = []
      for await (const c of hit.stream) chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c))
      return JSON.parse(Buffer.concat(chunks).toString('utf8'))
    }
  } catch { /* ignore */ }
  return null
}
async function blobHas(pathname) {
  try {
    let cursor
    do {
      const page = await blobList({ token, prefix: pathname, cursor, limit: 100 })
      for (const b of page.blobs ?? []) {
        if (b.pathname === pathname) return true
        // prefix listing may return siblings; keep scanning this page only for exact match
      }
      cursor = page.cursor
    } while (cursor)
  } catch { /* ignore */ }
  return false
}

const ok = (s) => `\x1b[32m${s}\x1b[0m`
const bad = (s) => `\x1b[31m${s}\x1b[0m`
const warn = (s) => `\x1b[33m${s}\x1b[0m`
const h = (s) => `\n\x1b[1m${s}\x1b[0m`

const hasBlob = await blobSetup()
console.log(
  `Blob store: ${hasBlob ? ok('connected — blob locations checked') : warn('no token found — blob locations NOT checked')}`,
)

console.log(h('A. Shipped stills (live in git — cannot be lost)'))
console.log(`  ${ok(`${shippedFiles.length} files`)} in public/learn/coach-stills/`)
const shippedIds = new Set(shippedFiles.map(idOf))

console.log(h('B. Gym shapes hidden by tombstone (removedGymShapeIds)'))
const localContent = readJson(join(ROOT, 'data', 'coach-content.json'))
const localGone = new Set(localContent?.removedGymShapeIds ?? [])
const blobContent = hasBlob ? await blobJson('data/coach-content.json') : null
const blobGone = new Set(blobContent?.removedGymShapeIds ?? [])
const gone = new Set([...localGone, ...blobGone])
if (gone.size === 0) {
  console.log(`  ${ok('none hidden')} — every shipped shape should show in the library`)
} else {
  for (const id of gone) {
    const where = [localGone.has(id) ? 'local' : null, blobGone.has(id) ? 'blob' : null].filter(Boolean).join('+')
    console.log(`  ${warn('HIDDEN')}: ${shapeName(id)} (${id}) [${where}] — unhide to restore`)
  }
}

console.log(h('C. Uploaded coach stills (registry + JPEG locations)'))
const localStills = readJson(join(ROOT, 'data', 'coach-stills.json'))
const blobStills = hasBlob ? await blobJson('data/coach-stills.json') : null
const parkStills = readJson(join(ROOT, '.gym-park', 'data', 'coach-stills.json'))
const reg = { main: {}, extras: [] }
for (const src of [blobStills, parkStills, localStills]) {
  if (!src) continue
  Object.assign(reg.main, src.main ?? {})
  for (const row of src.extras ?? []) if (row?.id && !reg.extras.some((r) => r.id === row.id)) reg.extras.push(row)
}
const localBlobs = new Set(listJpegs(join(ROOT, 'data', 'coach-blobs')).map(idOf))
const parkBlobs = new Set(listJpegs(join(ROOT, '.gym-park', 'data', 'coach-blobs')).map(idOf))
const goneStill = new Set([...(localStills?.removedCoachStillIds ?? []), ...(blobStills?.removedCoachStillIds ?? [])])

const expected = new Map() // stillId -> { shapeId, label }
for (const [shapeId, stillId] of Object.entries(reg.main)) {
  if (typeof stillId === 'string' && stillId) expected.set(stillId, { shapeId, label: shapeName(shapeId) })
}
for (const row of reg.extras) {
  if (!expected.has(row.id)) expected.set(row.id, { shapeId: row.shapeId, label: row.label || shapeName(row.shapeId) })
}

let missing = 0
let recoverable = 0
for (const [stillId, info] of expected) {
  if (goneStill.has(stillId)) {
    console.log(`  ${warn('HIDDEN')}: ${info.label} — still tombstoned, JPEG may still exist`)
    continue
  }
  const places = []
  if (localBlobs.has(stillId)) places.push('mac')
  if (parkBlobs.has(stillId)) places.push('park')
  let inBlob = false
  if (hasBlob) {
    inBlob = await blobHas(`data/coach-blobs/${stillId}.jpg`)
    if (!inBlob) inBlob = await blobHas(`data/coach-blobs/${stillId}.png`)
    if (inBlob) places.push('blob')
  }
  if (places.length === 0) {
    missing += 1
    console.log(`  ${bad('GONE')}: ${info.label} (${stillId}) — no JPEG on mac, park, or blob; re-upload needed`)
  } else {
    const note = places.includes('mac') ? ok('on mac') : warn(`recoverable via gym:stills [${places.join('+')}]`)
    if (!places.includes('mac')) recoverable += 1
    console.log(`  ${note}: ${info.label} (${stillId})`)
  }
}
if (expected.size === 0) console.log('  (no uploaded stills in any registry copy)')

console.log(h('D. Orphan JPEGs (on disk, not linked to any shape)'))
const orphans = [...localBlobs].filter((id) => !expected.has(id) && !shippedIds.has(id) && !goneStill.has(id))
if (orphans.length === 0) {
  console.log('  none')
} else {
  for (const id of orphans) console.log(`  ${warn('ORPHAN')}: data/coach-blobs/${id}.jpg — tell Ryan which shape it belongs to`)
}
const igBlobs = listJpegs(join(ROOT, 'data', 'ig-blobs'))
if (igBlobs.length) console.log(`  (${igBlobs.length} JPEGs in data/ig-blobs/ — Instagram stills)`)

console.log(h('E. Still crops (data/still-crops.json)'))
const localCrops = readJson(join(ROOT, 'data', 'still-crops.json'))
const blobCrops = hasBlob ? await blobJson('data/still-crops.json') : null
const cropInfo = (c) => (c ? `${Object.keys(c.crops ?? {}).length} crops, updated ${c.updatedAt || '?'}` : 'missing')
console.log(`  mac : ${cropInfo(localCrops)}`)
console.log(`  blob: ${cropInfo(blobCrops)}`)

console.log(h('Verdict'))
const lines = []
if (gone.size) lines.push(`${gone.size} shape(s) are tombstone-hidden — unhide to restore (no photo work needed)`)
if (recoverable) lines.push(`${recoverable} still(s) have a JPEG off-mac — run npm run gym:stills to pull them back`)
if (missing) lines.push(`${missing} still(s) are gone from every store — re-upload the photo`)
if (orphans.length) lines.push(`${orphans.length} orphan photo(s) need a shape assignment`)
if (!lines.length) lines.push('Everything the library expects is present or recoverable.')
for (const l of lines) console.log(`  • ${l}`)
console.log('')
