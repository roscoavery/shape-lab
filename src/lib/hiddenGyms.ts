/**
 * Admin-hidden gym names. Does not rewrite athlete profiles —
 * it only drops junk names from the Today gym chip list.
 */

import { TUMBLE_SMART, normalizeGymName, sameGym } from '../config/gyms'

const KEY = 'shape-lab.hiddenGyms.v1'
export const HIDDEN_GYMS_EVENT = 'shape-lab-hidden-gyms'

function readList(): string[] {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    return [
      ...new Set(
        parsed
          .filter((name): name is string => typeof name === 'string')
          .map((name) => normalizeGymName(name))
          .filter((name) => name && !sameGym(name, TUMBLE_SMART)),
      ),
    ]
  } catch {
    return []
  }
}

function writeList(names: string[]) {
  const next = [...new Set(names.map(normalizeGymName).filter((n) => n && !sameGym(n, TUMBLE_SMART)))]
  try {
    localStorage.setItem(KEY, JSON.stringify(next))
  } catch {
    /* quota / private mode */
  }
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(HIDDEN_GYMS_EVENT))
  }
}

export function listHiddenGyms(): string[] {
  return readList()
}

export function isGymHidden(name: string | null | undefined): boolean {
  if (!name?.trim()) return false
  const gym = normalizeGymName(name)
  if (sameGym(gym, TUMBLE_SMART)) return false
  return readList().some((hidden) => sameGym(hidden, gym))
}

export function hideListedGym(name: string): string[] {
  const gym = normalizeGymName(name)
  if (!gym || sameGym(gym, TUMBLE_SMART)) return readList()
  const next = [...readList().filter((n) => !sameGym(n, gym)), gym]
  writeList(next)
  return next
}

export function unhideListedGym(name: string): string[] {
  const gym = normalizeGymName(name)
  const next = readList().filter((n) => !sameGym(n, gym))
  writeList(next)
  return next
}

export function subscribeHiddenGyms(cb: () => void): () => void {
  if (typeof window === 'undefined') return () => {}
  window.addEventListener(HIDDEN_GYMS_EVENT, cb)
  window.addEventListener('storage', cb)
  return () => {
    window.removeEventListener(HIDDEN_GYMS_EVENT, cb)
    window.removeEventListener('storage', cb)
  }
}
