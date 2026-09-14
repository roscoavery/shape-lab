/**
 * Pause gym PUTs after the server says too many.
 * Roster, lessons, and the other gym files share this cooldown in this tab.
 */

import { noteSessionLost } from './authSession'

export const GYM_WRITE_COOLDOWN_MS = 60_000

let holdUntil = 0

export function resetGymWritePaceForTests(): void {
  holdUntil = 0
}

export function shouldHoldGymWrite(now = Date.now()): boolean {
  return now < holdUntil
}

export function noteGymWriteLimited(now = Date.now()): void {
  holdUntil = now + GYM_WRITE_COOLDOWN_MS
}

export function isStopWriteStatus(status: number): boolean {
  return status === 401 || status === 403 || status === 429
}

/** Same-origin gym write. Skips the network while this tab is in a 429 pause. */
export async function gymWriteFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  if (shouldHoldGymWrite()) {
    return new Response(JSON.stringify({ error: 'Too many saves. Wait a minute.' }), {
      status: 429,
      headers: { 'Content-Type': 'application/json' },
    })
  }
  const res = await fetch(input, init)
  if (res.status === 429) noteGymWriteLimited()
  if (res.status === 401) noteSessionLost()
  return res
}
