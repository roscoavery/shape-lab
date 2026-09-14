/**
 * Parent / athlete consent. unknown is not permission.
 * Class, homework, and lessons do not read these flags.
 */

import { applyPrivacyDefaults, isIntentionallyPublic, type ConsentState } from './privacy.ts'
import {
  athleteRole,
  canAccessAthlete,
  canParentAccessAthlete,
  isAdmin,
  type RosterAthlete,
} from './permissions.ts'
import type { AuthUser } from './types.ts'

export type SocialKind = 'feed' | 'wins' | 'stories'

export const CONSENT_KEYS = [
  'parentConsentStatus',
  'parentConsentAt',
  'mediaConsent',
  'publicProfileConsent',
  'instructionalMediaConsent',
  'researchConsent',
  'allowWinsOnFeed',
  'allowStories',
  'showProfilePhoto',
  'showCoachNames',
  'profileVisibility',
  'profilePublic',
] as const

export type ConsentPatch = {
  parentConsentStatus?: ConsentState
  parentConsentAt?: string
  mediaConsent?: ConsentState
  publicProfileConsent?: ConsentState
  instructionalMediaConsent?: ConsentState
  researchConsent?: ConsentState
  allowWinsOnFeed?: boolean
  allowStories?: boolean
  showProfilePhoto?: boolean
  showCoachNames?: boolean
  profileVisibility?: 'private' | 'public' | 'gym'
  profilePublic?: boolean
}

export function canEditConsent(
  user: AuthUser | null | undefined,
  athlete: RosterAthlete,
  athletes: RosterAthlete[] = [],
): boolean {
  if (!user) return false
  if (isAdmin(user)) return true
  if (user.rosterProfileId === athlete.id) return true
  return canParentAccessAthlete(user, athlete, athletes)
}

export function consentFieldsOf(athlete: RosterAthlete): Record<string, unknown> {
  const row = applyPrivacyDefaults(athlete)
  return {
    id: athlete.id,
    name: athlete.name,
    role: athlete.role,
    parentConsentStatus: row.parentConsentStatus,
    parentConsentAt: row.parentConsentAt,
    mediaConsent: row.mediaConsent,
    publicProfileConsent: row.publicProfileConsent,
    instructionalMediaConsent: row.instructionalMediaConsent,
    researchConsent: row.researchConsent,
    allowWinsOnFeed: row.allowWinsOnFeed,
    allowStories: row.allowStories,
    showProfilePhoto: row.showProfilePhoto,
    showCoachNames: row.showCoachNames,
    profileVisibility: row.profileVisibility,
    profilePublic: row.profilePublic === true,
  }
}

const CONSENT_STATES = new Set<ConsentState>(['unknown', 'pending', 'granted', 'declined'])
const VISIBILITY = new Set(['private', 'public', 'gym'] as const)

function asConsentState(value: unknown): ConsentState | undefined {
  return typeof value === 'string' && CONSENT_STATES.has(value as ConsentState)
    ? (value as ConsentState)
    : undefined
}

export function parseConsentPatch(body: unknown): ConsentPatch {
  if (!body || typeof body !== 'object') return {}
  const raw = body as Record<string, unknown>
  const patch: ConsentPatch = {}
  const parentConsentStatus = asConsentState(raw.parentConsentStatus)
  if (parentConsentStatus) patch.parentConsentStatus = parentConsentStatus
  const mediaConsent = asConsentState(raw.mediaConsent)
  if (mediaConsent) patch.mediaConsent = mediaConsent
  const publicProfileConsent = asConsentState(raw.publicProfileConsent)
  if (publicProfileConsent) patch.publicProfileConsent = publicProfileConsent
  const instructionalMediaConsent = asConsentState(raw.instructionalMediaConsent)
  if (instructionalMediaConsent) patch.instructionalMediaConsent = instructionalMediaConsent
  const researchConsent = asConsentState(raw.researchConsent)
  if (researchConsent) patch.researchConsent = researchConsent
  if (typeof raw.allowWinsOnFeed === 'boolean') patch.allowWinsOnFeed = raw.allowWinsOnFeed
  if (typeof raw.allowStories === 'boolean') patch.allowStories = raw.allowStories
  if (typeof raw.showProfilePhoto === 'boolean') patch.showProfilePhoto = raw.showProfilePhoto
  if (typeof raw.showCoachNames === 'boolean') patch.showCoachNames = raw.showCoachNames
  if (typeof raw.profileVisibility === 'string' && VISIBILITY.has(raw.profileVisibility as 'private')) {
    patch.profileVisibility = raw.profileVisibility as ConsentPatch['profileVisibility']
  }
  if (typeof raw.profilePublic === 'boolean') patch.profilePublic = raw.profilePublic
  return patch
}

export function athletesViewerMayConsent(
  user: AuthUser,
  athletes: RosterAthlete[],
): RosterAthlete[] {
  return athletes.filter(
    (row) => athleteRole(row) === 'athlete' && canEditConsent(user, row, athletes),
  )
}

export function applyConsentPatch(
  existing: RosterAthlete,
  patch: ConsentPatch,
): RosterAthlete {
  const next: RosterAthlete = { ...existing }
  if (patch.parentConsentStatus) {
    next.parentConsentStatus = patch.parentConsentStatus
    next.parentConsentAt =
      patch.parentConsentStatus === 'granted' || patch.parentConsentStatus === 'declined'
        ? new Date().toISOString()
        : existing.parentConsentAt
  }
  if (patch.mediaConsent) next.mediaConsent = patch.mediaConsent
  if (patch.publicProfileConsent) next.publicProfileConsent = patch.publicProfileConsent
  if (patch.instructionalMediaConsent) {
    next.instructionalMediaConsent = patch.instructionalMediaConsent
  }
  if (patch.researchConsent) next.researchConsent = patch.researchConsent
  if (patch.allowWinsOnFeed !== undefined) next.allowWinsOnFeed = patch.allowWinsOnFeed
  if (patch.allowStories !== undefined) next.allowStories = patch.allowStories
  if (patch.showProfilePhoto !== undefined) next.showProfilePhoto = patch.showProfilePhoto
  if (patch.showCoachNames !== undefined) next.showCoachNames = patch.showCoachNames
  if (patch.profileVisibility) next.profileVisibility = patch.profileVisibility

  const publicOk =
    next.publicProfileConsent === 'granted' || isIntentionallyPublic(existing)
  if (patch.profilePublic === true && !publicOk) {
    next.profilePublic = false
    next.profileVisibility = 'private'
  } else if (patch.profilePublic !== undefined) {
    next.profilePublic = patch.profilePublic
    if (patch.profilePublic) next.profileVisibility = next.profileVisibility === 'gym' ? 'gym' : 'public'
    else if (!patch.profileVisibility) next.profileVisibility = 'private'
  }

  next.updatedAt = new Date().toISOString()
  return next
}

export function allowsUnaffiliatedSocial(
  athlete: RosterAthlete,
  kind: SocialKind,
): boolean {
  const row = applyPrivacyDefaults(athlete)
  if (kind === 'wins') return row.allowWinsOnFeed === true
  if (kind === 'stories') return row.allowStories === true
  return isIntentionallyPublic(row) || row.publicProfileConsent === 'granted'
}

export async function viewerCanSeeSocialAbout(
  user: AuthUser,
  athlete: RosterAthlete,
  athletes: RosterAthlete[],
  kind: SocialKind,
): Promise<boolean> {
  if (await canAccessAthlete(user, athlete, athletes)) return true
  return allowsUnaffiliatedSocial(athlete, kind)
}

export function socialSubjectIds(authorId?: string, taggedIds?: string[]): string[] {
  const tags = (taggedIds ?? []).filter((id): id is string => typeof id === 'string' && Boolean(id))
  if (tags.length) return [...new Set(tags)]
  return authorId ? [authorId] : []
}

export function socialKindForFeedChannels(channels: unknown): SocialKind {
  const list = Array.isArray(channels) ? channels : []
  if (list.includes('wins')) return 'wins'
  return 'feed'
}

/** Hide a post/story unless the viewer may see every tagged athlete. */
export async function viewerCanSeeSocialSubjects(
  user: AuthUser,
  athletes: RosterAthlete[],
  kind: SocialKind,
  authorId?: string,
  taggedIds?: string[],
): Promise<boolean> {
  const ids = socialSubjectIds(authorId, taggedIds)
  const known = ids
    .map((id) => athletes.find((row) => row.id === id))
    .filter((row): row is RosterAthlete => Boolean(row))
  if (known.length === 0) return true
  for (const athlete of known) {
    if (!(await viewerCanSeeSocialAbout(user, athlete, athletes, kind))) return false
  }
  return true
}
