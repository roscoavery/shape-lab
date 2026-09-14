/**
 * Path-level authorization for the gym API.
 * Health and /api/auth/* are handled before this gate.
 */

import type { IncomingMessage, ServerResponse } from 'node:http'
import { sendJson } from '../instagramResolve.ts'
import { userFromRequest } from './sessions.ts'
import { canWriteCoachTools, canWriteGymLibrary, isAdmin } from './permissions.ts'
import type { AuthUser } from './types.ts'

/** Instructional / gym-tool writes limited to admin. */
const ADMIN_WRITE_PATHS = new Set([
  '/api/contacts',
  '/api/contacts.csv',
  '/api/library',
  '/api/shape-copy',
  '/api/still-crops',
  '/api/research',
  '/api/coach-stills',
])

const COACH_WRITE_PATHS = new Set([
  '/api/lessons',
  '/api/coach-classes',
  '/api/coach-content',
  '/api/coach-media',
  '/api/training-events',
  '/api/skill-paths',
  '/api/ig-stills',
  '/api/learn-notes',
  '/api/chalkboards',
  '/api/coach-library',
])

function isWrite(method: string | undefined): boolean {
  return method === 'POST' || method === 'PUT' || method === 'PATCH' || method === 'DELETE'
}

export type GateResult =
  | { handled: true; user?: undefined }
  | { handled: false; user: AuthUser }

export async function gateApiRequest(
  req: IncomingMessage,
  res: ServerResponse,
  path: string,
): Promise<GateResult> {
  const user = await userFromRequest(req)
  if (!user) {
    sendJson(res, 401, { error: 'Sign in to continue.' })
    return { handled: true }
  }

  if (path === '/api/contacts' || path === '/api/contacts.csv') {
    if (!isAdmin(user)) {
      sendJson(res, 403, { error: 'Contacts are limited to gym admin.' })
      return { handled: true }
    }
    return { handled: false, user }
  }

  if (isWrite(req.method) && ADMIN_WRITE_PATHS.has(path) && !canWriteGymLibrary(user)) {
    sendJson(res, 403, { error: 'That change is limited to gym admin.' })
    return { handled: true }
  }

  if (isWrite(req.method) && COACH_WRITE_PATHS.has(path) && !canWriteCoachTools(user)) {
    sendJson(res, 403, { error: 'That change is limited to coaches and gym admin.' })
    return { handled: true }
  }

  return { handled: false, user }
}
