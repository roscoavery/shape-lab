/**
 * iPhone delay display — copy frames from the live <video> into a ring,
 * then paint them on a canvas delaySec later.
 *
 * Safari ignores canvas 2d rotation on camera frames (they stay 90° CW).
 * This hook copies pixels as-is. CameraPane wraps the canvas in
 * IosDelayUnwind so CSS can straighten them the same way LIVE is upright.
 * Replay Last still plays the rolling blob (file rotation tag).
 */

import { useEffect, useRef, useState, type RefObject } from 'react'

const CAP_FPS = 10
const MAX_EDGE = 512
const DELAY_MAX_SEC = 20
const MAX_FRAMES = CAP_FPS * (DELAY_MAX_SEC + 2)

type Slot = { ts: number; bmp: ImageBitmap }

function coverScale(bw: number, bh: number, cw: number, ch: number) {
  return Math.max(cw / bw, ch / bh)
}

function captureRaw(
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
  if (cap.width !== dw || cap.height !== dh) {
    cap.width = dw
    cap.height = dh
  }
  capCtx.setTransform(1, 0, 0, 1, 0, 0)
  capCtx.drawImage(live, 0, 0, dw, dh)
  return true
}

function drawFrame(
  ctx: CanvasRenderingContext2D,
  bmp: ImageBitmap,
  cw: number,
  ch: number,
  zoom: number,
) {
  const s = coverScale(bmp.width, bmp.height, cw, ch) * Math.max(0.4, zoom)
  ctx.save()
  ctx.setTransform(1, 0, 0, 1, 0, 0)
  ctx.clearRect(0, 0, cw, ch)
  ctx.translate(cw / 2, ch / 2)
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
  zoom,
}: {
  liveRef: RefObject<HTMLVideoElement | null>
  canvasRef: RefObject<HTMLCanvasElement | null>
  delaySec: number
  enabled: boolean
  zoom: number
}) {
  const [buffering, setBuffering] = useState(false)
  const ringRef = useRef<Slot[]>([])
  const delaySecRef = useRef(delaySec)
  const zoomRef = useRef(zoom)
  delaySecRef.current = delaySec
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
        if (captureRaw(live, cap, capCtx)) {
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

      if (canvas && ring.length > 0 && canvas.clientWidth > 2 && canvas.clientHeight > 2) {
        const dpr = Math.min(2, window.devicePixelRatio || 1)
        const cssW = canvas.clientWidth
        const cssH = canvas.clientHeight
        const pw = Math.round(cssW * dpr)
        const ph = Math.round(cssH * dpr)
        if (canvas.width !== pw || canvas.height !== ph) {
          canvas.width = pw
          canvas.height = ph
        }
        const ctx = canvas.getContext('2d', { alpha: false })
        const slot = nearest(ring, now - need)
        if (ctx && slot) {
          drawFrame(ctx, slot.bmp, pw, ph, zoomRef.current)
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
