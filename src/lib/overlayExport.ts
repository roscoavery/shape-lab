/**
 * Burn live score, stopwatch, and the body line onto a hold clip.
 * Plays the source at a rate that unsretches a slow MediaRecorder file
 * into canvas.captureStream so Photos gets regular-speed video with HUD.
 */

import { getShape } from '../config/shapes'
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
  overlayLineColor,
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

function waitUntil(
  video: HTMLVideoElement,
  endSec: number,
  cancelled?: () => boolean,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const hit = () => video.ended || video.currentTime >= endSec - 0.04
    if (hit()) {
      resolve()
      return
    }
    const done = () => {
      cleanup()
      resolve()
    }
    const fail = () => {
      cleanup()
      reject(new Error('Clip playback failed while saving'))
    }
    const tick = () => {
      if (cancelled?.() || hit()) {
        cleanup()
        resolve()
        return
      }
      timer = window.setTimeout(tick, 40)
    }
    let timer = window.setTimeout(tick, 40)
    const cleanup = () => {
      window.clearTimeout(timer)
      video.removeEventListener('ended', done)
      video.removeEventListener('error', fail)
    }
    video.addEventListener('ended', done)
    video.addEventListener('error', fail)
  })
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
  const mediaDur = Number.isFinite(video.duration) && video.duration > 0 ? video.duration : opts.holdSeconds
  const trackT = mediaTimeToTrackTime(mediaT, mediaDur, opts.track, opts.clockOffsetSec, opts.holdSeconds)
  const rawLm = landmarksAtMedia(opts.track, mediaT, mediaDur, opts.clockOffsetSec, opts.holdSeconds)
  const lm = rawLm && !looksLikeBackgroundProp(rawLm) ? rawLm : null
  const score = shape && lm ? scoreShape(lm, shape, null, { profileOk: true }) : null
  if (opts.showSkeleton !== false) {
    drawPoseOverlay(ctx, lm, {
      width,
      height,
      mirror: opts.mirror,
      mode: opts.mode,
      showAngles: opts.showAngles !== false,
      lineColor: overlayLineColor(score),
    })
  }
  const clock = Math.max(0, Math.min(opts.holdSeconds, trackT - opts.clockOffsetSec))
  drawGradeHud(ctx, width, height, Math.round(score?.overall ?? 0), 'Handstand', clock)
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
  /** Prefer the on-screen review canvas — Safari often drops offscreen draws. */
  video?: HTMLVideoElement | null
  canvas?: HTMLCanvasElement | null
}

export async function burnOverlayVideo(opts: BurnOverlayOpts): Promise<Blob> {
  const owned = !opts.video
  const loaded = opts.video ? { video: opts.video, url: '' } : await loadVideo(opts.source)
  const { video, url } = loaded
  const duration = Number.isFinite(video.duration) && video.duration > 0 ? video.duration : opts.holdSeconds
  const srcW = video.videoWidth || opts.canvas?.width || 1280
  const srcH = video.videoHeight || opts.canvas?.height || 720
  const scale = srcW > 1600 ? 1600 / srcW : 1
  const width = Math.max(16, Math.round(srcW * scale))
  const height = Math.max(16, Math.round(srcH * scale))

  let canvas = opts.canvas ?? null
  let created = false
  if (!canvas) {
    canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    canvas.style.cssText =
      'position:fixed;left:0;top:0;width:2px;height:2px;opacity:0.03;pointer-events:none;z-index:1'
    document.body.appendChild(canvas)
    created = true
  } else if (canvas.width < 16 || canvas.height < 16) {
    canvas.width = width
    canvas.height = height
  }
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    if (created) canvas.remove()
    if (owned) URL.revokeObjectURL(url)
    throw new Error('Could not draw the overlay')
  }

  const stretch = mediaStretch(duration, opts.track, opts.clockOffsetSec, opts.holdSeconds)
  const win = holdMediaWindow(opts.clockOffsetSec, opts.holdSeconds, duration, stretch)
  const playStart = win.start
  const playEnd = win.end
  const prevRate = video.playbackRate
  const prevTime = video.currentTime

  video.playbackRate = stretch > 1.02 ? stretch : 1
  video.muted = true
  video.currentTime = playStart
  const captured = canvas.captureStream(30)
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

  let raf = 0
  const draw = () => {
    const mediaT = video.currentTime || playStart
    paintHoldOverlay(ctx, video, canvas!.width, canvas!.height, mediaT, opts)
    const span = Math.max(0.001, playEnd - playStart)
    opts.onProgress?.(Math.min(1, (mediaT - playStart) / span))
    if (!video.ended && !video.paused && mediaT < playEnd) {
      raf = requestAnimationFrame(draw)
    }
  }

  try {
    try {
      await video.play()
    } catch {
      await new Promise((r) => window.setTimeout(r, 40))
      await video.play()
    }
    draw()
    await waitUntil(video, playEnd, opts.cancelled)
    video.pause()
    paintHoldOverlay(ctx, video, canvas.width, canvas.height, Math.min(video.currentTime || playEnd, playEnd), opts)
    opts.onProgress?.(1)
  } finally {
    cancelAnimationFrame(raf)
    if (rec.state !== 'inactive') rec.stop()
    if (created) canvas.remove()
    if (owned) {
      URL.revokeObjectURL(url)
      video.pause()
      video.src = ''
    } else {
      video.playbackRate = prevRate
      video.currentTime = prevTime
    }
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
      video: opts.video,
      canvas: opts.canvas,
      onProgress: opts.onProgress,
    })
    rememberBurnedOverlay(key, out)
  }
  const ext = extForVideoType(out.type || opts.source.type || opts.filename)
  const name = opts.filename.replace(/\.(webm|mp4)$/i, '') + `.${ext}`
  return saveVideoToDevice(out, name)
}
