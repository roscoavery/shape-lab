#!/usr/bin/env node
/**
 * Start the disk gym and a public HTTPS tunnel on this computer.
 * Pull first if data/ looks empty: npm run gym:pull
 */

import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const PORT = process.env.SHAPE_LAB_PORT || '43127'
const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm'
const shell = process.platform === 'win32'

const roster = join(ROOT, 'data', 'roster.json')
if (!existsSync(roster)) {
  console.warn('data/roster.json is missing. Run npm run gym:pull while Vercel is still up.')
}

console.log('Starting the home gym (disk only) and a public tunnel.')
console.log('Leave both running. Pause Vercel only after phones use the tunnel URL.')

const gym = spawn(npm, ['run', 'gym'], {
  cwd: ROOT,
  stdio: 'inherit',
  env: { ...process.env, GYM_HOME: '1', SHAPE_LAB_PORT: PORT },
  shell,
})

const shareArgs = process.env.CLOUDFLARE_TUNNEL_TOKEN?.trim()
  ? ['run', 'share']
  : ['run', 'share:quick']

setTimeout(() => {
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
}, 2500)

gym.on('exit', (code) => process.exit(code ?? 0))
