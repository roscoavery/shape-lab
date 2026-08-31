/**
 * iPhone delay display — copy frames from the live <video>, unwind the
 * sensor rotation that canvas drawImage leaves in place, then paint them
 * delaySec later. Replay Last still plays the rolling MediaRecorder blob
 * (Safari applies the file's rotation tag there). This hook is only enabled
 * on iOS / ManagedMediaSource.
 */

import { useEffect, useRef, useState, type RefObject } from 'react'

const CAP_FPS = 10
const MAX_EDGE = 512
const DELAY_MAX_SEC = 20
const MAX_FRAMES = CAP_FPS * (DELAY_MAX_SEC + 2)

/**
 * iPhone camera buffers are 90° clockwise vs the upright LIVE preview.
 * Replay Last looks fine because the mp4 rotation matrix is applied.
 * canvas.drawImage / MSE do not — rotate the copy 90° CCW to match LIVE.
 */
const UNWIND_CW_RAD = -Math.PI / 2

type Slot = { ts: number; bmp: ImageBitmap }

function coverScale(bw: number, bh: number, cw: number, ch: number) {
  return Math.max(cw / bw, ch / bh)
}

/** Paint the live video into `cap` with sensor rotation already unwound. */
function captureUpright(
  live: HTMLVideoElement,
  cap: HTMLCanvasElement,
  capCtx: CanvasRenderingContext2D,
): boolean {
  const srcW = live.videoWidth || 0
  const srcH = live.videoHeight || 0
  if (srcW < 2 || srcH < 2) return false

  const edge = Math.max(srcW, srcH)
  const scale = Math.min(1, MAX_EDGE / edge)
  const dw = Math.max(2, Math.round(srcW * scale))
  const dh = Math.max(2, Math.round(srcH * scale))
  // 90° CCW swap: source width becomes dest height
  const outW = dh
  const outH = dw
  if (cap.width !== outW || cap.height !== outH) {
    cap.width = outW
    cap.height = outH
  }
  capCtx.save()
  capCtx.setTransform(1, 0, 0, 1, 0, 0)
  capCtx.clearRect(0, 0, outW, outH)
  capCtx.translate(0, outH)
  capCtx.rotate(UNWIND_CW_RAD)
  capCtx.drawImage(live, 0, 0, dw, dh)
  capCtx.restore()
  return true
}

function drawFrame(
  ctx: CanvasRenderingContext2D,
  bmp: ImageBitmap,
  cw: number,
  ch: number,
  mirror: boolean,
  zoom: number,
) {
  const s = coverScale(bmp.width, bmp.height, cw, ch) * Math.max(0.4, zoom)
  ctx.save()
  ctx.setTransform(1, 0, 0, 1, 0, 0)
  ctx.clearRect(0, 0, cw, ch)
  ctx.translate(cw / 2, ch / 2)
  if (mirror) ctx.scale(-1, 1)
  ctx.drawImage(bmp, (-bmp.width * s) / 2, (-bmp.height * s) / 2, bmp.width * s, bmp.height * s)
  ctx.restore()
}

function nearest(ring: Slot[], targetTs: number): Slot | null {
  if (ring.length === 0) return null
  let best = ring[0]
  let bestD = Math.abs(best.ts - targetTs)
  for (let i = 1; i < ring.length; i++) {
    const d = Math.abs(ring[i].ts - targetTs)
    if (d < bestD) {
      best = ring[i]
      bestD = d
    }
  }
  return best
}

export function useFrameDelay({
  liveRef,
  canvasRef,
  delaySec,
  enabled,
  mirror,
  zoom,
}: {
  liveRef: RefObject<HTMLVideoElement | null>
  canvasRef: RefObject<HTMLCanvasElement | null>
  delaySec: number
  enabled: boolean
  mirror: boolean
  zoom: number
}) {
  const [buffering, setBuffering] = useState(false)
  const ringRef = useRef<Slot[]>([])
  const delaySecRef = useRef(delaySec)
  const mirrorRef = useRef(mirror)
  const zoomRef = useRef(zoom)
  delaySecRef.current = delaySec
  mirrorRef.current = mirror
  zoomRef.current = zoom

  useEffect(() => {
    if (!enabled) {
      for (const slot of ringRef.current) slot.bmp.close()
      ringRef.current = []
      setBuffering(false)
      return
    }

    let raf = 0
    let lastCap = 0
    let dead = false
    const cap = document.createElement('canvas')
    const capCtx = cap.getContext('2d', { alpha: false })

    const tick = (now: number) => {
      if (dead) return
      const live = liveRef.current
      const canvas = canvasRef.current
      if (live && live.readyState >= 2 && capCtx && now - lastCap >= 1000 / CAP_FPS) {
        lastCap = now
        if (captureUpright(live, cap, capCtx)) {
          void createImageBitmap(cap)
            .then((bmp) => {
              if (dead) {
                bmp.close()
                return
              }
              const ring = ringRef.current
              ring.push({ ts: now, bmp })
              const oldest = now - (DELAY_MAX_SEC + 1) * 1000
              while (ring.length > MAX_FRAMES || (ring[0] && ring[0].ts < oldest)) {
                ring.shift()?.bmp.close()
              }
            })
            .catch(() => {})
        }
      }

      const ring = ringRef.current
      const need = delaySecRef.current * 1000
      const ready = ring.length > 0 && now - ring[0].ts >= need
      setBuffering((was) => {
        const next = !ready
        return was === next ? was : next
      })

      if (canvas && ring.length > 0) {
        const dpr = Math.min(2, window.devicePixelRatio || 1)
        const cssW = Math.max(2, canvas.clientWidth)
        const cssH = Math.max(2, canvas.clientHeight)
        const pw = Math.round(cssW * dpr)
        const ph = Math.round(cssH * dpr)
        if (canvas.width !== pw || canvas.height !== ph) {
          canvas.width = pw
          canvas.height = ph
        }
        const ctx = canvas.getContext('2d', { alpha: false })
        const slot = nearest(ring, now - need)
        if (ctx && slot) {
          drawFrame(ctx, slot.bmp, pw, ph, mirrorRef.current, zoomRef.current)
        }
      }

      raf = requestAnimationFrame(tick)
    }

    raf = requestAnimationFrame(tick)
    return () => {
      dead = true
      cancelAnimationFrame(raf)
      for (const slot of ringRef.current) slot.bmp.close()
      ringRef.current = []
    }
  }, [enabled, liveRef, canvasRef])

  return { buffering }
}
