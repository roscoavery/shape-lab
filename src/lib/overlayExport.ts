/**
 * Burn the chosen skeleton (side-one-line or left/right) onto a hold clip
 * so Save can put a real video file in Photos — not a web link.
 */

import { getShape } from '../config/shapes'
import { scoreShape } from './scoring'
import {
  createRecorder,
  durableBlob,
  hintMotion,
  startRecorder,
} from './saveMedia'
import {
  drawGradeHud,
  drawPoseOverlay,
  overlayLineColor,
  type JointDrawMode,
} from './skeleton'
import { landmarksAt, type PoseTrack } from './poseTrack'

const burnedCache = new Map<string, Blob>()

export function burnedOverlayKey(
  clipId: string | null | undefined,
  mode: JointDrawMode,
  mirror: boolean,
): string | null {
  if (!clipId) return null
  return `${clipId}:${mode}:${mirror ? 'm' : 'c'}`
}

export function getBurnedOverlay(key: string | null): Blob | null {
  if (!key) return null
  return burnedCache.get(key) ?? null
}

export function rememberBurnedOverlay(key: string | null, blob: Blob): void {
  if (!key) return
  burnedCache.set(key, blob)
}

function seek(video: HTMLVideoElement, t: number): Promise<void> {
  return new Promise((resolve) => {
    if (Math.abs(video.currentTime - t) < 0.02) {
      resolve()
      return
    }
    const done = () => {
      video.removeEventListener('seeked', done)
      resolve()
    }
    video.addEventListener('seeked', done)
    video.currentTime = Math.min(t, Math.max(0, (video.duration || t) - 0.001))
  })
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

function paintFrame(
  ctx: CanvasRenderingContext2D,
  video: HTMLVideoElement,
  width: number,
  height: number,
  t: number,
  opts: BurnOverlayOpts,
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
  const lm = landmarksAt(opts.track, t)
  const score = shape ? scoreShape(lm, shape, null, { profileOk: true }) : null
  drawPoseOverlay(ctx, lm, {
    width,
    height,
    mirror: opts.mirror,
    mode: opts.mode,
    showAngles: true,
    lineColor: overlayLineColor(score),
  })
  const clock = Math.max(0, Math.min(opts.holdSeconds, t - opts.clockOffsetSec))
  if (score) {
    drawGradeHud(ctx, width, height, Math.round(score.overall), 'Handstand', clock)
  }
}

export type BurnOverlayOpts = {
  source: Blob
  track: PoseTrack | null
  mode: JointDrawMode
  mirror: boolean
  holdSeconds: number
  clockOffsetSec: number
  cancelled?: () => boolean
  onProgress?: (p: number) => void
}

export async function burnOverlayVideo(opts: BurnOverlayOpts): Promise<Blob> {
  const { video, url } = await loadVideo(opts.source)
  const duration = Number.isFinite(video.duration) && video.duration > 0 ? video.duration : opts.holdSeconds
  const srcW = video.videoWidth || 1280
  const srcH = video.videoHeight || 720
  const scale = srcW > 1280 ? 1280 / srcW : 1
  const width = Math.max(16, Math.round(srcW * scale))
  const height = Math.max(16, Math.round(srcH * scale))

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  canvas.style.position = 'fixed'
  canvas.style.left = '-9999px'
  canvas.style.top = '0'
  canvas.style.width = `${width}px`
  canvas.style.height = `${height}px`
  document.body.appendChild(canvas)
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    canvas.remove()
    URL.revokeObjectURL(url)
    throw new Error('Could not draw the overlay')
  }

  const captured = canvas.captureStream(24)
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

  const fps = 16
  const step = 1 / fps
  let t = 0
  let cancelled = false
  try {
    while (t <= duration + 0.001) {
      if (opts.cancelled?.()) {
        cancelled = true
        break
      }
      await seek(video, t)
      paintFrame(ctx, video, width, height, t, opts)
      opts.onProgress?.(Math.min(1, t / Math.max(0.001, duration)))
      await new Promise<void>((r) => requestAnimationFrame(() => r()))
      await new Promise((r) => window.setTimeout(r, 20))
      t += step
    }
  } finally {
    if (rec.state !== 'inactive') rec.stop()
    canvas.remove()
    URL.revokeObjectURL(url)
    video.src = ''
  }

  const blob = await stopped
  if (cancelled || blob.size < 800) throw new Error(cancelled ? 'cancelled' : 'Overlay export was empty')
  return durableBlob(blob)
}
