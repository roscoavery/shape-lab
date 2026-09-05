/**
 * IG shape crops — IndexedDB on this device, plus the gym-computer copy
 * (POST /api/ig-stills) so every gym link has the same library.
 */

import { SHIPPED_IG_STILLS } from '../config/shippedIgStills'
import type { ReferencePhoto } from '../types'

const DB_NAME = 'shape-lab-ig-stills'
const DB_VERSION = 1
const STORE = 'stills'
const MAX_IG = 400

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

function asIgStill(p: ReferencePhoto | null | undefined): ReferencePhoto | null {
  if (!p || typeof p.dataUrl !== 'string' || !p.dataUrl) return null
  if (p.library && p.library !== 'ig') return null
  return { ...p, library: 'ig' }
}

export function mergeIgStills(
  photos: ReferencePhoto[],
  ig: ReferencePhoto[],
): ReferencePhoto[] {
  const igIds = new Set(ig.map((p) => p.id))
  const rest = photos.filter((p) => p.library !== 'ig' || !igIds.has(p.id))
  const leftoverIg = rest.filter((p) => p.library === 'ig' || (!p.library && p.id.startsWith('ig_')))
  const coach = rest.filter((p) => p.library && p.library !== 'ig')
  return [...ig, ...leftoverIg.map((p) => ({ ...p, library: 'ig' as const })), ...coach]
}

function unionIgLists(local: ReferencePhoto[], remote: ReferencePhoto[]): ReferencePhoto[] {
  const map = new Map<string, ReferencePhoto>()
  for (const p of local) {
    const row = asIgStill(p)
    if (row) map.set(row.id, row)
  }
  for (const p of remote) {
    const row = asIgStill(p)
    if (!row) continue
    const prev = map.get(row.id)
    map.set(row.id, {
      ...prev,
      ...row,
      persistedToApp: true,
      dataUrl: prev?.dataUrl?.startsWith('data:') ? prev.dataUrl : row.dataUrl,
    })
  }
  return [...map.values()]
    .sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? ''))
    .slice(0, MAX_IG)
}

async function loadAllFromDb(): Promise<ReferencePhoto[]> {
  const db = await openDb()
  const tx = db.transaction(STORE, 'readonly')
  const rows = await reqToPromise(tx.objectStore(STORE).getAll() as IDBRequest<ReferencePhoto[]>)
  return (rows ?? [])
    .map((p) => asIgStill(p))
    .filter((p): p is ReferencePhoto => Boolean(p))
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
  const remoteIds = new Set(remote.map((p) => p.id))
  memory = unionIgLists([...SHIPPED_IG_STILLS, ...local], remote)
  emit()
  // Re-upload any still this device still has as pixels if the gym file is
  // missing that id — recovers crops after an empty Blob overwrite.
  const unsaved = memory.filter(
    (p) =>
      typeof p.dataUrl === 'string' &&
      p.dataUrl.startsWith('data:image') &&
      (!p.persistedToApp || !remoteIds.has(p.id)),
  )
  for (const photo of unsaved) {
    const saved = await postServerStill(photo)
    if (!saved) continue
    memory = [saved, ...memory.filter((p) => p.id !== saved.id)].slice(0, MAX_IG)
    await writeLocal(saved)
  }
  if (unsaved.length > 0) emit()
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
  _opts?: { persistToApp?: boolean },
): Promise<ReferencePhoto> {
  let next: ReferencePhoto = { ...photo, library: 'ig' }
  memory = [next, ...memory.filter((p) => p.id !== next.id)].slice(0, MAX_IG)
  emit()
  await writeLocal(next)
  const saved = await postServerStill(next)
  if (saved) {
    next = saved
    memory = [next, ...memory.filter((p) => p.id !== next.id)].slice(0, MAX_IG)
    emit()
    await writeLocal(next)
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
