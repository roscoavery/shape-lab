/**
 * Explicit Compare-library deletes. Union-without-tombstone used to bring
 * landing drills and other clips back from the shipped seed or another tab.
 */

import { canonicalSocialUrl } from './socialUrls'

const REMOVED_IDS_KEY = 'shape-lab.removedLibraryItems.v1'
const REMOVED_URLS_KEY = 'shape-lab.removedLibraryUrls.v1'
const RESTORED_IDS_KEY = 'shape-lab.restoredLibraryItems.v1'
const RESTORED_URLS_KEY = 'shape-lab.restoredLibraryUrls.v1'

function readIds(key: string): string[] {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return []
    const data = JSON.parse(raw) as unknown
    if (!Array.isArray(data)) return []
    return data.filter((id): id is string => typeof id === 'string' && id.length > 0)
  } catch {
    return []
  }
}

function writeIds(key: string, ids: string[]) {
  try {
    localStorage.setItem(key, JSON.stringify([...new Set(ids)].slice(-2000)))
  } catch {
    /* quota */
  }
}

export function libraryUrlKey(url: string): string {
  return canonicalSocialUrl(url).replace(/\/+$/, '')
}

export function loadRemovedLibraryItemIds(): string[] {
  return readIds(REMOVED_IDS_KEY)
}

export function loadRemovedLibraryUrlKeys(): string[] {
  return readIds(REMOVED_URLS_KEY)
}

export function loadRestoredLibraryItemIds(): string[] {
  return readIds(RESTORED_IDS_KEY)
}

export function loadRestoredLibraryUrlKeys(): string[] {
  return readIds(RESTORED_URLS_KEY)
}

export function noteRemovedLibraryItem(id: string, url?: string) {
  if (id) {
    writeIds(REMOVED_IDS_KEY, [...loadRemovedLibraryItemIds(), id])
    writeIds(
      RESTORED_IDS_KEY,
      loadRestoredLibraryItemIds().filter((row) => row !== id),
    )
  }
  if (url) {
    const key = libraryUrlKey(url)
    writeIds(REMOVED_URLS_KEY, [...loadRemovedLibraryUrlKeys(), key])
    writeIds(
      RESTORED_URLS_KEY,
      loadRestoredLibraryUrlKeys().filter((row) => row !== key),
    )
  }
}

export function noteRestoredLibraryItem(id: string, url?: string) {
  if (id) {
    writeIds(
      REMOVED_IDS_KEY,
      loadRemovedLibraryItemIds().filter((row) => row !== id),
    )
    writeIds(RESTORED_IDS_KEY, [...loadRestoredLibraryItemIds(), id])
  }
  if (url) {
    const key = libraryUrlKey(url)
    writeIds(
      REMOVED_URLS_KEY,
      loadRemovedLibraryUrlKeys().filter((row) => row !== key),
    )
    writeIds(RESTORED_URLS_KEY, [...loadRestoredLibraryUrlKeys(), key])
  }
}

export function clearRestoredLibraryMarks() {
  writeIds(RESTORED_IDS_KEY, [])
  writeIds(RESTORED_URLS_KEY, [])
}

export function rememberServerLibraryRemovals(ids?: string[], urls?: string[]) {
  if (ids?.length) writeIds(REMOVED_IDS_KEY, [...loadRemovedLibraryItemIds(), ...ids])
  if (urls?.length) writeIds(REMOVED_URLS_KEY, [...loadRemovedLibraryUrlKeys(), ...urls])
}
