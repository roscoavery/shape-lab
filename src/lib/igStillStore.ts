/**
 * IG shape crops — IndexedDB on this device, plus the gym-computer copy
 * when the Ryan profile saves (POST /api/ig-stills).
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

function unionIgLists(local: ReferencePhoto[], remote: ReferencePhoto[]): ReferencePhoto[] {
  const map = new Map<string, ReferencePhoto>()
  for (const p of local) map.set(p.id, p)
  for (const p of remote) {
    const prev = map.get(p.id)
    map.set(p.id, {
      ...prev,
      ...p,
      persistedToApp: true,
      dataUrl: prev?.dataUrl?.startsWith('data:') ? prev.dataUrl : p.dataUrl,
    })
  }
  return [...map.values()]
    .filter((p) => p && p.library === 'ig' && typeof p.dataUrl === 'string')
    .sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? ''))
    .slice(0, MAX_IG)
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

async function pullServerIgStills(): Promise<ReferencePhoto[]> {
  try {
    const res = await fetch('/api/ig-stills')
    if (!res.ok) return []
    const data = (await res.json()) as { stills?: ReferencePhoto[] }
    if (!Array.isArray(data.stills)) return []
    return data.stills.map((p) => ({ ...p, library: 'ig' as const, persistedToApp: true }))
  } catch {
    return []
  }
}

export async function hydrateIgStills(): Promise<ReferencePhoto[]> {
  let local: ReferencePhoto[] = []
  try {
    local = await loadAllFromDb()
  } catch {
    local = memory.filter((p) => p.library === 'ig')
  }
  const remote = await pullServerIgStills()
  memory = unionIgLists(local, remote)
  emit()
  return memory
}

async function writeLocal(photo: ReferencePhoto): Promise<void> {
  const db = await openDb()
  const tx = db.transaction(STORE, 'readwrite')
  tx.objectStore(STORE).put(photo)
  const extra = memory.slice(MAX_IG)
  for (const old of extra) tx.objectStore(STORE).delete(old.id)
  await new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error ?? new Error('Could not save IG still'))
    tx.onabort = () => reject(tx.error ?? new Error('Could not save IG still'))
  })
}

async function postServerStill(photo: ReferencePhoto): Promise<ReferencePhoto | null> {
  if (!photo.dataUrl.startsWith('data:image')) return { ...photo, persistedToApp: true }
  try {
    const res = await fetch('/api/ig-stills', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(photo),
    })
    if (!res.ok) return null
    const saved = (await res.json()) as ReferencePhoto
    return { ...photo, ...saved, library: 'ig', persistedToApp: true }
  } catch {
    return null
  }
}

export async function addIgStill(
  photo: ReferencePhoto,
  opts?: { persistToApp?: boolean },
): Promise<ReferencePhoto> {
  let next: ReferencePhoto = { ...photo, library: 'ig' }
  memory = [next, ...memory.filter((p) => p.id !== next.id)].slice(0, MAX_IG)
  emit()
  await writeLocal(next)
  if (opts?.persistToApp) {
    const saved = await postServerStill(next)
    if (saved) {
      next = saved
      memory = [next, ...memory.filter((p) => p.id !== next.id)].slice(0, MAX_IG)
      emit()
    }
  }
  return next
}

export type IgStillTextPatch = Partial<
  Pick<ReferencePhoto, 'label' | 'customName' | 'notes'>
>

/** Merge text edits without replacing the image, crop, ownership, or timestamps. */
export async function updateIgStill(
  id: string,
  patch: IgStillTextPatch,
  opts?: { persistToApp?: boolean },
): Promise<ReferencePhoto> {
  const current = memory.find((photo) => photo.id === id)
  if (!current) throw new Error('IG still not found.')
  let next: ReferencePhoto = { ...current, ...patch }
  memory = [next, ...memory.filter((photo) => photo.id !== id)].slice(0, MAX_IG)
  emit()
  await writeLocal(next)

  if (opts?.persistToApp) {
    const res = await fetch(`/api/ig-stills?id=${encodeURIComponent(id)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    })
    if (!res.ok) throw new Error('Could not save that description to the gym app.')
    const saved = (await res.json()) as ReferencePhoto
    next = {
      ...next,
      ...saved,
      dataUrl: next.dataUrl.startsWith('data:') ? next.dataUrl : saved.dataUrl,
      library: 'ig',
      persistedToApp: true,
    }
    memory = [next, ...memory.filter((photo) => photo.id !== id)].slice(0, MAX_IG)
    emit()
    await writeLocal(next)
  }
  return next
}

export async function removeIgStill(
  id: string,
  opts?: { fromApp?: boolean },
): Promise<void> {
  memory = memory.filter((p) => p.id !== id)
  emit()
  try {
    const db = await openDb()
    const tx = db.transaction(STORE, 'readwrite')
    tx.objectStore(STORE).delete(id)
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error ?? new Error('Could not delete IG still'))
      tx.onabort = () => reject(tx.error ?? new Error('Could not delete IG still'))
    })
  } catch {
    /* IndexedDB down — memory already dropped it */
  }
  if (opts?.fromApp) {
    try {
      await fetch(`/api/ig-stills?id=${encodeURIComponent(id)}`, { method: 'DELETE' })
    } catch {
      /* server down */
    }
  }
}
