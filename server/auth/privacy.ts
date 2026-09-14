/**
 * Additive privacy and consent defaults.
 * Never flip an existing intentionally-public profile to private.
 * Consent UX is incomplete — defaults stay conservative.
 */

export type ProfileVisibility = 'private' | 'public' | 'gym'
export type ConsentState = 'unknown' | 'pending' | 'granted' | 'declined'

export const CONSENT_INCOMPLETE =
  'CONSENT UX INCOMPLETE: these fields are stored for a later parent-consent flow. Do not treat a missing or unknown value as permission.'

export type PrivacyFields = {
  profileVisibility: ProfileVisibility
  allowWinsOnFeed: boolean
  allowStories: boolean
  showProfilePhoto: boolean
  showCoachNames: boolean
  parentConsentStatus: ConsentState
  parentConsentAt?: string
  mediaConsent: ConsentState
  publicProfileConsent: ConsentState
  instructionalMediaConsent: ConsentState
  researchConsent: ConsentState
}

function asVisibility(value: unknown, profilePublic: unknown): ProfileVisibility {
  if (value === 'public' || value === 'gym' || value === 'private') return value
  if (profilePublic === true) return 'public'
  return 'private'
}

function asConsent(value: unknown): ConsentState {
  if (value === 'pending' || value === 'granted' || value === 'declined' || value === 'unknown') {
    return value
  }
  return 'unknown'
}

/** Additive defaults. Does not delete or rewrite existing values. */
export function applyPrivacyDefaults(athlete: Record<string, unknown>): Record<string, unknown> {
  const visibility = asVisibility(athlete.profileVisibility, athlete.profilePublic)
  return {
    ...athlete,
    profileVisibility: visibility,
    allowWinsOnFeed: athlete.allowWinsOnFeed === true,
    allowStories: athlete.allowStories === true,
    showProfilePhoto: athlete.showProfilePhoto !== false,
    showCoachNames: athlete.showCoachNames !== false && athlete.showCoachesOnProfile !== false,
    parentConsentStatus: asConsent(athlete.parentConsentStatus),
    parentConsentAt: typeof athlete.parentConsentAt === 'string' ? athlete.parentConsentAt : undefined,
    mediaConsent: asConsent(athlete.mediaConsent),
    publicProfileConsent: asConsent(athlete.publicProfileConsent),
    instructionalMediaConsent: asConsent(athlete.instructionalMediaConsent),
    researchConsent: asConsent(athlete.researchConsent),
  }
}

export function newAthletePrivacyDefaults(): Partial<PrivacyFields> & { profilePublic: false } {
  return {
    profilePublic: false,
    profileVisibility: 'private',
    allowWinsOnFeed: false,
    allowStories: false,
    showProfilePhoto: true,
    showCoachNames: true,
    parentConsentStatus: 'unknown',
    mediaConsent: 'unknown',
    publicProfileConsent: 'unknown',
    instructionalMediaConsent: 'unknown',
    researchConsent: 'unknown',
  }
}

export function isIntentionallyPublic(athlete: Record<string, unknown>): boolean {
  return athlete.profilePublic === true || athlete.profileVisibility === 'public'
}
