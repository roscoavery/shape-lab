#!/usr/bin/env node
/**
 * Start the disk gym and a public HTTPS tunnel on this computer.
 * Pulls the live gym first if this machine has no roster photos yet.
 */

import { spawn, spawnSync } from 'node:child_process'
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { printLanUrls } from './lan-urls.mjs'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const PORT = process.env.SHAPE_LAB_PORT || '43127'
const ORIGIN = `http://127.0.0.1:${PORT}`
const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm'
const shell = process.platform === 'win32'

function loadEnvFile() {
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

loadEnvFile()

function photoCount() {
  const dir = join(ROOT, 'data', 'roster-photos')
  if (!existsSync(dir)) return 0
  return readdirSync(dir).filter((name) => name.endsWith('.bin')).length
}

const roster = join(ROOT, 'data', 'roster.json')
if (!existsSync(roster) || photoCount() === 0) {
  console.log('No gym copy on this computer yet — pulling from the live URL…')
  const pull = spawnSync(npm, ['run', 'gym:pull'], {
    cwd: ROOT,
    stdio: 'inherit',
    shell,
    env: process.env,
  })
  if (pull.status !== 0) {
    console.error('Could not copy the live gym. Stay on Vercel and try again while Production is up.')
    process.exit(pull.status ?? 1)
  }
}

console.log('Starting the home gym (disk only) and a public tunnel.')
console.log('Leave this running. Pause Vercel only after phones use the tunnel URL.')

const gym = spawn(npm, ['run', 'gym'], {
  cwd: ROOT,
  stdio: 'inherit',
  env: { ...process.env, GYM_HOME: '1', SHAPE_LAB_PORT: PORT },
  shell,
})

async function originUp() {
  try {
    const ac = new AbortController()
    const timer = setTimeout(() => ac.abort(), 2500)
    const res = await fetch(ORIGIN, { signal: ac.signal })
    clearTimeout(timer)
    return Number.isInteger(res.status)
  } catch {
    return false
  }
}

async function waitForGym() {
  for (let i = 0; i < 90; i += 1) {
    if (await originUp()) return true
    await new Promise((resolveWait) => setTimeout(resolveWait, 500))
  }
  return false
}

const shareArgs = process.env.CLOUDFLARE_TUNNEL_TOKEN?.trim()
  ? ['run', 'share']
  : ['run', 'share:quick']

void waitForGym().then((ok) => {
  printLanUrls(PORT)
  if (!ok) {
    console.warn(`Nothing answered at ${ORIGIN} yet. Starting the tunnel anyway.`)
  } else {
    const named = process.env.CLOUDFLARE_TUNNEL_HOSTNAME?.trim()
    console.log(
      named
        ? `Gym is up at ${ORIGIN}. Publishing ${named} …`
        : `Gym is up at ${ORIGIN}. Publishing HTTPS…`,
    )
  }
  const share = spawn(npm, shareArgs, {
    cwd: ROOT,
    stdio: 'inherit',
    env: { ...process.env, SHAPE_LAB_PORT: PORT },
    shell,
  })
  share.on('exit', (code) => {
    gym.kill('SIGTERM')
    process.exit(code ?? 0)
  })
})

gym.on('exit', (code) => process.exit(code ?? 0))
