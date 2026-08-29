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
the same hostname (gym.yourdomain.com) as long as the gym computer is
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
       Hostname:   gym.yourdomain.com
       Service:    ${ORIGIN}
  4. Copy .env.example to .env and paste:

       CLOUDFLARE_TUNNEL_TOKEN=eyJ...
       CLOUDFLARE_TUNNEL_HOSTNAME=https://gym.yourdomain.com

Gym computer every session
  Terminal 1:  npm run dev
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
  try {
    const result = spawnSync(
      process.execPath,
      [
        '-e',
        `fetch(${JSON.stringify(ORIGIN)}).then(r=>{process.exit(r.ok?0:2)}).catch(()=>process.exit(1))`,
      ],
      { encoding: 'utf8', timeout: 4000 },
    )
    return result.status === 0
  } catch {
    return false
  }
}

function runCloudflared(extraArgs, { printUrl = false, hostname = '' } = {}) {
  const bin = findCloudflared()
  const argv = [...bin.prefix, ...extraArgs]
  console.log(`Using ${bin.cmd} ${argv.join(' ')}`)
  if (hostname) console.log(`Gym URL: ${hostname}`)
  if (!originUp()) {
    console.warn(
      `Warning: nothing answered at ${ORIGIN}. Start Shape Lab first with npm run dev.`,
    )
  }

  const child = spawn(bin.cmd, argv, {
    stdio: printUrl ? ['ignore', 'pipe', 'pipe'] : 'inherit',
    env: process.env,
  })

  const onChunk = (buf) => {
    const text = buf.toString()
    process.stderr.write(text)
    const match = text.match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com/)
    if (match) console.log(`\nTemporary URL (dies when you stop this): ${match[0]}\n`)
  }

  if (printUrl) {
    child.stdout?.on('data', onChunk)
    child.stderr?.on('data', onChunk)
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
  runCloudflared(
    ['tunnel', '--protocol', 'http2', '--url', ORIGIN, '--no-autoupdate'],
    { printUrl: true },
  )
} else if (!token) {
  printGymSetup()
  console.error('No CLOUDFLARE_TUNNEL_TOKEN yet. Create the tunnel in the dashboard, then re-run.')
  process.exit(1)
} else {
  console.log('Starting the named Shape Lab tunnel. Leave this running on the gym computer.')
  runCloudflared(['tunnel', '--no-autoupdate', 'run', '--token', token], {
    hostname,
  })
}
