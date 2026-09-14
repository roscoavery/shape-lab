/**
 * In-memory request pacing. Not a WAF. Caps bursts on this Node process.
 */

import type { IncomingMessage } from 'node:http'

type Bucket = { count: number; resetAt: number }

const buckets = new Map<string, Bucket>()
let lastPrune = 0

function prune(now: number): void {
  if (now - lastPrune < 60_000) return
  lastPrune = now
  for (const [key, row] of buckets) {
    if (now > row.resetAt) buckets.delete(key)
  }
}

/** True when this key has already used `max` tries in the window. */
export function tooMany(key: string, max: number, windowMs: number): boolean {
  const now = Date.now()
  prune(now)
  const row = buckets.get(key)
  if (!row || now > row.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs })
    return false
  }
  row.count += 1
  return row.count > max
}

export function clientIp(req: IncomingMessage): string {
  const forwarded =
    typeof req.headers['x-forwarded-for'] === 'string' ? req.headers['x-forwarded-for'] : ''
  const first = forwarded.split(',')[0]?.trim()
  if (first) return first
  return req.socket?.remoteAddress || 'unknown'
}

export function ipKey(req: IncomingMessage, prefix: string): string {
  return `${prefix}:${clientIp(req)}`
}
