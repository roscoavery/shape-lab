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
  /** How many browsers may stay signed in at once. Default 4. */
  maxDevices?: number
  createdAt: string
  updatedAt: string
}

export type SessionRecord = {
  id: string
  accountId: string
  createdAt: string
  expiresAt: string
  /** Browser-only mark for account writes. Not the session cookie. */
  csrf?: string
  /** This browser is a floor iPad. Admin powers stay off until password leave. */
  kiosk?: boolean
}

/** Authenticated viewer used by API authorization. Never includes a password hash. */
export type AuthUser = {
  accountId: string
  email: string
  role: AccountRole
  displayName: string
  rosterProfileId?: string
  linkedAthleteIds: string[]
  maxDevices?: number
  kiosk?: boolean
}

export type PublicAthlete = Record<string, unknown> & { id: string }

export const DEFAULT_MAX_DEVICES = 4
export const MAX_DEVICES_CAP = 12

export function clampMaxDevices(value: unknown): number {
  const n = Number(value)
  if (!Number.isFinite(n)) return DEFAULT_MAX_DEVICES
  return Math.min(MAX_DEVICES_CAP, Math.max(1, Math.round(n)))
}

export function isAccountRole(value: unknown): value is AccountRole {
  return typeof value === 'string' && (ACCOUNT_ROLES as readonly string[]).includes(value)
}

export function isAdminRole(role: AccountRole): boolean {
  return role === 'admin' || role === 'gymOwner'
}
