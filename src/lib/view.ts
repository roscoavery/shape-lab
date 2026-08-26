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
  if (!ls || !rs) return 'unknown'
  const width = Math.abs(ls.x - rs.x)
  if (width >= 0.12) return 'front'
  if (width <= 0.07) return 'side'
  return 'unknown' // 3/4 — usable for both
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
    label: 'Side view required',
    instruction:
      'Stand in profile (3/4 is OK). Do not face the camera or turn your back — we need to see the body line from back foot to hands.',
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
