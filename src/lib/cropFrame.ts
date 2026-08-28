/**
 * Crop the current video frame from a normalized drag rectangle (0–1, video content box).
 */

export type NormPt = { x: number; y: number }

export function normalizeRect(a: NormPt, b: NormPt): {
  x: number
  y: number
  w: number
  h: number
} {
  const x = Math.min(a.x, b.x)
  const y = Math.min(a.y, b.y)
  return {
    x: Math.min(1, Math.max(0, x)),
    y: Math.min(1, Math.max(0, y)),
    w: Math.min(1, Math.max(0, Math.abs(b.x - a.x))),
    h: Math.min(1, Math.max(0, Math.abs(b.y - a.y))),
  }
}

/** CSS-mirrored video: overlay x=0 is the right edge of the pixel buffer. */
export function videoPixelRect(
  a: NormPt,
  b: NormPt,
  mirror: boolean,
): { x: number; y: number; w: number; h: number } {
  if (!mirror) return normalizeRect(a, b)
  return normalizeRect({ x: 1 - a.x, y: a.y }, { x: 1 - b.x, y: b.y })
}

const MIN_EDGE = 0.04
const MAX_EDGE_PX = 960
const JPEG_QUALITY = 0.82

export function cropVideoFrame(
  video: HTMLVideoElement | null,
  a: NormPt,
  b: NormPt,
  mirror = false,
): string | null {
  if (!video) return null
  const vw = video.videoWidth
  const vh = video.videoHeight
  if (!vw || !vh) return null
  const rect = videoPixelRect(a, b, mirror)
  if (rect.w < MIN_EDGE || rect.h < MIN_EDGE) return null

  const sx = Math.floor(rect.x * vw)
  const sy = Math.floor(rect.y * vh)
  const sw = Math.max(2, Math.min(vw - sx, Math.ceil(rect.w * vw)))
  const sh = Math.max(2, Math.min(vh - sy, Math.ceil(rect.h * vh)))

  const src = document.createElement('canvas')
  src.width = sw
  src.height = sh
  const ctx = src.getContext('2d')
  if (!ctx) return null
  try {
    ctx.drawImage(video, sx, sy, sw, sh, 0, 0, sw, sh)
  } catch {
    return null
  }

  const longest = Math.max(sw, sh)
  let out = src
  if (longest > MAX_EDGE_PX) {
    const scale = MAX_EDGE_PX / longest
    out = document.createElement('canvas')
    out.width = Math.max(1, Math.round(sw * scale))
    out.height = Math.max(1, Math.round(sh * scale))
    const octx = out.getContext('2d')
    if (!octx) return null
    octx.drawImage(src, 0, 0, out.width, out.height)
  }

  try {
    return out.toDataURL('image/jpeg', JPEG_QUALITY)
  } catch {
    return null
  }
}
