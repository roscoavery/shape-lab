/**
 * Home gym for this Shape Lab. Existing profiles default here.
 * Other gyms are free-text names on the profile.
 */

export const TUMBLE_SMART = 'Tumble Smart Athletics'

const TSA_ALIASES = new Set([
  'tumble smart',
  'tumble smart athletics',
  'tumblesmart',
  'tsa',
])

export function normalizeGymName(raw?: string | null): string {
  const trimmed = (raw ?? '').trim().replace(/\s+/g, ' ')
  if (!trimmed) return TUMBLE_SMART
  if (TSA_ALIASES.has(trimmed.toLowerCase())) return TUMBLE_SMART
  return trimmed
}

export function sameGym(a?: string | null, b?: string | null): boolean {
  return normalizeGymName(a).toLowerCase() === normalizeGymName(b).toLowerCase()
}

export function isTumbleSmart(raw?: string | null): boolean {
  return sameGym(raw, TUMBLE_SMART)
}

export function withDefaultGym<T extends { gymName?: string }>(athlete: T): T {
  return { ...athlete, gymName: normalizeGymName(athlete.gymName) }
}
