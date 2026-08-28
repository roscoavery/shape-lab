/**
 * IG shape crops — IndexedDB, not localStorage.
 * Data URLs are too big to pack into the coach-still localStorage blob;
 * writing that key can fail quietly and Learn never sees the crop.
 */

import type { ReferencePhoto } from '../types'

const DB_NAME = 'shape-lab-ig-stills'
const DB_VERSION = 1
const STORE = 'stills'
const MAX_IG = 80

let dbPromise: Promise<IDBDatabase> | null = null
let memory: ReferencePhoto[] = []
const listeners = new Set<(photos: ReferencePhoto[]) => void>()

function openDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: 'id' })
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error ?? new Error('IndexedDB unavailable'))
  })
  return dbPromise
}

function reqToPromise<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error ?? new Error('IndexedDB request failed'))
  })
}

function emit() {
  for (const fn of listeners) fn(memory)
}

export function subscribeIgStills(fn: (photos: ReferencePhoto[]) => void): () => void {
  listeners.add(fn)
  fn(memory)
  return () => {
    listeners.delete(fn)
  }
}

export function mergeIgStills(
  photos: ReferencePhoto[],
  ig: ReferencePhoto[],
): ReferencePhoto[] {
  const igIds = new Set(ig.map((p) => p.id))
  const rest = photos.filter((p) => p.library !== 'ig' || !igIds.has(p.id))
  const leftoverIg = rest.filter((p) => p.library === 'ig')
  const coach = rest.filter((p) => p.library !== 'ig')
  return [...ig, ...leftoverIg, ...coach]
}

async function loadAllFromDb(): Promise<ReferencePhoto[]> {
  const db = await openDb()
  const tx = db.transaction(STORE, 'readonly')
  const rows = await reqToPromise(tx.objectStore(STORE).getAll() as IDBRequest<ReferencePhoto[]>)
  return (rows ?? [])
    .filter((p) => p && p.library === 'ig' && typeof p.dataUrl === 'string')
    .sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? ''))
    .slice(0, MAX_IG)
}

export async function hydrateIgStills(): Promise<ReferencePhoto[]> {
  try {
    memory = await loadAllFromDb()
  } catch {
    memory = memory.filter((p) => p.library === 'ig')
  }
  emit()
  return memory
}

export async function addIgStill(photo: ReferencePhoto): Promise<void> {
  const next: ReferencePhoto = { ...photo, library: 'ig' }
  memory = [next, ...memory.filter((p) => p.id !== next.id)].slice(0, MAX_IG)
  emit()
  const db = await openDb()
  const tx = db.transaction(STORE, 'readwrite')
  tx.objectStore(STORE).put(next)
  const extra = memory.slice(MAX_IG)
  for (const old of extra) tx.objectStore(STORE).delete(old.id)
  await new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error ?? new Error('Could not save IG still'))
    tx.onabort = () => reject(tx.error ?? new Error('Could not save IG still'))
  })
}

export async function removeIgStill(id: string): Promise<void> {
  memory = memory.filter((p) => p.id !== id)
  emit()
  const db = await openDb()
  const tx = db.transaction(STORE, 'readwrite')
  tx.objectStore(STORE).delete(id)
  await new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error ?? new Error('Could not delete IG still'))
    tx.onabort = () => reject(tx.error ?? new Error('Could not delete IG still'))
  })
}
