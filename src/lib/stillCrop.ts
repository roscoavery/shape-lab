/**
 * Display crop for a coach / IG still — normalized 0–1 on the original photo.
 * Original files stay untouched; this only changes how the picture is framed in the app.
 */

export type StillCropRect = {
  x: number
  y: number
  w: number
  h: number
}

export const FULL_STILL_CROP: StillCropRect = { x: 0, y: 0, w: 1, h: 1 }

const MIN = 0.06

export function clampUnit(n: number, lo = 0, hi = 1): number {
  if (!Number.isFinite(n)) return lo
  return Math.min(hi, Math.max(lo, n))
}

export function clampStillCrop(c: StillCropRect): StillCropRect {
  const x = clampUnit(c.x, 0, 1 - MIN)
  const y = clampUnit(c.y, 0, 1 - MIN)
  return {
    x,
    y,
    w: clampUnit(c.w, MIN, 1 - x),
    h: clampUnit(c.h, MIN, 1 - y),
  }
}

export function isFullStillCrop(c?: StillCropRect | null): boolean {
  if (!c) return true
  return c.x <= 0.004 && c.y <= 0.004 && c.w >= 0.992 && c.h >= 0.992
}

export function cropFromCorners(
  a: { x: number; y: number },
  b: { x: number; y: number },
): StillCropRect {
  const x1 = clampUnit(Math.min(a.x, b.x))
  const y1 = clampUnit(Math.min(a.y, b.y))
  const x2 = clampUnit(Math.max(a.x, b.x))
  const y2 = clampUnit(Math.max(a.y, b.y))
  return clampStillCrop({ x: x1, y: y1, w: Math.max(MIN, x2 - x1), h: Math.max(MIN, y2 - y1) })
}

/** Pixel rectangle on a decoded image — clip only, never scale X/Y independently. */
export function cropSourcePixels(
  crop: StillCropRect,
  natW: number,
  natH: number,
): { sx: number; sy: number; sw: number; sh: number } {
  const c = clampStillCrop(crop)
  const sx = Math.min(natW - 1, Math.max(0, Math.round(c.x * natW)))
  const sy = Math.min(natH - 1, Math.max(0, Math.round(c.y * natH)))
  const sw = Math.min(natW - sx, Math.max(1, Math.round(c.w * natW)))
  const sh = Math.min(natH - sy, Math.max(1, Math.round(c.h * natH)))
  return { sx, sy, sw, sh }
}

