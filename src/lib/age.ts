/**
 * Age from date of birth. Thresholds live here so they can change later
 * without hunting through the UI.
 * This is not a legal-age or COPPA determination.
 */

export const ATHLETE_ACCESS_THRESHOLDS = {
  /** Younger than this: parent is the primary account relationship. */
  childMaxAge: 12,
  /** Younger than this (and not a child): more shared independence. */
  teenMaxAge: 17,
} as const

export type AgeBand = 'child' | 'teen' | 'adult'
export type AthleteAccessLevel = 'parentPrimary' | 'shared' | 'independent'

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/

export function parseDateOfBirth(value: string | null | undefined): Date | null {
  const raw = (value || '').trim()
  if (!raw) return null
  const match = ISO_DATE.exec(raw)
  if (!match) return null
  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  const date = new Date(year, month - 1, day)
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
    return null
  }
  if (date.getTime() > Date.now()) return null
  if (year < 1900) return null
  return date
}

/** Whole years from an ISO `YYYY-MM-DD` birthday. Null if missing or invalid. */
export function getAgeFromDateOfBirth(
  dateOfBirth: string | null | undefined,
  now = new Date(),
): number | null {
  const born = parseDateOfBirth(dateOfBirth)
  if (!born) return null
  let age = now.getFullYear() - born.getFullYear()
  const month = now.getMonth() - born.getMonth()
  if (month < 0 || (month === 0 && now.getDate() < born.getDate())) age -= 1
  if (age < 0 || age > 120) return null
  return age
}

export function getAgeBand(age: number | null | undefined): AgeBand | 'unknown' {
  if (age == null || !Number.isFinite(age)) return 'unknown'
  if (age <= ATHLETE_ACCESS_THRESHOLDS.childMaxAge) return 'child'
  if (age <= ATHLETE_ACCESS_THRESHOLDS.teenMaxAge) return 'teen'
  return 'adult'
}

export function getAthleteAccessLevel(age: number | null | undefined): AthleteAccessLevel {
  const band = getAgeBand(age)
  if (band === 'child') return 'parentPrimary'
  if (band === 'teen') return 'shared'
  if (band === 'adult') return 'independent'
  return 'parentPrimary'
}

export function birthdayNeeded(dateOfBirth: string | null | undefined): boolean {
  return parseDateOfBirth(dateOfBirth) == null
}

export function athleteMaySelfManageProfile(age: number | null | undefined): boolean {
  const level = getAthleteAccessLevel(age)
  return level === 'shared' || level === 'independent'
}

export function parentKeepsConsentControl(age: number | null | undefined): boolean {
  return getAthleteAccessLevel(age) !== 'independent'
}
