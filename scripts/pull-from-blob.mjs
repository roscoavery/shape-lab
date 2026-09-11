#!/usr/bin/env node
/**
 * Copy the live Vercel Blob gym onto this computer's data/ folder.
 * Run this while Production is still up, AFTER the iPad has sent pictures.
 * Then start the home gym (npm run gym) and pause Vercel.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { Readable } from 'node:stream'
import { fileURLToPath } from 'node:url'

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

async function streamToBuffer(stream) {
  const node = Readable.fromWeb(stream)
  const chunks = []
  for await (const chunk of node) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
  }
  return Buffer.concat(chunks)
}

await applyDotEnv()
const token = process.env.BLOB_READ_WRITE_TOKEN?.trim()
if (!token) {
  console.log('No BLOB_READ_WRITE_TOKEN — pulling from the live gym URL instead.')
  const { spawn } = await import('node:child_process')
  const child = spawn(process.execPath, [join(ROOT, 'scripts', 'pull-from-live.mjs')], {
    cwd: ROOT,
    stdio: 'inherit',
    env: process.env,
  })
  child.on('exit', (code) => process.exit(code ?? 0))
} else {

const { list, get } = await import('@vercel/blob')

async function downloadOne(pathname) {
  const dest = join(ROOT, pathname)
  mkdirSync(dirname(dest), { recursive: true })
  for (const access of ['private', 'public']) {
    try {
      const hit = await get(pathname, { access, token, useCache: false })
      if (hit?.statusCode === 200 && hit.stream) {
        const buf = await streamToBuffer(hit.stream)
        writeFileSync(dest, buf)
        return buf.length
      }
    } catch {
      /* try the other access */
    }
  }
  return 0
}

async function downloadUrl(url, dest) {
  try {
    const res = await fetch(url)
    if (!res.ok) return 0
    const buf = Buffer.from(await res.arrayBuffer())
    if (buf.length < 32) return 0
    mkdirSync(dirname(dest), { recursive: true })
    writeFileSync(dest, buf)
    return buf.length
  } catch {
    return 0
  }
}

let cursor
let files = 0
let bytes = 0
do {
  const page = await list({
    token,
    prefix: 'data/',
    cursor,
    limit: 1000,
  })
  for (const blob of page.blobs ?? []) {
    const pathname = blob.pathname
    if (!pathname || pathname.includes('..')) continue
    const size = await downloadOne(pathname)
    if (size > 0) {
      files += 1
      bytes += size
      console.log(`saved ${pathname} (${size} bytes)`)
    } else {
      console.warn(`skipped ${pathname}`)
    }
  }
  cursor = page.cursor
} while (cursor)

const indexPath = join(ROOT, 'data', 'roster-photos.json')
if (existsSync(indexPath)) {
  try {
    const data = JSON.parse(readFileSync(indexPath, 'utf8'))
    const photos = data.photos && typeof data.photos === 'object' ? data.photos : {}
    let localized = 0
    for (const [id, raw] of Object.entries(photos)) {
      const dest = join(ROOT, 'data', 'roster-photos', `${id}.bin`)
      if (!existsSync(dest)) {
        const url =
          typeof raw === 'string' && /^https:\/\//i.test(raw)
            ? raw
            : raw && typeof raw === 'object' && typeof raw.url === 'string' && /^https:\/\//i.test(raw.url)
              ? raw.url
              : ''
        if (url) {
          const size = await downloadUrl(url, dest)
          if (size > 0) {
            files += 1
            bytes += size
            console.log(`saved data/roster-photos/${id}.bin from public URL (${size} bytes)`)
          }
        }
        if (!existsSync(dest)) {
          const size = await downloadOne(`data/roster-photos/${id}.bin`)
          if (size > 0) {
            files += 1
            bytes += size
            console.log(`saved data/roster-photos/${id}.bin (${size} bytes)`)
          }
        }
      }
      const stamp =
        (raw && typeof raw === 'object' && typeof raw.updatedAt === 'string' && raw.updatedAt) ||
        (typeof data.exportedAt === 'string' ? data.exportedAt : '')
      const next = `/api/roster-photo-file?id=${encodeURIComponent(id)}${stamp ? `&v=${encodeURIComponent(stamp)}` : ''}`
      if (raw && typeof raw === 'object') {
        if (raw.url !== next) {
          raw.url = next
          localized += 1
        }
      } else if (typeof raw === 'string' && raw !== next) {
        photos[id] = { url: next, mime: 'image/jpeg', updatedAt: stamp || new Date().toISOString() }
        localized += 1
      }
    }
    if (localized > 0) {
      data.photos = photos
      writeFileSync(indexPath, JSON.stringify(data, null, 2) + '\n')
      console.log(`Pointed ${localized} profile pictures at this computer (not Vercel Blob).`)
    }
  } catch (err) {
    console.warn(`Could not localize roster-photos.json: ${err instanceof Error ? err.message : err}`)
  }
}

console.log('')
console.log(`Pulled ${files} gym files (${Math.round(bytes / 1024)} KB) into ${join(ROOT, 'data')}.`)
console.log('Next: npm run gym')
console.log('Keep this computer on. After phones use the home URL, pause the Vercel project.')
}
