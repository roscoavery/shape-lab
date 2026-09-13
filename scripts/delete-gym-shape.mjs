#!/usr/bin/env node
/**
 * List or delete gym-added shapes in data/coach-content.json.
 * Does not touch shipped Learn shapes (hollow, lunge, …).
 *
 *   node scripts/delete-gym-shape.mjs
 *   node scripts/delete-gym-shape.mjs "Shape name"
 *   node scripts/delete-gym-shape.mjs gym_shape_id
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const FILE = resolve(ROOT, 'data/coach-content.json')

function load() {
  const data = JSON.parse(readFileSync(FILE, 'utf8'))
  if (data?.kind !== 'shape-lab-coach-content') {
    throw new Error(`${FILE} is not a Shape Lab coach-content file.`)
  }
  if (!Array.isArray(data.gymLibrary)) data.gymLibrary = []
  if (!Array.isArray(data.removedGymShapeIds)) data.removedGymShapeIds = []
  return data
}

function list(data) {
  const lib = data.gymLibrary
  if (lib.length === 0) {
    console.log('No gym-added shapes in data/coach-content.json.')
    console.log('Shipped Learn shapes (hollow, lunge, …) cannot be deleted from here.')
    return
  }
  console.log(`${lib.length} gym-added shape${lib.length === 1 ? '' : 's'}:`)
  for (const row of lib) {
    console.log(`  ${row.id}    ${row.name}`)
  }
}

function matches(row, needle) {
  const q = needle.trim().toLowerCase()
  if (!q) return false
  return String(row.id ?? '').toLowerCase() === q || String(row.name ?? '').toLowerCase() === q
}

function del(data, needle) {
  const hit = data.gymLibrary.filter((row) => matches(row, needle))
  if (hit.length === 0) {
    console.error(`No gym-added shape named or id "${needle}".`)
    list(data)
    process.exit(1)
  }
  const ids = new Set(hit.map((row) => row.id).filter(Boolean))
  data.gymLibrary = data.gymLibrary.filter((row) => !ids.has(row.id))
  data.removedGymShapeIds = [...new Set([...data.removedGymShapeIds, ...ids])]
  data.exportedAt = new Date().toISOString()
  writeFileSync(FILE, `${JSON.stringify(data, null, 2)}\n`)
  for (const row of hit) {
    console.log(`Deleted ${row.name} (${row.id})`)
  }
  console.log('Saved data/coach-content.json. Leave gym:mac running, then refresh Learn on the iPad.')
}

const arg = process.argv.slice(2).filter((a) => a !== '--list').join(' ').trim()
const data = load()
if (!arg) list(data)
else del(data, arg)
