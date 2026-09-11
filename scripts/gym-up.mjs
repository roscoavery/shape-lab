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
import { originReady, waitForOrigin } from './gym-ready.mjs'

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

function tokenLooksReal(token) {
  if (!token) return false
  if (/paste the token/i.test(token)) return false
  if (token.length < 80) return false
  return token.startsWith('eyJ')
}

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

let gymAlive = true
gym.on('exit', (code) => {
  gymAlive = false
  process.exit(code ?? 0)
})

async function waitForGym() {
  return waitForOrigin(ORIGIN, {
    maxMs: 240_000,
    stopped: () => !gymAlive,
    onWait: (elapsed) => {
      console.log(
        `Waiting for the gym on ${ORIGIN} (${Math.round(elapsed / 1000)}s). First start after git pull builds the app — phones cannot use the https link yet.`,
      )
    },
  })
}

const tokenRaw = process.env.CLOUDFLARE_TUNNEL_TOKEN?.trim()
const shareArgs = tokenLooksReal(tokenRaw) ? ['run', 'share'] : ['run', 'share:quick']
if (tokenRaw && !tokenLooksReal(tokenRaw)) {
  console.warn(
    'CLOUDFLARE_TUNNEL_TOKEN in .env is not a real Cloudflare token. Using a temporary tunnel. Copy box 3 on the tunnel page, then: npm run gym:token',
  )
} else if (!tokenRaw) {
  console.warn(
    'No Cloudflare tunnel token in .env yet. Using a temporary tunnel. After you copy box 3: npm run gym:token',
  )
}

void waitForGym().then(async (ok) => {
  printLanUrls(PORT)
  if (!ok) {
    console.warn(`Nothing answered at ${ORIGIN} after 4 minutes.`)
    console.warn('Do not use a trycloudflare https link. Use the Wi-Fi http://192.168…:43127/ line above, or stay on Vercel.')
    console.warn('Starting the tunnel anyway in case the gym comes up late.')
  } else {
    const named = tokenLooksReal(tokenRaw)
      ? process.env.CLOUDFLARE_TUNNEL_HOSTNAME?.trim()
      : ''
    console.log(
      named
        ? `Gym is up at ${ORIGIN}. Publishing ${named} …`
        : `Gym is up at ${ORIGIN}. Publishing a temporary HTTPS link (this hostname is new every start — yesterday’s trycloudflare URL is dead).`,
    )
  }
  if (!(await originReady(ORIGIN)) && !ok) {
    console.warn('Tunnel will 502 until this Mac answers on port', PORT)
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
