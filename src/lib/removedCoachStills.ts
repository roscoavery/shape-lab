/** Extras parked here are off every Learn card until an admin assigns them. */
export const UNMATCHED_STILL_SHAPE = 'unmatched'

/**
 * Tombstones for coach stills — extras and hidden shipped originals.
 * Stored on the server (data/coach-stills.json) so every browser and the
 * public link honor them. Migrates from the old per-browser localStorage
 * key on first boot.
 */

import { markedFetch } from './authSession'

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

/** Pull server tombstones, migrate any local ones up. */
export async function pullRemovedCoachStills(): Promise<string[]> {
  try {
    const res = await fetch('/api/coach-stills')
    if (!res.ok) return loadRemovedCoachStillIds()
    const data = (await res.json()) as { removedCoachStillIds?: unknown }
    const server = Array.isArray(data.removedCoachStillIds)
      ? data.removedCoachStillIds.filter((id): id is string => typeof id === 'string' && id.length > 0)
      : []
    const local = loadRemovedCoachStillIds()
    const merged = [...new Set([...server, ...local])]
    if (local.length > 0 && merged.length > server.length) {
      // One-time migration: push local tombstones to the server.
      void markedFetch('/api/coach-stills', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ removedCoachStillIds: merged }),
      }).catch(() => {})
      try {
        localStorage.removeItem(REMOVED_KEY)
      } catch {
        /* ignore */
      }
    }
    return merged
  } catch {
    return loadRemovedCoachStillIds()
  }
}

export function noteRemovedCoachStill(id: string) {
  if (!id) return
  saveRemovedCoachStillIds([...loadRemovedCoachStillIds(), id])
  // Push to the server so other browsers and the public link honor it.
  void (async () => {
    try {
      const res = await fetch('/api/coach-stills')
      const data = (await res.json()) as { removedCoachStillIds?: unknown; extras?: unknown }
      const server = Array.isArray(data.removedCoachStillIds)
        ? (data.removedCoachStillIds as string[])
        : []
      const merged = [...new Set([...server, id])]
      await markedFetch('/api/coach-stills', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          extras: data.extras ?? [],
          removedCoachStillIds: merged,
        }),
      })
    } catch {
      /* best-effort; the local tombstone still applies here */
    }
  })()
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
