/**
 * Burn live score, stopwatch, and the body line onto a hold clip.
 * Plays the source at a rate that unsretches a slow MediaRecorder file
 * into canvas.captureStream so Photos gets regular-speed video with HUD.
 */

import { getShape } from '../config/shapes'
import { HOLD_PINK } from './holdBuild'
import { holdMediaWindow } from './handstandHold'
import { looksLikeBackgroundProp } from './poseSubject'
import { landmarksAtMedia, mediaStretch, mediaTimeToTrackTime, type PoseTrack } from './poseTrack'
import {
  createRecorder,
  durableBlob,
  hintMotion,
  startRecorder,
  saveVideoToDevice,
  extForVideoType,
  type SaveVideoResult,
} from './saveMedia'
import {
  drawGradeHud,
  drawPoseOverlay,
  type JointDrawMode,
} from './skeleton'
import { scoreShape } from './scoring'

const burnedCache = new Map<string, Blob>()

export function burnedOverlayKey(
  clipId: string | null | undefined,
  mode: JointDrawMode,
  mirror: boolean,
  showSkeleton = true,
  showAngles = true,
): string | null {
  if (!clipId) return null
  return `${clipId}:${mode}:${mirror ? 'm' : 'c'}:sk${showSkeleton ? 1 : 0}:ang${showAngles ? 1 : 0}`
}

export function getBurnedOverlay(key: string | null): Blob | null {
  if (!key) return null
  return burnedCache.get(key) ?? null
}

export function rememberBurnedOverlay(key: string | null, blob: Blob): void {
  if (!key) return
  burnedCache.set(key, blob)
}

function loadVideo(blob: Blob): Promise<{ video: HTMLVideoElement; url: string }> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video')
    video.muted = true
    video.playsInline = true
    video.preload = 'auto'
    const url = URL.createObjectURL(blob)
    video.onloadedmetadata = () => resolve({ video, url })
    video.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Could not read that hold clip'))
    }
    video.src = url
  })
}

function seekVideo(video: HTMLVideoElement, t: number): Promise<void> {
  return new Promise((resolve) => {
    const target = Math.min(Math.max(0, t), Math.max(0, (Number.isFinite(video.duration) ? video.duration : t) - 0.001))
    if (Math.abs(video.currentTime - target) < 0.02) {
      resolve()
      return
    }
    const done = () => {
      cleanup()
      resolve()
    }
    const cleanup = () => {
      video.removeEventListener('seeked', done)
      window.clearTimeout(timer)
    }
    const timer = window.setTimeout(done, 280)
    video.addEventListener('seeked', done)
    video.currentTime = target
  })
}

async function readDuration(video: HTMLVideoElement, fallback: number): Promise<number> {
  if (Number.isFinite(video.duration) && video.duration > 0 && video.duration < 1e6) {
    return video.duration
  }
  await seekVideo(video, 1e7)
  return Number.isFinite(video.duration) && video.duration > 0 && video.duration < 1e6
    ? video.duration
    : fallback
}

export function paintHoldOverlay(
  ctx: CanvasRenderingContext2D,
  video: HTMLVideoElement,
  width: number,
  height: number,
  mediaT: number,
  opts: {
    track: PoseTrack | null
    mode: JointDrawMode
    mirror: boolean
    holdSeconds: number
    clockOffsetSec: number
    showSkeleton?: boolean
    showAngles?: boolean
    recordedWallSec?: number
  },
) {
  if (opts.mirror) {
    ctx.save()
    ctx.translate(width, 0)
    ctx.scale(-1, 1)
    ctx.drawImage(video, 0, 0, width, height)
    ctx.restore()
  } else {
    ctx.drawImage(video, 0, 0, width, height)
  }
  const shape = getShape('handstand')
  const mediaDur =
    Number.isFinite(video.duration) && video.duration > 0 && video.duration < 1e6
      ? video.duration
      : opts.recordedWallSec && opts.recordedWallSec > 0.8
        ? opts.recordedWallSec
        : opts.holdSeconds
  const trackT = mediaTimeToTrackTime(
    mediaT,
    mediaDur,
    opts.track,
    opts.clockOffsetSec,
    opts.holdSeconds,
    opts.recordedWallSec,
  )
  const rawLm = landmarksAtMedia(
    opts.track,
    mediaT,
    mediaDur,
    opts.clockOffsetSec,
    opts.holdSeconds,
    opts.recordedWallSec,
  )
  const lm = rawLm && !looksLikeBackgroundProp(rawLm) ? rawLm : null
  const score = shape && lm ? scoreShape(lm, shape, null, { profileOk: true }) : null
  if (opts.showSkeleton !== false) {
    drawPoseOverlay(ctx, lm, {
      width,
      height,
      mirror: opts.mirror,
      mode: opts.mode,
      showAngles: opts.showAngles !== false,
      lineColor: HOLD_PINK,
    })
  }
  const clock = Math.max(0, Math.min(opts.holdSeconds, trackT - opts.clockOffsetSec))
  drawGradeHud(ctx, width, height, Math.round(score?.overall ?? 0), 'Lime', clock, HOLD_PINK)
}

export type BurnOverlayOpts = {
  source: Blob
  track: PoseTrack | null
  mode: JointDrawMode
  mirror: boolean
  holdSeconds: number
  clockOffsetSec: number
  showSkeleton?: boolean
  showAngles?: boolean
  cancelled?: () => boolean
  onProgress?: (p: number) => void
  recordedWallSec?: number
  /** Prefer the on-screen review canvas — Safari often drops offscreen draws. */
  video?: HTMLVideoElement | null
  canvas?: HTMLCanvasElement | null
}

export async function burnOverlayVideo(opts: BurnOverlayOpts): Promise<Blob> {
  const loaded = await loadVideo(opts.source)
  const { video, url } = loaded
  const duration = await readDuration(
    video,
    opts.recordedWallSec && opts.recordedWallSec > 0.8 ? opts.recordedWallSec : opts.holdSeconds,
  )
  const srcW = video.videoWidth || 1280
  const srcH = video.videoHeight || 720
  const scale = srcW > 1600 ? 1600 / srcW : 1
  const width = Math.max(16, Math.round(srcW * scale))
  const height = Math.max(16, Math.round(srcH * scale))

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  canvas.style.cssText =
    'position:fixed;left:8px;bottom:8px;width:72px;height:72px;opacity:0.2;pointer-events:none;z-index:9'
  document.body.appendChild(canvas)
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    canvas.remove()
    URL.revokeObjectURL(url)
    throw new Error('Could not draw the overlay')
  }

  const stretch = mediaStretch(
    duration,
    opts.track,
    opts.clockOffsetSec,
    opts.holdSeconds,
    opts.recordedWallSec,
  )
  const win = holdMediaWindow(opts.clockOffsetSec, opts.holdSeconds, duration, stretch)
  const realDur = Math.max(0.4, (win.end - win.start) / Math.max(stretch, 1))
  const fps = 24
  const frames = Math.max(10, Math.round(realDur * fps))
  const dwell = 1000 / fps

  video.muted = true
  video.playbackRate = 1
  const captured = canvas.captureStream(fps)
  hintMotion(captured)
  const rec = createRecorder(captured)
  const chunks: Blob[] = []
  rec.ondataavailable = (e) => {
    if (e.data && e.data.size > 0) chunks.push(e.data)
  }
  const stopped = new Promise<Blob>((resolve) => {
    rec.onstop = () => {
      captured.getTracks().forEach((t) => t.stop())
      resolve(new Blob(chunks, { type: rec.mimeType || 'video/mp4' }))
    }
  })
  startRecorder(rec, 200)

  try {
    for (let i = 0; i < frames; i++) {
      if (opts.cancelled?.()) break
      const mediaT = win.start + (i / fps) * stretch
      await seekVideo(video, mediaT)
      paintHoldOverlay(ctx, video, width, height, mediaT, opts)
      opts.onProgress?.(Math.min(1, (i + 1) / frames))
      await new Promise<void>((r) => window.setTimeout(r, dwell))
    }
  } finally {
    if (rec.state !== 'inactive') rec.stop()
    canvas.remove()
    URL.revokeObjectURL(url)
    video.pause()
    video.src = ''
  }

  const blob = await stopped
  if (opts.cancelled?.() || blob.size < 800) {
    throw new Error(opts.cancelled?.() ? 'cancelled' : 'Overlay export was empty')
  }
  return durableBlob(blob)
}

export async function saveHoldClipWithOverlay(opts: {
  source: Blob
  track: PoseTrack | null
  holdSeconds: number
  clockOffsetSec: number
  filename: string
  mirror?: boolean
  mode?: JointDrawMode
  clipId?: string | null
  recordedWallSec?: number
  video?: HTMLVideoElement | null
  canvas?: HTMLCanvasElement | null
  onProgress?: (p: number) => void
}): Promise<SaveVideoResult> {
  const mode = opts.mode ?? 'auto'
  const mirror = opts.mirror !== false
  const key = burnedOverlayKey(opts.clipId, mode, mirror, true, true)
  let out = getBurnedOverlay(key)
  if (!out) {
    out = await burnOverlayVideo({
      source: opts.source,
      track: opts.track,
      mode,
      mirror,
      holdSeconds: opts.holdSeconds,
      clockOffsetSec: opts.clockOffsetSec,
      recordedWallSec: opts.recordedWallSec,
      onProgress: opts.onProgress,
    })
    rememberBurnedOverlay(key, out)
  }
  const ext = extForVideoType(out.type || opts.source.type || opts.filename)
  const name = opts.filename.replace(/\.(webm|mp4)$/i, '') + `.${ext}`
  return saveVideoToDevice(out, name)
}
