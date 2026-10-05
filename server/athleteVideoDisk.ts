/**
 * On-disk athlete video library. Blobs in data/athlete-video-blobs/;
 * metadata in data/athlete-videos.json. Playable from any Preview / phone link.
 */

import type { IncomingMessage, ServerResponse } from 'node:http'
import { randomBytes } from 'node:crypto'
import {
  isDirectHttpUrl,
  readBin,
  readJson,
  removeFile,
  sendPrivateOrProxy,
  writeBin,
  writeJson,
} from './persist.ts'

import {
  deleteCloudVideo,
  r2Enabled,
  storeVideoBufferInCloud,
} from './videoStorage.ts'

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
  | 'collage'
  | 'story'
  | 'upload'

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
  /** Public Blob URL — phones play this instead of streaming through the function. */
  publicUrl?: string
  /**
   * R2 object key for cloud-stored bytes. Server-side only, never sent to
   * clients; playback goes through /api/athlete-video-file, which 302s to a
   * short-lived presigned URL.
   */
  cloudKey?: string
  lessonId?: string
  skillId?: string
  skillLabel?: string
  classId?: string
  className?: string
  /** Original video id when this row was filed from a class video into an athlete folder. */
  filedFrom?: string
}

export type DiskAthleteVideoLibrary = {
  kind: 'shape-lab-athlete-videos'
  version: 1
  exportedAt: string
  videos: DiskAthleteVideo[]
  /** athleteId -> unguessable share token for the athlete's video folder. */
  folderTokens: Record<string, string>
}

const EMPTY: DiskAthleteVideoLibrary = {
  kind: 'shape-lab-athlete-videos',
  version: 1,
  exportedAt: '',
  videos: [],
  folderTokens: {},
}

const SOURCES = new Set<AthleteVideoSource>([
  'delay-record',
  'compare-replay',
  'hold',
  'tasks2',
  'form-analysis',
  'lesson',
  'collage',
  'story',
  'upload',
])

function safeId(id: string): string | null {
  const s = id.trim()
  if (!s || s.length > 80) return null
  if (!/^[a-zA-Z0-9_-]+$/.test(s)) return null
  return s
}

export function extForMime(mime: string): string {
  if (mime.includes('mp4')) return '.mp4'
  if (mime.includes('webm')) return '.webm'
  return '.webm'
}

export async function readAthleteVideoMeta(): Promise<DiskAthleteVideoLibrary> {
  const data = await readJson<DiskAthleteVideoLibrary>(META, { ...EMPTY })
  if (!data || data.kind !== 'shape-lab-athlete-videos' || !Array.isArray(data.videos)) {
    return { ...EMPTY }
  }
  const folderTokens =
    data.folderTokens && typeof data.folderTokens === 'object' && !Array.isArray(data.folderTokens)
      ? (data.folderTokens as Record<string, string>)
      : {}
  return {
    ...EMPTY,
    ...data,
    videos: data.videos.filter((v) => v && typeof v.id === 'string' && typeof v.file === 'string'),
    folderTokens,
  }
}

async function writeMeta(meta: DiskAthleteVideoLibrary): Promise<DiskAthleteVideoLibrary> {
  const next: DiskAthleteVideoLibrary = {
    ...meta,
    kind: 'shape-lab-athlete-videos',
    version: 1,
    exportedAt: new Date().toISOString(),
  }
  await writeJson(META, next)
  return next
}

export async function videosForClient(
  athleteId?: string,
  classId?: string,
): Promise<DiskAthleteVideo[]> {
  const all = (await readAthleteVideoMeta()).videos
  let list = athleteId ? all.filter((v) => v.athleteId === athleteId) : all
  if (classId) list = list.filter((v) => v.classId === classId)
  return list.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

export function athleteVideoClientUrl(video: Pick<DiskAthleteVideo, 'id' | 'publicUrl'>): string {
  void video.publicUrl
  return `/api/athlete-video-file?id=${encodeURIComponent(video.id)}`
}

export async function findAthleteVideo(id: string): Promise<DiskAthleteVideo | null> {
  const sid = safeId(id)
  if (!sid) return null
  return (await readAthleteVideoMeta()).videos.find((v) => v.id === sid) ?? null
}

async function rememberVideo(video: DiskAthleteVideo): Promise<DiskAthleteVideo> {
  const meta = await readAthleteVideoMeta()
  const others = meta.videos.filter((v) => v.id !== video.id)
  const mine = others.filter((v) => v.athleteId === video.athleteId)
  const rest = others.filter((v) => v.athleteId !== video.athleteId)
  const kept = [video, ...mine].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  const keptVideos = [...kept.slice(0, MAX_PER_ATHLETE), ...rest]
  const pruned = kept.slice(MAX_PER_ATHLETE)
  for (const drop of pruned) {
    await removeFile(blobRel(drop.file))
    // filed copies share the source's cloudKey, so only delete the cloud
    // object when no kept row still references it.
    if (drop.cloudKey && !keptVideos.some((v) => v.cloudKey === drop.cloudKey)) {
      await deleteCloudVideo(drop.cloudKey)
    }
  }
  await writeMeta({ ...meta, videos: keptVideos })
  return video
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
  skillId?: string
  skillLabel?: string
  classId?: string
  className?: string
}): Promise<DiskAthleteVideo | null> {
  const id = safeId(params.id)
  const athleteId = safeId(params.athleteId)
  if (!id || !athleteId || !params.buf.length || params.buf.length > MAX_BYTES) return null
  const source = SOURCES.has(params.source as AthleteVideoSource)
    ? (params.source as AthleteVideoSource)
    : 'compare-replay'
  const mime = params.mime.includes('mp4') ? 'video/mp4' : 'video/webm'
  const file = `${id}${extForMime(mime)}`
  // Cloud-first when R2 is configured: bytes go to the coach's bucket and
  // the row carries the object key, skipping the disk write. If the upload
  // throws, fall back to disk so the video is never lost (no cloudKey then).
  let cloudKey: string | undefined
  if (r2Enabled()) {
    try {
      cloudKey = (await storeVideoBufferInCloud(file, params.buf, mime)) ?? undefined
    } catch {
      cloudKey = undefined
    }
  }
  if (!cloudKey) {
    await writeBin(blobRel(file), params.buf, mime)
  }
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
    ...(cloudKey ? { cloudKey } : {}),
    ...(safeId(params.lessonId ?? '') ? { lessonId: safeId(params.lessonId ?? '')! } : {}),
    ...(safeId(params.skillId ?? '') ? { skillId: safeId(params.skillId ?? '')! } : {}),
    ...(params.skillLabel?.trim()
      ? { skillLabel: params.skillLabel.trim().slice(0, 120) }
      : {}),
    ...(safeId(params.classId ?? '') ? { classId: safeId(params.classId ?? '')! } : {}),
    ...(params.className?.trim()
      ? { className: params.className.trim().slice(0, 120) }
      : {}),
  }
  return rememberVideo(video)
}

export async function addAthleteVideoFromUrl(params: {
  id: string
  athleteId: string
  name: string
  source: string
  createdAt?: string
  durationSec?: number | null
  mime: string
  url: string
  /** R2 object key when the client uploaded bytes straight to the bucket. */
  cloudKey?: string
  sizeBytes?: number
  lessonId?: string
  skillId?: string
  skillLabel?: string
  classId?: string
  className?: string
}): Promise<DiskAthleteVideo | null> {
  const id = safeId(params.id)
  const athleteId = safeId(params.athleteId)
  const url = (params.url ?? '').trim()
  const cloudKey = typeof params.cloudKey === 'string' ? params.cloudKey.trim() : ''
  const cloudKeyOk =
    cloudKey.length > 0 &&
    cloudKey.length <= 200 &&
    /^[A-Za-z0-9_.\-/]+$/.test(cloudKey)
  // A row needs either a reachable http(s) URL or a safe R2 object key.
  if (!id || !athleteId || (!cloudKeyOk && !isDirectHttpUrl(url))) return null
  const source = SOURCES.has(params.source as AthleteVideoSource)
    ? (params.source as AthleteVideoSource)
    : 'compare-replay'
  const mime = params.mime.includes('mp4') ? 'video/mp4' : 'video/webm'
  const file = `${id}${extForMime(mime)}`
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
    sizeBytes: params.sizeBytes && params.sizeBytes > 0 ? params.sizeBytes : 0,
    mime,
    file,
    ...(isDirectHttpUrl(url) ? { publicUrl: url } : {}),
    ...(cloudKeyOk ? { cloudKey } : {}),
    ...(safeId(params.lessonId ?? '') ? { lessonId: safeId(params.lessonId ?? '')! } : {}),
    ...(safeId(params.skillId ?? '') ? { skillId: safeId(params.skillId ?? '')! } : {}),
    ...(params.skillLabel?.trim()
      ? { skillLabel: params.skillLabel.trim().slice(0, 120) }
      : {}),
    ...(safeId(params.classId ?? '') ? { classId: safeId(params.classId ?? '')! } : {}),
    ...(params.className?.trim()
      ? { className: params.className.trim().slice(0, 120) }
      : {}),
  }
  return rememberVideo(video)
}

export async function deleteAthleteVideo(id: string, athleteId?: string): Promise<boolean> {
  const sid = safeId(id)
  if (!sid) return false
  const meta = await readAthleteVideoMeta()
  const found = meta.videos.find((v) => v.id === sid)
  if (!found) return false
  if (athleteId && found.athleteId !== athleteId) return false
  await removeFile(blobRel(found.file))
  const remaining = meta.videos.filter((v) => v.id !== sid)
  // Copies made by fileClassVideosToAthletes share the source's cloudKey, so
  // only delete the cloud object when no other row still references it.
  if (found.cloudKey && !remaining.some((v) => v.cloudKey === found.cloudKey)) {
    await deleteCloudVideo(found.cloudKey)
  }
  await writeMeta({ ...meta, videos: remaining })
  return true
}

export async function sendAthleteVideoFile(id: string, res: ServerResponse): Promise<boolean> {
  const sid = safeId(id)
  if (!sid) return false
  const found = (await readAthleteVideoMeta()).videos.find((v) => v.id === sid)
  if (!found) return false
  const buf = await readBin(blobRel(found.file))
  return sendPrivateOrProxy(
    res,
    buf,
    found.mime || 'video/webm',
    found.publicUrl && isDirectHttpUrl(found.publicUrl) ? found.publicUrl : undefined,
  )
}

/** Unguessable share token for an athlete's video folder. Created on first request. */
export async function getFolderToken(athleteId: string): Promise<string | null> {
  const sid = safeId(athleteId)
  if (!sid) return null
  const meta = await readAthleteVideoMeta()
  const existing = meta.folderTokens[sid]
  if (existing && /^[a-f0-9]{32}$/.test(existing)) return existing
  const token = randomBytes(16).toString('hex')
  await writeMeta({ ...meta, folderTokens: { ...meta.folderTokens, [sid]: token } })
  return token
}

/** Reverse lookup: which athlete does this folder token belong to? */
export async function athleteIdForFolderToken(token: string): Promise<string | null> {
  const t = token.trim()
  if (!/^[a-f0-9]{32}$/.test(t)) return null
  const meta = await readAthleteVideoMeta()
  for (const [athleteId, tok] of Object.entries(meta.folderTokens)) {
    if (tok === t) return athleteId
  }
  return null
}

export async function renameAthleteVideo(
  id: string,
  athleteId: string,
  name: string,
): Promise<DiskAthleteVideo | null> {
  const sid = safeId(id)
  const aid = safeId(athleteId)
  const clean = name.trim().slice(0, 120)
  if (!sid || !aid || !clean) return null
  const meta = await readAthleteVideoMeta()
  const found = meta.videos.find((v) => v.id === sid)
  if (!found || found.athleteId !== aid) return null
  const next = { ...found, name: clean }
  await writeMeta({
    ...meta,
    videos: meta.videos.map((v) => (v.id === sid ? next : v)),
  })
  return next
}

/**
 * File every video saved under a class (classId) into each attending
 * athlete's folder. Copies are metadata rows sharing the original bytes
 * (same Blob publicUrl); the copy's own file slot is never written, so
 * deleting or pruning a copy never touches shared bytes. Dedupes on
 * filedFrom so running this twice never double-files.
 */
export async function fileClassVideosToAthletes(
  classId: string,
  athleteIds: string[],
): Promise<number> {
  const cid = safeId(classId)
  if (!cid) return 0
  const targets = [...new Set(athleteIds.map((a) => safeId(a)).filter((a): a is string => Boolean(a)))]
  if (targets.length === 0) return 0
  const meta = await readAthleteVideoMeta()
  const classVideos = meta.videos.filter((v) => v.classId === cid)
  if (classVideos.length === 0) return 0
  const videos = [...meta.videos]
  let filed = 0
  for (const src of classVideos) {
    for (const athleteId of targets) {
      if (athleteId === src.athleteId) continue
      const already = videos.some(
        (v) => v.athleteId === athleteId && v.filedFrom === src.id,
      )
      if (already) continue
      const id = `vid_${randomBytes(8).toString('hex')}`
      const dot = src.file.lastIndexOf('.')
      const ext = dot >= 0 ? src.file.slice(dot) : '.mp4'
      videos.unshift({
        ...src,
        id,
        athleteId,
        file: `${id}${ext}`,
        filedFrom: src.id,
      })
      filed++
    }
  }
  if (filed === 0) return 0
  // Enforce the per-athlete cap on copies (their file slots were never
  // written, so pruning here is metadata-only and cannot harm shared bytes).
  const kept: DiskAthleteVideo[] = []
  const seen = new Map<string, number>()
  for (const v of videos) {
    const n = seen.get(v.athleteId) ?? 0
    if (n >= MAX_PER_ATHLETE) continue
    seen.set(v.athleteId, n + 1)
    kept.push(v)
  }
  await writeMeta({ ...meta, videos: kept })
  return filed
}
