/**
 * Filter roster reads and writes so a caller cannot fetch or overwrite
 * athletes they are not allowed to see.
 */

import { newAthletePrivacyDefaults } from './privacy.ts'
import {
  canAccessAthlete,
  canCreateAthlete,
  canEditAthlete,
  isAdmin,
  type RosterAthlete,
} from './permissions.ts'
import { sanitizeRosterForViewer } from './sanitize.ts'
import type { AuthUser } from './types.ts'

const ADMIN_ONLY_FIELDS = [
  'role',
  'email',
  'parentPhone',
  'createdByCoachId',
  'passcodeHash',
] as const

const COACH_FORBIDDEN_FIELDS = ['parentPhone', 'email', 'role', 'passcodeHash'] as const

function asAthlete(raw: unknown): RosterAthlete | null {
  if (!raw || typeof raw !== 'object') return null
  const row = raw as Record<string, unknown>
  if (typeof row.id !== 'string' || !row.id) return null
  return row as RosterAthlete
}

export async function visibleAthletes(
  user: AuthUser,
  athletes: unknown[],
): Promise<RosterAthlete[]> {
  const rows = athletes.map(asAthlete).filter((row): row is RosterAthlete => Boolean(row))
  const out: RosterAthlete[] = []
  for (const row of rows) {
    if (await canAccessAthlete(user, row, rows)) out.push(row)
  }
  return out
}

export async function presentRosterForViewer(
  user: AuthUser,
  roster: { athletes?: unknown[]; [key: string]: unknown },
): Promise<Record<string, unknown>> {
  const allowed = await visibleAthletes(user, Array.isArray(roster.athletes) ? roster.athletes : [])
  return sanitizeRosterForViewer(user, roster, allowed)
}

function stripFields(row: Record<string, unknown>, keys: readonly string[]): Record<string, unknown> {
  const next = { ...row }
  for (const key of keys) delete next[key]
  return next
}

function applyAllowedEdits(
  user: AuthUser,
  existing: RosterAthlete,
  incoming: RosterAthlete,
): RosterAthlete {
  if (isAdmin(user)) return { ...existing, ...incoming, id: existing.id }

  let next: Record<string, unknown> = { ...existing, ...incoming, id: existing.id }
  if (user.role === 'coach') {
    next = stripFields(next, COACH_FORBIDDEN_FIELDS)
    next.role = existing.role
    next.email = existing.email
    next.parentPhone = existing.parentPhone
    next.passcodeHash = existing.passcodeHash
    const existingCoaches = Array.isArray(existing.worksWithCoachIds)
      ? existing.worksWithCoachIds.filter((id): id is string => typeof id === 'string')
      : []
    const incomingCoaches = Array.isArray(incoming.worksWithCoachIds)
      ? incoming.worksWithCoachIds.filter((id): id is string => typeof id === 'string')
      : existingCoaches
    const coachId = user.rosterProfileId
    next.worksWithCoachIds = [
      ...new Set([...existingCoaches.filter((id) => id !== coachId), ...incomingCoaches, coachId].filter(Boolean)),
    ]
    next.createdByCoachId = existing.createdByCoachId
  }
  if (user.role === 'athlete' || user.role === 'parent') {
    next = stripFields(next, ADMIN_ONLY_FIELDS)
    next.role = existing.role
    next.worksWithCoachIds = existing.worksWithCoachIds
    next.createdByCoachId = existing.createdByCoachId
    next.passcodeHash = incoming.passcodeHash || existing.passcodeHash
    if (user.role === 'parent') {
      next.email = existing.email
    }
  }
  return next as RosterAthlete
}

function athleteIdOf(row: unknown): string | null {
  if (!row || typeof row !== 'object') return null
  const id = (row as { athleteId?: unknown }).athleteId
  return typeof id === 'string' && id ? id : null
}

function mergeAuthorizedRows(
  existing: unknown[],
  incoming: unknown[],
  allowedIds: Set<string>,
  allowCreate: boolean,
): unknown[] {
  const keep = existing.filter((row) => {
    const id = athleteIdOf(row)
    return !id || !allowedIds.has(id)
  })
  const nextOwned = incoming.filter((row) => {
    const id = athleteIdOf(row)
    if (!id) return allowCreate
    return allowedIds.has(id)
  })
  return [...keep, ...nextOwned]
}

function mergeAuthorizedMaps(
  existing: Record<string, unknown>,
  incoming: Record<string, unknown>,
  allowedIds: Set<string>,
): Record<string, unknown> {
  const next = { ...existing }
  for (const [id, value] of Object.entries(incoming)) {
    if (allowedIds.has(id)) next[id] = value
  }
  return next
}

export async function authorizeRosterWrite(
  user: AuthUser,
  existing: { athletes?: unknown[]; [key: string]: unknown },
  incoming: { athletes?: unknown[]; [key: string]: unknown },
): Promise<{ athletes: RosterAthlete[]; [key: string]: unknown }> {
  const existingAthletes = (Array.isArray(existing.athletes) ? existing.athletes : [])
    .map(asAthlete)
    .filter((row): row is RosterAthlete => Boolean(row))
  const incomingAthletes = (Array.isArray(incoming.athletes) ? incoming.athletes : [])
    .map(asAthlete)
    .filter((row): row is RosterAthlete => Boolean(row))

  const byId = new Map(existingAthletes.map((row) => [row.id, row]))
  const nextAthletes: RosterAthlete[] = existingAthletes.map((row) => ({ ...row }))

  for (const incomingRow of incomingAthletes) {
    const prev = byId.get(incomingRow.id)
    if (!prev) {
      if (!canCreateAthlete(user)) continue
      const created: RosterAthlete = {
        ...incomingRow,
        ...newAthletePrivacyDefaults(),
        createdByCoachId:
          typeof incomingRow.createdByCoachId === 'string'
            ? incomingRow.createdByCoachId
            : user.rosterProfileId,
        worksWithCoachIds: [
          ...new Set([
            ...(Array.isArray(incomingRow.worksWithCoachIds)
              ? incomingRow.worksWithCoachIds.filter((id): id is string => typeof id === 'string')
              : []),
            user.rosterProfileId,
          ].filter(Boolean)),
        ],
      }
      nextAthletes.push(created)
      byId.set(created.id, created)
      continue
    }
    if (!(await canEditAthlete(user, prev, existingAthletes))) continue
    const patched = applyAllowedEdits(user, prev, incomingRow)
    const idx = nextAthletes.findIndex((row) => row.id === prev.id)
    if (idx >= 0) nextAthletes[idx] = patched
  }

  const editableIds = new Set<string>()
  for (const row of existingAthletes) {
    if (await canEditAthlete(user, row, existingAthletes)) editableIds.add(row.id)
  }
  for (const row of nextAthletes) {
    if (!existingAthletes.some((prev) => prev.id === row.id)) editableIds.add(row.id)
  }

  const removedIncoming = Array.isArray(incoming.removedAthleteIds)
    ? incoming.removedAthleteIds.filter((id): id is string => typeof id === 'string')
    : []
  const removedExisting = Array.isArray(existing.removedAthleteIds)
    ? existing.removedAthleteIds.filter((id): id is string => typeof id === 'string')
    : []
  const removedAthleteIds = isAdmin(user)
    ? [...new Set([...removedExisting, ...removedIncoming])]
    : removedExisting

  return {
    ...existing,
    ...incoming,
    kind: 'shape-lab-roster',
    athletes: nextAthletes,
    removedAthleteIds,
    homework: mergeAuthorizedRows(
      Array.isArray(existing.homework) ? existing.homework : [],
      Array.isArray(incoming.homework) ? incoming.homework : [],
      editableIds,
      canCreateAthlete(user),
    ),
    homeworkLogs: mergeAuthorizedRows(
      Array.isArray(existing.homeworkLogs) ? existing.homeworkLogs : [],
      Array.isArray(incoming.homeworkLogs) ? incoming.homeworkLogs : [],
      editableIds,
      true,
    ),
    attempts: mergeAuthorizedRows(
      Array.isArray(existing.attempts) ? existing.attempts : [],
      Array.isArray(incoming.attempts) ? incoming.attempts : [],
      editableIds,
      true,
    ),
    injuryLogs: mergeAuthorizedRows(
      Array.isArray(existing.injuryLogs) ? existing.injuryLogs : [],
      Array.isArray(incoming.injuryLogs) ? incoming.injuryLogs : [],
      editableIds,
      true,
    ),
    painJournals: mergeAuthorizedRows(
      Array.isArray(existing.painJournals) ? existing.painJournals : [],
      Array.isArray(incoming.painJournals) ? incoming.painJournals : [],
      editableIds,
      true,
    ),
    taskProgress: mergeAuthorizedMaps(
      existing.taskProgress && typeof existing.taskProgress === 'object'
        ? (existing.taskProgress as Record<string, unknown>)
        : {},
      incoming.taskProgress && typeof incoming.taskProgress === 'object'
        ? (incoming.taskProgress as Record<string, unknown>)
        : {},
      editableIds,
    ),
    flowProgress: mergeAuthorizedMaps(
      existing.flowProgress && typeof existing.flowProgress === 'object'
        ? (existing.flowProgress as Record<string, unknown>)
        : {},
      incoming.flowProgress && typeof incoming.flowProgress === 'object'
        ? (incoming.flowProgress as Record<string, unknown>)
        : {},
      editableIds,
    ),
    compareLibraries: isAdmin(user)
      ? incoming.compareLibraries ?? existing.compareLibraries
      : mergeAuthorizedMaps(
          existing.compareLibraries && typeof existing.compareLibraries === 'object'
            ? (existing.compareLibraries as Record<string, unknown>)
            : {},
          incoming.compareLibraries && typeof incoming.compareLibraries === 'object'
            ? (incoming.compareLibraries as Record<string, unknown>)
            : {},
          editableIds,
        ),
  }
}
