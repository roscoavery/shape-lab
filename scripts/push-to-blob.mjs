#!/usr/bin/env node
/**
 * Mirror this Mac's data/ folder up to Vercel Blob (the cloud backup).
 *
 * The gym Mac (GYM_HOME=1) is the source of truth and serves phones from
 * disk. Run this after library work so the Vercel fallback URL stays fresh:
 *
 *   npm run gym:push
 *
 * One-way: disk -> blob. Never deletes from blob, only overwrites.
 */

import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative, resolve, dirname } from 'node:path'
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
for (const n of ['.env', '.env.local']) applyDotEnvFile(join(ROOT, n))

const token = process.env.BLOB_READ_WRITE_TOKEN?.trim()
if (!token) {
  console.error('No BLOB_READ_WRITE_TOKEN in env or .env — nothing pushed.')
  process.exit(1)
}

const { put } = await import('@vercel/blob')

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    if (name === 'history') continue // local safety net, not for the cloud
    const full = join(dir, name)
    const st = statSync(full)
    if (st.isDirectory()) walk(full, out)
    else if (st.isFile()) out.push(full)
  }
  return out
}

const dataDir = join(ROOT, 'data')
if (!existsSync(dataDir)) {
  console.error('No data/ folder — nothing to push.')
  process.exit(1)
}

let files = 0
let bytes = 0
for (const full of walk(dataDir)) {
  const pathname = relative(ROOT, full).replace(/\\/g, '/')
  const body = readFileSync(full)
  const contentType = pathname.endsWith('.json')
    ? 'application/json'
    : pathname.endsWith('.jpg') || pathname.endsWith('.jpeg')
      ? 'image/jpeg'
      : pathname.endsWith('.png')
        ? 'image/png'
        : 'application/octet-stream'
  try {
    await put(pathname, body, {
      access: 'private',
      token,
      addRandomSuffix: false,
      allowOverwrite: true,
      contentType,
      cacheControlMaxAge: 0,
    })
    files += 1
    bytes += body.length
    console.log(`pushed ${pathname} (${body.length} bytes)`)
  } catch (err) {
    console.warn(`FAILED ${pathname}: ${err?.message || err}`)
  }
}
console.log(`\ndone: ${files} files, ${(bytes / 1024).toFixed(0)} KB -> blob`)
