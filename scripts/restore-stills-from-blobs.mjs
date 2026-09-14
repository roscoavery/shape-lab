#!/usr/bin/env node
/**
 * Put yesterday's coach stills back from JPEGs on this Mac or in Vercel Blob.
 * Leave gym:mac running. Second Terminal tab:
 *
 *   cd /Users/ryanwilliams/shape-lab && npm run gym:stills
 */

import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { Readable } from 'node:stream'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const JSON_PATH = join(ROOT, 'data', 'coach-stills.json')
const LIVE = join(ROOT, 'data', 'coach-blobs')
const PARK = join(ROOT, '.gym-park', 'data', 'coach-blobs')

function applyDotEnv() {
  const path = join(ROOT, '.env')
  if (!existsSync(path)) return
  for (const line of readFileSync(path, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq < 0) continue
    const key = trimmed.slice(0, eq).trim()
    let value = trimmed.slice(eq + 1).trim()
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }
    if (process.env[key] == null || process.env[key] === '') process.env[key] = value
  }
}

function blobId(name) {
  const m = /^([a-zA-Z0-9_-]+)\.(jpe?g|png|webp)$/i.exec(name)
  return m ? m[1] : null
}

function listLocal(dir) {
  if (!existsSync(dir)) return []
  return readdirSync(dir)
    .map((name) => {
      const id = blobId(name)
      return id ? { id, name, dir } : null
    })
    .filter(Boolean)
}

async function streamToBuffer(stream) {
  const node = Readable.fromWeb(stream)
  const chunks = []
  for await (const chunk of node) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
  }
  return Buffer.concat(chunks)
}

applyDotEnv()
const token = process.env.BLOB_READ_WRITE_TOKEN?.trim()

const empty = {
  kind: 'shape-lab-coach-stills',
  version: 1,
  updatedAt: '',
  main: {},
  extras: [],
  removedCoachStillIds: [],
}

function asFile(raw) {
  if (!raw || raw.kind !== 'shape-lab-coach-stills') return { ...empty }
  return {
    ...empty,
    ...raw,
    main: raw.main && typeof raw.main === 'object' ? raw.main : {},
    extras: Array.isArray(raw.extras) ? raw.extras.filter((row) => row && row.id && row.shapeId) : [],
    removedCoachStillIds: Array.isArray(raw.removedCoachStillIds) ? raw.removedCoachStillIds : [],
  }
}

const local = asFile(existsSync(JSON_PATH) ? JSON.parse(readFileSync(JSON_PATH, 'utf8')) : empty)
let remote = { ...empty }

let pulled = 0
if (token) {
  console.log('Downloading coach stills from the Vercel Blob store (deployment can stay paused)…')
  const { list, get } = await import('@vercel/blob')

  async function downloadOne(pathname, dest) {
    mkdirSync(dirname(dest), { recursive: true })
    for (const access of ['private', 'public']) {
      try {
        const hit = await get(pathname, { access, token, useCache: false })
        if (hit?.statusCode === 200 && hit.stream) {
          const buf = await streamToBuffer(hit.stream)
          if (buf.length < 32) return 0
          writeFileSync(dest, buf)
          return buf.length
        }
      } catch {
        /* try the other access */
      }
    }
    return 0
  }

  const metaSize = await downloadOne('data/coach-stills.json', join(ROOT, '.gym-park', 'data', 'coach-stills.blob.json'))
  if (metaSize > 0) {
    try {
      remote = asFile(JSON.parse(readFileSync(join(ROOT, '.gym-park', 'data', 'coach-stills.blob.json'), 'utf8')))
      console.log(`Blob gym file has ${remote.extras.length} extras and ${Object.keys(remote.main).length} main picks.`)
    } catch {
      console.warn('Could not parse Blob coach-stills.json')
    }
  } else {
    console.warn('No data/coach-stills.json in Blob — will still scan Blob JPEGs.')
  }

  mkdirSync(LIVE, { recursive: true })
  let cursor
  do {
    const page = await list({ token, prefix: 'data/coach-blobs/', cursor, limit: 1000 })
    for (const blob of page.blobs ?? []) {
      const pathname = blob.pathname
      if (!pathname || pathname.includes('..')) continue
      const name = pathname.split('/').pop()
      const id = name ? blobId(name) : null
      if (!id) continue
      const dest = join(LIVE, name)
      if (existsSync(dest)) continue
      const size = await downloadOne(pathname, dest)
      if (size > 0) {
        pulled += 1
        console.log(`downloaded ${name} (${size} bytes)`)
      }
    }
    cursor = page.cursor
  } while (cursor)
  console.log(`New JPEGs from Blob: ${pulled}`)
} else {
  console.log('No BLOB_READ_WRITE_TOKEN in .env — using JPEGs already on this Mac only.')
}

const gone = new Set(
  [...local.removedCoachStillIds, ...remote.removedCoachStillIds].filter(
    (id) => typeof id === 'string' && id,
  ),
)
const extrasById = new Map()
for (const row of [...remote.extras, ...local.extras]) {
  if (!row?.id || gone.has(row.id)) continue
  extrasById.set(row.id, row)
}
const main = { ...remote.main, ...local.main }
const shapeByStill = Object.fromEntries(
  Object.entries(main)
    .filter(([, stillId]) => typeof stillId === 'string' && stillId)
    .map(([shapeId, stillId]) => [stillId, shapeId]),
)

mkdirSync(LIVE, { recursive: true })
let copied = 0
let restored = 0
const found = [...listLocal(LIVE), ...listLocal(PARK)]
for (const blob of found) {
  if (gone.has(blob.id)) continue
  const dest = join(LIVE, blob.name)
  if (blob.dir === PARK && !existsSync(dest)) {
    copyFileSync(join(PARK, blob.name), dest)
    copied += 1
  }
  const prev = extrasById.get(blob.id)
  const shapeId = prev?.shapeId || shapeByStill[blob.id]
  if (!shapeId) continue
  if (!prev || !prev.file) {
    extrasById.set(blob.id, {
      id: blob.id,
      shapeId,
      file: blob.name,
      label: prev?.label,
      createdAt: prev?.createdAt || new Date().toISOString(),
    })
    restored += 1
    console.log(`restored ${blob.id} → ${shapeId}`)
  } else if (!prev.file) {
    extrasById.set(blob.id, { ...prev, file: blob.name })
    restored += 1
  }
}

const extras = [...extrasById.values()]
const next = {
  kind: 'shape-lab-coach-stills',
  version: 1,
  updatedAt: new Date().toISOString(),
  main,
  extras,
  removedCoachStillIds: [...gone],
}
mkdirSync(dirname(JSON_PATH), { recursive: true })
writeFileSync(JSON_PATH, JSON.stringify(next, null, 2) + '\n')

const have = new Set(extras.map((row) => row.id))
const missing = Object.entries(main).filter(([, stillId]) => !have.has(stillId))
console.log('')
console.log(`JPEG files on this Mac now: ${listLocal(LIVE).length}`)
console.log(`Copied from park: ${copied}`)
console.log(`Extras in the gym file: ${extras.length}`)
if (missing.length) {
  console.log('Still missing (name is there, JPEG is not here or in Blob):')
  for (const [shapeId, stillId] of missing) console.log(`  ${shapeId}  ${stillId}`)
} else {
  console.log('Every main still has a JPEG.')
}
console.log('')
console.log('Leave the gym:mac window open. Hard-refresh Safari on the iPad.')
