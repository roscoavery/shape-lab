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

function loadImageElement(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('Could not read that picture'))
    img.src = src
  })
}

async function rasterToJpeg(
  source: ImageBitmap | HTMLImageElement,
  maxW: number,
  quality: number,
): Promise<Blob | null> {
  const width = 'width' in source ? source.width : 0
  const height = 'height' in source ? source.height : 0
  if (!width || !height) return null
  const scale = width > maxW ? maxW / width : 1
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(width * scale)
  canvas.height = Math.round(height * scale)
  const ctx = canvas.getContext('2d')
  if (!ctx) return null
  ctx.drawImage(source, 0, 0, canvas.width, canvas.height)
  if ('close' in source) source.close()
  return new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality))
}

/** Resize + JPEG. iPhone HEIC often fails createImageBitmap — fall back to <img>. */
export async function fileToJpegBlob(file: File, maxW = 1200, quality = 0.84): Promise<Blob> {
  try {
    const bitmap = await createImageBitmap(file)
    const out = await rasterToJpeg(bitmap, maxW, quality)
    if (out) return out
  } catch {
    /* HEIC / old Safari */
  }
  const url = URL.createObjectURL(file)
  try {
    const img = await loadImageElement(url)
    const out = await rasterToJpeg(img, maxW, quality)
    if (out) return out
  } finally {
    URL.revokeObjectURL(url)
  }
  if (file.type.startsWith('image/')) return file
  throw new Error('Could not read that picture. Try a screenshot or a JPEG.')
}

export function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(reader.error ?? new Error('Failed to read blob'))
    reader.readAsDataURL(blob)
  })
}
