/**
 * Per-coach Compare collections. Gym library.json is Ryan-only.
 * Personal lists live on /api/coach-library and in localStorage.
 */

import {
  getCollections,
  isSameReferenceUrl,
  parseKeywords,
  putCollection,
  type RefCollection,
  type RefItem,
} from './clipStore'
import { collectionsToBackup, type LibraryBackup } from './libraryBackup'
import { saveAthleteCompareLibrary, loadCompareLibraries } from './compareLibraries'
import { dispatchLibraryChanged } from './libraryEvents'
import { createId } from './storage'

export function isGymCollection(col: { athleteId?: string }): boolean {
  return !col.athleteId
}

export async function pullCoachLibrary(athleteId: string): Promise<LibraryBackup | null> {
  try {
    const res = await fetch(`/api/coach-library?athleteId=${encodeURIComponent(athleteId)}`)
    if (!res.ok) return null
    const data = (await res.json()) as LibraryBackup
    if (!data || data.kind !== 'shape-lab-library' || !Array.isArray(data.collections)) {
      return null
    }
    return data
  } catch {
    return null
  }
}

export async function pushCoachLibrary(
  athleteId: string,
  collections: RefCollection[],
): Promise<boolean> {
  try {
    const personal = collections
      .filter((c) => c.athleteId === athleteId)
      .map((c) => ({ ...c, athleteId }))
    saveAthleteCompareLibrary(athleteId, personal)
    const res = await fetch(`/api/coach-library?athleteId=${encodeURIComponent(athleteId)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(collectionsToBackup(personal)),
    })
    if (res.ok) dispatchLibraryChanged()
    return res.ok
  } catch {
    return false
  }
}

function backupCollections(backup: LibraryBackup | null, athleteId: string): RefCollection[] {
  if (!backup) return []
  return backup.collections.map((c) => ({
    id: c.id || createId('col'),
    name: c.name || 'My references',
    createdAt: c.createdAt || new Date().toISOString(),
    athleteId,
    items: c.items
      .filter((i) => i.url)
      .map((item) => ({
        id: item.id,
        kind:
          item.kind === 'instagram' ||
          item.kind === 'tiktok' ||
          item.kind === 'facebook' ||
          item.kind === 'url'
            ? item.kind
            : 'url',
        name: item.name || item.url || 'Clip',
        url: item.url,
        keywords: parseKeywords(item.keywords),
        createdAt: item.createdAt,
      })),
  }))
}

function mergeItems(into: RefItem[], incoming: RefItem[]): RefItem[] {
  const items = into.map((i) => ({ ...i, keywords: i.keywords ? [...i.keywords] : undefined }))
  for (const item of incoming) {
    const match = items.find(
      (existing) =>
        existing.id === item.id ||
        (existing.url && item.url && isSameReferenceUrl(existing.url, item.url)),
    )
    if (match) {
      if (item.name && item.name !== match.name) match.name = item.name
      const tags = [...(match.keywords ?? []), ...(item.keywords ?? [])]
      const seen = new Set<string>()
      const keywords: string[] = []
      for (const tag of tags) {
        const key = tag.toLowerCase()
        if (seen.has(key)) continue
        seen.add(key)
        keywords.push(tag)
      }
      match.keywords = keywords.length ? keywords : undefined
    } else {
      items.push({ ...item, keywords: item.keywords ? [...item.keywords] : undefined })
    }
  }
  return items
}

function unionPersonal(parts: RefCollection[][], athleteId: string): RefCollection[] {
  const byId = new Map<string, RefCollection>()
  const byName = new Map<string, RefCollection>()
  for (const list of parts) {
    for (const col of list) {
      const tagged: RefCollection = { ...col, athleteId }
      const nameKey = tagged.name.trim().toLowerCase()
      const existing = byId.get(tagged.id) ?? byName.get(nameKey)
      if (!existing) {
        byId.set(tagged.id, tagged)
        if (nameKey) byName.set(nameKey, tagged)
        continue
      }
      existing.items = mergeItems(existing.items, tagged.items)
      if (tagged.name.trim()) existing.name = tagged.name
    }
  }
  return [...byId.values()]
}

/** Gym collections first, then this profile’s collections. */
export async function attachPersonalCollections(
  gym: RefCollection[],
  profileId: string,
): Promise<RefCollection[]> {
  const gymClean = gym.filter(isGymCollection)
  const idb = (await getCollections()).filter((c) => c.athleteId === profileId)
  const local = (loadCompareLibraries()[profileId] ?? []).map((c) => ({
    ...c,
    athleteId: profileId,
  }))
  const server = backupCollections(await pullCoachLibrary(profileId), profileId)
  const personal = unionPersonal([server, local, idb], profileId)
  for (const col of personal) await putCollection(col)
  saveAthleteCompareLibrary(profileId, personal)
  return [...gymClean, ...personal]
}
