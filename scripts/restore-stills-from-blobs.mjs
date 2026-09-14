#!/usr/bin/env node
/**
 * Put yesterday's coach stills back from JPEGs on this Mac or in Vercel Blob.
 * Leave gym:mac running. Second Terminal tab:
 *
 *   cd /Users/ryanwilliams/shape-lab && npm run gym:stills
 */

import { spawnSync } from 'node:child_process'
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { Readable } from 'node:stream'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const JSON_PATH = join(ROOT, 'data', 'coach-stills.json')
const LIVE = join(ROOT, 'data', 'coach-blobs')
const PARK = join(ROOT, '.gym-park', 'data', 'coach-blobs')

function applyDotEnvFile(path) {
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

function applyDotEnv() {
  for (const name of ['.env', '.env.local', '.env.vercel', '.env.production']) {
    applyDotEnvFile(join(ROOT, name))
  }
}

function tryVercelEnvPull() {
  if (process.env.BLOB_READ_WRITE_TOKEN?.trim()) return
  const dest = join(ROOT, '.env.vercel')
  console.log('Asking the existing Vercel project for BLOB_READ_WRITE_TOKEN (no new store)…')
  const result = spawnSync(
    'npx',
    ['--yes', 'vercel', 'env', 'pull', dest, '--yes', '--environment', 'production'],
    { cwd: ROOT, encoding: 'utf8', timeout: 120000 },
  )
  if (result.status !== 0) {
    console.warn((result.stderr || result.stdout || 'vercel env pull failed').trim().slice(0, 400))
    return
  }
  applyDotEnvFile(dest)
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
tryVercelEnvPull()
const token = process.env.BLOB_READ_WRITE_TOKEN?.trim()
const LIVE_GYM = (
  process.env.GYM_PULL_URL || 'https://temporary-racing-sulfur-78x9doy.vercel.app'
).replace(/\/$/, '')

async function getBytes(url) {
  try {
    const res = await fetch(url, { cache: 'no-store', redirect: 'follow' })
    if (!res.ok) return null
    const buf = Buffer.from(await res.arrayBuffer())
    return buf.length >= 32 ? buf : null
  } catch {
    return null
  }
}

async function pullFromLiveGym(file) {
  console.log(`Trying the Production gym ${LIVE_GYM} (unpause that project if this 503s)…`)
  const metaBuf = await getBytes(`${LIVE_GYM}/api/coach-stills`)
  if (!metaBuf) {
    console.warn('Production gym is paused or unreachable. Unpause the existing Vercel project, then run this again.')
    return file
  }
  let remoteFile
  try {
    remoteFile = asFile(JSON.parse(metaBuf.toString('utf8')))
  } catch {
    console.warn('Production gym did not return a coach-stills file.')
    return file
  }
  console.log(`Production gym has ${remoteFile.extras.length} extras.`)
  mkdirSync(LIVE, { recursive: true })
  const ids = new Set([
    ...remoteFile.extras.map((row) => row.id),
    ...Object.values(remoteFile.main),
    ...Object.values(file.main),
  ])
  let n = 0
  for (const id of ids) {
    if (!id || /[^a-zA-Z0-9_-]/.test(id)) continue
    const dest = join(LIVE, `${id}.jpg`)
    if (existsSync(dest)) continue
    const buf = await getBytes(`${LIVE_GYM}/api/coach-still-file?id=${encodeURIComponent(id)}`)
    if (!buf) continue
    writeFileSync(dest, buf)
    n += 1
    console.log(`downloaded ${id}.jpg from Production (${buf.length} bytes)`)
  }
  console.log(`New JPEGs from Production: ${n}`)
  return {
    ...file,
    main: { ...remoteFile.main, ...file.main },
    extras: [...remoteFile.extras, ...file.extras],
    removedCoachStillIds: [...remoteFile.removedCoachStillIds, ...file.removedCoachStillIds],
  }
}

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
  console.log('No BLOB_READ_WRITE_TOKEN in .env yet.')
}

const liveHit = await pullFromLiveGym({
  ...local,
  main: { ...remote.main, ...local.main },
  extras: [...remote.extras, ...local.extras],
  removedCoachStillIds: [...remote.removedCoachStillIds, ...local.removedCoachStillIds],
})
remote = {
  ...remote,
  main: { ...remote.main, ...liveHit.main },
  extras: [...remote.extras, ...liveHit.extras],
  removedCoachStillIds: [...remote.removedCoachStillIds, ...liveHit.removedCoachStillIds],
}
local.main = { ...liveHit.main, ...local.main }

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
