import type { Athlete } from '../types'
import { namesMatch } from './classStation'
import { profileRole } from './profileRole'

export function likelyExistingAthletes(
  firstName: string,
  lastName: string,
  athletes: Athlete[],
): Athlete[] {
  const first = firstName.trim()
  const last = lastName.trim()
  if (!first || !last) return []
  return athletes.filter(
    (row) => profileRole(row) === 'athlete' && namesMatch(row, first, last),
  )
}

export function duplicateAthleteMessage(matches: Athlete[]): string {
  if (matches.length === 0) return ''
  const names = matches.map((row) => row.name).join(', ')
  return `${names} is already on this gym. Link the parent to that profile instead of creating another one.`
}
