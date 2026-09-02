import type { Athlete } from '../types'
import { isCoachProfile, profileRole } from './profileRole'

export function coachShareLabel(coach: Pick<Athlete, 'name' | 'firstName'> | null | undefined): string {
  if (!coach) return 'Coach'
  const first = (coach.firstName || coach.name.split(/\s+/)[0] || 'Coach').trim()
  if (/^coach\b/i.test(first)) return first
  return `Coach ${first}`
}

export function isCoachToAthlete(
  from: Athlete | null | undefined,
  to: Athlete | null | undefined,
): boolean {
  return Boolean(from && to && isCoachProfile(from) && profileRole(to) === 'athlete')
}

/**
 * Coaches may only reach athletes by sharing a reference.
 * High-fives, fist bumps, and likes live outside DMs.
 */
export function coachAthleteMessageAllowed(params: {
  from: Athlete | null | undefined
  to: Athlete | null | undefined
  text: string
  shareUrl?: string
}): { ok: true } | { ok: false; reason: string } {
  if (!isCoachToAthlete(params.from, params.to)) return { ok: true }
  const url = params.shareUrl?.trim() ?? ''
  if (!url) {
    return {
      ok: false,
      reason:
        'Coaches share a reference with an athlete — or give a high five, fist bump, or like. Direct messages stay off.',
    }
  }
  if (!/^https?:\/\//i.test(url) && !url.startsWith('/') && !url.startsWith('blob:')) {
    return { ok: false, reason: 'Paste a public video or Shape Lab reference URL to share.' }
  }
  return { ok: true }
}

export function coachShareCaption(text: string): string {
  const trimmed = text.trim()
  return trimmed || 'Shared a reference'
}
