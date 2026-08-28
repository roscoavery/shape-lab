/**
 * Coarse “are they in this homework shape?” checks so the stopwatch can
 * start when the athlete actually hits the position — not only at a high score.
 */

import { LM } from './landmarks'
import { mergePair } from './skeleton'
import type { Landmark } from '../types'

function visOk(p: Landmark | undefined, min = 0.12): p is Landmark {
  return Boolean(p) && (p!.visibility ?? 1) >= min
}

function hipAngleDeg(lm: Landmark[]): number | null {
  const hip = mergePair(lm[LM.LEFT_HIP], lm[LM.RIGHT_HIP], 0.08)
  const sh = mergePair(lm[LM.LEFT_SHOULDER], lm[LM.RIGHT_SHOULDER], 0.08)
  const knee = mergePair(lm[LM.LEFT_KNEE], lm[LM.RIGHT_KNEE], 0.06)
  if (!hip || !sh || !knee) return null
  const a = Math.hypot(sh.x - hip.x, sh.y - hip.y)
  const b = Math.hypot(knee.x - hip.x, knee.y - hip.y)
  const c = Math.hypot(sh.x - knee.x, sh.y - knee.y)
  if (a < 1e-4 || b < 1e-4) return null
  const cos = Math.max(-1, Math.min(1, (a * a + b * b - c * c) / (2 * a * b)))
  return (Math.acos(cos) * 180) / Math.PI
}

/**
 * Lying hollow (side or 3/4 view). Bent knees are allowed — that is how
 * beginners get the lower back down. Does not require a high shape score.
 */
export function poseLooksHollow(lm: Landmark[] | null | undefined): boolean {
  if (!lm || lm.length < 33) return false
  const hip = mergePair(lm[LM.LEFT_HIP], lm[LM.RIGHT_HIP], 0.08)
  const sh = mergePair(lm[LM.LEFT_SHOULDER], lm[LM.RIGHT_SHOULDER], 0.08)
  if (!hip || !sh) return false

  const torsoTilt = Math.abs(sh.y - hip.y)
  const dx = sh.x - hip.x
  const dy = sh.y - hip.y
  const deg = Math.abs((Math.atan2(dy, dx) * 180) / Math.PI)
  const torsoFlat = torsoTilt < 0.28 || deg < 48 || deg > 132
  if (!torsoFlat) return false

  const hipA = hipAngleDeg(lm)
  if (hipA == null) return torsoTilt < 0.2
  // Standing ~170–180; a hollow is closed. Bent-knee hollow can sit near 80°.
  return hipA > 68 && hipA < 176
}

/** Lying/prone-ish long body for superman / plank-like holds. */
export function poseLooksLongBody(lm: Landmark[] | null | undefined): boolean {
  if (!lm || lm.length < 33) return false
  const hip = mergePair(lm[LM.LEFT_HIP], lm[LM.RIGHT_HIP], 0.1)
  const sh = mergePair(lm[LM.LEFT_SHOULDER], lm[LM.RIGHT_SHOULDER], 0.1)
  const ank = mergePair(lm[LM.LEFT_ANKLE], lm[LM.RIGHT_ANKLE], 0.08)
  if (!hip || !sh || !ank) return false
  const span = Math.hypot(ank.x - sh.x, ank.y - sh.y)
  const torsoTilt = Math.abs(sh.y - hip.y)
  return span > 0.22 && torsoTilt < 0.32
}

function kneeAngleDeg(lm: Landmark[]): number | null {
  const knee = mergePair(lm[LM.LEFT_KNEE], lm[LM.RIGHT_KNEE], 0.06)
  const hip = mergePair(lm[LM.LEFT_HIP], lm[LM.RIGHT_HIP], 0.08)
  const ank = mergePair(lm[LM.LEFT_ANKLE], lm[LM.RIGHT_ANKLE], 0.06)
  if (!knee || !hip || !ank) return null
  const a = Math.hypot(hip.x - knee.x, hip.y - knee.y)
  const b = Math.hypot(ank.x - knee.x, ank.y - knee.y)
  const c = Math.hypot(hip.x - ank.x, hip.y - ank.y)
  if (a < 1e-4 || b < 1e-4) return null
  const cos = Math.max(-1, Math.min(1, (a * a + b * b - c * c) / (2 * a * b)))
  return (Math.acos(cos) * 180) / Math.PI
}

/** Hands and feet down, hips the peak of a back-bridge arch. */
function poseLooksBridgeSupport(lm: Landmark[] | null | undefined): boolean {
  if (!lm || lm.length < 33) return false
  const hip = mergePair(lm[LM.LEFT_HIP], lm[LM.RIGHT_HIP], 0.08)
  const sh = mergePair(lm[LM.LEFT_SHOULDER], lm[LM.RIGHT_SHOULDER], 0.08)
  const ank = mergePair(lm[LM.LEFT_ANKLE], lm[LM.RIGHT_ANKLE], 0.08)
  const wr = mergePair(lm[LM.LEFT_WRIST], lm[LM.RIGHT_WRIST], 0.08)
  if (!hip || !sh || !ank || !wr) return false

  // Hands and feet both down: similar height, not a handstand or a stand.
  if (Math.abs(wr.y - ank.y) > 0.28) return false
  const supportY = Math.max(wr.y, ank.y)
  // Hips are the peak (smaller y = higher on screen).
  if (supportY - hip.y < 0.12) return false
  // Some arch: hips above the shoulders.
  if (hip.y > sh.y - 0.02) return false
  return true
}

/**
 * Side-view rainbow bridge: hands and feet on the floor, hips the peak,
 * knees bent. Standing, hollow, and handstand must not pass this check.
 */
export function poseLooksRainbowBridge(lm: Landmark[] | null | undefined): boolean {
  if (!poseLooksBridgeSupport(lm)) return false
  const kneeA = kneeAngleDeg(lm!)
  if (kneeA != null && (kneeA < 68 || kneeA > 158)) return false
  return true
}

/** Straight-leg long bridge — same support as rainbow, knees open. */
export function poseLooksLongBridge(lm: Landmark[] | null | undefined): boolean {
  if (!poseLooksBridgeSupport(lm)) return false
  const kneeA = kneeAngleDeg(lm!)
  if (kneeA != null && kneeA < 145) return false
  return true
}

/**
 * Forearm side plank: one elbow down near the feet, hips lifted,
 * body in a long line. Bent knees allowed. Not a rainbow bridge.
 */
export function poseLooksSidePlank(lm: Landmark[] | null | undefined): boolean {
  if (!lm || lm.length < 33) return false
  const hip = mergePair(lm[LM.LEFT_HIP], lm[LM.RIGHT_HIP], 0.08)
  const sh = mergePair(lm[LM.LEFT_SHOULDER], lm[LM.RIGHT_SHOULDER], 0.08)
  const ank = mergePair(lm[LM.LEFT_ANKLE], lm[LM.RIGHT_ANKLE], 0.08)
  if (!hip || !sh || !ank) return false
  const leftEl = visOk(lm[LM.LEFT_ELBOW], 0.08) ? lm[LM.LEFT_ELBOW] : null
  const rightEl = visOk(lm[LM.RIGHT_ELBOW], 0.08) ? lm[LM.RIGHT_ELBOW] : null
  const support = [leftEl, rightEl].filter(Boolean).sort((a, b) => b!.y - a!.y)[0]
  if (!support) return false
  // Support elbow near the floor with the feet (not a handstand).
  if (Math.abs(support.y - ank.y) > 0.3) return false
  // Hips lifted off that elbow.
  if (support.y - hip.y < 0.06) return false
  // Long-ish body, not a tucked sit.
  const span = Math.hypot(ank.x - sh.x, ank.y - sh.y)
  if (span < 0.18) return false
  // Not a rainbow: hips should not tower over the shoulders.
  if (sh.y - hip.y > 0.18) return false
  return true
}

/** Seated open-shoulder tuck — sitting on the glutes, knees pulled in,
 * at least one arm reaching up. Not a seated pike (straight knees) and
 * not a lying hollow (torso flat).
 */
export function poseLooksSeatedTuck(lm: Landmark[] | null | undefined): boolean {
  if (!lm || lm.length < 33) return false
  const hip = mergePair(lm[LM.LEFT_HIP], lm[LM.RIGHT_HIP], 0.08)
  const sh = mergePair(lm[LM.LEFT_SHOULDER], lm[LM.RIGHT_SHOULDER], 0.08)
  if (!hip || !sh) return false
  // Sitting: shoulders clearly above the hips (not a hollow on the back).
  if (hip.y - sh.y < 0.08) return false
  const hipA = hipAngleDeg(lm)
  if (hipA != null && hipA > 125) return false
  const kneeA = kneeAngleDeg(lm)
  if (kneeA != null && (kneeA < 25 || kneeA > 125)) return false
  const leftWr = lm[LM.LEFT_WRIST]
  const rightWr = lm[LM.RIGHT_WRIST]
  const armUp =
    (visOk(leftWr, 0.1) && leftWr.y < sh.y - 0.05) ||
    (visOk(rightWr, 0.1) && rightWr.y < sh.y - 0.05)
  return armUp
}

/** Seated pike with zombie arms — hips and feet on the floor, torso up. */
export function poseLooksSeatedPike(lm: Landmark[] | null | undefined): boolean {
  if (!lm || lm.length < 33) return false
  const hip = mergePair(lm[LM.LEFT_HIP], lm[LM.RIGHT_HIP], 0.08)
  const sh = mergePair(lm[LM.LEFT_SHOULDER], lm[LM.RIGHT_SHOULDER], 0.08)
  const ank = mergePair(lm[LM.LEFT_ANKLE], lm[LM.RIGHT_ANKLE], 0.08)
  if (!hip || !sh || !ank) return false
  // Sitting: hips and ankles near the same height (both on the floor).
  if (Math.abs(hip.y - ank.y) > 0.22) return false
  // Torso up: shoulders clearly above the hips.
  if (hip.y - sh.y < 0.1) return false
  const kneeA = kneeAngleDeg(lm)
  if (kneeA != null && kneeA < 145) return false
  return true
}

export function homeworkLooksReady(
  shapeId: string,
  lm: Landmark[] | null | undefined,
  overall: number,
): boolean {
  if (shapeId.startsWith('hollow')) {
    return poseLooksHollow(lm) || overall >= 32
  }
  if (shapeId === 'superman') {
    return poseLooksLongBody(lm) || overall >= 32
  }
  if (shapeId === 'side_plank') {
    return poseLooksSidePlank(lm) || overall >= 32
  }
  if (shapeId === 'rainbow_bridge') {
    return poseLooksRainbowBridge(lm) || overall >= 32
  }
  if (shapeId === 'long_bridge') {
    return poseLooksLongBridge(lm) || overall >= 32
  }
  if (shapeId === 'seated_pike' || shapeId === 'pike_open_shoulders') {
    return poseLooksSeatedPike(lm) || overall >= 32
  }
  if (shapeId === 'tuck_open_shoulders') {
    return poseLooksSeatedTuck(lm) || overall >= 32
  }
  if (shapeId === 'wall_handstand') {
    if (overall >= 32) return true
    if (!lm) return false
    const wrists = [lm[LM.LEFT_WRIST], lm[LM.RIGHT_WRIST]].filter((p) => visOk(p, 0.12))
    const ankles = [lm[LM.LEFT_ANKLE], lm[LM.RIGHT_ANKLE]].filter((p) => visOk(p, 0.1))
    if (!wrists.length || !ankles.length) return false
    const wristY = Math.max(...wrists.map((p) => p.y))
    const ankleY = Math.min(...ankles.map((p) => p.y))
    return wristY - ankleY > 0.18
  }
  return overall >= 28
}
