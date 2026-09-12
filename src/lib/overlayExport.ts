/**
 * Burn live score, stopwatch, and the body line onto a hold clip at 1×.
 * Play the source in real time into canvas.captureStream so Photos
 * gets regular-speed video — not the old seek+timeout slow-mo encode.
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
import { holdMediaWindow } from './handstandHold'
import { looksLikeBackgroundProp } from './poseSubject'
import { landmarksAtMedia, mediaTimeToTrackTime, type PoseTrack } from './poseTrack'

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
    const hit = () => video.ended || video.currentTime >= endSec - 0.02
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
  const mediaDur = Number.isFinite(video.duration) && video.duration > 0 ? video.duration : opts.holdSeconds
  const trackT = mediaTimeToTrackTime(t, mediaDur, opts.track)
  const rawLm = landmarksAtMedia(opts.track, t, mediaDur)
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
}

export async function burnOverlayVideo(opts: BurnOverlayOpts): Promise<Blob> {
  const { video, url } = await loadVideo(opts.source)
  const duration = Number.isFinite(video.duration) && video.duration > 0 ? video.duration : opts.holdSeconds
  const srcW = video.videoWidth || 1280
  const srcH = video.videoHeight || 720
  const scale = srcW > 1600 ? 1600 / srcW : 1
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

  const win = holdMediaWindow(opts.clockOffsetSec, opts.holdSeconds, duration)
  const track = opts.track
  const localTrack = Boolean(track && track.length && track[0]!.t <= 0.35)
  const trackSpan = track && track.length ? track[track.length - 1]!.t - track[0]!.t : 0
  const stretched = localTrack && duration > trackSpan + 0.45
  const playStart = stretched ? 0 : win.start
  const playEnd = stretched ? duration : win.end

  video.playbackRate = 1
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
  let vfc = 0
  const draw = (_now?: number, meta?: { mediaTime?: number }) => {
    const mediaT = meta?.mediaTime ?? video.currentTime ?? playStart
    paintFrame(ctx, video, width, height, mediaT, opts)
    const span = Math.max(0.001, playEnd - playStart)
    opts.onProgress?.(Math.min(1, (mediaT - playStart) / span))
    if (!video.ended && !video.paused && mediaT < playEnd) {
      const rvfc = (
        video as HTMLVideoElement & {
          requestVideoFrameCallback?: (cb: typeof draw) => number
        }
      ).requestVideoFrameCallback
      if (rvfc) vfc = rvfc.call(video, draw)
      else raf = requestAnimationFrame(() => draw())
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
    paintFrame(ctx, video, width, height, Math.min(video.currentTime || playEnd, playEnd), opts)
    opts.onProgress?.(1)
  } finally {
    cancelAnimationFrame(raf)
    const cvfc = (
      video as HTMLVideoElement & { cancelVideoFrameCallback?: (id: number) => void }
    ).cancelVideoFrameCallback
    if (vfc && cvfc) cvfc.call(video, vfc)
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
