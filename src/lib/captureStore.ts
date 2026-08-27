/**
 * IndexedDB store for task hit snapshots and trimmed clips.
 * Blobs are too large for localStorage — this stays on-device only.
 */

const DB_NAME = 'shape-lab-captures'
const DB_VERSION = 2
const META = 'meta'
const BLOBS = 'blobs'
const LEGACY_ITEMS = 'items'

/** Keep the newest N clips; always keep the latest snapshot per shape. */
const MAX_CLIPS_PER_ATHLETE = 48
const MAX_EXTRA_SNAPSHOTS = 10

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
  tx.objectStore(BLOBS).delete(`${id}::pose`)
  await new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

export async function savePoseTrackJson(id: string, json: string): Promise<void> {
  const db = await openDb()
  const tx = db.transaction(BLOBS, 'readwrite')
  await reqToPromise(
    tx.objectStore(BLOBS).put(new Blob([json], { type: 'application/json' }), `${id}::pose`),
  )
}

export async function getPoseTrackJson(id: string): Promise<string | null> {
  const db = await openDb()
  const tx = db.transaction(BLOBS, 'readonly')
  const blob = await reqToPromise(
    tx.objectStore(BLOBS).get(`${id}::pose`) as IDBRequest<Blob | undefined>,
  )
  if (!blob) return null
  try {
    return await blob.text()
  } catch {
    return null
  }
}

async function pruneAthlete(athleteId: string): Promise<void> {
  const all = await listCaptures(athleteId)
  const snapshots = all.filter((c) => c.kind === 'snapshot')
  const clips = all.filter((c) => c.kind === 'clip')

  const seenShape = new Set<string>()
  const keepLatest = new Set<string>()
  for (const s of snapshots) {
    if (!seenShape.has(s.shapeId)) {
      seenShape.add(s.shapeId)
      keepLatest.add(s.id)
    }
  }
  let extra = 0
  for (const s of snapshots) {
    if (keepLatest.has(s.id)) continue
    extra += 1
    if (extra > MAX_EXTRA_SNAPSHOTS) await deleteCapture(s.id)
  }
  for (const c of clips.slice(MAX_CLIPS_PER_ATHLETE)) {
    await deleteCapture(c.id)
  }
}

export type ShapeHitGroup = {
  shapeId: string
  shapeName: string
  snapshots: TaskCapture[]
  clips: TaskCapture[]
}

export function groupCapturesByShape(captures: TaskCapture[]): ShapeHitGroup[] {
  const map = new Map<string, ShapeHitGroup>()
  for (const c of captures) {
    let g = map.get(c.shapeId)
    if (!g) {
      g = { shapeId: c.shapeId, shapeName: c.shapeName, snapshots: [], clips: [] }
      map.set(c.shapeId, g)
    }
    if (c.kind === 'clip') g.clips.push(c)
    else g.snapshots.push(c)
  }
  return [...map.values()]
}

export function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(reader.error ?? new Error('Failed to read blob'))
    reader.readAsDataURL(blob)
  })
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
