#!/usr/bin/env node
/**
 * One-shot migration of athlete video bytes into the coach's private R2 bucket.
 *
 * For every entry in data/athlete-videos.json it uploads the video bytes to
 * R2 and records the object key as `cloudKey`. Idempotent: a video whose
 * cloudKey already exists in R2 is skipped. Only the metadata file is
 * rewritten; no Blob objects are deleted and publicUrl is kept as a fallback.
 *
 * Usage:
 *   node scripts/backfill-videos-to-cloud.mjs --dry-run   # print the plan, change nothing
 *   node scripts/backfill-videos-to-cloud.mjs            # migrate for real
 *
 * Requires the R2 env vars in the checkout's .env:
 *   R2_ACCOUNT_ID, R2_BUCKET, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_PREFIX (optional)
 */

import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import {
  r2ConfigFromEnv,
  r2HeadObject,
  r2KeyForVideoFile,
  r2PutObject,
} from '../server/r2Client.ts'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')

async function applyDotEnv() {
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

await applyDotEnv()

const DRY_RUN = process.argv.includes('--dry-run')

const cfg = r2ConfigFromEnv()
if (!cfg) {
  console.error(
    'Missing R2 configuration. Set R2_ACCOUNT_ID, R2_BUCKET, R2_ACCESS_KEY_ID and R2_SECRET_ACCESS_KEY in the checkout .env file (R2_PREFIX is optional).',
  )
  process.exit(1)
}

const META_PATH = join(ROOT, 'data', 'athlete-videos.json')
if (!existsSync(META_PATH)) {
  console.error(`No metadata file found at ${META_PATH}. Nothing to migrate.`)
  process.exit(1)
}

const meta = JSON.parse(readFileSync(META_PATH, 'utf8'))
const videos = Array.isArray(meta.videos) ? meta.videos : []
const blobDir = join(ROOT, 'data', 'athlete-video-blobs')

async function readBytes(video) {
  if (video.file) {
    const local = join(blobDir, video.file)
    if (existsSync(local)) return readFileSync(local)
  }
  if (video.publicUrl) {
    const res = await fetch(video.publicUrl)
    if (!res.ok) throw new Error(`fetch of publicUrl failed (${res.status})`)
    const buf = Buffer.from(await res.arrayBuffer())
    if (buf.length === 0) throw new Error('fetch of publicUrl returned 0 bytes')
    return buf
  }
  return null
}

let migrated = 0
let skippedAlready = 0
let skippedNoBytes = 0
let errors = 0

for (const video of videos) {
  const label = video.name || video.id || video.file || '(unnamed video)'
  try {
    if (video.cloudKey && (await r2HeadObject(cfg, video.cloudKey))) {
      skippedAlready += 1
      console.log(`skip (already in R2): ${label} -> ${video.cloudKey}`)
      continue
    }
    const key = video.cloudKey || r2KeyForVideoFile(cfg.prefix, video.file)
    let buf = null
    try {
      buf = await readBytes(video)
    } catch (err) {
      errors += 1
      console.error(`error reading bytes for ${label}: ${err instanceof Error ? err.message : err}`)
      continue
    }
    if (!buf) {
      skippedNoBytes += 1
      console.warn(`skip (no bytes found): ${label} (no local blob file, no publicUrl)`)
      continue
    }
    if (DRY_RUN) {
      console.log(`would upload: ${label} (${buf.length} bytes) -> ${key}`)
      continue
    }
    await r2PutObject(cfg, key, buf, video.mime || 'video/mp4')
    video.cloudKey = key
    migrated += 1
    console.log(`migrated: ${label} (${buf.length} bytes) -> ${key}`)
  } catch (err) {
    errors += 1
    console.error(`error migrating ${label}: ${err instanceof Error ? err.message : err}`)
  }
}

if (DRY_RUN) {
  console.log('')
  console.log('Dry run: nothing was uploaded and data/athlete-videos.json was not changed.')
} else if (migrated > 0) {
  writeFileSync(META_PATH, JSON.stringify(meta, null, 2) + '\n')
  console.log(`Wrote updated metadata to ${META_PATH}.`)
}

console.log('')
console.log(
  `Done. migrated=${migrated} skipped-already=${skippedAlready} skipped-no-bytes=${skippedNoBytes} errors=${errors}${DRY_RUN ? ' (dry run)' : ''}`,
)
process.exit(errors > 0 ? 1 : 0)
