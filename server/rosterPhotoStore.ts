import type { ServerResponse } from 'node:http'
import { readBin, readJson, readText, removeFile, writeBin, writeJson } from './persist.ts'

const FILE = 'data/roster-photos.json'

export type PhotoRef = {
  url: string
  mime: string
  updatedAt: string
}

export type DiskRosterPhotos = {
  kind: 'shape-lab-roster-photos'
  version: 1 | 2
  exportedAt: string
  photos: Record<string, string | PhotoRef>
  ids?: string[]
}

const EMPTY: DiskRosterPhotos = {
  kind: 'shape-lab-roster-photos',
  version: 2,
  exportedAt: '',
  photos: {},
  ids: [],
}

function photoTextRel(id: string): string {
  return `data/roster-photos/${id}.txt`
}

function photoBinRel(id: string): string {
  return `data/roster-photos/${id}.bin`
}

function safePhotoId(id: string): string | null {
  const s = id.trim()
  if (!s || s.length > 80) return null
  if (!/^[a-zA-Z0-9_-]+$/.test(s)) return null
  return s
}

function decodeDataUrl(url: string): { buf: Buffer; mime: string } | null {
  const m = url.match(/^data:([^;]+);base64,(.+)$/s)
  if (!m) return null
  try {
    return { mime: m[1] || 'image/jpeg', buf: Buffer.from(m[2], 'base64') }
  } catch {
    return null
  }
}

function isHttpUrl(url: string): boolean {
  return url.startsWith('https://') || url.startsWith('http://') || url.startsWith('/api/')
}

function photoFileUrl(id: string, updatedAt: string): string {
  return `/api/roster-photo-file?id=${encodeURIComponent(id)}&v=${encodeURIComponent(updatedAt)}`
}

function asRef(raw: string | PhotoRef | undefined, fallbackAt: string): PhotoRef | null {
  if (!raw) return null
  if (typeof raw === 'string') {
    if (isHttpUrl(raw)) {
      return { url: raw, mime: 'image/jpeg', updatedAt: fallbackAt }
    }
    return null
  }
  if (typeof raw.url === 'string' && raw.url && !raw.url.startsWith('data:')) {
    return {
      url: raw.url,
      mime: raw.mime || 'image/jpeg',
      updatedAt: raw.updatedAt || fallbackAt,
    }
  }
  return null
}

async function writePhotoBytes(
  id: string,
  buf: Buffer,
  mime: string,
): Promise<PhotoRef> {
  const updatedAt = new Date().toISOString()
  await writeBin(photoBinRel(id), buf, mime || 'image/jpeg')
  return {
    url: photoFileUrl(id, updatedAt),
    mime: mime || 'image/jpeg',
    updatedAt,
  }
}

async function migrateDataUrl(id: string, dataUrl: string): Promise<PhotoRef | null> {
  const decoded = decodeDataUrl(dataUrl)
  if (!decoded || decoded.buf.length < 32) return null
  const ref = await writePhotoBytes(id, decoded.buf, decoded.mime)
  try {
    await removeFile(photoTextRel(id))
  } catch {
    /* leftover text is unused once the binary exists */
  }
  return ref
}

async function loadIndex(): Promise<DiskRosterPhotos> {
  const data = await readJson<DiskRosterPhotos>(FILE, { ...EMPTY })
  if (!data || data.kind !== 'shape-lab-roster-photos') return { ...EMPTY }
  return {
    ...EMPTY,
    ...data,
    photos: data.photos && typeof data.photos === 'object' ? data.photos : {},
    ids: Array.isArray(data.ids) ? data.ids.filter((id): id is string => typeof id === 'string') : [],
  }
}

async function persistIndex(photos: Record<string, PhotoRef>): Promise<DiskRosterPhotos> {
  const next: DiskRosterPhotos = {
    kind: 'shape-lab-roster-photos',
    version: 2,
    exportedAt: new Date().toISOString(),
    photos,
    ids: Object.keys(photos),
  }
  await writeJson(FILE, next)
  return next
}

export async function listRosterPhotoIds(): Promise<string[]> {
  const data = await loadIndex()
  const ids = new Set<string>()
  for (const id of data.ids ?? []) {
    if (safePhotoId(id)) ids.add(id)
  }
  for (const id of Object.keys(data.photos)) {
    if (safePhotoId(id)) ids.add(id)
  }
  return [...ids]
}

export async function readRosterPhoto(id: string): Promise<string | null> {
  const sid = safePhotoId(id)
  if (!sid) return null
  const data = await loadIndex()
  const ref = asRef(data.photos[sid], data.exportedAt)
  if (ref) return ref.url
  const text = await readText(photoTextRel(sid))
  if (text?.startsWith('data:')) {
    const migrated = await migrateDataUrl(sid, text)
    if (migrated) {
      const photos = clientPhotoMap(data)
      photos[sid] = migrated
      await persistIndex(photos)
      return migrated.url
    }
  }
  return null
}

function clientPhotoMap(data: DiskRosterPhotos): Record<string, PhotoRef> {
  const photos: Record<string, PhotoRef> = {}
  const at = data.exportedAt || new Date().toISOString()
  const ids = new Set([...(data.ids ?? []), ...Object.keys(data.photos)])
  for (const id of ids) {
    const sid = safePhotoId(id)
    if (!sid) continue
    const ref = asRef(data.photos[sid], at)
    if (ref) {
      photos[sid] = ref
      continue
    }
    photos[sid] = {
      url: photoFileUrl(sid, at),
      mime: 'image/jpeg',
      updatedAt: at,
    }
  }
  return photos
}

/** Index only — phones get URLs, never megabyte data URLs. */
export async function readRosterPhotosFile(): Promise<DiskRosterPhotos> {
  const data = await loadIndex()
  const photos = clientPhotoMap(data)
  return {
    kind: 'shape-lab-roster-photos',
    version: 2,
    exportedAt: data.exportedAt,
    photos,
    ids: Object.keys(photos),
  }
}

export async function writeRosterPhotosFile(raw: unknown): Promise<DiskRosterPhotos> {
  const body = raw && typeof raw === 'object' ? (raw as DiskRosterPhotos) : EMPTY
  const incoming = body.photos && typeof body.photos === 'object' ? body.photos : {}
  const current = clientPhotoMap(await loadIndex())
  for (const [id, value] of Object.entries(incoming)) {
    const sid = safePhotoId(id)
    if (!sid) continue
    if (!value) {
      delete current[sid]
      await removeFile(photoBinRel(sid))
      await removeFile(photoTextRel(sid))
      continue
    }
    if (typeof value === 'string' && value.startsWith('data:')) {
      const migrated = await migrateDataUrl(sid, value)
      if (migrated) current[sid] = migrated
      continue
    }
    if (typeof value === 'string' && isHttpUrl(value)) {
      current[sid] = { url: value, mime: 'image/jpeg', updatedAt: new Date().toISOString() }
      continue
    }
    if (typeof value === 'object' && value && typeof value.url === 'string') {
      if (value.url.startsWith('data:')) {
        const migrated = await migrateDataUrl(sid, value.url)
        if (migrated) current[sid] = migrated
      } else if (isHttpUrl(value.url)) {
        current[sid] = {
          url: value.url,
          mime: value.mime || 'image/jpeg',
          updatedAt: value.updatedAt || new Date().toISOString(),
        }
      }
    }
  }
  return persistIndex(current)
}

export async function writeRosterPhotoBytes(
  id: string,
  buf: Buffer,
  mime: string,
): Promise<PhotoRef | null> {
  const sid = safePhotoId(id)
  if (!sid || !buf.length) return null
  const ref = await writePhotoBytes(sid, buf, mime)
  const current = clientPhotoMap(await loadIndex())
  current[sid] = ref
  await persistIndex(current)
  return ref
}

async function dataUrlForId(id: string, data: DiskRosterPhotos): Promise<string | null> {
  const raw = data.photos[id]
  if (typeof raw === 'string' && raw.startsWith('data:')) return raw
  if (raw && typeof raw === 'object' && typeof raw.url === 'string' && raw.url.startsWith('data:')) {
    return raw.url
  }
  const text = await readText(photoTextRel(id))
  return text?.startsWith('data:') ? text : null
}

export async function sendRosterPhotoFile(id: string, res: ServerResponse): Promise<boolean> {
  const sid = safePhotoId(id)
  if (!sid) return false
  let buf = await readBin(photoBinRel(sid))
  let mime = 'image/jpeg'
  if (!buf) {
    const data = await loadIndex()
    const dataUrl = await dataUrlForId(sid, data)
    if (dataUrl) {
      const migrated = await migrateDataUrl(sid, dataUrl)
      if (migrated) {
        const current = clientPhotoMap(data)
        current[sid] = migrated
        await persistIndex(current)
        buf = await readBin(photoBinRel(sid))
        mime = migrated.mime
      }
    }
  } else {
    const data = await loadIndex()
    const ref = asRef(data.photos[sid], data.exportedAt)
    if (ref?.mime) mime = ref.mime
  }
  if (!buf) return false
  res.statusCode = 200
  res.setHeader('Content-Type', mime)
  res.setHeader('Content-Length', String(buf.length))
  res.setHeader('Cache-Control', 'public, max-age=31536000, immutable')
  res.end(buf)
  return true
}

export function photosFromAthletes(athletes: unknown[]): Record<string, string> {
  const photos: Record<string, string> = {}
  for (const raw of athletes) {
    if (!raw || typeof raw !== 'object') continue
    const row = raw as { id?: unknown; photoDataUrl?: unknown }
    if (typeof row.id !== 'string' || typeof row.photoDataUrl !== 'string') continue
    if (row.photoDataUrl.startsWith('data:') || isHttpUrl(row.photoDataUrl)) {
      photos[row.id] = row.photoDataUrl
    }
  }
  return photos
}

export function attachRosterPhotos<T extends { id: string; photoDataUrl?: string }>(
  athletes: T[],
  photos: Record<string, string>,
): T[] {
  return athletes.map((a) => {
    const incoming = photos[a.id]
    if (!incoming) return a
    if (!a.photoDataUrl || incoming.length > a.photoDataUrl.length || incoming.startsWith('http') || incoming.startsWith('/api/')) {
      return { ...a, photoDataUrl: incoming }
    }
    return a
  })
}

export function stripRosterPhotos<T extends { photoDataUrl?: string }>(athletes: T[]): T[] {
  return athletes.map(({ photoDataUrl: _photo, ...rest }) => rest as T)
}
