/**
 * Read server secrets from process.env, then gitignored .env.
 * Never log the values. Never expose these through VITE_ variables.
 */

import fs from 'node:fs'
import path from 'node:path'

let fileCache: Record<string, string> | null = null

function readDotEnv(): Record<string, string> {
  if (fileCache) return fileCache
  const out: Record<string, string> = {}
  try {
    const text = fs.readFileSync(path.join(process.cwd(), '.env'), 'utf8')
    for (const line of text.split('\n')) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) continue
      const eq = trimmed.indexOf('=')
      if (eq < 1) continue
      const key = trimmed.slice(0, eq).trim()
      const value = trimmed.slice(eq + 1).trim()
      if (key) out[key] = value
    }
  } catch {
    /* no local .env */
  }
  fileCache = out
  return out
}

export function serverEnv(name: string): string {
  const fromProcess = process.env[name]
  if (typeof fromProcess === 'string' && fromProcess.length > 0) return fromProcess
  return readDotEnv()[name] ?? ''
}

export function serverEnvFlag(name: string): boolean {
  const value = serverEnv(name).trim().toLowerCase()
  return value === '1' || value === 'true' || value === 'yes'
}
