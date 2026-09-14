/**
 * Cookie writes must come from this gym's host.
 * Missing Origin is allowed (Node checks, some iPad fetches).
 */

import type { IncomingHttpHeaders } from 'node:http'

export function requestHost(headers: IncomingHttpHeaders): string {
  const forwarded = headers['x-forwarded-host']
  if (typeof forwarded === 'string' && forwarded.trim()) {
    return forwarded.split(',')[0].trim()
  }
  return typeof headers.host === 'string' ? headers.host : ''
}

export function requestOrigin(headers: IncomingHttpHeaders): string | undefined {
  return typeof headers.origin === 'string' ? headers.origin : undefined
}

export function writeOriginForbidden(
  method: string | undefined,
  origin: string | undefined,
  host: string,
): boolean {
  if (!method || method === 'GET' || method === 'HEAD' || method === 'OPTIONS') return false
  if (!origin) return false
  if (!host) return true
  try {
    return new URL(origin).host !== host
  } catch {
    return true
  }
}

export function requestWriteOriginForbidden(req: {
  method?: string
  headers: IncomingHttpHeaders
}): boolean {
  return writeOriginForbidden(req.method, requestOrigin(req.headers), requestHost(req.headers))
}
