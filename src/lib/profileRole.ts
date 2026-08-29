import type { Athlete } from '../types'
import { isRyanAthlete } from './ryanProfile'

export type ProfileRole = 'coach' | 'athlete'

export function profileRole(athlete: Athlete | null | undefined): ProfileRole {
  if (!athlete) return 'athlete'
  if (isRyanAthlete(athlete)) return 'coach'
  return athlete.role === 'coach' ? 'coach' : 'athlete'
}

export function isCoachProfile(athlete: Athlete | null | undefined): boolean {
  return profileRole(athlete) === 'coach'
}

/** Ryan only — gym Compare library, shape copy, still crops, gym collages. */
export function isGymAdmin(athlete: Athlete | null | undefined): boolean {
  return isRyanAthlete(athlete)
}

export function roleLabel(athlete: Athlete | null | undefined): string {
  return isCoachProfile(athlete) ? 'Coach' : 'Athlete'
}
