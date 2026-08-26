/**
 * IndexedDB store for task hit snapshots and trimmed clips.
 * Blobs are too large for localStorage — this stays on-device only.
 */

const DB_NAME = 'shape-lab-captures'
const DB_VERSION = 1
const META = 'meta'
const BLOBS = 'blobs'

/** Keep the newest N captures per athlete so the gym iPad does not fill up. */
const MAX_PER_ATHLETE = 36

export type TaskCapture = {
  id: string
  athleteId: string
  taskId: string
  shapeId: string
  shapeName: string
  kind: 'snapshot' | 'clip'
  createdAt: string
  holdSeconds: number
}

let dbPromise: Promise<IDBDatabase> | null = null

function openDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(META)) {
        const s = db.createObjectStore(META, { keyPath: 'id' })
        s.createIndex('by-athlete', 'athleteId')
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

function reqToPromise<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error ?? new Error('IndexedDB request failed'))
  })
}

export async function saveCapture(meta: TaskCapture, blob: Blob): Promise<void> {
  const db = await openDb()
  const tx = db.transaction([META, BLOBS], 'readwrite')
  tx.objectStore(META).put(meta)
  tx.objectStore(BLOBS).put(blob, meta.id)
  await new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
  await pruneAthlete(meta.athleteId)
}

export async function listCaptures(athleteId: string): Promise<TaskCapture[]> {
  const db = await openDb()
  const tx = db.transaction(META, 'readonly')
  const idx = tx.objectStore(META).index('by-athlete')
  const rows = await reqToPromise(idx.getAll(athleteId) as IDBRequest<TaskCapture[]>)
  return rows.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

export async function getCaptureBlob(id: string): Promise<Blob | null> {
  const db = await openDb()
  const tx = db.transaction(BLOBS, 'readonly')
  const blob = await reqToPromise(tx.objectStore(BLOBS).get(id) as IDBRequest<Blob | undefined>)
  return blob ?? null
}

export async function deleteCapture(id: string): Promise<void> {
  const db = await openDb()
  const tx = db.transaction([META, BLOBS], 'readwrite')
  tx.objectStore(META).delete(id)
  tx.objectStore(BLOBS).delete(id)
  await new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

async function pruneAthlete(athleteId: string): Promise<void> {
  const all = await listCaptures(athleteId)
  if (all.length <= MAX_PER_ATHLETE) return
  const extra = all.slice(MAX_PER_ATHLETE)
  await Promise.all(extra.map((c) => deleteCapture(c.id)))
}

/** JPEG snapshot of the pose canvas (sync, so we can fire on the hit frame). */
export function snapshotCanvas(canvas: HTMLCanvasElement | null): Blob | null {
  if (!canvas || canvas.width < 8 || canvas.height < 8) return null
  try {
    const url = canvas.toDataURL('image/jpeg', 0.86)
    const comma = url.indexOf(',')
    if (comma < 0) return null
    const bin = atob(url.slice(comma + 1))
    const arr = new Uint8Array(bin.length)
    for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i)
    return new Blob([arr], { type: 'image/jpeg' })
  } catch {
    return null
  }
}
