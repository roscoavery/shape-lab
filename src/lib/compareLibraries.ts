/**
 * Per-athlete Compare URL collections (Instagram / TikTok / Facebook).
 * Lives in localStorage + the roster so any unlocked browser has the list.
 */

import type { RefCollection } from './clipStore'

const KEY = 'shape-lab.compareLibraries.v1'

export type CompareLibraries = Record<string, RefCollection[]>

export function loadCompareLibraries(): CompareLibraries {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as CompareLibraries
    if (!parsed || typeof parsed !== 'object') return {}
    const out: CompareLibraries = {}
    for (const [id, cols] of Object.entries(parsed)) {
      if (!id || !Array.isArray(cols)) continue
      out[id] = cols
    }
    return out
  } catch {
    return {}
  }
}

export function saveCompareLibraries(map: CompareLibraries): void {
  localStorage.setItem(KEY, JSON.stringify(map))
}

export function saveAthleteCompareLibrary(athleteId: string, collections: RefCollection[]): void {
  const map = loadCompareLibraries()
  map[athleteId] = collections.map((c) => ({
    ...c,
    athleteId,
    items: c.items.filter((i) => i.url),
  }))
  saveCompareLibraries(map)
}

export function collectionsForAthlete(
  all: RefCollection[],
  athleteId: string | null,
): RefCollection[] {
  if (!athleteId) return []
  const tagged = all.filter((c) => c.athleteId === athleteId)
  if (tagged.length > 0) return tagged
  const fromDisk = loadCompareLibraries()[athleteId]
  if (fromDisk?.length) return fromDisk
  return all.filter((c) => !c.athleteId)
}
