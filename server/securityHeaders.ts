/**
 * Browser-facing headers that do not break MediaPipe / blob clips.
 */

import type { ServerResponse } from 'node:http'

export function applySecurityHeaders(res: ServerResponse): void {
  if (!res.getHeader('X-Content-Type-Options')) {
    res.setHeader('X-Content-Type-Options', 'nosniff')
  }
  if (!res.getHeader('X-Frame-Options')) {
    res.setHeader('X-Frame-Options', 'DENY')
  }
  if (!res.getHeader('Referrer-Policy')) {
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin')
  }
}
