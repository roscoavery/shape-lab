import type { Athlete } from '../types'
import { profileRole } from './profileRole'

export function linkedAthleteIds(parent: Athlete | null | undefined): string[] {
  if (!parent) return []
  const ids = (parent.linkedAthleteIds ?? []).filter((id) => typeof id === 'string' && id)
  return [...new Set(ids)]
}

export function childAthletes(parent: Athlete | null | undefined, athletes: Athlete[]): Athlete[] {
  const ids = new Set(linkedAthleteIds(parent))
  return athletes.filter((a) => ids.has(a.id) && profileRole(a) === 'athlete')
}

export function parentsOf(athleteId: string, athletes: Athlete[]): Athlete[] {
  return athletes.filter(
    (a) => profileRole(a) === 'parent' && linkedAthleteIds(a).includes(athleteId),
  )
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
