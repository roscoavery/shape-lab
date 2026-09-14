import type { Athlete, GuardianRelationship } from '../types'
import { createId } from './storage'
import { profileRole } from './profileRole'

export function linkedAthleteIds(parent: Athlete | null | undefined): string[] {
  if (!parent) return []
  const ids = (parent.linkedAthleteIds ?? []).filter((id) => typeof id === 'string' && id)
  return [...new Set(ids)]
}

export function guardianIdsOf(athlete: Athlete | null | undefined): string[] {
  if (!athlete) return []
  const ids = (athlete.guardianRelationships ?? [])
    .map((row) => row.rosterProfileId)
    .filter((id): id is string => Boolean(id))
  return [...new Set(ids)]
}

export function childAthletes(parent: Athlete | null | undefined, athletes: Athlete[]): Athlete[] {
  if (!parent) return []
  const ids = new Set(linkedAthleteIds(parent))
  return athletes.filter((a) => {
    if (profileRole(a) !== 'athlete') return false
    if (ids.has(a.id)) return true
    return (a.guardianRelationships ?? []).some((row) => row.rosterProfileId === parent.id)
  })
}

export function parentsOf(athleteId: string, athletes: Athlete[]): Athlete[] {
  const athlete = athletes.find((row) => row.id === athleteId)
  const guardianIds = new Set(guardianIdsOf(athlete))
  return athletes.filter((a) => {
    if (profileRole(a) !== 'parent') return false
    if (linkedAthleteIds(a).includes(athleteId)) return true
    return guardianIds.has(a.id)
  })
}

export function parentSeesAthlete(
  parent: Athlete | null | undefined,
  athleteId: string | null | undefined,
): boolean {
  if (!parent || !athleteId) return false
  if (profileRole(parent) !== 'parent') return false
  return linkedAthleteIds(parent).includes(athleteId)
}

export function childNamesLabel(parent: Athlete, athletes: Athlete[]): string {
  const kids = childAthletes(parent, athletes)
  if (kids.length) return kids.map((k) => k.name).join(', ')
  return parent.childName?.trim() || ''
}

export function withLinkedAthletes(
  parent: Athlete,
  ids: string[],
  athletes: Athlete[],
): Athlete {
  const unique = [...new Set(ids.filter(Boolean))]
  const names = unique
    .map((id) => athletes.find((a) => a.id === id)?.name)
    .filter((n): n is string => Boolean(n))
  return {
    ...parent,
    linkedAthleteIds: unique,
    childName: names.join(', ') || parent.childName,
  }
}

function withGuardian(athlete: Athlete, parent: Athlete): Athlete {
  const existing = athlete.guardianRelationships ?? []
  if (existing.some((row) => row.rosterProfileId === parent.id)) return athlete
  const row: GuardianRelationship = {
    id: createId('grd'),
    kind: 'parent',
    createdAt: new Date().toISOString(),
    rosterProfileId: parent.id,
  }
  return { ...athlete, guardianRelationships: [...existing, row] }
}

/** Keep parent.linkedAthleteIds and additive athlete.guardianRelationships in sync. */
export function linkParentToAthletes(
  parent: Athlete,
  ids: string[],
  athletes: Athlete[],
): Athlete[] {
  const nextParent = withLinkedAthletes(parent, ids, athletes)
  const linked = new Set(ids.filter(Boolean))
  return athletes.map((row) => {
    if (row.id === parent.id) return nextParent
    if (linked.has(row.id)) return withGuardian(row, nextParent)
    if ((row.guardianRelationships ?? []).some((rel) => rel.rosterProfileId === parent.id) && !linked.has(row.id)) {
      return {
        ...row,
        guardianRelationships: (row.guardianRelationships ?? []).filter(
          (rel) => rel.rosterProfileId !== parent.id,
        ),
      }
    }
    return row
  })
}
