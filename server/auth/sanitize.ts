/**
 * Strip private athlete fields before they leave the server.
 * Hiding fields in React is not enough.
 */

import { applyPrivacyDefaults } from './privacy.ts'
import {
  canSeeAdminContacts,
  canSeeCoachNotes,
  canSeeHealth,
  isAdmin,
  isKiosk,
  type RosterAthlete,
} from './permissions.ts'
import type { AuthUser } from './types.ts'

const CONTACT_FIELDS = ['email', 'phone', 'parentPhone'] as const
const HEALTH_FIELDS = ['hasBackPain', 'injuryActive', 'intakeAnswers'] as const
const AUTH_FIELDS = ['passcodeHash'] as const
const INTERNAL_FIELDS = ['coachNotes'] as const

function omit(row: Record<string, unknown>, keys: readonly string[]): Record<string, unknown> {
  const next = { ...row }
  for (const key of keys) delete next[key]
  return next
}

export async function sanitizeAthleteForViewer(
  user: AuthUser,
  athlete: RosterAthlete,
  athletes: RosterAthlete[] = [],
): Promise<RosterAthlete> {
  const withPrivacy = applyPrivacyDefaults(athlete)
  let next = { ...withPrivacy }

  if (!isAdmin(user) && user.rosterProfileId !== athlete.id) {
    next = omit(next, AUTH_FIELDS)
  }

  if (!canSeeAdminContacts(user) && user.rosterProfileId !== athlete.id) {
    const parentOf = user.role === 'parent'
    if (!parentOf) {
      next = omit(next, CONTACT_FIELDS)
    } else {
      next = omit(next, ['email'])
    }
  }

  if (user.role === 'coach' && !isAdmin(user)) {
    next = omit(next, ['parentPhone', 'email'])
  }

  if (!(await canSeeHealth(user, athlete, athletes))) {
    next = omit(next, HEALTH_FIELDS)
  }

  if (!(await canSeeCoachNotes(user, athlete))) {
    next = omit(next, INTERNAL_FIELDS)
  }

  return next as RosterAthlete
}

function rowAthleteId(row: unknown): string | null {
  if (!row || typeof row !== 'object') return null
  const id = (row as { athleteId?: unknown }).athleteId
  return typeof id === 'string' && id ? id : null
}

export function filterRowsForAthleteIds(rows: unknown[], allowedIds: Set<string>): unknown[] {
  return rows.filter((row) => {
    const id = rowAthleteId(row)
    if (!id) return false
    return allowedIds.has(id)
  })
}

export function filterKeyedMap(map: Record<string, unknown>, allowedIds: Set<string>): Record<string, unknown> {
  const next: Record<string, unknown> = {}
  for (const [id, value] of Object.entries(map)) {
    if (allowedIds.has(id)) next[id] = value
  }
  return next
}

export async function sanitizeRosterForViewer(
  user: AuthUser,
  roster: {
    athletes?: unknown[]
    homework?: unknown[]
    homeworkLogs?: unknown[]
    taskProgress?: Record<string, unknown>
    flowProgress?: Record<string, unknown>
    attempts?: unknown[]
    compareLibraries?: Record<string, unknown>
    injuryLogs?: unknown[]
    painJournals?: unknown[]
    [key: string]: unknown
  },
  allowed: RosterAthlete[],
): Promise<typeof roster> {
  const allowedIds = new Set(allowed.map((row) => row.id))
  const athletes = await Promise.all(
    allowed.map((athlete) => sanitizeAthleteForViewer(user, athlete, allowed)),
  )
  const healthOk = isAdmin(user)
  const hideHealthLists = isKiosk(user)
  return {
    ...roster,
    athletes,
    homework: filterRowsForAthleteIds(Array.isArray(roster.homework) ? roster.homework : [], allowedIds),
    homeworkLogs: filterRowsForAthleteIds(
      Array.isArray(roster.homeworkLogs) ? roster.homeworkLogs : [],
      allowedIds,
    ),
    attempts: filterRowsForAthleteIds(Array.isArray(roster.attempts) ? roster.attempts : [], allowedIds),
    taskProgress: filterKeyedMap(
      roster.taskProgress && typeof roster.taskProgress === 'object' ? roster.taskProgress : {},
      allowedIds,
    ),
    flowProgress: filterKeyedMap(
      roster.flowProgress && typeof roster.flowProgress === 'object' ? roster.flowProgress : {},
      allowedIds,
    ),
    compareLibraries: isAdmin(user)
      ? roster.compareLibraries ?? {}
      : filterKeyedMap(
          roster.compareLibraries && typeof roster.compareLibraries === 'object'
            ? roster.compareLibraries
            : {},
          allowedIds,
        ),
    injuryLogs: hideHealthLists
      ? []
      : healthOk
        ? roster.injuryLogs ?? []
        : filterRowsForAthleteIds(Array.isArray(roster.injuryLogs) ? roster.injuryLogs : [], allowedIds),
    painJournals: hideHealthLists
      ? []
      : healthOk
        ? roster.painJournals ?? []
        : filterRowsForAthleteIds(Array.isArray(roster.painJournals) ? roster.painJournals : [], allowedIds),
  }
}
