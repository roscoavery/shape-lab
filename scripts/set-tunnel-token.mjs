#!/usr/bin/env node
/**
 * Paste the Cloudflare tunnel token from the clipboard into .env.
 * On the Mac: copy box 3 in the Cloudflare tunnel page, then npm run gym:token.
 */

import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const ENV = join(ROOT, '.env')
const EXAMPLE = join(ROOT, '.env.example')

function clipboard() {
  if (process.platform === 'darwin') {
    return spawnSync('pbpaste', { encoding: 'utf8' }).stdout || ''
  }
  if (process.platform === 'win32') {
    return spawnSync('powershell', ['-NoProfile', '-Command', 'Get-Clipboard'], {
      encoding: 'utf8',
    }).stdout || ''
  }
  return spawnSync('xclip', ['-selection', 'clipboard', '-o'], { encoding: 'utf8' }).stdout || ''
}

function extractToken(raw) {
  const text = raw.replace(/\s+/g, ' ').trim()
  const fromFlag = text.match(/--token\s+(\S+)/)
  if (fromFlag) return fromFlag[1]
  const jwt = text.match(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/)
  if (jwt) return jwt[0]
  if (text.startsWith('eyJ') && text.length > 80 && !/\s/.test(text)) return text
  return ''
}

const token = extractToken(clipboard())
if (!token || token.length < 80 || /paste the token/i.test(token)) {
  console.error(
    'Clipboard does not have the Cloudflare token yet. On the tunnel page, macOS → copy the icon on box 3 (cloudflared tunnel run --token eyJ…). Then run npm run gym:token again.',
  )
  process.exit(1)
}

let body = existsSync(ENV) ? readFileSync(ENV, 'utf8') : existsSync(EXAMPLE) ? readFileSync(EXAMPLE, 'utf8') : ''
if (!body.includes('CLOUDFLARE_TUNNEL_TOKEN=')) {
  body += `\nCLOUDFLARE_TUNNEL_TOKEN=${token}\n`
} else {
  body = body.replace(/CLOUDFLARE_TUNNEL_TOKEN=.*/g, `CLOUDFLARE_TUNNEL_TOKEN=${token}`)
}
if (!body.includes('CLOUDFLARE_TUNNEL_HOSTNAME=')) {
  body += 'CLOUDFLARE_TUNNEL_HOSTNAME=https://gym.shapelab.win\n'
} else if (/CLOUDFLARE_TUNNEL_HOSTNAME=\s*$/m.test(body)) {
  body = body.replace(
    /CLOUDFLARE_TUNNEL_HOSTNAME=.*/,
    'CLOUDFLARE_TUNNEL_HOSTNAME=https://gym.shapelab.win',
  )
}
writeFileSync(ENV, body)
console.log(`Saved tunnel token (${token.length} characters) to .env`)
console.log('Next: npm run gym:mac')
console.log('Then open https://gym.shapelab.win')
