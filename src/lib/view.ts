/**
 * Camera-angle helpers.
 *
 * Joint angles (knees, elbows, hips) work from most facings.
 * Body-line vs floor/vertical needs a side view. T / symmetry needs front.
 */

import { LM } from './landmarks'
import type { CameraView, Landmark } from '../types'

export type DetectedView = 'front' | 'side' | 'unknown'

/**
 * Estimate whether the athlete is facing the camera or standing in profile.
 * Uses shoulder width in the frame: wide = front, overlapping = side.
 */
export function detectCameraView(landmarks: Landmark[]): DetectedView {
  const ls = landmarks[LM.LEFT_SHOULDER]
  const rs = landmarks[LM.RIGHT_SHOULDER]
  const lh = landmarks[LM.LEFT_HIP]
  const rh = landmarks[LM.RIGHT_HIP]
  if (!ls || !rs) return 'unknown'
  const shoulderW = Math.abs(ls.x - rs.x)
  const hipW = lh && rh ? Math.abs(lh.x - rh.x) : shoulderW
  const zDiff = Math.abs((ls.z ?? 0) - (rs.z ?? 0))
  // Profile: shoulders overlap in x, or a clear depth split between them.
  if (shoulderW <= 0.08 || (shoulderW <= 0.12 && zDiff > 0.1)) return 'side'
  // Face-on only when both girdles are clearly wide — gymnastics side views
  // often still show ~0.12–0.18 shoulder width and used to be mislabeled "front".
  if (shoulderW >= 0.22 && hipW >= 0.15) return 'front'
  return 'unknown'
}

export function viewMatches(
  required: CameraView | undefined,
  detected: DetectedView,
): boolean {
  if (!required || required === 'any') return true
  if (detected === 'unknown') return true // 3/4 is OK
  return required === detected
}

export function criterionViewOk(
  needs: 'side' | 'front' | undefined,
  detected: DetectedView,
): boolean {
  if (!needs) return true
  if (detected === 'unknown') return true
  return needs === detected
}

export const CAMERA_VIEW_COPY: Record<
  CameraView,
  { label: string; instruction: string }
> = {
  any: {
    label: 'Any facing',
    instruction:
      'You do not need to match the reference photo’s camera angle. Face any way that shows the body.',
  },
  side: {
    label: 'Side view',
    instruction:
      'Stand in profile (3/4 is OK). Stay sideways — you do not need to face the camera. We grade the body line from the landmarks we can see.',
  },
  front: {
    label: 'Front view required',
    instruction:
      'Face the camera so both arms and both legs are visible. Do not stand in profile.',
  },
}

const SWAP_PAIRS: [number, number][] = [
  [LM.LEFT_EYE_INNER, LM.RIGHT_EYE_INNER],
  [LM.LEFT_EYE, LM.RIGHT_EYE],
  [LM.LEFT_EYE_OUTER, LM.RIGHT_EYE_OUTER],
  [LM.LEFT_EAR, LM.RIGHT_EAR],
  [LM.MOUTH_LEFT, LM.MOUTH_RIGHT],
  [LM.LEFT_SHOULDER, LM.RIGHT_SHOULDER],
  [LM.LEFT_ELBOW, LM.RIGHT_ELBOW],
  [LM.LEFT_WRIST, LM.RIGHT_WRIST],
  [LM.LEFT_PINKY, LM.RIGHT_PINKY],
  [LM.LEFT_INDEX, LM.RIGHT_INDEX],
  [LM.LEFT_THUMB, LM.RIGHT_THUMB],
  [LM.LEFT_HIP, LM.RIGHT_HIP],
  [LM.LEFT_KNEE, LM.RIGHT_KNEE],
  [LM.LEFT_ANKLE, LM.RIGHT_ANKLE],
  [LM.LEFT_HEEL, LM.RIGHT_HEEL],
  [LM.LEFT_FOOT_INDEX, LM.RIGHT_FOOT_INDEX],
]

/** Swap left/right landmarks so “left = front” shape defs also grade the other side. */
export function swapLeftRight(landmarks: Landmark[]): Landmark[] {
  const out = landmarks.slice()
  for (const [a, b] of SWAP_PAIRS) {
    const tmp = out[a]
    out[a] = out[b]
    out[b] = tmp
  }
  return out
}
