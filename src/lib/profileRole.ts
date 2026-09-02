import type { Athlete } from '../types'
import { isRyanAthlete } from './ryanProfile'

export type ProfileKind = 'gym_owner' | 'coach' | 'athlete' | 'parent'

export const PROFILE_KINDS: { id: ProfileKind; label: string }[] = [
  { id: 'gym_owner', label: 'Gym owner' },
  { id: 'coach', label: 'Coach' },
  { id: 'athlete', label: 'Athlete' },
  { id: 'parent', label: 'Parent' },
]

export type ProfileRole = ProfileKind

export function isProfileKind(value: unknown): value is ProfileKind {
  return value === 'gym_owner' || value === 'coach' || value === 'athlete' || value === 'parent'
}

export function profileRole(athlete: Athlete | null | undefined): ProfileKind {
  if (!athlete) return 'athlete'
  if (isRyanAthlete(athlete)) return 'coach'
  return isProfileKind(athlete.role) ? athlete.role : 'athlete'
}

/** Coaches and gym owners — Compare collections, lounge, class boards. */
export function isCoachProfile(athlete: Athlete | null | undefined): boolean {
  const role = profileRole(athlete)
  return role === 'coach' || role === 'gym_owner'
}

/** Ryan only — gym Compare library, shape copy, still crops, gym collages. */
export function isGymAdmin(athlete: Athlete | null | undefined): boolean {
  return isRyanAthlete(athlete)
}

export function roleLabel(athlete: Athlete | null | undefined): string {
  if (isRyanAthlete(athlete)) return 'Gym admin'
  const found = PROFILE_KINDS.find((k) => k.id === profileRole(athlete))
  return found?.label ?? 'Athlete'
}

export function roleHint(kind: ProfileKind): string {
  switch (kind) {
    case 'gym_owner':
      return 'Gym owners unlock Compare, Classes, Feed, Network, and Research. Paste Instagram URLs into your own collections — they stay on this profile. Ryan’s gym list stays as he left it.'
    case 'coach':
      return 'Coaches unlock to use Compare, Classes, Feed, Network, and Research. Paste Instagram URLs into your own collections — they show on this profile only. Ryan’s gym collections, shape descriptions, and picture sizes stay as he left them.'
    case 'parent':
      return 'Parents unlock to follow their athlete, watch Compare, and use Homework / Learn. Select who your athlete is so coaches know you are their parent, and so you can see their wins, homework, and activity.'
    default:
      return 'Athletes unlock homework, hold times, the video library, and Learn. Add your gym if you train somewhere we should remember.'
  }
}
