/**
 * Ryan is the gym-computer profile. Always on the roster. IG crops saved
 * while this profile is selected are written to the Shape Lab server so a
 * new browser or phone link still has them.
 */

import type { Athlete } from '../types'

export const RYAN_PROFILE_ID = 'ath_ryan'
export const RYAN_PROFILE_NAME = 'Ryan'

export function isRyanName(name: string | null | undefined): boolean {
  return (name ?? '').trim().toLowerCase() === 'ryan'
}

export function isRyanAthlete(athlete: Athlete | null | undefined): boolean {
  if (!athlete) return false
  return athlete.id === RYAN_PROFILE_ID || isRyanName(athlete.name)
}

export function findRyan(athletes: Athlete[]): Athlete | undefined {
  return athletes.find(isRyanAthlete)
}

export function makeRyanProfile(): Athlete {
  return {
    id: RYAN_PROFILE_ID,
    name: RYAN_PROFILE_NAME,
    createdAt: '2024-01-01T00:00:00.000Z',
  }
}

/** Ryan first, never duplicated. Safe to run on every roster load. */
export function ensureRyanInAthletes(list: Athlete[]): Athlete[] {
  const ryan = findRyan(list) ?? makeRyanProfile()
  const rest = list.filter((a) => !isRyanAthlete(a))
  rest.sort((a, b) => a.name.localeCompare(b.name))
  return [ryan, ...rest]
}
