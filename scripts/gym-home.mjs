#!/usr/bin/env node
/**
 * Run Shape Lab on this computer as the gym file.
 * Uses data/ on disk (GYM_HOME=1) so Vercel / Blob is not billed.
 * Serves a production Vite build through the gym gate so phones load a
 * handful of hashed files instead of hundreds of /src modules through
 * the Cloudflare tunnel. Set GYM_DEV=1 to use Vite instead.
 */

import { spawn, spawnSync } from 'node:child_process'
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { printLanUrls } from './lan-urls.mjs'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const PORT = process.env.SHAPE_LAB_PORT || '43127'
const VITE_PORT = process.env.SHAPE_LAB_VITE_PORT || '43128'
const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm'
const shell = process.platform === 'win32'
const viteJs = join(ROOT, 'node_modules', 'vite', 'bin', 'vite.js')
const distIndex = join(ROOT, 'dist', 'index.html')
const wantDev = /^(1|true|yes)$/i.test(String(process.env.GYM_DEV || ''))

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

function latestMtime(dir, acc = 0) {
  let latest = acc
  let entries
  try {
    entries = readdirSync(dir, { withFileTypes: true })
  } catch {
    return latest
  }
  for (const ent of entries) {
    const p = join(dir, ent.name)
    if (ent.isDirectory()) {
      if (ent.name === 'node_modules' || ent.name === 'dist' || ent.name === '.git' || ent.name === 'data') {
        continue
      }
      latest = latestMtime(p, latest)
      continue
    }
    if (!ent.isFile()) continue
    try {
      const t = statSync(p).mtimeMs
      if (t > latest) latest = t
    } catch {
      /* skip */
    }
  }
  return latest
}

function distIsFresh() {
  if (!existsSync(distIndex)) return false
  const distTime = statSync(distIndex).mtimeMs
  const inputs = [
    join(ROOT, 'src'),
    join(ROOT, 'public'),
    join(ROOT, 'index.html'),
    join(ROOT, 'vite.config.ts'),
    join(ROOT, 'package.json'),
  ]
  let newest = 0
  for (const p of inputs) {
    try {
      const st = statSync(p)
      newest = Math.max(newest, st.isDirectory() ? latestMtime(p) : st.mtimeMs)
    } catch {
      /* missing input */
    }
  }
  return distTime >= newest
}

function buildApp() {
  if (distIsFresh()) {
    console.log('Using the existing production build (phones get a few hashed files, not Vite source).')
    return true
  }
  console.log('Building Shape Lab for phones (can take a minute). Do not open the https link yet.')
  const viteBin = existsSync(viteJs) ? [process.execPath, viteJs, 'build'] : null
  const result = viteBin
    ? spawnSync(viteBin[0], viteBin.slice(1), {
        cwd: ROOT,
        stdio: 'inherit',
        env: process.env,
      })
    : spawnSync(npm, ['exec', '--', 'vite', 'build'], {
        cwd: ROOT,
        stdio: 'inherit',
        env: process.env,
        shell,
      })
  if (result.status !== 0 || !existsSync(distIndex)) {
    console.warn('Production build failed — falling back to Vite (phones will feel slower).')
    return false
  }
  return true
}

applyDotEnv()
process.env.GYM_HOME = '1'
// Disk is the gym file. Do not keep writing paid Blob from the home PC.
delete process.env.BLOB_READ_WRITE_TOKEN
delete process.env.BLOB_STORE_ID

const roster = join(ROOT, 'data', 'roster.json')
if (!existsSync(roster)) {
  console.warn('data/roster.json is missing. Run npm run gym:pull while Vercel is still up.')
}

const env = {
  ...process.env,
  GYM_HOME: '1',
  SHAPE_LAB_PORT: PORT,
  SHAPE_LAB_VITE_PORT: VITE_PORT,
  GYM_DEV: wantDev ? '1' : '',
}

console.log(`Home gym on http://127.0.0.1:${PORT}  (disk only — Vercel can pause after phones switch)`)
printLanUrls(PORT)
console.log('Opening port 43127 now so the https link does not 502 while the app builds.')

const gate = spawn(
  process.execPath,
  ['--experimental-strip-types', join(ROOT, 'scripts', 'gym-gate.mjs')],
  { cwd: ROOT, stdio: 'inherit', env },
)

const useStatic = !wantDev && buildApp()
if (useStatic) {
  console.log('Serving the production build. Leave this window open.')
} else {
  console.log('Leave this window open. A trycloudflare https link from an old run is dead.')
}

let vite = null
if (!useStatic) {
  vite = existsSync(viteJs)
    ? spawn(process.execPath, [viteJs, '--host', '127.0.0.1', '--port', VITE_PORT, '--strictPort'], {
        cwd: ROOT,
        stdio: 'inherit',
        env,
      })
    : spawn(npm, ['exec', '--', 'vite', '--host', '127.0.0.1', '--port', VITE_PORT, '--strictPort'], {
        cwd: ROOT,
        stdio: 'inherit',
        env,
        shell,
      })
}

function shutdown(code = 0) {
  vite?.kill('SIGTERM')
  gate.kill('SIGTERM')
  process.exit(code)
}

vite?.on('exit', (code) => {
  if (!existsSync(distIndex)) shutdown(code ?? 0)
})
gate.on('exit', (code) => shutdown(code ?? 0))
process.on('SIGINT', () => shutdown(0))
process.on('SIGTERM', () => shutdown(0))
