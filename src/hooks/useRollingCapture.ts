import { useCallback, useEffect, useRef } from 'react'

/** Seconds of camera kept before the body-position hit. */
export const PRE_ROLL_MS = 2200
/** Seconds kept after the hold completes (a beat past the hit). */
export const POST_ROLL_MS = 1300

const GRAB_MS = 80
const KEEP_MS = 10_000

type Frame = { t: number; bitmap: ImageBitmap }

function pickMime(): string | undefined {
  if (typeof MediaRecorder === 'undefined') return undefined
  const cands = [
    'video/webm;codecs=vp8',
    'video/webm',
    'video/mp4',
  ]
  return cands.find((m) => MediaRecorder.isTypeSupported(m))
}

function freezeCleanup(frames: Frame[], encoding: boolean, now: number) {
  if (encoding) return
  const cutoff = now - KEEP_MS
  while (frames.length && frames[0]!.t < cutoff) {
    frames.shift()!.bitmap.close()
  }
}

async function encodeFrames(frames: Frame[]): Promise<Blob | null> {
  if (frames.length < 3) return null
  const first = frames[0]!.bitmap
  const canvas = document.createElement('canvas')
  canvas.width = first.width
  canvas.height = first.height
  const ctx = canvas.getContext('2d')
  if (!ctx) return null

  let stream: MediaStream
  try {
    stream = canvas.captureStream(12)
  } catch {
    return null
  }

  const mime = pickMime()
  let rec: MediaRecorder
  try {
    rec = mime
      ? new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 900_000 })
      : new MediaRecorder(stream)
  } catch {
    stream.getTracks().forEach((t) => t.stop())
    return null
  }

  const chunks: Blob[] = []
  rec.ondataavailable = (e) => {
    if (e.data && e.data.size > 0) chunks.push(e.data)
  }

  let watchdog = 0
  const stopped = new Promise<Blob | null>((resolve) => {
    rec.onstop = () => {
      window.clearTimeout(watchdog)
      stream.getTracks().forEach((t) => t.stop())
      if (!chunks.length) resolve(null)
      else resolve(new Blob(chunks, { type: rec.mimeType || mime || 'video/webm' }))
    }
    rec.onerror = () => {
      window.clearTimeout(watchdog)
      stream.getTracks().forEach((t) => t.stop())
      resolve(null)
    }
  })

  watchdog = window.setTimeout(() => {
    if (rec.state !== 'inactive') rec.stop()
  }, 8000)

  try {
    rec.start(80)
  } catch {
    window.clearTimeout(watchdog)
    stream.getTracks().forEach((t) => t.stop())
    return null
  }

  for (let i = 0; i < frames.length; i++) {
    ctx.drawImage(frames[i]!.bitmap, 0, 0)
    const nextT = frames[i + 1]?.t ?? frames[i]!.t + GRAB_MS
    const delay = Math.min(180, Math.max(50, nextT - frames[i]!.t))
    await new Promise((r) => setTimeout(r, delay))
  }
  await new Promise((r) => setTimeout(r, 90))
  if (rec.state !== 'inactive') rec.stop()
  return stopped
}

/**
 * Keeps ~10s of downscaled live frames (canvas overlay preferred).
 * `trimClip(hitAt, endAt)` waits a little past the hold, then encodes
 * from ~2.2s before the hit through ~1.3s after the hold ends.
 */
export function useRollingCapture(
  videoRef: React.RefObject<HTMLVideoElement | null>,
  canvasRef: React.RefObject<HTMLCanvasElement | null>,
  enabled: boolean,
) {
  const framesRef = useRef<Frame[]>([])
  const enabledRef = useRef(enabled)
  const encodingRef = useRef(false)

  useEffect(() => {
    enabledRef.current = enabled
  }, [enabled])

  useEffect(() => {
    if (!enabled) {
      for (const f of framesRef.current) f.bitmap.close()
      framesRef.current = []
      return
    }

    let timer = 0
    let cancelled = false

    const grab = async () => {
      if (cancelled || !enabledRef.current) return
      const canvas = canvasRef.current
      const video = videoRef.current
      let source: CanvasImageSource | null = null
      let w = 0
      let h = 0
      if (canvas && canvas.width > 16 && canvas.height > 16) {
        source = canvas
        w = canvas.width
        h = canvas.height
      } else if (video && video.readyState >= 2 && video.videoWidth > 0) {
        source = video
        w = video.videoWidth
        h = video.videoHeight
      }

      if (source && w > 0) {
        const maxW = 640
        const scale = w > maxW ? maxW / w : 1
        try {
          let bitmap: ImageBitmap
          try {
            bitmap = await createImageBitmap(source, {
              resizeWidth: Math.round(w * scale),
              resizeHeight: Math.round(h * scale),
            })
          } catch {
            bitmap = await createImageBitmap(source)
          }
          const now = performance.now()
          framesRef.current.push({ t: now, bitmap })
          freezeCleanup(framesRef.current, encodingRef.current, now)
        } catch {
          /* frame grab optional */
        }
      }

      if (!cancelled) timer = window.setTimeout(() => void grab(), GRAB_MS)
    }

    void grab()
    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [enabled, videoRef, canvasRef])

  const trimClip = useCallback(async (hitAt: number, endAt: number): Promise<Blob | null> => {
    const from = hitAt - PRE_ROLL_MS
    const to = endAt + POST_ROLL_MS
    const wait = Math.max(0, to - performance.now())
    encodingRef.current = true
    try {
      await new Promise((r) => setTimeout(r, wait + 80))
      const frames = framesRef.current.filter((f) => f.t >= from && f.t <= to + 40)
      return await encodeFrames(frames)
    } catch {
      return null
    } finally {
      encodingRef.current = false
    }
  }, [])

  return { trimClip }
}
