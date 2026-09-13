/**
 * Extra coach stills and the main-still pick for each shape.
 * Pixels live in data/coach-blobs/; metadata in data/coach-stills.json.
 */

import type { IncomingMessage, ServerResponse } from 'node:http'
import { readBin, readJson, writeBin, writeJson } from './persist.ts'

const FILE = 'data/coach-stills.json'
const blobRel = (name: string) => `data/coach-blobs/${name}`
const MAX_EXTRAS = 2000
const MAX_BYTES = 6 * 1024 * 1024

export type CoachStillExtra = {
  id: string
  shapeId: string
  dataUrl?: string
  label?: string
  createdAt: string
  file?: string
}

export type CoachStillsFile = {
  kind: 'shape-lab-coach-stills'
  version: 1
  updatedAt: string
  main: Record<string, string>
  extras: CoachStillExtra[]
}

const EMPTY: CoachStillsFile = {
  kind: 'shape-lab-coach-stills',
  version: 1,
  updatedAt: '',
  main: {},
  extras: [],
}

function safeId(id: string): string | null {
  const s = id.trim()
  if (!s || s.length > 80) return null
  if (!/^[a-zA-Z0-9_-]+$/.test(s)) return null
  return s
}

function parseDataUrl(dataUrl: string): { type: string; buf: Buffer } | null {
  const m = /^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/.exec(dataUrl.trim())
  if (!m) return null
  const type = m[1]!
  try {
    const buf = Buffer.from(m[2]!, 'base64')
    if (!buf.length || buf.length > MAX_BYTES) return null
    return { type, buf }
  } catch {
    return null
  }
}

function mimeToExt(mime: string): { ext: string; type: string } {
  if (mime.includes('png')) return { ext: '.png', type: 'image/png' }
  if (mime.includes('webp')) return { ext: '.webp', type: 'image/webp' }
  return { ext: '.jpg', type: 'image/jpeg' }
}

function clientUrl(row: CoachStillExtra): string {
  if (row.file) return `/api/coach-still-file?id=${encodeURIComponent(row.id)}`
  if (row.dataUrl?.startsWith('data:image') || row.dataUrl?.startsWith('/')) {
    return row.dataUrl
  }
  return `/api/coach-still-file?id=${encodeURIComponent(row.id)}`
}

function cleanExtra(row: unknown): CoachStillExtra | null {
  if (!row || typeof row !== 'object') return null
  const item = row as Record<string, unknown>
  const id = typeof item.id === 'string' ? item.id.trim() : ''
  const shapeId = typeof item.shapeId === 'string' ? item.shapeId.trim() : ''
  if (!id || !shapeId) return null
  const dataUrl = typeof item.dataUrl === 'string' ? item.dataUrl : undefined
  const file = typeof item.file === 'string' && item.file ? item.file : undefined
  if (!file && !(dataUrl && (dataUrl.startsWith('data:image') || dataUrl.startsWith('/')))) {
    return null
  }
  return {
    id: id.slice(0, 80),
    shapeId: shapeId.slice(0, 80),
    dataUrl,
    file,
    label: typeof item.label === 'string' ? item.label.trim().slice(0, 80) : undefined,
    createdAt: typeof item.createdAt === 'string' ? item.createdAt : '',
  }
}

async function persistPixels(extra: CoachStillExtra): Promise<CoachStillExtra> {
  if (extra.file && !extra.dataUrl?.startsWith('data:image')) {
    const { dataUrl: _drop, ...rest } = extra
    return rest
  }
  if (!extra.dataUrl?.startsWith('data:image')) return extra
  const parsed = parseDataUrl(extra.dataUrl)
  if (!parsed) return extra
  const { ext } = mimeToExt(parsed.type)
  const file = `${extra.id}${ext}`
  await writeBin(blobRel(file), parsed.buf, parsed.type)
  return {
    id: extra.id,
    shapeId: extra.shapeId,
    label: extra.label,
    createdAt: extra.createdAt,
    file,
  }
}

function asFile(data: CoachStillsFile): CoachStillsFile {
  const main: Record<string, string> = {}
  if (data.main && typeof data.main === 'object') {
    for (const [shapeId, stillId] of Object.entries(data.main)) {
      if (shapeId && typeof stillId === 'string' && stillId.trim()) {
        main[shapeId] = stillId.trim()
      }
    }
  }
  return {
    ...EMPTY,
    ...data,
    main,
    extras: Array.isArray(data.extras)
      ? data.extras
          .map(cleanExtra)
          .filter((row): row is CoachStillExtra => Boolean(row))
          .slice(0, MAX_EXTRAS)
      : [],
  }
}

export async function readCoachStillsFile(): Promise<CoachStillsFile> {
  const data = await readJson<CoachStillsFile>(FILE, { ...EMPTY })
  if (!data || data.kind !== 'shape-lab-coach-stills') return { ...EMPTY }
  return asFile(data)
}

export async function extrasForClient(file?: CoachStillsFile) {
  const next = file ?? (await readCoachStillsFile())
  return {
    ...next,
    extras: next.extras.map((row) => ({
      ...row,
      dataUrl: clientUrl(row),
    })),
  }
}

export async function writeCoachStillsFile(data: unknown): Promise<CoachStillsFile> {
  const parsed = asFile({ ...EMPTY, ...(data as Partial<CoachStillsFile>) })
  const current = await readCoachStillsFile()
  const prevById = new Map(current.extras.map((row) => [row.id, row]))
  const extras: CoachStillExtra[] = []
  for (const row of parsed.extras) {
    if (!row.file && !row.dataUrl?.startsWith('data:image')) {
      const prev = prevById.get(row.id)
      if (prev) extras.push(prev)
      continue
    }
    extras.push(await persistPixels(row))
  }
  const next: CoachStillsFile = {
    kind: 'shape-lab-coach-stills',
    version: 1,
    updatedAt: new Date().toISOString(),
    main: parsed.main,
    extras,
  }
  await writeJson(FILE, next)
  return extrasForClient(next)
}

export async function addCoachStillFromBody(body: unknown): Promise<CoachStillsFile> {
  if (!body || typeof body !== 'object') throw new Error('Invalid still')
  const p = body as Record<string, unknown>
  const id = typeof p.id === 'string' ? safeId(p.id) : null
  const shapeId = typeof p.shapeId === 'string' ? p.shapeId.trim().slice(0, 80) : ''
  const dataUrl = typeof p.dataUrl === 'string' ? p.dataUrl : ''
  if (!id || !shapeId) throw new Error('Still needs an id and a shape')
  const extra = await persistPixels({
    id,
    shapeId,
    dataUrl,
    label: typeof p.label === 'string' ? p.label.trim().slice(0, 80) : undefined,
    createdAt: typeof p.createdAt === 'string' ? p.createdAt : new Date().toISOString(),
  })
  if (!extra.file && !extra.dataUrl?.startsWith('data:image')) {
    throw new Error('Still needs a picture')
  }
  const file = await readCoachStillsFile()
  const extras = [extra, ...file.extras.filter((row) => row.id !== id)].slice(0, MAX_EXTRAS)
  const next: CoachStillsFile = {
    kind: 'shape-lab-coach-stills',
    version: 1,
    updatedAt: new Date().toISOString(),
    main: file.main,
    extras,
  }
  await writeJson(FILE, next)
  return extrasForClient(next)
}

export async function sendCoachStillFile(idRaw: string, res: ServerResponse): Promise<boolean> {
  const id = safeId(idRaw)
  if (!id) return false
  const file = await readCoachStillsFile()
  const row = file.extras.find((s) => s.id === id)
  if (!row) return false
  if (row.file) {
    const buf = await readBin(blobRel(row.file))
    if (!buf) return false
    const { type } = mimeToExt(row.file)
    res.statusCode = 200
    res.setHeader('Content-Type', type)
    res.setHeader('Cache-Control', 'public, max-age=86400')
    res.end(buf)
    return true
  }
  if (row.dataUrl?.startsWith('data:image')) {
    const parsed = parseDataUrl(row.dataUrl)
    if (!parsed) return false
    res.statusCode = 200
    res.setHeader('Content-Type', parsed.type)
    res.setHeader('Cache-Control', 'public, max-age=86400')
    res.end(parsed.buf)
    return true
  }
  return false
}

export function readRequestBodyLimited(
  req: IncomingMessage,
  max = MAX_BYTES + 512 * 1024,
): Promise<string> {
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
