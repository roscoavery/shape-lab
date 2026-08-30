import type { IncomingMessage, ServerResponse } from 'node:http'
import { readBin, readJson, writeBin, writeJson } from './persist.ts'

const META = 'data/coach-media.json'
const blobRel = (file: string) => `data/coach-media-blobs/${file}`
const MAX_BYTES = 48 * 1024 * 1024

type DiskRow = {
  id: string
  ownerId: string
  name: string
  createdAt: string
  mime: string
  file: string
  sizeBytes: number
}

type DiskLib = {
  kind: 'shape-lab-coach-media'
  version: 1
  exportedAt: string
  files: DiskRow[]
}

const EMPTY: DiskLib = {
  kind: 'shape-lab-coach-media',
  version: 1,
  exportedAt: '',
  files: [],
}

function safeId(id: string): string | null {
  const s = id.trim()
  if (!s || s.length > 80) return null
  if (!/^[a-zA-Z0-9_-]+$/.test(s)) return null
  return s
}

function extForMime(mime: string): string {
  if (mime.includes('mp4')) return '.mp4'
  if (mime.includes('webm')) return '.webm'
  if (mime.includes('jpeg') || mime.includes('jpg')) return '.jpg'
  if (mime.includes('png')) return '.png'
  return '.bin'
}

async function readMeta(): Promise<DiskLib> {
  const data = await readJson<DiskLib>(META, { ...EMPTY })
  if (!data || data.kind !== 'shape-lab-coach-media' || !Array.isArray(data.files)) {
    return { ...EMPTY }
  }
  return { ...EMPTY, ...data, files: data.files.filter((f) => f && typeof f.id === 'string') }
}

export function readCoachMediaBuffer(req: IncomingMessage, max = MAX_BYTES): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    let n = 0
    req.on('data', (c: Buffer) => {
      n += c.length
      if (n > max) {
        reject(new Error('That file is too large to save into the app.'))
        req.destroy()
        return
      }
      chunks.push(c)
    })
    req.on('end', () => resolve(Buffer.concat(chunks)))
    req.on('error', reject)
  })
}

export async function addCoachMedia(params: {
  id: string
  ownerId: string
  name: string
  mime: string
  buf: Buffer
}): Promise<{ id: string; url: string; mime: string } | null> {
  const id = safeId(params.id)
  const ownerId = safeId(params.ownerId)
  if (!id || !ownerId || !params.buf.length || params.buf.length > MAX_BYTES) return null
  const mime = params.mime || 'application/octet-stream'
  const file = `${id}${extForMime(mime)}`
  await writeBin(blobRel(file), params.buf, mime)
  const row: DiskRow = {
    id,
    ownerId,
    name: params.name.trim() || 'Media',
    createdAt: new Date().toISOString(),
    mime,
    file,
    sizeBytes: params.buf.length,
  }
  const meta = await readMeta()
  const files = [row, ...meta.files.filter((f) => f.id !== id)]
  await writeJson(META, {
    kind: 'shape-lab-coach-media',
    version: 1,
    exportedAt: new Date().toISOString(),
    files,
  })
  return { id, url: `/api/coach-media-file?id=${encodeURIComponent(id)}`, mime }
}

export async function sendCoachMediaFile(id: string, res: ServerResponse): Promise<boolean> {
  const sid = safeId(id)
  if (!sid) return false
  const found = (await readMeta()).files.find((f) => f.id === sid)
  if (!found) return false
  const buf = await readBin(blobRel(found.file))
  if (!buf) return false
  res.statusCode = 200
  res.setHeader('Content-Type', found.mime || 'application/octet-stream')
  res.setHeader('Content-Length', String(buf.length))
  res.setHeader('Cache-Control', 'private, max-age=3600')
  res.end(buf)
  return true
}
