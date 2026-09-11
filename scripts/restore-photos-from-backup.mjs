#!/usr/bin/env node
/**
 * Pull profile pictures out of a downloaded gym JSON (data:image/jpeg;base64,…)
 * and write them into data/roster-photos/ so the Mac gym can show faces.
 *
 *   npm run gym:photos -- ~/Downloads/shape-lab-gym-2026-09-11.json
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const backupPath = process.argv.slice(2).find((a) => !a.startsWith('--'))

if (!backupPath) {
  console.error('Usage: npm run gym:photos -- ~/Downloads/shape-lab-gym-2026-09-11.json')
  process.exit(1)
}

const abs = resolve(backupPath)
if (!existsSync(abs)) {
  console.error(`No file at ${abs}`)
  process.exit(1)
}

const backup = JSON.parse(readFileSync(abs, 'utf8'))
if (backup?.kind !== 'shape-lab-gym-backup' || !Array.isArray(backup.roster?.athletes)) {
  console.error('That file is not a Shape Lab gym backup.')
  process.exit(1)
}

const indexPath = join(ROOT, 'data', 'roster-photos.json')
const index = existsSync(indexPath)
  ? JSON.parse(readFileSync(indexPath, 'utf8'))
  : { kind: 'shape-lab-roster-photos', version: 2, exportedAt: '', photos: {}, ids: [] }
const photos = index.photos && typeof index.photos === 'object' ? index.photos : {}

mkdirSync(join(ROOT, 'data', 'roster-photos'), { recursive: true })

let saved = 0
for (const row of backup.roster.athletes) {
  const id = typeof row?.id === 'string' ? row.id : ''
  const dataUrl = typeof row?.photoDataUrl === 'string' ? row.photoDataUrl : ''
  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/s)
  if (!id || !match) continue
  const buf = Buffer.from(match[2], 'base64')
  if (buf.length < 32) continue
  writeFileSync(join(ROOT, 'data', 'roster-photos', `${id}.bin`), buf)
  const stamp = new Date().toISOString()
  photos[id] = {
    url: `/api/roster-photo-file?id=${encodeURIComponent(id)}&v=${encodeURIComponent(stamp)}`,
    mime: match[1] || 'image/jpeg',
    updatedAt: stamp,
  }
  saved += 1
  console.log(`saved ${row.name || id} (${buf.length} bytes)`)
}

index.kind = 'shape-lab-roster-photos'
index.version = 2
index.photos = photos
index.ids = Object.keys(photos)
index.exportedAt = new Date().toISOString()
writeFileSync(indexPath, JSON.stringify(index, null, 2) + '\n')

if (saved === 0) {
  console.error('No embedded pictures in that file (only URL pointers). Keep Vercel up and run npm run gym:mac.')
  process.exit(1)
}
console.log(`Wrote ${saved} picture${saved === 1 ? '' : 's'} into data/roster-photos.`)
console.log('Next: npm run gym:mac  (or refresh if the gym is already running)')
