/**
 * Extra glossary shapes — learn-only positions that are not scored on camera.
 * Photo blobs live in IndexedDB so the gym iPad does not fill localStorage.
 */

const DB_NAME = 'shape-lab-glossary'
const DB_VERSION = 1
const META = 'extra'
const BLOBS = 'blobs'

export type ExtraShape = {
  id: string
  name: string
  /** Coach-written extra info shown on the glossary card. */
  notes: string
  bodyPosition: string
  cameraHint: string
  createdAt: string
}

let dbPromise: Promise<IDBDatabase> | null = null

function openDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(META)) {
        db.createObjectStore(META, { keyPath: 'id' })
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

export async function listExtraShapes(): Promise<ExtraShape[]> {
  const db = await openDb()
  const tx = db.transaction(META, 'readonly')
  const rows = await reqToPromise(tx.objectStore(META).getAll() as IDBRequest<ExtraShape[]>)
  return rows.sort((a, b) => a.name.localeCompare(b.name))
}

export async function saveExtraShape(entry: ExtraShape, blob: Blob): Promise<void> {
  const db = await openDb()
  const tx = db.transaction([META, BLOBS], 'readwrite')
  tx.objectStore(META).put(entry)
  tx.objectStore(BLOBS).put(blob, entry.id)
  await new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

export async function getExtraShapeBlob(id: string): Promise<Blob | null> {
  const db = await openDb()
  const tx = db.transaction(BLOBS, 'readonly')
  const blob = await reqToPromise(tx.objectStore(BLOBS).get(id) as IDBRequest<Blob | undefined>)
  return blob ?? null
}

export async function deleteExtraShape(id: string): Promise<void> {
  const db = await openDb()
  const tx = db.transaction([META, BLOBS], 'readwrite')
  tx.objectStore(META).delete(id)
  tx.objectStore(BLOBS).delete(id)
  await new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

/** Resize + JPEG so many glossary photos still fit on the device. */
export async function fileToJpegBlob(file: File, maxW = 1200, quality = 0.84): Promise<Blob> {
  const bitmap = await createImageBitmap(file)
  const scale = bitmap.width > maxW ? maxW / bitmap.width : 1
  const w = Math.round(bitmap.width * scale)
  const h = Math.round(bitmap.height * scale)
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    bitmap.close()
    return file
  }
  ctx.drawImage(bitmap, 0, 0, w, h)
  bitmap.close()
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality))
  return blob ?? file
}

export function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(reader.error ?? new Error('Failed to read blob'))
    reader.readAsDataURL(blob)
  })
}
