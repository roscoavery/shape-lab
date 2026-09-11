#!/usr/bin/env node
/**
 * Run Shape Lab on this computer as the gym file.
 * Uses data/ on disk (GYM_HOME=1) so Vercel / Blob is not billed.
 * Pull from Blob first if data/ is still empty: npm run gym:pull
 */

import { spawn } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const PORT = process.env.SHAPE_LAB_PORT || '43127'

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

applyDotEnv()
process.env.GYM_HOME = '1'
// Disk is the gym file. Do not keep writing paid Blob from the home PC.
delete process.env.BLOB_READ_WRITE_TOKEN
delete process.env.BLOB_STORE_ID

const roster = join(ROOT, 'data', 'roster.json')
if (!existsSync(roster)) {
  console.warn('data/roster.json is missing. Run npm run gym:pull while Vercel is still up.')
}

console.log(`Home gym on http://127.0.0.1:${PORT}  (disk only — Vercel can pause after phones switch)`)
console.log('Leave this running. In another terminal: npm run share')
const child = spawn(process.platform === 'win32' ? 'npm.cmd' : 'npm', ['run', 'dev'], {
  cwd: ROOT,
  stdio: 'inherit',
  env: { ...process.env, GYM_HOME: '1', SHAPE_LAB_PORT: PORT },
  shell: process.platform === 'win32',
})
child.on('exit', (code) => process.exit(code ?? 0))
