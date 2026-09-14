/**
 * Extra coach stills and the main-still pick for each shape.
 * Pixels live in data/coach-blobs/; metadata in data/coach-stills.json.
 */

import type { IncomingMessage, ServerResponse } from 'node:http'
import fs from 'node:fs'
import path from 'node:path'
import { readBin, readDiskJson, readJson, removeFile, writeBin, writeJson } from './persist.ts'

const FILE = 'data/coach-stills.json'
const blobRel = (name: string) => `data/coach-blobs/${name}`
const SHIPPED_DIR = 'public/learn/coach-stills'
const SHIPPED_MANIFEST = 'src/config/shippedCoachStills.json'
const MAX_EXTRAS = 2000
const MAX_BYTES = 6 * 1024 * 1024

type ShippedManifestExtra = {
  id: string
  shapeId: string
  file: string
  label?: string
  createdAt?: string
}

let shippedManifest: ShippedManifestExtra[] | null = null

function loadShippedManifest(): ShippedManifestExtra[] {
  if (shippedManifest) return shippedManifest
  try {
    const raw = JSON.parse(fs.readFileSync(path.join(process.cwd(), SHIPPED_MANIFEST), 'utf8')) as {
      extras?: ShippedManifestExtra[]
    }
    shippedManifest = Array.isArray(raw.extras) ? raw.extras : []
  } catch {
    shippedManifest = []
  }
  return shippedManifest
}

function shippedSrc(file: string): string {
  return path.join(process.cwd(), SHIPPED_DIR, file)
}

function blobAbs(name: string): string {
  return path.join(process.cwd(), blobRel(name))
}

function blobExists(name: string | undefined): boolean {
  if (!name) return false
  return fs.existsSync(blobAbs(name))
}

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
  removedCoachStillIds?: string[]
}

const EMPTY: CoachStillsFile = {
  kind: 'shape-lab-coach-stills',
  version: 1,
  updatedAt: '',
  main: {},
  extras: [],
  removedCoachStillIds: [],
}

function asIdList(raw: unknown): string[] {
  if (!Array.isArray(raw)) return []
  return [...new Set(raw.filter((id): id is string => typeof id === 'string' && Boolean(id)))]
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
  if (row.file && blobExists(row.file)) {
    return `/api/coach-still-file?id=${encodeURIComponent(row.id)}`
  }
  const shipped = loadShippedManifest().find((extra) => extra.id === row.id)
  if (shipped && fs.existsSync(shippedSrc(shipped.file))) {
    return `/learn/coach-stills/${shipped.file}`
  }
  if (row.dataUrl?.startsWith('data:image') || row.dataUrl?.startsWith('/learn/')) {
    return row.dataUrl
  }
  if (row.file) return `/api/coach-still-file?id=${encodeURIComponent(row.id)}`
  return row.dataUrl || ''
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
  const removedCoachStillIds = asIdList(data.removedCoachStillIds)
  const gone = new Set(removedCoachStillIds)
  return {
    ...EMPTY,
    ...data,
    main,
    extras: Array.isArray(data.extras)
      ? data.extras
          .map(cleanExtra)
          .filter((row): row is CoachStillExtra => Boolean(row) && !gone.has(row!.id))
          .slice(0, MAX_EXTRAS)
      : [],
    removedCoachStillIds,
  }
}

function blobFileId(name: string): string | null {
  const match = /^([a-zA-Z0-9_-]+)\.(jpe?g|png|webp)$/i.exec(name)
  return match ? match[1] : null
}

/** Main still picks can outlive extras if a PUT dropped the JPEG rows. */
function extrasFromBlobDirs(file: CoachStillsFile): CoachStillExtra[] {
  const gone = new Set(asIdList(file.removedCoachStillIds))
  const extras = [...file.extras]
  const have = new Set(extras.map((row) => row.id))
  const shapeByStill = Object.fromEntries(
    Object.entries(file.main).map(([shapeId, stillId]) => [stillId, shapeId]),
  )
  const dirs = ['data/coach-blobs', '.gym-park/data/coach-blobs']
  for (const dir of dirs) {
    let names: string[] = []
    try {
      names = fs.readdirSync(path.join(process.cwd(), dir))
    } catch {
      continue
    }
    for (const name of names) {
      const id = blobFileId(name)
      if (!id || gone.has(id) || have.has(id)) continue
      const shapeId = shapeByStill[id]
      if (!shapeId) continue
      const live = path.join(process.cwd(), 'data/coach-blobs', name)
      const src = path.join(process.cwd(), dir, name)
      if (dir.includes('gym-park') && !fs.existsSync(live)) {
        fs.mkdirSync(path.dirname(live), { recursive: true })
        fs.copyFileSync(src, live)
      }
      extras.push({
        id,
        shapeId,
        file: name,
        createdAt: new Date().toISOString(),
      })
      have.add(id)
    }
  }
  return extras.slice(0, MAX_EXTRAS)
}

function seedShippedInto(file: CoachStillsFile): { file: CoachStillsFile; wrote: boolean } {
  const gone = new Set(asIdList(file.removedCoachStillIds))
  const byId = new Map(file.extras.map((row) => [row.id, row]))
  let wrote = false
  for (const row of loadShippedManifest()) {
    if (!row.id || !row.shapeId || gone.has(row.id)) continue
    const src = shippedSrc(row.file)
    if (!fs.existsSync(src)) continue
    const destName = `${row.id}${path.extname(row.file) || '.jpg'}`
    const dest = blobAbs(destName)
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(path.dirname(dest), { recursive: true })
      fs.copyFileSync(src, dest)
      wrote = true
    }
    const prev = byId.get(row.id)
    if (!prev) {
      byId.set(row.id, {
        id: row.id,
        shapeId: row.shapeId,
        label: row.label,
        createdAt: row.createdAt || new Date().toISOString(),
        file: destName,
      })
      wrote = true
      continue
    }
    if (!prev.file || !blobExists(prev.file)) {
      byId.set(row.id, {
        ...prev,
        shapeId: prev.shapeId || row.shapeId,
        label: prev.label || row.label,
        file: destName,
      })
      wrote = true
    }
  }
  return {
    file: {
      ...file,
      extras: [...byId.values()].slice(0, MAX_EXTRAS),
    },
    wrote,
  }
}

export async function readCoachStillsFile(): Promise<CoachStillsFile> {
  const remote = await readJson<CoachStillsFile>(FILE, { ...EMPTY })
  const disk = readDiskJson<CoachStillsFile>(FILE, { ...EMPTY })
  const a = remote && remote.kind === 'shape-lab-coach-stills' ? asFile(remote) : { ...EMPTY }
  const b = disk && disk.kind === 'shape-lab-coach-stills' ? asFile(disk) : { ...EMPTY }
  const removedCoachStillIds = [...new Set([...asIdList(a.removedCoachStillIds), ...asIdList(b.removedCoachStillIds)])]
  const gone = new Set(removedCoachStillIds)
  const byId = new Map<string, CoachStillExtra>()
  for (const row of [...a.extras, ...b.extras]) {
    if (!row.id || gone.has(row.id)) continue
    const keep = byId.get(row.id)
    if (!keep || (row.createdAt || '').localeCompare(keep.createdAt || '') >= 0) {
      byId.set(row.id, row)
    }
  }
  const merged: CoachStillsFile = {
    kind: 'shape-lab-coach-stills',
    version: 1,
    updatedAt: a.updatedAt || b.updatedAt || '',
    main: { ...b.main, ...a.main },
    extras: [...byId.values()].slice(0, MAX_EXTRAS),
    removedCoachStillIds,
  }
  const recovered = extrasFromBlobDirs(merged)
  if (recovered.length !== merged.extras.length) {
    merged.extras = recovered
    merged.updatedAt = new Date().toISOString()
    await writeJson(FILE, merged)
  }
  const seeded = seedShippedInto(merged)
  if (seeded.wrote) {
    seeded.file.updatedAt = new Date().toISOString()
    await writeJson(FILE, seeded.file)
  }
  return seeded.file
}

export async function extrasForClient(file?: CoachStillsFile) {
  const next = file ?? (await readCoachStillsFile())
  const extras: CoachStillExtra[] = []
  let wrote = false
  for (const row of next.extras) {
    if (row.dataUrl?.startsWith('data:image') && !row.file) {
      const saved = await persistPixels(row)
      extras.push(saved)
      if (saved.file && saved.file !== row.file) wrote = true
    } else {
      extras.push(row)
    }
  }
  if (wrote) {
    const persisted: CoachStillsFile = {
      ...next,
      extras,
      updatedAt: new Date().toISOString(),
    }
    await writeJson(FILE, persisted)
    return {
      ...persisted,
      extras: extras.map((row) => ({
        ...row,
        dataUrl: clientUrl(row),
      })),
    }
  }
  return {
    ...next,
    extras: extras.map((row) => ({
      ...row,
      dataUrl: clientUrl(row),
    })),
  }
}

export async function writeCoachStillsFile(data: unknown): Promise<CoachStillsFile> {
  const parsed = asFile({ ...EMPTY, ...(data as Partial<CoachStillsFile>) })
  const current = await readCoachStillsFile()
  const removedCoachStillIds = [
    ...new Set([...asIdList(current.removedCoachStillIds), ...asIdList(parsed.removedCoachStillIds)]),
  ]
  const gone = new Set(removedCoachStillIds)
  const prevById = new Map(current.extras.map((row) => [row.id, row]))
  const extras: CoachStillExtra[] = []
  const incoming = parsed.extras.length > 0 ? parsed.extras : current.extras
  for (const row of incoming) {
    if (gone.has(row.id)) continue
    if (!row.file && !row.dataUrl?.startsWith('data:image')) {
      const prev = prevById.get(row.id)
      if (prev && !gone.has(prev.id)) extras.push(prev)
      continue
    }
    extras.push(await persistPixels(row))
  }
  if (parsed.extras.length > 0) {
    for (const prev of current.extras) {
      if (gone.has(prev.id) || extras.some((row) => row.id === prev.id)) continue
      extras.push(prev)
    }
  }
  const next: CoachStillsFile = {
    kind: 'shape-lab-coach-stills',
    version: 1,
    updatedAt: new Date().toISOString(),
    main: { ...current.main, ...parsed.main },
    extras: extras.slice(0, MAX_EXTRAS),
    removedCoachStillIds,
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
  const current = await readCoachStillsFile()
  const prev = current.extras.find((row) => row.id === id)
  const extra = await persistPixels({
    id,
    shapeId,
    dataUrl: dataUrl.startsWith('data:image') ? dataUrl : undefined,
    file: prev?.file,
    label:
      typeof p.label === 'string'
        ? p.label.trim().slice(0, 80)
        : prev?.label,
    createdAt:
      typeof p.createdAt === 'string' && p.createdAt
        ? p.createdAt
        : prev?.createdAt || new Date().toISOString(),
  })
  if (!extra.file && !extra.dataUrl?.startsWith('data:image')) {
    throw new Error('Still needs a picture')
  }
  const extras = [extra, ...current.extras.filter((row) => row.id !== id)].slice(0, MAX_EXTRAS)
  const next: CoachStillsFile = {
    kind: 'shape-lab-coach-stills',
    version: 1,
    updatedAt: new Date().toISOString(),
    main: current.main,
    extras,
    removedCoachStillIds: asIdList(current.removedCoachStillIds).filter((gone) => gone !== id),
  }
  await writeJson(FILE, next)
  return extrasForClient(next)
}

export async function deleteCoachStill(idRaw: string): Promise<CoachStillsFile | null> {
  const id = safeId(idRaw)
  if (!id) return null
  const file = await readCoachStillsFile()
  const row = file.extras.find((s) => s.id === id)
  if (!row) return extrasForClient(file)
  if (row.file) await removeFile(blobRel(row.file))
  const main = { ...file.main }
  for (const [shapeId, stillId] of Object.entries(main)) {
    if (stillId === id) delete main[shapeId]
  }
  const next: CoachStillsFile = {
    kind: 'shape-lab-coach-stills',
    version: 1,
    updatedAt: new Date().toISOString(),
    main,
    extras: file.extras.filter((s) => s.id !== id),
    removedCoachStillIds: [...new Set([...asIdList(file.removedCoachStillIds), id])],
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
    if (buf) {
      const { type } = mimeToExt(row.file)
      res.statusCode = 200
      res.setHeader('Content-Type', type)
      res.setHeader('Cache-Control', 'public, max-age=86400')
      res.end(buf)
      return true
    }
  }
  const shipped = loadShippedManifest().find((extra) => extra.id === id)
  if (shipped) {
    const src = shippedSrc(shipped.file)
    if (fs.existsSync(src)) {
      const buf = fs.readFileSync(src)
      res.statusCode = 200
      res.setHeader('Content-Type', 'image/jpeg')
      res.setHeader('Cache-Control', 'public, max-age=86400')
      res.end(buf)
      return true
    }
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
