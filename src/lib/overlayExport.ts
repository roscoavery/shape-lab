/**
 * Burn live score, stopwatch, and the body line onto a hold clip.
 * Plays the source at stretch × save-speed into canvas.captureStream so
 * Photos gets a real-time (or slower/faster) file. Recap does not wait
 * on this — Save starts the write when the athlete taps it.
 */

import { getShape } from '../config/shapes'
import { HOLD_HUD_LABEL, HOLD_PINK } from './holdBuild'
import { holdMediaWindow, recapHoldClock } from './handstandHold'
import { looksLikeBackgroundProp } from './poseSubject'
import {
  landmarksAtMedia,
  mediaStretch,
  mediaTimeToTrackTime,
  savePlaybackRate,
  type PoseTrack,
} from './poseTrack'
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

export type HoldSaveLayers = {
  showScore: boolean
  showSkeleton: boolean
  showClock: boolean
  showAngles: boolean
}

export const DEFAULT_HOLD_SAVE_LAYERS: HoldSaveLayers = {
  showScore: true,
  showSkeleton: true,
  showClock: true,
  showAngles: true,
}

/** 0.5 = half speed, 1 = real time, 2 = double. */
export function clampSaveSpeed(speed: number): number {
  if (!Number.isFinite(speed)) return 1
  return Math.min(2, Math.max(0.5, Math.round(speed * 4) / 4))
}

export function saveSpeedLabel(speed: number): string {
  const n = clampSaveSpeed(speed)
  if (n === 1) return 'Regular · 1×'
  if (n < 1) return `Slower · ${n}×`
  return `Faster · ${n}×`
}

export function burnedOverlayKey(
  clipId: string | null | undefined,
  mode: JointDrawMode,
  mirror: boolean,
  layers: HoldSaveLayers = DEFAULT_HOLD_SAVE_LAYERS,
  saveSpeed = 1,
): string | null {
  if (!clipId) return null
  const speed = clampSaveSpeed(saveSpeed)
  return [
    clipId,
    mode,
    mirror ? 'm' : 'c',
    layers.showSkeleton ? 'sk1' : 'sk0',
    layers.showAngles ? 'ang1' : 'ang0',
    layers.showScore ? 'sc1' : 'sc0',
    layers.showClock ? 'cl1' : 'cl0',
    `spd${speed}`,
  ].join(':')
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

type VideoWithFrameCb = HTMLVideoElement & {
  requestVideoFrameCallback?: (cb: () => void) => number
  cancelVideoFrameCallback?: (id: number) => void
}

function hookVideoFrames(video: HTMLVideoElement, onFrame: () => boolean): () => void {
  const v = video as VideoWithFrameCb
  let stopped = false
  if (typeof v.requestVideoFrameCallback === 'function') {
    let id = 0
    const wrap = () => {
      if (stopped) return
      if (onFrame()) return
      id = v.requestVideoFrameCallback!(wrap)
    }
    id = v.requestVideoFrameCallback(wrap)
    return () => {
      stopped = true
      v.cancelVideoFrameCallback?.(id)
    }
  }
  let raf = 0
  const tick = () => {
    if (stopped) return
    if (onFrame()) return
    raf = requestAnimationFrame(tick)
  }
  raf = requestAnimationFrame(tick)
  return () => {
    stopped = true
    cancelAnimationFrame(raf)
  }
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
    showScore?: boolean
    showClock?: boolean
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
  const clock = recapHoldClock(trackT, opts.clockOffsetSec, opts.holdSeconds)
  drawGradeHud(
    ctx,
    width,
    height,
    Math.round(score?.overall ?? 0),
    HOLD_HUD_LABEL,
    clock,
    HOLD_PINK,
    { score: opts.showScore !== false, clock: opts.showClock !== false },
  )
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
  showScore?: boolean
  showClock?: boolean
  saveSpeed?: number
  cancelled?: () => boolean
  onProgress?: (p: number) => void
  recordedWallSec?: number
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
  video.style.cssText =
    'position:fixed;left:8px;bottom:8px;width:2px;height:2px;opacity:0.01;pointer-events:none;z-index:8'
  document.body.appendChild(video)
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    canvas.remove()
    video.remove()
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
  const saveSpeed = clampSaveSpeed(opts.saveSpeed ?? 1)
  const win = holdMediaWindow(opts.clockOffsetSec, opts.holdSeconds, duration, stretch)
  // Overlay still uses currentTime → track time. Only the file play rate changes.
  const wantedRate = savePlaybackRate(stretch, saveSpeed)
  video.muted = true
  video.playsInline = true
  video.playbackRate = wantedRate
  const playRate = video.playbackRate > 0.05 ? video.playbackRate : wantedRate

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
  const paint = () => {
    paintHoldOverlay(ctx, video, width, height, video.currentTime, opts)
    const span = Math.max(0.2, win.end - win.start)
    opts.onProgress?.(Math.min(1, (video.currentTime - win.start) / span))
  }

  let started = false
  try {
    await seekVideo(video, win.start)
    paint()
    startRecorder(rec, 200)
    started = true
    const wallBudget = ((win.end - win.start) / playRate) * 1000 + 1800
    await new Promise<void>((resolve) => {
      let settled = false
      const finish = () => {
        if (settled) return
        settled = true
        unhook()
        window.clearTimeout(timer)
        resolve()
      }
      const onFrame = () => {
        if (opts.cancelled?.()) {
          finish()
          return true
        }
        paint()
        if (video.ended || video.currentTime >= win.end - 0.03) {
          finish()
          return true
        }
        return false
      }
      const unhook = hookVideoFrames(video, onFrame)
      const timer = window.setTimeout(finish, wallBudget)
      video.addEventListener('ended', finish, { once: true })
      void video.play().catch(() => {
        finish()
      })
    })
  } finally {
    video.pause()
    if (started && rec.state !== 'inactive') rec.stop()
    canvas.remove()
    video.remove()
    URL.revokeObjectURL(url)
    video.src = ''
  }

  if (!started) throw new Error('Could not start the clip write')
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
  showSkeleton?: boolean
  showAngles?: boolean
  showScore?: boolean
  showClock?: boolean
  saveSpeed?: number
}): Promise<SaveVideoResult> {
  const mode = opts.mode ?? 'auto'
  const mirror = opts.mirror !== false
  const layers: HoldSaveLayers = {
    showScore: opts.showScore !== false,
    showSkeleton: opts.showSkeleton !== false,
    showClock: opts.showClock !== false,
    showAngles: opts.showAngles !== false,
  }
  const saveSpeed = clampSaveSpeed(opts.saveSpeed ?? 1)
  const anyOverlay = layers.showScore || layers.showSkeleton || layers.showClock
  if (!anyOverlay && saveSpeed === 1) {
    const probe = await loadVideo(opts.source)
    const duration = await readDuration(
      probe.video,
      opts.recordedWallSec && opts.recordedWallSec > 0.8 ? opts.recordedWallSec : opts.holdSeconds,
    )
    URL.revokeObjectURL(probe.url)
    probe.video.src = ''
    const stretch = mediaStretch(
      duration,
      opts.track,
      opts.clockOffsetSec,
      opts.holdSeconds,
      opts.recordedWallSec,
    )
    if (stretch <= 1.02) {
      const ext = extForVideoType(opts.source.type || opts.filename)
      const name = opts.filename.replace(/\.(webm|mp4)$/i, '') + `.${ext}`
      return saveVideoToDevice(opts.source, name)
    }
  }
  const key = burnedOverlayKey(opts.clipId, mode, mirror, layers, saveSpeed)
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
      showSkeleton: layers.showSkeleton,
      showAngles: layers.showAngles,
      showScore: layers.showScore,
      showClock: layers.showClock,
      saveSpeed,
      onProgress: opts.onProgress,
    })
    rememberBurnedOverlay(key, out)
  }
  const ext = extForVideoType(out.type || opts.source.type || opts.filename)
  const name = opts.filename.replace(/\.(webm|mp4)$/i, '') + `.${ext}`
  return saveVideoToDevice(out, name)
}
