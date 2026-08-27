/**
 * Portable backup of Compare library metadata (names, order, Instagram/direct
 * URLs). Video bytes stay in IndexedDB; this JSON is what you keep if a
 * tunnel URL changes. Instagram post URLs themselves do not expire.
 */

import {
  getCollections,
  isSameReferenceUrl,
  putCollection,
  type RefCollection,
  type RefItem,
} from './clipStore'
import { createId } from './storage'
import shippedLibrary from '../config/compareLibrary.json'

export const LIBRARY_META_KEY = 'shape-lab.library-meta.v1'

export type LibraryBackup = {
  kind: 'shape-lab-library'
  version: 1
  exportedAt: string
  collections: Array<{
    id: string
    name: string
    createdAt: string
    items: Array<{
      id: string
      kind: RefItem['kind']
      name: string
      url?: string
      createdAt: string
    }>
  }>
}

export function collectionsToBackup(collections: RefCollection[]): LibraryBackup {
  return {
    kind: 'shape-lab-library',
    version: 1,
    exportedAt: new Date().toISOString(),
    collections: collections.map((c) => ({
      id: c.id,
      name: c.name,
      createdAt: c.createdAt,
      items: c.items.map((i) => ({
        id: i.id,
        kind: i.kind,
        name: i.name,
        url: i.url,
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
  if (!isGenericIgName(next) && next !== existing) return next
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
        .map((i) => `${i.name}\t${i.url}`),
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

export async function mergeLibraryBackup(
  backup: LibraryBackup,
): Promise<{ collections: RefCollection[]; added: number; skipped: number }> {
  const collections = [...(await getCollections())]
  let added = 0
  let skipped = 0

  for (const incoming of backup.collections) {
    let target = collections.find((c) => c.id === incoming.id)
    if (!target) target = collections.find((c) => c.name === incoming.name)
    if (!target) {
      target = {
        id: incoming.id || createId('col'),
        name: incoming.name || 'Imported',
        items: [],
        createdAt: incoming.createdAt || new Date().toISOString(),
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
        createdAt: item.createdAt || new Date().toISOString(),
      }
      target.items = [...target.items, next]
      added += 1
    }
  }

  for (const col of collections) {
    await putCollection(col)
  }
  persistLibraryMeta(collections)
  void pushServerLibrary(collections)
  return { collections, added, skipped }
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

export async function pushServerLibrary(collections: RefCollection[]): Promise<void> {
  try {
    await fetch('/api/library', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(collectionsToBackup(collections)),
    })
  } catch {
    // dev server down — IndexedDB + localStorage still hold a copy
  }
}

export function publishLibrary(collections: RefCollection[]): void {
  persistLibraryMeta(collections)
  void pushServerLibrary(collections)
}

/** Merge this origin's IndexedDB with the shipped list and the on-disk library. */
export async function syncLibraryWithServer(
  local: RefCollection[],
): Promise<{ collections: RefCollection[]; pulled: number }> {
  const seed = shippedCompareLibrary()
  const server = await pullServerLibrary()
  let collections = local
  let pulled = 0

  if (seed && backupUrlCount(seed) > 0) {
    const merged = await mergeLibraryBackup(seed)
    collections = merged.collections
    pulled += merged.added
  }
  if (server && backupUrlCount(server) > 0) {
    const merged = await mergeLibraryBackup(server)
    collections = merged.collections
    pulled += merged.added
  }

  const urlCount = collections.reduce(
    (n, c) => n + c.items.filter((i) => i.kind !== 'file' && i.url).length,
    0,
  )
  if (urlCount > 0) await pushServerLibrary(collections)
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
