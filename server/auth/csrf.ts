/**
 * Gym mark for cookie-backed account writes.
 * Roster PUTs still rely on Origin (Bind). Missing Origin is allowed there.
 */

import { timingSafeEqual } from 'node:crypto'
import type { IncomingHttpHeaders } from 'node:http'

export const CSRF_HEADER = 'x-shape-lab-csrf'

export function authWriteNeedsCsrf(method: string | undefined, path: string): boolean {
  const m = (method || '').toUpperCase()
  if (m === 'GET' || m === 'HEAD' || m === 'OPTIONS' || !m) return false
  if (
    path === '/api/auth/login' ||
    path === '/api/auth/bootstrap' ||
    path === '/api/auth/invite'
  ) {
    return false
  }
  return path.startsWith('/api/auth/')
}

export function readCsrfHeader(headers: IncomingHttpHeaders): string {
  const raw = headers[CSRF_HEADER]
  if (Array.isArray(raw)) return (raw[0] || '').trim()
  return typeof raw === 'string' ? raw.trim() : ''
}

export function csrfForbidden(got: string, want: string | undefined): boolean {
  if (!want || want.length < 32) return true
  if (!got || got.length !== want.length) return true
  try {
    return !timingSafeEqual(Buffer.from(got), Buffer.from(want))
  } catch {
    return true
  }
}
