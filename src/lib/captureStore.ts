/**
 * IndexedDB store for task hit snapshots and trimmed clips.
 * Blobs are too large for localStorage — this stays on-device only.
 */

const DB_NAME = 'shape-lab-captures'
const DB_VERSION = 2
const META = 'meta'
const BLOBS = 'blobs'
const LEGACY_ITEMS = 'items'

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

function ensureStores(db: IDBDatabase, tx: IDBTransaction | null) {
  if (!db.objectStoreNames.contains(META)) {
    const s = db.createObjectStore(META, { keyPath: 'id' })
    s.createIndex('by-athlete', 'athleteId')
  } else if (tx) {
    const s = tx.objectStore(META)
    if (!s.indexNames.contains('by-athlete')) {
      s.createIndex('by-athlete', 'athleteId')
    }
  }
  if (!db.objectStoreNames.contains(BLOBS)) {
    db.createObjectStore(BLOBS)
  }
  if (db.objectStoreNames.contains(LEGACY_ITEMS)) {
    db.deleteObjectStore(LEGACY_ITEMS)
  }
}

function openDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => {
      ensureStores(req.result, req.transaction)
    }
    req.onsuccess = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(META) || !db.objectStoreNames.contains(BLOBS)) {
        db.close()
        dbPromise = null
        const del = indexedDB.deleteDatabase(DB_NAME)
        del.onsuccess = () => {
          openDb().then(resolve, reject)
        }
        del.onerror = () => reject(del.error ?? new Error('Could not reset capture store'))
        return
      }
      db.onversionchange = () => {
        db.close()
        dbPromise = null
      }
      resolve(db)
    }
    req.onerror = () => {
      dbPromise = null
      reject(req.error ?? new Error('IndexedDB unavailable'))
    }
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
  if (!db.objectStoreNames.contains(META)) return []
  const tx = db.transaction(META, 'readonly')
  const store = tx.objectStore(META)
  let rows: TaskCapture[]
  if (store.indexNames.contains('by-athlete')) {
    rows = await reqToPromise(
      store.index('by-athlete').getAll(athleteId) as IDBRequest<TaskCapture[]>,
    )
  } else {
    const all = await reqToPromise(store.getAll() as IDBRequest<TaskCapture[]>)
    rows = all.filter((c) => c.athleteId === athleteId)
  }
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
