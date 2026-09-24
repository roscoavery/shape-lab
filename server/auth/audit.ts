/**
 * Small append-only audit log for sensitive V4 actions.
 * Incomplete on purpose — do not treat this as a compliance system.
 */

import { readJson, writeJson } from '../persist.ts'
import type { AuthUser } from './types.ts'

const FILE = 'data/audit.json'
const MAX_EVENTS = 2000

export type AuditAction =
  | 'auth.login'
  | 'auth.logout'
  | 'auth.account_create'
  | 'auth.kiosk'
  | 'auth.invite'
  | 'auth.account_delete'
  | 'roster.view'
  | 'roster.write'
  | 'contacts.view'
  | 'athlete.view'
  | 'athlete.edit'
  | 'parent.link'
  | 'media.delete'
  | 'media.view'
  | 'role.change'

export type AuditEvent = {
  at: string
  action: AuditAction
  actorId?: string
  actorEmail?: string
  actorRole?: string
  athleteId?: string
  detail?: string
}

type AuditFile = {
  kind: 'shape-lab-audit'
  version: 1
  events: AuditEvent[]
}

const EMPTY: AuditFile = { kind: 'shape-lab-audit', version: 1, events: [] }

const VIEW_ACTIONS = new Set<AuditAction>([
  'roster.view',
  'roster.write',
  'media.view',
  'athlete.view',
])

export async function readAudit(opts?: {
  includeViews?: boolean
  limit?: number
}): Promise<AuditEvent[]> {
  try {
    const stored = await readJson<AuditFile>(FILE, EMPTY)
    const events = Array.isArray(stored.events) ? stored.events : []
    const filtered = opts?.includeViews
      ? events
      : events.filter((row) => !VIEW_ACTIONS.has(row.action))
    const limit = Math.min(Math.max(opts?.limit ?? 80, 1), 400)
    return filtered.slice(-limit).reverse()
  } catch {
    return []
  }
}

export async function writeAudit(
  action: AuditAction,
  user: AuthUser | null | undefined,
  extra?: { athleteId?: string; detail?: string },
): Promise<void> {
  try {
    const stored = await readJson<AuditFile>(FILE, EMPTY)
    const events = Array.isArray(stored.events) ? stored.events : []
    events.push({
      at: new Date().toISOString(),
      action,
      actorId: user?.accountId,
      actorEmail: user?.email,
      actorRole: user?.role,
      athleteId: extra?.athleteId,
      detail: extra?.detail,
    })
    await writeJson(FILE, {
      kind: 'shape-lab-audit',
      version: 1,
      events: events.slice(-MAX_EVENTS),
    } satisfies AuditFile)
  } catch {
    /* audit must never break a request */
  }
}
