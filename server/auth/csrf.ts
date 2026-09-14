/**
 * Gym mark for cookie-backed writes.
 * Account routes and gym-file PUTs (roster, lessons, classes, …) require it.
 * Other writes still rely on Origin (Bind).
 */

import { timingSafeEqual } from 'node:crypto'
import type { IncomingHttpHeaders } from 'node:http'

export const CSRF_HEADER = 'x-shape-lab-csrf'

const GYM_WRITE_PATHS = new Set([
  '/api/roster',
  '/api/roster-photos',
  '/api/lessons',
  '/api/coach-classes',
  '/api/coach-content',
  '/api/chalkboards',
  '/api/skill-paths',
  '/api/training-events',
])

function isWriteMethod(method: string | undefined): boolean {
  const m = (method || '').toUpperCase()
  return m === 'POST' || m === 'PUT' || m === 'PATCH' || m === 'DELETE'
}

export function authWriteNeedsCsrf(method: string | undefined, path: string): boolean {
  if (!isWriteMethod(method)) return false
  if (
    path === '/api/auth/login' ||
    path === '/api/auth/bootstrap' ||
    path === '/api/auth/invite'
  ) {
    return false
  }
  return path.startsWith('/api/auth/')
}

export function gymWriteNeedsCsrf(method: string | undefined, path: string): boolean {
  if (!isWriteMethod(method)) return false
  return GYM_WRITE_PATHS.has(path)
}

export function writeNeedsCsrf(method: string | undefined, path: string): boolean {
  return authWriteNeedsCsrf(method, path) || gymWriteNeedsCsrf(method, path)
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
