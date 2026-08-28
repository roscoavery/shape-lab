/**
 * Ryan's IG shape crops on disk so every Preview / phone link shows them.
 * Blobs live in data/ig-blobs/; metadata in data/ig-stills.json.
 */

import fs from 'node:fs'
import path from 'node:path'
import type { IncomingMessage, ServerResponse } from 'node:http'

const META = path.join(process.cwd(), 'data/ig-stills.json')
const BLOBS = path.join(process.cwd(), 'data/ig-blobs')
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

export function readIgStillMeta(): DiskIgLibrary {
  try {
    const data = JSON.parse(fs.readFileSync(META, 'utf8')) as DiskIgLibrary
    if (!data || data.kind !== 'shape-lab-ig-stills' || !Array.isArray(data.stills)) {
      return { ...EMPTY }
    }
    return {
      ...EMPTY,
      ...data,
      stills: data.stills.filter((s) => s && typeof s.id === 'string' && typeof s.file === 'string'),
    }
  } catch {
    return { ...EMPTY }
  }
}

function writeMeta(stills: DiskIgStill[]): DiskIgLibrary {
  const next: DiskIgLibrary = {
    kind: 'shape-lab-ig-stills',
    version: 1,
    exportedAt: new Date().toISOString(),
    stills: stills.slice(0, MAX_STILLS),
  }
  fs.mkdirSync(path.dirname(META), { recursive: true })
  fs.writeFileSync(META, JSON.stringify(next, null, 2) + '\n')
  return next
}

export function stillsForClient(): Array<Record<string, unknown>> {
  return readIgStillMeta().stills.map((s) => ({
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

export function addIgStillFromBody(body: unknown): Record<string, unknown> {
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
  fs.mkdirSync(BLOBS, { recursive: true })
  fs.writeFileSync(path.join(BLOBS, file), parsed.buf)
  const meta = readIgStillMeta()
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
  writeMeta(stills)
  void type
  return {
    ...row,
    persistedToApp: true,
    dataUrl: `/api/ig-still-file?id=${encodeURIComponent(id)}`,
  }
}

export function deleteIgStill(idRaw: string): boolean {
  const id = safeId(idRaw)
  if (!id) return false
  const meta = readIgStillMeta()
  const row = meta.stills.find((s) => s.id === id)
  if (!row) return false
  writeMeta(meta.stills.filter((s) => s.id !== id))
  try {
    fs.unlinkSync(path.join(BLOBS, row.file))
  } catch {
    /* already gone */
  }
  return true
}

export function sendIgStillFile(idRaw: string, res: ServerResponse): boolean {
  const id = safeId(idRaw)
  if (!id) return false
  const row = readIgStillMeta().stills.find((s) => s.id === id)
  if (!row) return false
  const file = path.join(BLOBS, row.file)
  if (!fs.existsSync(file)) return false
  const { type } = mimeToExt(row.file)
  const buf = fs.readFileSync(file)
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
