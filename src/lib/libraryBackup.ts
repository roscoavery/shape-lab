/**
 * Portable backup of Compare library metadata (names, order, Instagram/direct
 * URLs). Video bytes stay in IndexedDB; this JSON is what you keep if a
 * tunnel URL changes. Instagram post URLs themselves do not expire.
 */

import {
  deleteCollectionRecord,
  getCollections,
  isSameReferenceUrl,
  mergeKeywords,
  parseKeywords,
  putCollection,
  type RefCollection,
  type RefItem,
} from './clipStore'
import { createId } from './storage'
import shippedLibrary from '../config/compareLibrary.json'
import { loadCompareLibraries } from './compareLibraries'
import { dispatchLibraryChanged } from './libraryEvents'

export const LIBRARY_META_KEY = 'shape-lab.library-meta.v1'

export type LibraryBackup = {
  kind: 'shape-lab-library'
  version: 1
  exportedAt: string
  managed?: boolean
  collections: Array<{
    id: string
    name: string
    createdAt: string
    /** Profile that owns this list. Missing = gym / Ryan library. */
    athleteId?: string
    items: Array<{
      id: string
      kind: RefItem['kind']
      name: string
      url?: string
      keywords?: string[]
      postedBy?: string
      createdAt: string
    }>
  }>
}

export function collectionsToBackup(collections: RefCollection[]): LibraryBackup {
  return {
    kind: 'shape-lab-library',
    version: 1,
    exportedAt: new Date().toISOString(),
    managed: true,
    collections: collections.map((c) => ({
      id: c.id,
      name: c.name,
      createdAt: c.createdAt,
      ...(c.athleteId ? { athleteId: c.athleteId } : {}),
      items: c.items.map((i) => ({
        id: i.id,
        kind: i.kind,
        name: i.name,
        url: i.url,
        ...(i.keywords && i.keywords.length ? { keywords: i.keywords } : {}),
        ...(i.postedBy ? { postedBy: i.postedBy } : {}),
        createdAt: i.createdAt,
      })),
    })),
  }
}

function isGenericIgName(name: string): boolean {
  return /^(IG|TikTok|Facebook)\s+\S+$/i.test(name.trim())
}

function preferName(existing: string, incoming: string): string {
  const next = incoming.trim()
  if (!next) return existing
  if (isGenericIgName(existing) && !isGenericIgName(next)) return next
  return existing
}

export function shippedCompareLibrary(): LibraryBackup | null {
  const data = shippedLibrary as LibraryBackup
  if (!data || data.kind !== 'shape-lab-library' || !Array.isArray(data.collections)) {
    return null
  }
  return data
}
export function persistLibraryMeta(collections: RefCollection[]): void {
  try {
    localStorage.setItem(LIBRARY_META_KEY, JSON.stringify(collectionsToBackup(collections)))
  } catch {
    // quota or private mode — IndexedDB is still the source of truth
  }
}

export function readLibraryMeta(): LibraryBackup | null {
  try {
    const raw = localStorage.getItem(LIBRARY_META_KEY)
    if (!raw) return null
    return parseLibraryBackup(raw)
  } catch {
    return null
  }
}

export function parseLibraryBackup(text: string): LibraryBackup {
  const data = JSON.parse(text) as LibraryBackup
  if (!data || data.kind !== 'shape-lab-library' || !Array.isArray(data.collections)) {
    throw new Error('That file is not a Shape Lab library backup.')
  }
  return data
}

export function backupUrlCount(backup: LibraryBackup): number {
  return backup.collections.reduce(
    (n, c) => n + c.items.filter((i) => i.kind !== 'file' && i.url).length,
    0,
  )
}

export function allUrlsText(collections: RefCollection[]): string {
  return collections
    .flatMap((c) =>
      c.items
        .filter((i) => i.url)
        .map((i) =>
          [i.name, i.url, (i.keywords ?? []).join(', ')].filter(Boolean).join('\t'),
        ),
    )
    .join('\n')
}

/** If IndexedDB is empty but localStorage still has a backup, restore it. */
export async function restoreMetaIfIndexedDbEmpty(
  collections: RefCollection[],
): Promise<RefCollection[]> {
  const hasItems = collections.some((c) => c.items.length > 0)
  if (hasItems) return collections
  const meta = readLibraryMeta()
  if (!meta || backupUrlCount(meta) === 0) return collections
  const { collections: restored } = await mergeLibraryBackup(meta)
  return restored
}

export function coalesceCollections(
  collections: RefCollection[],
  preferIds?: Set<string>,
): RefCollection[] {
  const groups = new Map<string, RefCollection[]>()
  for (const col of collections) {
    const key = `${col.athleteId ?? 'gym'}::${col.name.trim().toLowerCase() || col.id}`
    const list = groups.get(key) ?? []
    list.push(col)
    groups.set(key, list)
  }
  const out: RefCollection[] = []
  for (const group of groups.values()) {
    const primary = [...group].sort((a, b) => {
      const ap = preferIds?.has(a.id) ? 1 : 0
      const bp = preferIds?.has(b.id) ? 1 : 0
      if (ap !== bp) return bp - ap
      return a.createdAt.localeCompare(b.createdAt)
    })[0]
    const items = primary.items.map((i) => ({ ...i, keywords: i.keywords ? [...i.keywords] : undefined }))
    for (const col of group) {
      if (col.id === primary.id) continue
      for (const item of col.items) {
        const match = items.find(
          (existing) =>
            existing.id === item.id ||
            (existing.url && item.url && isSameReferenceUrl(existing.url, item.url)),
        )
        if (match) {
          match.name = preferName(match.name, item.name)
          match.keywords = mergeKeywords(match.keywords, item.keywords)
          if (!match.postedBy && item.postedBy) match.postedBy = item.postedBy
        } else {
          items.push({ ...item, keywords: item.keywords ? [...item.keywords] : undefined })
        }
      }
    }
    out.push({
      ...primary,
      athleteId: primary.athleteId,
      items: items.map((i) =>
        i.keywords && i.keywords.length ? i : { ...i, keywords: undefined },
      ),
    })
  }
  return out
}

export async function mergeLibraryBackup(
  backup: LibraryBackup,
): Promise<{ collections: RefCollection[]; added: number; skipped: number }> {
  const collections = [...(await getCollections())]
  let added = 0
  let skipped = 0

  for (const incoming of backup.collections) {
    const owner = incoming.athleteId ?? ''
    let target = collections.find(
      (c) => c.id === incoming.id && (c.athleteId ?? '') === owner,
    )
    if (!target) {
      target = collections.find(
        (c) => c.name === incoming.name && (c.athleteId ?? '') === owner,
      )
    }
    if (!target) {
      target = {
        id:
          incoming.id && !collections.some((c) => c.id === incoming.id)
            ? incoming.id
            : createId('col'),
        name: incoming.name || 'Imported',
        items: [],
        createdAt: incoming.createdAt || new Date().toISOString(),
        ...(incoming.athleteId ? { athleteId: incoming.athleteId } : {}),
      }
      collections.push(target)
    }

    for (const item of incoming.items) {
      if (item.kind === 'file' && !item.url) {
        skipped += 1
        continue
      }
      if (!item.url) {
        skipped += 1
        continue
      }
      const match = target.items.find(
        (existing) =>
          existing.id === item.id ||
          (existing.url && isSameReferenceUrl(existing.url, item.url!)),
      )
      if (match) {
        const renamed = preferName(match.name, item.name || '')
        if (renamed !== match.name) match.name = renamed
        match.keywords = mergeKeywords(match.keywords, parseKeywords(item.keywords))
        if (!match.postedBy && item.postedBy) match.postedBy = item.postedBy
        skipped += 1
        continue
      }
      const next: RefItem = {
        id: item.id || createId('ref'),
        kind:
          item.kind === 'instagram' ||
          item.kind === 'tiktok' ||
          item.kind === 'facebook' ||
          item.kind === 'url'
            ? item.kind
            : 'url',
        name: item.name || item.url,
        url: item.url,
        keywords: parseKeywords(item.keywords),
        postedBy: item.postedBy,
        createdAt: item.createdAt || new Date().toISOString(),
      }
      target.items = [...target.items, next]
      added += 1
    }
  }

  const coalesced = coalesceCollections(
    collections,
    new Set(backup.collections.map((c) => c.id).filter(Boolean)),
  )
  const keepIds = new Set(coalesced.map((c) => c.id))
  for (const col of collections) {
    if (!keepIds.has(col.id)) await deleteCollectionRecord(col.id)
  }
  for (const col of coalesced) {
    await putCollection(col)
  }
  persistLibraryMeta(coalesced)
  return { collections: coalesced, added, skipped }
}

export async function pullServerLibrary(): Promise<LibraryBackup | null> {
  try {
    const res = await fetch('/api/library')
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

export async function pushServerLibrary(collections: RefCollection[]): Promise<boolean> {
  try {
    const gym = collections.filter((c) => !c.athleteId)
    const res = await fetch('/api/library', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(collectionsToBackup(gym)),
    })
    if (res.ok) dispatchLibraryChanged()
    return res.ok
  } catch {
    return false
  }
}

export function publishLibrary(
  collections: RefCollection[],
  persistToApp = false,
): void {
  persistLibraryMeta(collections)
  if (persistToApp) void pushServerLibrary(collections)
}

export function libraryIsManaged(backup: LibraryBackup | null): boolean {
  if (!backup) return false
  const extra = backup as LibraryBackup & { managed?: boolean }
  return Boolean(extra.managed) || Boolean(backup.exportedAt)
}

function backupToCollections(backup: LibraryBackup): RefCollection[] {
  return backup.collections.map((c) => ({
    id: c.id,
    name: c.name,
    createdAt: c.createdAt,
    ...(c.athleteId ? { athleteId: c.athleteId } : {}),
    items: c.items
      .filter((i) => i.kind !== 'file' || i.url)
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
        postedBy: item.postedBy,
        createdAt: item.createdAt,
      })),
  }))
}

/** Replace IndexedDB collections with a backup (deletes stick). */
export async function replaceLibraryFromBackup(
  backup: LibraryBackup,
): Promise<RefCollection[]> {
  const existing = await getCollections()
  const next = backupToCollections(backup)
  const keep = new Set(next.map((c) => c.id))
  for (const col of existing) {
    if (!keep.has(col.id)) await deleteCollectionRecord(col.id)
  }
  for (const col of next) await putCollection(col)
  persistLibraryMeta(next)
  return next
}

/** Replace gym collections from a backup; keep this profile’s personal lists. */
export async function replaceGymKeepPersonal(
  backup: LibraryBackup,
  profileId: string | null,
): Promise<RefCollection[]> {
  const existing = await getCollections()
  const personal = profileId
    ? existing.filter((c) => c.athleteId === profileId)
    : []
  const gym = backupToCollections(backup).map((c) => {
    const { athleteId: _drop, ...rest } = c
    void _drop
    return rest
  })
  const keep = new Set([...gym.map((c) => c.id), ...personal.map((c) => c.id)])
  for (const col of existing) {
    if (!keep.has(col.id)) await deleteCollectionRecord(col.id)
  }
  for (const col of gym) await putCollection(col)
  for (const col of personal) await putCollection(col)
  persistLibraryMeta(gym)
  return [...gym, ...personal]
}

export function backupFromRosterLibraries(): LibraryBackup | null {
  const map = loadCompareLibraries()
  const collections = Object.values(map).flat()
  if (!collections.some((c) => c.items.some((i) => i.url))) return null
  return collectionsToBackup(collections)
}

/**
 * Ryan / gym computer: merge this browser + disk, then push gym collections only.
 * Never replace a larger local library with a smaller server copy.
 * Never fold a coach’s personal lists into the gym file.
 * Everyone else: take the gym library from the server so every link matches.
 */
export async function syncLibraryWithServer(
  local: RefCollection[],
  persistToApp = false,
  profileId: string | null = null,
): Promise<{ collections: RefCollection[]; pulled: number }> {
  const seed = shippedCompareLibrary()
  const server = await pullServerLibrary()

  const mergeIn = async (backup: LibraryBackup | null): Promise<number> => {
    if (!backup || backupUrlCount(backup) === 0) return 0
    const merged = await mergeLibraryBackup(backup)
    return merged.added
  }

  if (persistToApp) {
    let pulled = 0
    pulled += await mergeIn(server)
    pulled += await mergeIn(seed)
    const all = await getCollections()
    const collections = all.filter((c) => !c.athleteId)
    // Only push when this browser added URLs the gym file did not have.
    // Never auto-publish a stale tab's names over a newer saved library.
    if (pulled > 0) await pushServerLibrary(collections)
    return { collections, pulled }
  }

  if (server && backupUrlCount(server) > 0 && libraryIsManaged(server)) {
    const collections = await replaceGymKeepPersonal(server, profileId)
    return {
      collections: collections.filter(
        (c) => !c.athleteId || (profileId != null && c.athleteId === profileId),
      ),
      pulled: backupUrlCount(server),
    }
  }

  let collections = local
  let pulled = 0
  if (server && backupUrlCount(server) > 0) {
    const merged = await mergeLibraryBackup(server)
    collections = merged.collections
    pulled += merged.added
  } else if (seed && backupUrlCount(seed) > 0) {
    const localUrls = local.reduce(
      (n, c) => n + c.items.filter((i) => i.url).length,
      0,
    )
    if (localUrls === 0) {
      const merged = await mergeLibraryBackup(seed)
      collections = merged.collections
      pulled += merged.added
    }
  }
  return { collections, pulled }
}

export function downloadBackupFile(collections: RefCollection[]): void {
  const backup = collectionsToBackup(collections)
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `shape-lab-library-${backup.exportedAt.slice(0, 10)}.json`
  a.click()
  URL.revokeObjectURL(url)
}
