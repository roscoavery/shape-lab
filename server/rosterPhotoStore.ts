import { readJson, writeJson } from './persist.ts'

const FILE = 'data/roster-photos.json'

export type DiskRosterPhotos = {
  kind: 'shape-lab-roster-photos'
  version: 1
  exportedAt: string
  photos: Record<string, string>
}

const EMPTY: DiskRosterPhotos = {
  kind: 'shape-lab-roster-photos',
  version: 1,
  exportedAt: '',
  photos: {},
}

export async function readRosterPhotosFile(): Promise<DiskRosterPhotos> {
  const data = await readJson<DiskRosterPhotos>(FILE, { ...EMPTY })
  if (!data || data.kind !== 'shape-lab-roster-photos' || !data.photos || typeof data.photos !== 'object') {
    return { ...EMPTY, photos: {} }
  }
  const photos: Record<string, string> = {}
  for (const [id, url] of Object.entries(data.photos)) {
    if (id && typeof url === 'string' && url.startsWith('data:')) photos[id] = url
  }
  return {
    kind: 'shape-lab-roster-photos',
    version: 1,
    exportedAt: typeof data.exportedAt === 'string' ? data.exportedAt : '',
    photos,
  }
}

export async function writeRosterPhotosFile(raw: unknown): Promise<DiskRosterPhotos> {
  const body = raw && typeof raw === 'object' ? (raw as DiskRosterPhotos) : EMPTY
  const current = await readRosterPhotosFile()
  const incoming = body.photos && typeof body.photos === 'object' ? body.photos : {}
  const photos = { ...current.photos }
  for (const [id, url] of Object.entries(incoming)) {
    if (!id || typeof url !== 'string') continue
    if (!url) {
      delete photos[id]
      continue
    }
    if (url.startsWith('data:')) photos[id] = url
  }
  const next: DiskRosterPhotos = {
    kind: 'shape-lab-roster-photos',
    version: 1,
    exportedAt: new Date().toISOString(),
    photos,
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
