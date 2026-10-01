/**
 * Gym-wide per-video playback adjustments, keyed by video URL.
 * Trim start/end, crop rectangle, and slow-motion segments set in the app's
 * fullscreen player. Applied at playback time — original files are untouched.
 * Shared by Learn skill cards, Spotting cards, and anywhere else videos play.
 */

import { loopKey } from './clipLoopsStore.ts'
import { readJson, writeJson } from './persist.ts'

const FILE = 'data/video-adjustments.json'

/** Crop rectangle as fractions (0-1) of the video element box. */
export type VideoCrop = {
  x: number
  y: number
  w: number
  h: number
}

export type SlowMoSegment = {
  start: number
  end: number
  rate: number
}

export type VideoAdjustment = {
  trimStart: number | null
  trimEnd: number | null
  crop: VideoCrop | null
  slowMo: SlowMoSegment[]
  updatedAt: string
}

export type DiskVideoAdjustments = {
  kind: 'shape-lab-video-adjustments'
  version: 1
  exportedAt: string
  adjustments: Record<string, VideoAdjustment>
}

const EMPTY: DiskVideoAdjustments = {
  kind: 'shape-lab-video-adjustments',
  version: 1,
  exportedAt: '',
  adjustments: {},
}

function cleanCrop(raw: unknown): VideoCrop | null {
  if (!raw || typeof raw !== 'object') return null
  const c = raw as VideoCrop
  const x = Number(c.x)
  const y = Number(c.y)
  const w = Number(c.w)
  const h = Number(c.h)
  if (![x, y, w, h].every(Number.isFinite)) return null
  if (w <= 0.01 || h <= 0.01 || w > 1 || h > 1) return null
  if (x < 0 || y < 0 || x + w > 1.001 || y + h > 1.001) return null
  return { x, y, w, h }
}

function cleanSlowMo(raw: unknown): SlowMoSegment | null {
  if (!raw || typeof raw !== 'object') return null
  const s = raw as SlowMoSegment
  const start = Number(s.start)
  const end = Number(s.end)
  const rate = Number(s.rate)
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return null
  if (!Number.isFinite(rate) || rate <= 0 || rate > 1) return null
  return { start, end, rate }
}

export function normalizeAdjustment(value: unknown): VideoAdjustment | null {
  if (!value || typeof value !== 'object') return null
  const raw = value as VideoAdjustment
  const trimStart = raw.trimStart == null ? null : Number(raw.trimStart)
  const trimEnd = raw.trimEnd == null ? null : Number(raw.trimEnd)
  if (trimStart != null && (!Number.isFinite(trimStart) || trimStart < 0)) return null
  if (trimEnd != null && (!Number.isFinite(trimEnd) || trimEnd <= 0)) return null
  if (trimStart != null && trimEnd != null && trimEnd <= trimStart) return null
  const slowMo = Array.isArray(raw.slowMo)
    ? raw.slowMo.map(cleanSlowMo).filter((s): s is SlowMoSegment => Boolean(s))
    : []
  const crop = cleanCrop(raw.crop)
  if (trimStart == null && trimEnd == null && crop == null && slowMo.length === 0) return null
  return {
    trimStart,
    trimEnd,
    crop,
    slowMo,
    updatedAt:
      typeof raw.updatedAt === 'string' ? raw.updatedAt : new Date().toISOString(),
  }
}

export async function readVideoAdjustmentsFile(): Promise<DiskVideoAdjustments> {
  const data = await readJson<DiskVideoAdjustments>(FILE, { ...EMPTY })
  if (
    !data ||
    data.kind !== 'shape-lab-video-adjustments' ||
    !data.adjustments ||
    typeof data.adjustments !== 'object'
  ) {
    return { ...EMPTY }
  }
  const adjustments: Record<string, VideoAdjustment> = {}
  for (const [rawKey, value] of Object.entries(data.adjustments)) {
    const entry = normalizeAdjustment(value)
    if (!entry) continue
    adjustments[loopKey(rawKey) || rawKey] = entry
  }
  return { ...EMPTY, ...data, adjustments }
}

export async function writeVideoAdjustmentsFile(data: unknown): Promise<DiskVideoAdjustments> {
  const parsed = data as DiskVideoAdjustments
  if (
    !parsed ||
    parsed.kind !== 'shape-lab-video-adjustments' ||
    !parsed.adjustments ||
    typeof parsed.adjustments !== 'object'
  ) {
    throw new Error('Invalid video-adjustments payload')
  }
  const adjustments: Record<string, VideoAdjustment> = {}
  for (const [rawKey, value] of Object.entries(parsed.adjustments)) {
    const entry = normalizeAdjustment(value)
    if (!entry) continue
    adjustments[loopKey(rawKey) || rawKey] = entry
  }
  const next: DiskVideoAdjustments = {
    kind: 'shape-lab-video-adjustments',
    version: 1,
    exportedAt: new Date().toISOString(),
    adjustments,
  }
  await writeJson(FILE, next)
  return next
}
