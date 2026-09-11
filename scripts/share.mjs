#!/usr/bin/env node
/**
 * Shape Lab public HTTPS share.
 *
 * Named tunnel (permanent hostname — gym computer):
 *   1. Create a remotely-managed tunnel in Cloudflare (needs a domain on Cloudflare)
 *   2. Put CLOUDFLARE_TUNNEL_TOKEN in .env
 *   3. npm run share
 *
 * Quick tunnel (new trycloudflare hostname every process):
 *   npm run share -- --quick
 */

import { spawn, spawnSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { printLanUrls } from './lan-urls.mjs'
import { originReady, waitForOrigin } from './gym-ready.mjs'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const PORT = Number(process.env.SHAPE_LAB_PORT || 43127)
const ORIGIN = `http://127.0.0.1:${PORT}`
const DASHBOARD = 'https://one.dash.cloudflare.com/'

const args = process.argv.slice(2)
const wantsHelp = args.includes('--help') || args.includes('-h')
const wantsQuick = args.includes('--quick')
const wantsService = args.includes('--install-service')

function loadEnvFile(path) {
  if (!existsSync(path)) return {}
  const out = {}
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
    out[key] = value
  }
  return out
}

function applyEnv(fileEnv) {
  for (const [key, value] of Object.entries(fileEnv)) {
    if (process.env[key] == null || process.env[key] === '') {
      process.env[key] = value
    }
  }
}

function printGymSetup() {
  console.log(`
Shape Lab — named Cloudflare tunnel (permanent HTTPS link)
==========================================================

A trycloudflare URL dies when this process dies. A named tunnel keeps
the same hostname (gym.shapelab.win) as long as the gym computer is
on and running this script.

This Cursor cloud machine is not 24/7. Run the tunnel on the gym PC.

You need
  1. A free Cloudflare account: https://dash.cloudflare.com/sign-up
  2. A domain added to that account (buy one, or point an existing
     domain's nameservers at Cloudflare). Cloudflare will not issue a
     stable public hostname without a domain.

Dashboard (once)
  1. Open ${DASHBOARD}
     (or dash.cloudflare.com → Zero Trust / Networking → Tunnels)
  2. Create a tunnel named shape-lab. Copy the token.
  3. Add a published application:
       Hostname:   gym.shapelab.win
       Service:    ${ORIGIN}
  4. Copy .env.example to .env and paste:

       CLOUDFLARE_TUNNEL_TOKEN=eyJ...
       CLOUDFLARE_TUNNEL_HOSTNAME=https://gym.shapelab.win

Gym computer every session
  Terminal 1:  npm run gym
  Terminal 2:  npm run share

Start the tunnel on Windows boot (admin PowerShell, cloudflared installed):
  npm run share -- --install-service

Temporary link only (new hostname every time):
  npm run share -- --quick
`)
}

function findCloudflared() {
  const fromEnv = process.env.CLOUDFLARED_BIN?.trim()
  if (fromEnv && existsSync(fromEnv)) return { cmd: fromEnv, prefix: [] }

  const which = spawnSync(process.platform === 'win32' ? 'where' : 'which', ['cloudflared'], {
    encoding: 'utf8',
  })
  const onPath = which.stdout?.trim().split(/\r?\n/).find(Boolean)
  if (onPath && existsSync(onPath)) return { cmd: onPath, prefix: [] }

  return { cmd: process.platform === 'win32' ? 'npx.cmd' : 'npx', prefix: ['--yes', 'cloudflared'] }
}

function originUp() {
  return originReady(ORIGIN)
}

function tokenLooksReal(token) {
  if (!token) return false
  if (/paste the token/i.test(token)) return false
  if (token.length < 80) return false
  return token.startsWith('eyJ')
}

function explainDeadTunnel() {
  console.warn('')
  console.warn('The public https link cannot reach this Mac right now.')
  console.warn('A trycloudflare URL also dies if you closed the gym window or reused yesterday’s link.')
  console.warn('On the same Wi-Fi, use the http://192.168…:43127/ line. Camera still needs HTTPS (Vercel or gym.shapelab.win).')
  printLanUrls(PORT)
}

async function waitUntilGymOrWarn() {
  if (await originUp()) return true
  console.log(`Waiting for Shape Lab at ${ORIGIN} before opening the tunnel…`)
  const ok = await waitForOrigin(ORIGIN, {
    maxMs: 180_000,
    onWait: (elapsed) => {
      console.log(`Still waiting for ${ORIGIN} (${Math.round(elapsed / 1000)}s)…`)
    },
  })
  if (!ok) {
    console.warn(
      `Warning: nothing answered at ${ORIGIN}. Start Shape Lab first with npm run gym (home PC).`,
    )
    printLanUrls(PORT)
  }
  return ok
}

function runCloudflared(extraArgs, { printUrl = false, hostname = '' } = {}) {
  const bin = findCloudflared()
  const argv = [...bin.prefix, ...extraArgs]
  const shown = argv.map((part, i) => (argv[i - 1] === '--token' ? '(hidden)' : part))
  console.log(`Using ${bin.cmd} ${shown.join(' ')}`)
  if (hostname) console.log(`Gym URL: ${hostname}`)

  const env = { ...process.env }
  if (!tokenLooksReal(env.CLOUDFLARE_TUNNEL_TOKEN)) {
    delete env.CLOUDFLARE_TUNNEL_TOKEN
  }

  const child = spawn(bin.cmd, argv, {
    stdio: ['ignore', printUrl ? 'pipe' : 'inherit', 'pipe'],
    env,
  })

  let announced = false
  let lastOriginFail = 0
  const onChunk = (buf) => {
    const text = buf.toString()
    process.stderr.write(text)
    const match = text.match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com/)
    if (match && !announced) {
      announced = true
      console.log(`\nTemporary URL (dies when you stop this — do not bookmark it): ${match[0]}`)
      console.log('If that https link 502s, ignore it and use the Wi-Fi http://192.168… link.\n')
      setTimeout(() => {
        fetch(match[0])
          .then((res) => {
            if (!res.ok) {
              console.warn(
                `Tunnel returned ${res.status}. Use the Wi-Fi link printed above — do not pause Vercel yet.`,
              )
            }
          })
          .catch(() => {
            console.warn('Tunnel is not reachable. Use the Wi-Fi link printed above.')
          })
      }, 4000)
    }
    if (
      /Unable to reach the origin service|connection reset by peer|Failed to proxy HTTP/i.test(
        text,
      )
    ) {
      const now = Date.now()
      if (now - lastOriginFail > 30_000) {
        lastOriginFail = now
        explainDeadTunnel()
      }
    }
  }

  child.stderr?.on('data', onChunk)
  if (printUrl) {
    child.stdout?.on('data', onChunk)
  }

  child.on('error', (err) => {
    console.error(`Could not start cloudflared: ${err.message}`)
    process.exit(1)
  })
  child.on('exit', (code, signal) => {
    if (signal) process.exit(1)
    process.exit(code ?? 0)
  })
}

applyEnv(loadEnvFile(resolve(ROOT, '.env')))

if (wantsHelp) {
  printGymSetup()
  process.exit(0)
}

const token = process.env.CLOUDFLARE_TUNNEL_TOKEN?.trim()
const hostname = process.env.CLOUDFLARE_TUNNEL_HOSTNAME?.trim()

if (wantsService) {
  if (!token) {
    printGymSetup()
    console.error('Missing CLOUDFLARE_TUNNEL_TOKEN in .env — cannot install the service.')
    process.exit(1)
  }
  runCloudflared(['service', 'install', token])
} else if (wantsQuick) {
  console.log('Starting a quick TryCloudflare tunnel. The hostname will change next time.')
  console.log('Yesterday’s trycloudflare link is dead. Use the URL printed in THIS window.')
  void waitUntilGymOrWarn().then(() => {
    runCloudflared(
      [
        'tunnel',
        '--protocol',
        'http2',
        '--url',
        ORIGIN,
        '--http-host-header',
        '127.0.0.1',
        '--retries',
        '15',
        '--no-autoupdate',
      ],
      { printUrl: true },
    )
  })
} else if (!tokenLooksReal(token)) {
  printGymSetup()
  console.error(
    token
      ? 'CLOUDFLARE_TUNNEL_TOKEN in .env is not the real token. Open Cloudflare → Tunnels → shape-lab, copy the install token (a long eyJ… string), paste it into .env, save, then npm run gym:mac.'
      : 'No CLOUDFLARE_TUNNEL_TOKEN yet. Create the tunnel in the dashboard, then re-run.',
  )
  process.exit(1)
} else {
  console.log('Starting the named Shape Lab tunnel. Leave this running on the gym computer.')
  void waitUntilGymOrWarn().then(() => {
    runCloudflared(['tunnel', '--retries', '15', '--no-autoupdate', 'run', '--token', token], {
      hostname,
    })
  })
}
