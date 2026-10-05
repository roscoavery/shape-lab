/**
 * Public shareable athlete video folders.
 *
 * GET /api/share/folder?token=<hex>      — NO AUTH. Folder metadata + video list.
 * GET /api/share/folder-file?token=&id=   — NO AUTH. Streams one video, token-scoped.
 * GET /api/share/folder-zip?token=        — NO AUTH. Streams a zip of the folder.
 *
 * Wired into handleShapeLabApi BEFORE the auth gate in server/apiHandler.ts,
 * like /api/share/card. The 32-hex-char token is the only secret; athlete ids
 * are validated against it on every request. No upload, rename, or delete
 * here — those stay on the authed /api/athlete-videos endpoints.
 */

import type { IncomingMessage, ServerResponse } from 'node:http'
import { sendJson } from './instagramResolve.ts'
import {
  athleteIdForFolderToken,
  findAthleteVideo,
  sendAthleteVideoFile,
  videosForClient,
  type DiskAthleteVideo,
} from './athleteVideoDisk.ts'
import { readBin } from './persist.ts'
import { readRosterFile } from './rosterStore.ts'

export type ShareFolderVideo = {
  id: string
  name: string
  source: string
  createdAt: string
  durationSec: number | null
  sizeBytes: number
  mime: string
  className?: string
  skillLabel?: string
  /** Token-scoped playback URL. */
  url: string
}

export type ShareFolder = {
  kind: 'shape-lab-folder'
  athleteId: string
  athleteName: string
  videos: ShareFolderVideo[]
}

function fileUrl(token: string, id: string): string {
  return `/api/share/folder-file?token=${encodeURIComponent(token)}&id=${encodeURIComponent(id)}`
}

async function athleteName(athleteId: string): Promise<string> {
  try {
    const roster = await readRosterFile()
    const athletes = Array.isArray(roster.athletes) ? roster.athletes : []
    const row = athletes.find(
      (a): a is { id: string; name?: unknown } =>
        Boolean(a && typeof a === 'object' && (a as { id?: unknown }).id === athleteId),
    ) as { name?: unknown } | undefined
    const name = typeof row?.name === 'string' ? row.name.trim() : ''
    return name || 'Athlete'
  } catch {
    return 'Athlete'
  }
}

function toShareVideo(v: DiskAthleteVideo, token: string): ShareFolderVideo {
  const out: ShareFolderVideo = {
    id: v.id,
    name: v.name,
    source: v.source,
    createdAt: v.createdAt,
    durationSec: v.durationSec,
    sizeBytes: v.sizeBytes,
    mime: v.mime,
    url: fileUrl(token, v.id),
  }
  if (v.className) out.className = v.className
  if (v.skillLabel) out.skillLabel = v.skillLabel
  return out
}

async function tokenAthleteId(
  res: ServerResponse,
  url: URL,
): Promise<{ token: string; athleteId: string } | null> {
  const token = (url.searchParams.get('token') ?? '').trim()
  const athleteId = await athleteIdForFolderToken(token)
  if (!athleteId) {
    sendJson(res, 404, { error: 'This folder link is not valid.' })
    return null
  }
  return { token, athleteId }
}

export async function handleShareFolder(
  req: IncomingMessage,
  res: ServerResponse,
  url: URL,
): Promise<boolean> {
  if (req.method !== 'GET') {
    sendJson(res, 405, { error: 'Use GET' })
    return true
  }
  const checked = await tokenAthleteId(res, url)
  if (!checked) return true
  const videos = await videosForClient(checked.athleteId)
  const folder: ShareFolder = {
    kind: 'shape-lab-folder',
    athleteId: checked.athleteId,
    athleteName: await athleteName(checked.athleteId),
    videos: videos.map((v) => toShareVideo(v, checked.token)),
  }
  res.setHeader('Cache-Control', 'private, max-age=30')
  sendJson(res, 200, folder)
  return true
}

export async function handleShareFolderFile(
  req: IncomingMessage,
  res: ServerResponse,
  url: URL,
): Promise<boolean> {
  if (req.method !== 'GET') {
    sendJson(res, 405, { error: 'Use GET' })
    return true
  }
  const checked = await tokenAthleteId(res, url)
  if (!checked) return true
  const video = await findAthleteVideo(url.searchParams.get('id') ?? '')
  if (!video || video.athleteId !== checked.athleteId) {
    sendJson(res, 404, { error: 'Video not found' })
    return true
  }
  if (!(await sendAthleteVideoFile(video.id, res))) {
    sendJson(res, 404, { error: 'Video not found' })
  }
  return true
}

/* ------------------------------------------------------------------ */
/* Zip streaming (stored entries, no compression — video barely        */
/* compresses anyway). Each file is buffered once, then written with  */
/* real CRC32/sizes in its local header.                              */
/* ------------------------------------------------------------------ */

const CRC_TABLE = (() => {
  const t = new Uint32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    t[n] = c >>> 0
  }
  return t
})()

function crc32(buf: Buffer): number {
  let c = 0xffffffff
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

function dosDateTime(d: Date): { time: number; date: number } {
  const time =
    ((d.getHours() & 0x1f) << 11) | ((d.getMinutes() & 0x3f) << 5) | ((Math.floor(d.getSeconds() / 2)) & 0x1f)
  const date =
    (((d.getFullYear() - 1980) & 0x7f) << 9) | (((d.getMonth() + 1) & 0x0f) << 5) | (d.getDate() & 0x1f)
  return { time, date }
}

function sanitizeName(name: string, index: number, ext: string): string {
  const base = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 48) || 'video'
  return `${String(index + 1).padStart(2, '0')}-${base}${ext}`
}

function extForMime(mime: string): string {
  if (mime.includes('mp4')) return '.mp4'
  if (mime.includes('webm')) return '.webm'
  if (mime.includes('quicktime') || mime.includes('mov')) return '.mov'
  return '.mp4'
}

export async function handleShareFolderZip(
  req: IncomingMessage,
  res: ServerResponse,
  url: URL,
): Promise<boolean> {
  if (req.method !== 'GET') {
    sendJson(res, 405, { error: 'Use GET' })
    return true
  }
  const checked = await tokenAthleteId(res, url)
  if (!checked) return true
  const videos = await videosForClient(checked.athleteId)
  const name = await athleteName(checked.athleteId)
  const zipName = `${name.split(' ')[0].toLowerCase().replace(/[^a-z0-9]+/g, '') || 'athlete'}-videos.zip`

  res.writeHead(200, {
    'Content-Type': 'application/zip',
    'Content-Disposition': `attachment; filename="${zipName}"`,
    'Cache-Control': 'private, max-age=0',
  })

  const { time, date } = dosDateTime(new Date())
  const central: Buffer[] = []
  let offset = 0
  let index = 0

  for (const v of videos) {
    let data: Buffer | null = await readBin(`data/athlete-video-blobs/${v.file}`)
    if (!data && v.publicUrl) {
      try {
        const r = await fetch(v.publicUrl)
        if (r.ok) data = Buffer.from(await r.arrayBuffer())
      } catch {
        data = null
      }
    }
    if (!data || data.length === 0) continue
    const fname = Buffer.from(sanitizeName(v.name, index, extForMime(v.mime)), 'utf8')
    const crc = crc32(data)
    index++

    const local = Buffer.alloc(30 + fname.length)
    local.writeUInt32LE(0x04034b50, 0)
    local.writeUInt16LE(20, 4)
    local.writeUInt16LE(0x0800, 6) // UTF-8 filename flag
    local.writeUInt16LE(0, 8) // stored
    local.writeUInt16LE(time, 10)
    local.writeUInt16LE(date, 12)
    local.writeUInt32LE(crc, 14)
    local.writeUInt32LE(data.length, 18)
    local.writeUInt32LE(data.length, 22)
    local.writeUInt16LE(fname.length, 26)
    local.writeUInt16LE(0, 28)
    fname.copy(local, 30)
    res.write(local)
    res.write(data)
    offset += local.length + data.length

    const c = Buffer.alloc(46 + fname.length)
    c.writeUInt32LE(0x02014b50, 0)
    c.writeUInt16LE(20, 4)
    c.writeUInt16LE(20, 6)
    c.writeUInt16LE(0x0800, 8)
    c.writeUInt16LE(0, 10)
    c.writeUInt16LE(time, 12)
    c.writeUInt16LE(date, 14)
    c.writeUInt32LE(crc, 16)
    c.writeUInt32LE(data.length, 20)
    c.writeUInt32LE(data.length, 24)
    c.writeUInt16LE(fname.length, 28)
    c.writeUInt16LE(0, 30)
    c.writeUInt16LE(0, 32)
    c.writeUInt16LE(0, 34)
    c.writeUInt16LE(0, 36)
    c.writeUInt32LE(0, 38)
    c.writeUInt32LE(offset - local.length - data.length, 42)
    fname.copy(c, 46)
    central.push(c)
  }

  const centralStart = offset
  let centralSize = 0
  for (const c of central) {
    res.write(c)
    centralSize += c.length
  }
  const end = Buffer.alloc(22)
  end.writeUInt32LE(0x06054b50, 0)
  end.writeUInt16LE(0, 4)
  end.writeUInt16LE(0, 6)
  end.writeUInt16LE(central.length, 8)
  end.writeUInt16LE(central.length, 10)
  end.writeUInt32LE(centralSize, 12)
  end.writeUInt32LE(centralStart, 16)
  end.writeUInt16LE(0, 20)
  res.write(end)
  res.end()
  return true
}
