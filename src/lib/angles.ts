/**
 * ============================================================================
 * Joint angle helpers
 * ============================================================================
 * All angles are returned in degrees.
 * Joint angles use the interior angle at the middle landmark (0–180°).
 * Segment angles vs vertical/horizontal use 0–90° deviation unless noted.
 */

import type { Landmark } from '../types'

function isVisible(lm: Landmark | undefined, min = 0.4): boolean {
  if (!lm) return false
  return (lm.visibility ?? 1) >= min
}

/** Angle ABC in degrees (0–180), where B is the vertex. */
export function jointAngle(
  landmarks: Landmark[],
  a: number,
  b: number,
  c: number,
): number | null {
  const A = landmarks[a]
  const B = landmarks[b]
  const C = landmarks[c]
  if (!isVisible(A) || !isVisible(B) || !isVisible(C)) return null

  const bax = A.x - B.x
  const bay = A.y - B.y
  const bcx = C.x - B.x
  const bcy = C.y - B.y

  const dot = bax * bcx + bay * bcy
  const magBA = Math.hypot(bax, bay)
  const magBC = Math.hypot(bcx, bcy)
  if (magBA < 1e-6 || magBC < 1e-6) return null

  const cos = Math.min(1, Math.max(-1, dot / (magBA * magBC)))
  return (Math.acos(cos) * 180) / Math.PI
}

/**
 * Absolute angle of segment A→B from the upward vertical, in degrees (0–180).
 * 0 = pointing straight up on screen, 90 = horizontal, 180 = straight down.
 * Note: camera Y grows downward, so we flip Y for "up".
 */
export function segmentAngleFromVertical(
  landmarks: Landmark[],
  a: number,
  b: number,
): number | null {
  const A = landmarks[a]
  const B = landmarks[b]
  if (!isVisible(A) || !isVisible(B)) return null

  const dx = B.x - A.x
  const dy = -(B.y - A.y) // flip so +y is up
  const deg = (Math.atan2(dx, dy) * 180) / Math.PI
  return Math.abs(deg)
}

/** Smallest angle between segment A→B and horizontal (0–90°). */
export function segmentAngleFromHorizontal(
  landmarks: Landmark[],
  a: number,
  b: number,
): number | null {
  const fromVert = segmentAngleFromVertical(landmarks, a, b)
  if (fromVert === null) return null
  // vertical 0 → horizontal distance 90; vertical 90 → horizontal distance 0
  return Math.abs(90 - fromVert)
}

/** Euclidean distance in normalized landmark space. */
export function pointDistance(
  landmarks: Landmark[],
  a: number,
  b: number,
): number | null {
  const A = landmarks[a]
  const B = landmarks[b]
  if (!isVisible(A) || !isVisible(B)) return null
  return Math.hypot(A.x - B.x, A.y - B.y)
}

/** Midpoint between two landmarks, or null if either is weak. */
export function midpoint(
  landmarks: Landmark[],
  a: number,
  b: number,
): Landmark | null {
  const A = landmarks[a]
  const B = landmarks[b]
  if (!isVisible(A) || !isVisible(B)) return null
  return {
    x: (A.x + B.x) / 2,
    y: (A.y + B.y) / 2,
    z: (A.z + B.z) / 2,
    visibility: Math.min(A.visibility ?? 1, B.visibility ?? 1),
  }
}
