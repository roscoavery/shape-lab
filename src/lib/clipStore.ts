/**
 * ============================================================================
 * IndexedDB storage for the Compare tab
 * ============================================================================
 * Reference collections (uploaded video blobs, direct video URLs, Instagram
 * links) and recorded athlete attempt clips. Video blobs are far too large
 * for localStorage, so everything Compare-related lives in IndexedDB.
 * No server, no account — this device only.
 */

export type RefItemKind = 'file' | 'url' | 'instagram'

export type RefItem = {
  id: string
  kind: RefItemKind
  name: string
  /** Direct video URL (kind 'url') or Instagram post/reel URL (kind 'instagram'). */
  url?: string
  createdAt: string
}

export type RefCollection = {
  id: string
  name: string
  items: RefItem[]
  createdAt: string
}

export type RecordedClip = {
  id: string
  name: string
  createdAt: string
  durationSec: number | null
  sizeBytes: number
}

const DB_NAME = 'shape-lab-compare'
const DB_VERSION = 1
const COLLECTIONS = 'collections'
const CLIPS = 'clips'
const BLOBS = 'blobs'

/** Storage cap: keep only this many recorded attempt clips (oldest pruned). */
export const MAX_CLIPS = 12

let dbPromise: Promise<IDBDatabase> | null = null

function openDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(COLLECTIONS)) {
        db.createObjectStore(COLLECTIONS, { keyPath: 'id' })
      }
      if (!db.objectStoreNames.contains(CLIPS)) {
        db.createObjectStore(CLIPS, { keyPath: 'id' })
      }
      if (!db.objectStoreNames.contains(BLOBS)) {
        db.createObjectStore(BLOBS)
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error ?? new Error('IndexedDB unavailable'))
  })
  return dbPromise
}

function requestToPromise<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error ?? new Error('IndexedDB request failed'))
  })
}

async function readStore<T>(store: string): Promise<T[]> {
  const db = await openDb()
  const tx = db.transaction(store, 'readonly')
  return requestToPromise(tx.objectStore(store).getAll() as IDBRequest<T[]>)
}

// ---------------------------------------------------------------------------
// Reference collections
// ---------------------------------------------------------------------------

export async function getCollections(): Promise<RefCollection[]> {
  const all = await readStore<RefCollection>(COLLECTIONS)
  return all.sort((a, b) => a.createdAt.localeCompare(b.createdAt))
}

export async function putCollection(collection: RefCollection): Promise<void> {
  const db = await openDb()
  const tx = db.transaction(COLLECTIONS, 'readwrite')
  await requestToPromise(tx.objectStore(COLLECTIONS).put(collection))
}

export async function deleteCollection(collection: RefCollection): Promise<void> {
  const db = await openDb()
  const tx = db.transaction([COLLECTIONS, BLOBS], 'readwrite')
  tx.objectStore(COLLECTIONS).delete(collection.id)
  const blobs = tx.objectStore(BLOBS)
  for (const item of collection.items) {
    blobs.delete(item.id)
  }
  await new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error ?? new Error('Delete failed'))
  })
}

// ---------------------------------------------------------------------------
// Video blobs (uploaded reference files + recorded clips, keyed by item id)
// ---------------------------------------------------------------------------

export async function putBlob(id: string, blob: Blob): Promise<void> {
  const db = await openDb()
  const tx = db.transaction(BLOBS, 'readwrite')
  await requestToPromise(tx.objectStore(BLOBS).put(blob, id))
}

export async function getBlob(id: string): Promise<Blob | null> {
  const db = await openDb()
  const tx = db.transaction(BLOBS, 'readonly')
  const result = await requestToPromise(
    tx.objectStore(BLOBS).get(id) as IDBRequest<Blob | undefined>,
  )
  return result ?? null
}

export async function deleteBlob(id: string): Promise<void> {
  const db = await openDb()
  const tx = db.transaction(BLOBS, 'readwrite')
  await requestToPromise(tx.objectStore(BLOBS).delete(id))
}

/** True if a blob is stored for this id — does not load the bytes. */
export async function hasBlob(id: string): Promise<boolean> {
  const db = await openDb()
  const tx = db.transaction(BLOBS, 'readonly')
  const count = await requestToPromise(tx.objectStore(BLOBS).count(id))
  return count > 0
}

export async function listCachedIds(ids: string[]): Promise<Set<string>> {
  const out = new Set<string>()
  await Promise.all(
    ids.map(async (id) => {
      if (await hasBlob(id)) out.add(id)
    }),
  )
  return out
}

// ---------------------------------------------------------------------------
// Recorded attempt clips
// ---------------------------------------------------------------------------

export async function getClips(): Promise<RecordedClip[]> {
  const all = await readStore<RecordedClip>(CLIPS)
  return all.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

/** Save a clip and prune the oldest ones beyond MAX_CLIPS. */
export async function addClip(meta: RecordedClip, blob: Blob): Promise<void> {
  const db = await openDb()
  const existing = await getClips()
  const tx = db.transaction([CLIPS, BLOBS], 'readwrite')
  tx.objectStore(CLIPS).put(meta)
  tx.objectStore(BLOBS).put(blob, meta.id)
  for (const old of existing.slice(MAX_CLIPS - 1)) {
    tx.objectStore(CLIPS).delete(old.id)
    tx.objectStore(BLOBS).delete(old.id)
  }
  await new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error ?? new Error('Save failed'))
  })
}

export async function deleteClip(id: string): Promise<void> {
  const db = await openDb()
  const tx = db.transaction([CLIPS, BLOBS], 'readwrite')
  tx.objectStore(CLIPS).delete(id)
  tx.objectStore(BLOBS).delete(id)
  await new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error ?? new Error('Delete failed'))
  })
}

// ---------------------------------------------------------------------------
// Instagram URL helpers
// ---------------------------------------------------------------------------

export function isInstagramUrl(url: string): boolean {
  return /(^|\.)instagram\.com|instagr\.am/i.test(safeHost(url))
}

function safeHost(url: string): string {
  try {
    return new URL(url).host
  } catch {
    return ''
  }
}

/** Extract shortcode + path type from an Instagram post/reel/tv/share URL. */
export function parseInstagramUrl(
  url: string,
): { type: 'p' | 'reel' | 'tv'; code: string } | null {
  const m = url.match(
    /instagr(?:am\.com|\.am)\/(?:share\/)?(p|reel|reels|tv)\/([A-Za-z0-9_-]+)/i,
  )
  if (!m) return null
  const type = m[1].toLowerCase() === 'reels' ? 'reel' : (m[1].toLowerCase() as 'p' | 'reel' | 'tv')
  return { type, code: m[2] }
}

export function instagramCode(url: string): string | null {
  return parseInstagramUrl(url)?.code ?? null
}

/** Same IG shortcode, or the same URL ignoring trailing slashes. */
export function isSameReferenceUrl(a: string, b: string): boolean {
  const ca = instagramCode(a)
  const cb = instagramCode(b)
  if (ca && cb) return ca.toLowerCase() === cb.toLowerCase()
  return a.replace(/\/+$/, '') === b.replace(/\/+$/, '')
}

export function itemMatchesQuery(item: RefItem, query: string): boolean {
  const needle = query.trim().toLowerCase()
  if (!needle) return true
  if (item.name.toLowerCase().includes(needle)) return true
  if (item.url?.toLowerCase().includes(needle)) return true
  const code = item.url ? instagramCode(item.url) : null
  return Boolean(code?.toLowerCase().includes(needle))
}

export function reorderItems(items: RefItem[], fromId: string, toId: string): RefItem[] {
  if (fromId === toId) return items
  const next = [...items]
  const from = next.findIndex((i) => i.id === fromId)
  const to = next.findIndex((i) => i.id === toId)
  if (from < 0 || to < 0) return items
  const [moved] = next.splice(from, 1)
  next.splice(to, 0, moved)
  return next
}

export function moveItem(items: RefItem[], id: string, dir: -1 | 1): RefItem[] {
  const from = items.findIndex((i) => i.id === id)
  const to = from + dir
  if (from < 0 || to < 0 || to >= items.length) return items
  const next = [...items]
  const [moved] = next.splice(from, 1)
  next.splice(to, 0, moved)
  return next
}
