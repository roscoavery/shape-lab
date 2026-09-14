/**
 * Server-side account, session, and role types for Shape Lab V4.
 * Roles stay extensible (gymOwner now; more gym roles later).
 */

export const ACCOUNT_ROLES = ['admin', 'coach', 'athlete', 'parent', 'gymOwner'] as const

export type AccountRole = (typeof ACCOUNT_ROLES)[number]

export type Account = {
  id: string
  email: string
  passwordHash: string
  role: AccountRole
  displayName: string
  rosterProfileId?: string
  linkedAthleteIds?: string[]
  createdAt: string
  updatedAt: string
}

export type SessionRecord = {
  id: string
  accountId: string
  createdAt: string
  expiresAt: string
}

/** Authenticated viewer used by API authorization. Never includes a password hash. */
export type AuthUser = {
  accountId: string
  email: string
  role: AccountRole
  displayName: string
  rosterProfileId?: string
  linkedAthleteIds: string[]
}

export type PublicAthlete = Record<string, unknown> & { id: string }

export function isAccountRole(value: unknown): value is AccountRole {
  return typeof value === 'string' && (ACCOUNT_ROLES as readonly string[]).includes(value)
}

export function isAdminRole(role: AccountRole): boolean {
  return role === 'admin' || role === 'gymOwner'
}
