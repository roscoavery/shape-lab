/**
 * Ryan's IG shape crops on disk so every Preview / phone link shows them.
 * Blobs live in data/ig-blobs/; metadata in data/ig-stills.json.
 */

import type { IncomingMessage, ServerResponse } from 'node:http'
import { readBin, readJson, removeFile, writeBin, writeJson } from './persist.ts'

const META = 'data/ig-stills.json'
const blobRel = (file: string) => `data/ig-blobs/${file}`
const MAX_STILLS = 80
const MAX_BYTES = 6 * 1024 * 1024

export type DiskIgStill = {
  id: string
  shapeId: string
  athleteId: string | null
  label?: string
  customName?: string
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

export async function readIgStillMeta(): Promise<DiskIgLibrary> {
  const data = await readJson<DiskIgLibrary>(META, { ...EMPTY })
  if (!data || data.kind !== 'shape-lab-ig-stills' || !Array.isArray(data.stills)) {
    return { ...EMPTY }
  }
  return {
    ...EMPTY,
    ...data,
    stills: data.stills.filter((s) => s && typeof s.id === 'string' && typeof s.file === 'string'),
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
  return (await readIgStillMeta()).stills.map((s) => ({
    id: s.id,
    shapeId: s.shapeId,
    athleteId: s.athleteId,
    label: s.label,
    customName: s.customName,
    createdAt: s.createdAt,
    library: 'ig',
    persistedToApp: true,
    dataUrl: `/api/ig-still-file?id=${encodeURIComponent(s.id)}`,
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
  const buf = await readBin(blobRel(row.file))
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
