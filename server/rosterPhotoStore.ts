import { readJson, readText, removeFile, writeJson, writeText } from './persist.ts'

const FILE = 'data/roster-photos.json'

export type DiskRosterPhotos = {
  kind: 'shape-lab-roster-photos'
  version: 1
  exportedAt: string
  photos: Record<string, string>
  ids?: string[]
}

const EMPTY: DiskRosterPhotos = {
  kind: 'shape-lab-roster-photos',
  version: 1,
  exportedAt: '',
  photos: {},
  ids: [],
}

function photoRel(id: string): string {
  return `data/roster-photos/${id}.txt`
}

function safePhotoId(id: string): string | null {
  const s = id.trim()
  if (!s || s.length > 80) return null
  if (!/^[a-zA-Z0-9_-]+$/.test(s)) return null
  return s
}

async function writeOne(id: string, url: string): Promise<void> {
  await writeText(photoRel(id), url)
}

async function readOne(id: string): Promise<string | null> {
  const text = await readText(photoRel(id))
  if (text && text.startsWith('data:')) return text
  return null
}

async function migrateCombined(data: DiskRosterPhotos): Promise<string[]> {
  const ids = new Set<string>()
  for (const id of Array.isArray(data.ids) ? data.ids : []) {
    if (typeof id === 'string' && safePhotoId(id)) ids.add(id)
  }
  let moved = false
  if (data.photos && typeof data.photos === 'object') {
    for (const [id, url] of Object.entries(data.photos)) {
      const sid = safePhotoId(id)
      if (!sid) continue
      ids.add(sid)
      if (typeof url === 'string' && url.startsWith('data:')) {
        await writeOne(sid, url)
        moved = true
      }
    }
  }
  if (moved) {
    await writeJson(FILE, {
      kind: 'shape-lab-roster-photos',
      version: 1,
      exportedAt: new Date().toISOString(),
      photos: {},
      ids: [...ids],
    })
  }
  return [...ids]
}

export async function listRosterPhotoIds(): Promise<string[]> {
  const data = await readJson<DiskRosterPhotos>(FILE, { ...EMPTY })
  return migrateCombined(data)
}

export async function readRosterPhoto(id: string): Promise<string | null> {
  const sid = safePhotoId(id)
  if (!sid) return null
  const one = await readOne(sid)
  if (one) return one
  const data = await readJson<DiskRosterPhotos>(FILE, { ...EMPTY })
  const url = data.photos?.[sid]
  return typeof url === 'string' && url.startsWith('data:') ? url : null
}

/** Index only — do not inline data URLs. iPhone Safari dies on the combined file. */
export async function readRosterPhotosFile(): Promise<DiskRosterPhotos> {
  const ids = await listRosterPhotoIds()
  return {
    kind: 'shape-lab-roster-photos',
    version: 1,
    exportedAt: '',
    photos: {},
    ids,
  }
}

export async function writeRosterPhotosFile(raw: unknown): Promise<DiskRosterPhotos> {
  const body = raw && typeof raw === 'object' ? (raw as DiskRosterPhotos) : EMPTY
  const incoming = body.photos && typeof body.photos === 'object' ? body.photos : {}
  const ids = new Set(await listRosterPhotoIds())
  for (const [id, url] of Object.entries(incoming)) {
    const sid = safePhotoId(id)
    if (!sid) continue
    if (!url) {
      ids.delete(sid)
      await removeFile(photoRel(sid))
      continue
    }
    if (typeof url === 'string' && url.startsWith('data:')) {
      await writeOne(sid, url)
      ids.add(sid)
    }
  }
  const next: DiskRosterPhotos = {
    kind: 'shape-lab-roster-photos',
    version: 1,
    exportedAt: new Date().toISOString(),
    photos: {},
    ids: [...ids],
  }
  await writeJson(FILE, next)
  return next
}

export function photosFromAthletes(athletes: unknown[]): Record<string, string> {
  const photos: Record<string, string> = {}
  for (const raw of athletes) {
    if (!raw || typeof raw !== 'object') continue
    const row = raw as { id?: unknown; photoDataUrl?: unknown }
    if (typeof row.id !== 'string' || typeof row.photoDataUrl !== 'string') continue
    if (row.photoDataUrl.startsWith('data:')) photos[row.id] = row.photoDataUrl
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
    if (!a.photoDataUrl || incoming.length > a.photoDataUrl.length) {
      return { ...a, photoDataUrl: incoming }
    }
    return a
  })
}

export function stripRosterPhotos<T extends { photoDataUrl?: string }>(athletes: T[]): T[] {
  return athletes.map(({ photoDataUrl: _photo, ...rest }) => rest as T)
}
