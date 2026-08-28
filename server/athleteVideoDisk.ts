/**
 * On-disk athlete video library. Blobs in data/athlete-video-blobs/;
 * metadata in data/athlete-videos.json. Playable from any Preview / phone link.
 */

import fs from 'node:fs'
import path from 'node:path'
import type { IncomingMessage, ServerResponse } from 'node:http'

const META = path.join(process.cwd(), 'data', 'athlete-videos.json')
const BLOBS = path.join(process.cwd(), 'data', 'athlete-video-blobs')
const MAX_PER_ATHLETE = 40
const MAX_BYTES = 48 * 1024 * 1024

export type AthleteVideoSource =
  | 'delay-record'
  | 'compare-replay'
  | 'hold'
  | 'tasks2'
  | 'form-analysis'

export type DiskAthleteVideo = {
  id: string
  athleteId: string
  name: string
  source: AthleteVideoSource
  createdAt: string
  durationSec: number | null
  sizeBytes: number
  mime: string
  file: string
}

export type DiskAthleteVideoLibrary = {
  kind: 'shape-lab-athlete-videos'
  version: 1
  exportedAt: string
  videos: DiskAthleteVideo[]
}

const EMPTY: DiskAthleteVideoLibrary = {
  kind: 'shape-lab-athlete-videos',
  version: 1,
  exportedAt: '',
  videos: [],
}

const SOURCES = new Set<AthleteVideoSource>([
  'delay-record',
  'compare-replay',
  'hold',
  'tasks2',
  'form-analysis',
])

function safeId(id: string): string | null {
  const s = id.trim()
  if (!s || s.length > 80) return null
  if (!/^[a-zA-Z0-9_-]+$/.test(s)) return null
  return s
}

function extForMime(mime: string): string {
  if (mime.includes('mp4')) return '.mp4'
  if (mime.includes('webm')) return '.webm'
  return '.webm'
}

export function readAthleteVideoMeta(): DiskAthleteVideoLibrary {
  try {
    const data = JSON.parse(fs.readFileSync(META, 'utf8')) as DiskAthleteVideoLibrary
    if (!data || data.kind !== 'shape-lab-athlete-videos' || !Array.isArray(data.videos)) {
      return { ...EMPTY }
    }
    return {
      ...EMPTY,
      ...data,
      videos: data.videos.filter((v) => v && typeof v.id === 'string' && typeof v.file === 'string'),
    }
  } catch {
    return { ...EMPTY }
  }
}

function writeMeta(videos: DiskAthleteVideo[]): DiskAthleteVideoLibrary {
  const next: DiskAthleteVideoLibrary = {
    kind: 'shape-lab-athlete-videos',
    version: 1,
    exportedAt: new Date().toISOString(),
    videos,
  }
  fs.mkdirSync(path.dirname(META), { recursive: true })
  fs.writeFileSync(META, JSON.stringify(next, null, 2) + '\n')
  return next
}

export function videosForClient(athleteId?: string): DiskAthleteVideo[] {
  const all = readAthleteVideoMeta().videos
  const list = athleteId ? all.filter((v) => v.athleteId === athleteId) : all
  return list.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

export function readRequestBuffer(
  req: IncomingMessage,
  max = MAX_BYTES,
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    let n = 0
    req.on('data', (c: Buffer) => {
      n += c.length
      if (n > max) {
        reject(new Error('Video is too large to save into the app.'))
        req.destroy()
        return
      }
      chunks.push(c)
    })
    req.on('end', () => resolve(Buffer.concat(chunks)))
    req.on('error', reject)
  })
}

export function addAthleteVideoFromBody(params: {
  id: string
  athleteId: string
  name: string
  source: string
  createdAt?: string
  durationSec?: number | null
  mime: string
  buf: Buffer
}): DiskAthleteVideo | null {
  const id = safeId(params.id)
  const athleteId = safeId(params.athleteId)
  if (!id || !athleteId || !params.buf.length || params.buf.length > MAX_BYTES) return null
  const source = SOURCES.has(params.source as AthleteVideoSource)
    ? (params.source as AthleteVideoSource)
    : 'compare-replay'
  const mime = params.mime.includes('mp4') ? 'video/mp4' : 'video/webm'
  const file = `${id}${extForMime(mime)}`
  fs.mkdirSync(BLOBS, { recursive: true })
  fs.writeFileSync(path.join(BLOBS, file), params.buf)
  const video: DiskAthleteVideo = {
    id,
    athleteId,
    name: params.name.trim() || 'Clip',
    source,
    createdAt: params.createdAt || new Date().toISOString(),
    durationSec:
      typeof params.durationSec === 'number' && Number.isFinite(params.durationSec)
        ? params.durationSec
        : null,
    sizeBytes: params.buf.length,
    mime,
    file,
  }
  const meta = readAthleteVideoMeta()
  const others = meta.videos.filter((v) => v.id !== id)
  const mine = others.filter((v) => v.athleteId === athleteId)
  const rest = others.filter((v) => v.athleteId !== athleteId)
  const kept = [video, ...mine].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  const pruned = kept.slice(MAX_PER_ATHLETE)
  for (const drop of pruned) {
    try {
      fs.unlinkSync(path.join(BLOBS, drop.file))
    } catch {
      /* missing */
    }
  }
  writeMeta([...kept.slice(0, MAX_PER_ATHLETE), ...rest])
  return video
}

export function deleteAthleteVideo(id: string, athleteId?: string): boolean {
  const sid = safeId(id)
  if (!sid) return false
  const meta = readAthleteVideoMeta()
  const found = meta.videos.find((v) => v.id === sid)
  if (!found) return false
  if (athleteId && found.athleteId !== athleteId) return false
  try {
    fs.unlinkSync(path.join(BLOBS, found.file))
  } catch {
    /* missing */
  }
  writeMeta(meta.videos.filter((v) => v.id !== sid))
  return true
}

export function sendAthleteVideoFile(id: string, res: ServerResponse): boolean {
  const sid = safeId(id)
  if (!sid) return false
  const found = readAthleteVideoMeta().videos.find((v) => v.id === sid)
  if (!found) return false
  const file = path.join(BLOBS, found.file)
  if (!fs.existsSync(file)) return false
  const buf = fs.readFileSync(file)
  res.statusCode = 200
  res.setHeader('Content-Type', found.mime || 'video/webm')
  res.setHeader('Content-Length', String(buf.length))
  res.setHeader('Cache-Control', 'private, max-age=3600')
  res.end(buf)
  return true
}
