/** Extras parked here are off every Learn card until an admin assigns them. */
export const UNMATCHED_STILL_SHAPE = 'unmatched'

/** Tombstones for coach stills — extras and hidden shipped originals. */

const REMOVED_KEY = 'shape-lab.removedCoachStills.v1'

export function loadRemovedCoachStillIds(): string[] {
  try {
    const raw = localStorage.getItem(REMOVED_KEY)
    if (!raw) return []
    const data = JSON.parse(raw) as unknown
    if (!Array.isArray(data)) return []
    return data.filter((id): id is string => typeof id === 'string' && id.length > 0)
  } catch {
    return []
  }
}

export function saveRemovedCoachStillIds(ids: string[]) {
  try {
    localStorage.setItem(REMOVED_KEY, JSON.stringify([...new Set(ids)].slice(-2000)))
  } catch {
    /* quota */
  }
}

export function noteRemovedCoachStill(id: string) {
  if (!id) return
  saveRemovedCoachStillIds([...loadRemovedCoachStillIds(), id])
}

export function forgetRemovedCoachStill(id: string) {
  if (!id) return
  saveRemovedCoachStillIds(loadRemovedCoachStillIds().filter((row) => row !== id))
}

export function removedCoachStillIdSet(): Set<string> {
  return new Set(loadRemovedCoachStillIds())
}

export function isRemovedCoachStill(id: string): boolean {
  return Boolean(id) && loadRemovedCoachStillIds().includes(id)
}
