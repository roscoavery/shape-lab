#!/usr/bin/env node
/**
 * Put coach stills back from JPEGs already on this Mac.
 * Does not stop the gym. Run in a second Terminal tab:
 *
 *   cd /Users/ryanwilliams/shape-lab && npm run gym:stills
 *
 * Then refresh Safari. Do not run gym:mac for this.
 */

import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const JSON_PATH = join(ROOT, 'data', 'coach-stills.json')
const LIVE = join(ROOT, 'data', 'coach-blobs')
const PARK = join(ROOT, '.gym-park', 'data', 'coach-blobs')

function blobId(name) {
  const m = /^([a-zA-Z0-9_-]+)\.(jpe?g|png|webp)$/i.exec(name)
  return m ? m[1] : null
}

function listBlobs(dir) {
  if (!existsSync(dir)) return []
  return readdirSync(dir)
    .map((name) => {
      const id = blobId(name)
      return id ? { id, name, dir } : null
    })
    .filter(Boolean)
}

const empty = {
  kind: 'shape-lab-coach-stills',
  version: 1,
  updatedAt: '',
  main: {},
  extras: [],
  removedCoachStillIds: [],
}

const file = existsSync(JSON_PATH)
  ? { ...empty, ...JSON.parse(readFileSync(JSON_PATH, 'utf8')) }
  : { ...empty }
if (!file.main || typeof file.main !== 'object') file.main = {}
if (!Array.isArray(file.extras)) file.extras = []

const gone = new Set(
  (Array.isArray(file.removedCoachStillIds) ? file.removedCoachStillIds : []).filter(
    (id) => typeof id === 'string' && id,
  ),
)
const extras = [...file.extras]
const have = new Set(extras.map((row) => row.id))
const shapeByStill = Object.fromEntries(
  Object.entries(file.main)
    .filter(([, stillId]) => typeof stillId === 'string' && stillId)
    .map(([shapeId, stillId]) => [stillId, shapeId]),
)

mkdirSync(LIVE, { recursive: true })
let restored = 0
let copied = 0
const found = [...listBlobs(LIVE), ...listBlobs(PARK)]
for (const blob of found) {
  if (gone.has(blob.id)) continue
  const dest = join(LIVE, blob.name)
  if (blob.dir === PARK && !existsSync(dest)) {
    copyFileSync(join(PARK, blob.name), dest)
    copied += 1
  }
  const shapeId = shapeByStill[blob.id]
  if (!shapeId || have.has(blob.id)) continue
  extras.push({
    id: blob.id,
    shapeId,
    file: blob.name,
    createdAt: new Date().toISOString(),
  })
  have.add(blob.id)
  restored += 1
  console.log(`restored ${blob.id} → ${shapeId}`)
}

file.extras = extras
file.updatedAt = new Date().toISOString()
mkdirSync(dirname(JSON_PATH), { recursive: true })
writeFileSync(JSON_PATH, JSON.stringify(file, null, 2) + '\n')

const missing = Object.entries(file.main).filter(([, stillId]) => !have.has(stillId))
console.log('')
console.log(`JPEG files found: ${found.length}`)
console.log(`Copied from park: ${copied}`)
console.log(`Extras put back: ${restored}`)
console.log(`Library extras now: ${extras.length}`)
if (missing.length) {
  console.log('Still missing (name is there, JPEG is not on this Mac):')
  for (const [shapeId, stillId] of missing) console.log(`  ${shapeId}  ${stillId}`)
} else {
  console.log('Every main still has a JPEG on this Mac.')
}
console.log('')
console.log('Leave the gym:mac window open. Refresh Safari on the iPad.')
