/**
 * Ryan's IG shape crops on disk so every Preview / phone link shows them.
 * Blobs live in data/ig-blobs/; metadata in data/ig-stills.json.
 */

import type { IncomingMessage, ServerResponse } from 'node:http'
import path from 'node:path'
import { readBin, readDiskJson, readJson, removeFile, writeBin, writeJson } from './persist.ts'

const META = 'data/ig-stills.json'
const blobRel = (file: string) => `data/ig-blobs/${file}`
const MAX_STILLS = 400
const SHIPPED_DIR = 'public/learn/ig-stills'
const MAX_BYTES = 6 * 1024 * 1024

export type DiskIgStill = {
  id: string
  shapeId: string
  athleteId: string | null
  label?: string
  customName?: string
  notes?: string
  createdAt: string
  library: 'ig'
  file: string
}

export type DiskIgLibrary = {
  kind: 'shape-lab-ig-stills'
  version: 1
  exportedAt: string
  stills: DiskIgStill[]
}

const EMPTY: DiskIgLibrary = {
  kind: 'shape-lab-ig-stills',
  version: 1,
  exportedAt: '',
  stills: [],
}

function safeId(id: string): string | null {
  const s = id.trim()
  if (!s || s.length > 80) return null
  if (!/^[a-zA-Z0-9_-]+$/.test(s)) return null
  return s
}

function mimeToExt(mime: string): { ext: string; type: string } {
  if (mime.includes('png')) return { ext: '.png', type: 'image/png' }
  if (mime.includes('webp')) return { ext: '.webp', type: 'image/webp' }
  return { ext: '.jpg', type: 'image/jpeg' }
}

function parseDataUrl(dataUrl: string): { type: string; buf: Buffer } | null {
  const m = /^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/.exec(dataUrl.trim())
  if (!m) return null
  const type = m[1]!
  const b64 = m[2]!
  let buf: Buffer
  try {
    buf = Buffer.from(b64, 'base64')
  } catch {
    return null
  }
  if (!buf.length || buf.length > MAX_BYTES) return null
  return { type, buf }
}

function asDiskStill(s: unknown): DiskIgStill | null {
  if (!s || typeof s !== 'object') return null
  const row = s as DiskIgStill
  if (typeof row.id !== 'string' || !row.id) return null
  const file = typeof row.file === 'string' && row.file ? row.file : `${row.id}.jpg`
  return { ...row, library: 'ig', file }
}

const SHIPPED_FALLBACK: DiskIgStill[] = [
  {
    id: 'ig_mtcn5232_az6p66',
    shapeId: 'handstand',
    athleteId: null,
    createdAt: '2026-08-28T07:39:19.118Z',
    library: 'ig',
    file: 'ig_mtcn5232_az6p66.jpg',
  },
  {
    id: 'ig_mtdy2mah_ey7owy',
    shapeId: 'custom_eduardo_athlete_lever',
    athleteId: 'ath_mt946zgf_p3ml85',
    label: 'eduardo athlete lever',
    customName: 'eduardo athlete lever',
    createdAt: '2026-08-29T05:33:07.289Z',
    library: 'ig',
    file: 'ig_mtdy2mah_ey7owy.jpg',
  },
  {
    id: 'ig_mtdy0ax0_wz77sx',
    shapeId: 'custom_eduardo_athlete_starting_lunge',
    athleteId: 'ath_mt946zgf_p3ml85',
    label: 'eduardo athlete starting lunge',
    customName: 'eduardo athlete starting lunge',
    createdAt: '2026-08-29T05:31:19.236Z',
    library: 'ig',
    file: 'ig_mtdy0ax0_wz77sx.jpg',
  },
  {
    id: 'ig_mtdcrfqt_j9l8df',
    shapeId: 'custom_zombie_into_whip',
    athleteId: 'ath_ryan',
    label: 'Dead mat whip shapes',
    customName: 'Zombie into whip',
    createdAt: '2026-08-28T19:36:33.653Z',
    library: 'ig',
    file: 'ig_mtdcrfqt_j9l8df.jpg',
  },
]

/** Blob can be an empty file that hid the disk / shipped library. Union, do not replace. */
export async function readIgStillMeta(): Promise<DiskIgLibrary> {
  const remote = await readJson<DiskIgLibrary>(META, { ...EMPTY })
  const disk = readDiskJson<DiskIgLibrary>(META, { ...EMPTY })
  const map = new Map<string, DiskIgStill>()
  const addAll = (lib: DiskIgLibrary | null) => {
    if (!lib || lib.kind !== 'shape-lab-ig-stills' || !Array.isArray(lib.stills)) return
    for (const raw of lib.stills) {
      const row = asDiskStill(raw)
      if (row) map.set(row.id, row)
    }
  }
  addAll(disk)
  addAll(remote)
  for (const shipped of SHIPPED_FALLBACK) {
    if (!map.has(shipped.id)) map.set(shipped.id, shipped)
  }
  return {
    ...EMPTY,
    exportedAt: remote.exportedAt || disk.exportedAt || '',
    stills: [...map.values()].sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? '')),
  }
}

async function writeMeta(stills: DiskIgStill[]): Promise<DiskIgLibrary> {
  const next: DiskIgLibrary = {
    kind: 'shape-lab-ig-stills',
    version: 1,
    exportedAt: new Date().toISOString(),
    stills: stills.slice(0, MAX_STILLS),
  }
  await writeJson(META, next)
  return next
}

export async function stillsForClient(): Promise<Array<Record<string, unknown>>> {
  const shippedIds = new Set(SHIPPED_FALLBACK.map((s) => s.id))
  return (await readIgStillMeta()).stills.map((s) => ({
    id: s.id,
    shapeId: s.shapeId,
    athleteId: s.athleteId,
    label: s.label,
    customName: s.customName,
    notes: s.notes,
    createdAt: s.createdAt,
    library: 'ig',
    persistedToApp: true,
    dataUrl: shippedIds.has(s.id)
      ? `/learn/ig-stills/${s.file}`
      : `/api/ig-still-file?id=${encodeURIComponent(s.id)}`,
  }))
}

export async function addIgStillFromBody(body: unknown): Promise<Record<string, unknown>> {
  if (!body || typeof body !== 'object') throw new Error('Invalid still')
  const p = body as Record<string, unknown>
  const id = typeof p.id === 'string' ? safeId(p.id) : null
  const shapeId = typeof p.shapeId === 'string' ? p.shapeId.trim() : ''
  const dataUrl = typeof p.dataUrl === 'string' ? p.dataUrl : ''
  if (!id || !shapeId) throw new Error('Still needs an id and a shape')
  const parsed = parseDataUrl(dataUrl)
  if (!parsed) throw new Error('Still needs a data:image payload')
  const { ext, type } = mimeToExt(parsed.type)
  const file = `${id}${ext}`
  await writeBin(blobRel(file), parsed.buf, type)
  const meta = await readIgStillMeta()
  const row: DiskIgStill = {
    id,
    shapeId,
    athleteId: typeof p.athleteId === 'string' ? p.athleteId : null,
    label: typeof p.label === 'string' ? p.label : undefined,
    customName: typeof p.customName === 'string' ? p.customName : undefined,
    notes: typeof p.notes === 'string' ? p.notes : undefined,
    createdAt: typeof p.createdAt === 'string' ? p.createdAt : new Date().toISOString(),
    library: 'ig',
    file,
  }
  const stills = [row, ...meta.stills.filter((s) => s.id !== id)].slice(0, MAX_STILLS)
  await writeMeta(stills)
  return {
    ...row,
    persistedToApp: true,
    dataUrl: `/api/ig-still-file?id=${encodeURIComponent(id)}`,
  }
}

function optionalText(value: unknown, max: number): string | undefined {
  if (typeof value !== 'string') return undefined
  const text = value.trim().slice(0, max)
  return text || undefined
}

/** Update text metadata without rewriting or deleting the stored image blob. */
export async function updateIgStillMeta(
  idRaw: string,
  body: unknown,
): Promise<Record<string, unknown> | null> {
  const id = safeId(idRaw)
  if (!id || !body || typeof body !== 'object') return null
  const meta = await readIgStillMeta()
  const found = meta.stills.find((still) => still.id === id)
  if (!found) return null
  const patch = body as Record<string, unknown>
  const next: DiskIgStill = {
    ...found,
    ...(Object.hasOwn(patch, 'label') ? { label: optionalText(patch.label, 120) } : {}),
    ...(Object.hasOwn(patch, 'customName')
      ? { customName: optionalText(patch.customName, 120) }
      : {}),
    ...(Object.hasOwn(patch, 'notes') ? { notes: optionalText(patch.notes, 1200) } : {}),
  }
  await writeMeta(meta.stills.map((still) => (still.id === id ? next : still)))
  return {
    ...next,
    persistedToApp: true,
    dataUrl: `/api/ig-still-file?id=${encodeURIComponent(id)}`,
  }
}

export async function deleteIgStill(idRaw: string): Promise<boolean> {
  const id = safeId(idRaw)
  if (!id) return false
  const meta = await readIgStillMeta()
  const row = meta.stills.find((s) => s.id === id)
  if (!row) return false
  await writeMeta(meta.stills.filter((s) => s.id !== id))
  await removeFile(blobRel(row.file))
  return true
}

export async function sendIgStillFile(idRaw: string, res: ServerResponse): Promise<boolean> {
  const id = safeId(idRaw)
  if (!id) return false
  const row = (await readIgStillMeta()).stills.find((s) => s.id === id)
  if (!row) return false
  const buf =
    (await readBin(blobRel(row.file))) ??
    (await readBin(path.posix.join(SHIPPED_DIR, row.file))) ??
    (await readBin(path.posix.join(SHIPPED_DIR, `${id}.jpg`)))
  if (!buf) return false
  const { type } = mimeToExt(row.file)
  res.statusCode = 200
  res.setHeader('Content-Type', type)
  res.setHeader('Cache-Control', 'public, max-age=86400')
  res.end(buf)
  return true
}

export function readRequestBodyLimited(req: IncomingMessage, max = MAX_BYTES + 512 * 1024): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    let n = 0
    req.on('data', (c: Buffer) => {
      n += c.length
      if (n > max) {
        reject(new Error('Still is too large'))
        req.destroy()
        return
      }
      chunks.push(c)
    })
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')))
    req.on('error', reject)
  })
}
