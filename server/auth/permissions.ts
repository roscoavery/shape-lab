/**
 * Central server-side authorization. Do not trust role flags from the browser.
 */

import { readCoachClassesFile } from '../coachClassStore.ts'
import { readLessonsFile } from '../lessonStore.ts'
import { readTrainingEventsFile } from '../trainingEventStore.ts'
import { isAdminRole, type AuthUser } from './types.ts'

export type RosterAthlete = Record<string, unknown> & { id: string }

export function requireAuthenticatedUser(user: AuthUser | null): AuthUser {
  if (!user) {
    const err = new Error('Sign in to continue.')
    ;(err as Error & { status: number }).status = 401
    throw err
  }
  return user
}

export function requireAdmin(user: AuthUser | null): AuthUser {
  const authed = requireAuthenticatedUser(user)
  if (!isAdminRole(authed.role)) {
    const err = new Error('That action is limited to gym admin.')
    ;(err as Error & { status: number }).status = 403
    throw err
  }
  return authed
}

export function isKiosk(user: AuthUser | null | undefined): boolean {
  return Boolean(user?.kiosk)
}

export function isAdmin(user: AuthUser | null | undefined): boolean {
  return Boolean(user && isAdminRole(user.role) && !user.kiosk)
}

function asIds(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return [...new Set(value.filter((id): id is string => typeof id === 'string' && Boolean(id)))]
}

function text(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

export function athleteRole(athlete: RosterAthlete | null | undefined): string {
  const role = text(athlete?.role)
  if (athlete?.id === 'ath_ryan' || text(athlete?.name).trim().toLowerCase() === 'ryan') {
    return role || 'coach'
  }
  return role || 'athlete'
}

export function worksWithCoachIds(athlete: RosterAthlete | null | undefined): string[] {
  return asIds(athlete?.worksWithCoachIds)
}

export function canParentAccessAthlete(
  user: AuthUser | null | undefined,
  athlete: RosterAthlete,
  athletes: RosterAthlete[] = [],
): boolean {
  if (!user || user.role !== 'parent') return false
  return parentSees(user, athlete, athletes)
}

export function parentLinkedFromRoster(
  user: AuthUser,
  athletes: RosterAthlete[],
): string[] {
  const fromAccount = [...user.linkedAthleteIds]
  const profile = athletes.find((row) => row.id && row.id === user.rosterProfileId)
  const fromParentRow = asIds(profile?.linkedAthleteIds)
  const fromGuardians = athletes
    .filter((row) => {
      const rels = Array.isArray(row.guardianRelationships) ? row.guardianRelationships : []
      return rels.some((raw) => {
        if (!raw || typeof raw !== 'object') return false
        const rel = raw as { rosterProfileId?: unknown; accountId?: unknown }
        return (
          (typeof rel.rosterProfileId === 'string' && rel.rosterProfileId === user.rosterProfileId) ||
          (typeof rel.accountId === 'string' && rel.accountId === user.accountId)
        )
      })
    })
    .map((row) => row.id)
  return [...new Set([...fromAccount, ...fromParentRow, ...fromGuardians])]
}

function parentSees(user: AuthUser, athlete: RosterAthlete, athletes: RosterAthlete[]): boolean {
  return parentLinkedFromRoster(user, athletes).includes(athlete.id)
}

type CoachRelContext = {
  offerings: Record<string, unknown>[]
  meetings: Record<string, unknown>[]
  lessons: Record<string, unknown>[]
  events: Record<string, unknown>[]
}

let relCache: { at: number; ctx: CoachRelContext } | null = null

async function coachRelContext(): Promise<CoachRelContext> {
  const now = Date.now()
  if (relCache && now - relCache.at < 4000) return relCache.ctx
  try {
    const [classes, lessons, events] = await Promise.all([
      readCoachClassesFile(),
      readLessonsFile(),
      readTrainingEventsFile(),
    ])
    const ctx: CoachRelContext = {
      offerings: Array.isArray(classes.offerings)
        ? (classes.offerings as Record<string, unknown>[])
        : [],
      meetings: Array.isArray(classes.meetings)
        ? (classes.meetings as Record<string, unknown>[])
        : [],
      lessons: Array.isArray(lessons.sessions)
        ? (lessons.sessions as Record<string, unknown>[])
        : [],
      events: Array.isArray((events as { events?: unknown }).events)
        ? ((events as { events: Record<string, unknown>[] }).events)
        : [],
    }
    relCache = { at: now, ctx }
    return ctx
  } catch {
    return { offerings: [], meetings: [], lessons: [], events: [] }
  }
}

function coachAssignedOnRoster(coachId: string, athlete: RosterAthlete): boolean {
  if (!coachId) return false
  if (text(athlete.createdByCoachId) === coachId) return true
  return worksWithCoachIds(athlete).includes(coachId)
}

function coachAssignedByClasses(coachId: string, athlete: RosterAthlete, ctx: CoachRelContext): boolean {
  for (const offering of ctx.offerings) {
    const coaches = new Set([text(offering.coachId), ...asIds(offering.coachIds)])
    if (!coaches.has(coachId)) continue
    if (asIds(offering.rosterIds).includes(athlete.id)) return true
  }
  for (const meeting of ctx.meetings) {
    const offering = ctx.offerings.find((row) => row.id === meeting.offeringId)
    const coaches = new Set([
      text(meeting.coachId),
      text(offering?.coachId),
      ...asIds(offering?.coachIds),
    ])
    if (!coaches.has(coachId)) continue
    const attendees = Array.isArray(meeting.attendees) ? meeting.attendees : []
    for (const raw of attendees) {
      if (!raw || typeof raw !== 'object') continue
      const row = raw as Record<string, unknown>
      if (text(row.athleteId) === athlete.id) return true
    }
  }
  for (const lesson of ctx.lessons) {
    const coach = text(lesson.coachId) || text(lesson.ownerId)
    if (coach !== coachId) continue
    const ids = [
      ...asIds(lesson.athleteIds),
      text(lesson.athleteId),
    ].filter(Boolean)
    if (ids.includes(athlete.id)) return true
  }
  for (const event of ctx.events) {
    if (!asIds(event.coachIds).includes(coachId)) continue
    if (asIds(event.athleteIds).includes(athlete.id)) return true
    if (asIds(athlete.eventIds).includes(text(event.id))) return true
  }
  return false
}

export async function canCoachAthlete(
  user: AuthUser | null | undefined,
  athlete: RosterAthlete,
): Promise<boolean> {
  if (!user || (user.role !== 'coach' && !isAdminRole(user.role))) return false
  if (isAdminRole(user.role)) return true
  const coachId = user.rosterProfileId
  if (!coachId) return false
  if (coachAssignedOnRoster(coachId, athlete)) return true
  return coachAssignedByClasses(coachId, athlete, await coachRelContext())
}

export async function canAccessAthlete(
  user: AuthUser | null | undefined,
  athlete: RosterAthlete,
  athletes: RosterAthlete[] = [],
): Promise<boolean> {
  if (!user) return false
  if (isAdminRole(user.role)) return true
  if (user.rosterProfileId && user.rosterProfileId === athlete.id) return true
  if (user.role === 'parent' && parentSees(user, athlete, athletes)) return true
  if (user.role === 'coach' && (await canCoachAthlete(user, athlete))) return true
  return false
}

export async function canEditAthlete(
  user: AuthUser | null | undefined,
  athlete: RosterAthlete,
  athletes: RosterAthlete[] = [],
): Promise<boolean> {
  if (!user) return false
  if (isAdminRole(user.role)) return true
  if (user.role === 'athlete' && user.rosterProfileId === athlete.id) return true
  if (user.role === 'parent' && parentSees(user, athlete, athletes)) return true
  if (user.role === 'coach' && (await canCoachAthlete(user, athlete))) return true
  return false
}

export function canCreateAthlete(user: AuthUser | null | undefined): boolean {
  if (!user || isKiosk(user)) return false
  return isAdmin(user) || user.role === 'coach'
}

export function canSeeAdminContacts(user: AuthUser | null | undefined): boolean {
  return isAdmin(user)
}

export async function canSeeHealth(
  user: AuthUser | null | undefined,
  athlete: RosterAthlete,
  athletes: RosterAthlete[] = [],
): Promise<boolean> {
  if (!user) return false
  if (isAdmin(user)) return true
  if (user.rosterProfileId === athlete.id) return true
  if (user.role === 'parent' && parentSees(user, athlete, athletes)) return true
  if (user.role === 'coach') return canCoachAthlete(user, athlete)
  return false
}

/** Full birthday. Admin, the athlete, and linked parents only. */
export function canSeeDateOfBirth(
  user: AuthUser | null | undefined,
  athlete: RosterAthlete,
  athletes: RosterAthlete[] = [],
): boolean {
  if (!user) return false
  if (isAdmin(user)) return true
  if (user.rosterProfileId === athlete.id) return true
  if (user.role === 'parent' && parentSees(user, athlete, athletes)) return true
  return false
}

export async function canSeeCoachNotes(
  user: AuthUser | null | undefined,
  athlete: RosterAthlete,
): Promise<boolean> {
  if (!user) return false
  if (isAdminRole(user.role)) return true
  if (user.role === 'coach') return canCoachAthlete(user, athlete)
  return false
}

export function canWriteGymLibrary(user: AuthUser | null | undefined): boolean {
  return isAdmin(user)
}

export function canWriteCoachTools(user: AuthUser | null | undefined): boolean {
  if (!user) return false
  return isAdminRole(user.role) || user.role === 'coach'
}

export function statusError(status: number, message: string): Error & { status: number } {
  const err = new Error(message) as Error & { status: number }
  err.status = status
  return err
}
