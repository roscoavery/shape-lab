/**
 * On-disk athlete video library. Blobs in data/athlete-video-blobs/;
 * metadata in data/athlete-videos.json. Playable from any Preview / phone link.
 */

import type { IncomingMessage, ServerResponse } from 'node:http'
import { readBin, readJson, removeFile, writeBin, writeJson } from './persist.ts'

const META = 'data/athlete-videos.json'
const blobRel = (file: string) => `data/athlete-video-blobs/${file}`
const MAX_PER_ATHLETE = 40
const MAX_BYTES = 48 * 1024 * 1024

export type AthleteVideoSource =
  | 'delay-record'
  | 'compare-replay'
  | 'hold'
  | 'tasks2'
  | 'form-analysis'
  | 'lesson'

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
  lessonId?: string
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
  'lesson',
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

export async function readAthleteVideoMeta(): Promise<DiskAthleteVideoLibrary> {
  const data = await readJson<DiskAthleteVideoLibrary>(META, { ...EMPTY })
  if (!data || data.kind !== 'shape-lab-athlete-videos' || !Array.isArray(data.videos)) {
    return { ...EMPTY }
  }
  return {
    ...EMPTY,
    ...data,
    videos: data.videos.filter((v) => v && typeof v.id === 'string' && typeof v.file === 'string'),
  }
}

async function writeMeta(videos: DiskAthleteVideo[]): Promise<DiskAthleteVideoLibrary> {
  const next: DiskAthleteVideoLibrary = {
    kind: 'shape-lab-athlete-videos',
    version: 1,
    exportedAt: new Date().toISOString(),
    videos,
  }
  await writeJson(META, next)
  return next
}

export async function videosForClient(athleteId?: string): Promise<DiskAthleteVideo[]> {
  const all = (await readAthleteVideoMeta()).videos
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

export async function addAthleteVideoFromBody(params: {
  id: string
  athleteId: string
  name: string
  source: string
  createdAt?: string
  durationSec?: number | null
  mime: string
  buf: Buffer
  lessonId?: string
}): Promise<DiskAthleteVideo | null> {
  const id = safeId(params.id)
  const athleteId = safeId(params.athleteId)
  if (!id || !athleteId || !params.buf.length || params.buf.length > MAX_BYTES) return null
  const source = SOURCES.has(params.source as AthleteVideoSource)
    ? (params.source as AthleteVideoSource)
    : 'compare-replay'
  const mime = params.mime.includes('mp4') ? 'video/mp4' : 'video/webm'
  const file = `${id}${extForMime(mime)}`
  await writeBin(blobRel(file), params.buf, mime)
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
    ...(safeId(params.lessonId ?? '') ? { lessonId: safeId(params.lessonId ?? '')! } : {}),
  }
  const meta = await readAthleteVideoMeta()
  const others = meta.videos.filter((v) => v.id !== id)
  const mine = others.filter((v) => v.athleteId === athleteId)
  const rest = others.filter((v) => v.athleteId !== athleteId)
  const kept = [video, ...mine].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  const pruned = kept.slice(MAX_PER_ATHLETE)
  for (const drop of pruned) {
    await removeFile(blobRel(drop.file))
  }
  await writeMeta([...kept.slice(0, MAX_PER_ATHLETE), ...rest])
  return video
}

export async function deleteAthleteVideo(id: string, athleteId?: string): Promise<boolean> {
  const sid = safeId(id)
  if (!sid) return false
  const meta = await readAthleteVideoMeta()
  const found = meta.videos.find((v) => v.id === sid)
  if (!found) return false
  if (athleteId && found.athleteId !== athleteId) return false
  await removeFile(blobRel(found.file))
  await writeMeta(meta.videos.filter((v) => v.id !== sid))
  return true
}

export async function sendAthleteVideoFile(id: string, res: ServerResponse): Promise<boolean> {
  const sid = safeId(id)
  if (!sid) return false
  const found = (await readAthleteVideoMeta()).videos.find((v) => v.id === sid)
  if (!found) return false
  const buf = await readBin(blobRel(found.file))
  if (!buf) return false
  res.statusCode = 200
  res.setHeader('Content-Type', found.mime || 'video/webm')
  res.setHeader('Content-Length', String(buf.length))
  res.setHeader('Cache-Control', 'private, max-age=3600')
  res.end(buf)
  return true
}
