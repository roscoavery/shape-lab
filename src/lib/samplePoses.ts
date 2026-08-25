/**
 * Synthetic poses for testing scoring without a camera.
 * Approximate side-view handstand (good) and a piked/broken variant (needs corrections).
 */

import { LM } from './landmarks'
import type { Landmark } from '../types'

function lm(x: number, y: number, visibility = 0.95): Landmark {
  return { x, y, z: 0, visibility }
}

/** Build a 33-point pose array from a sparse map of index → landmark. */
function fillPose(points: Partial<Record<number, Landmark>>): Landmark[] {
  const out: Landmark[] = []
  for (let i = 0; i < 33; i++) {
    out[i] = points[i] ?? lm(0.5, 0.5, 0.1)
  }
  return out
}

/**
 * Side-view-ish stacked handstand (mirrored coordinates as if facing camera slightly).
 * High scores expected on elbows/knees/hips/body line.
 */
export function sampleGoodHandstand(): Landmark[] {
  // Hands near bottom of frame, feet near top (inverted)
  return fillPose({
    [LM.NOSE]: lm(0.5, 0.42),
    [LM.LEFT_SHOULDER]: lm(0.47, 0.55),
    [LM.RIGHT_SHOULDER]: lm(0.53, 0.55),
    [LM.LEFT_ELBOW]: lm(0.47, 0.68),
    [LM.RIGHT_ELBOW]: lm(0.53, 0.68),
    [LM.LEFT_WRIST]: lm(0.47, 0.82),
    [LM.RIGHT_WRIST]: lm(0.53, 0.82),
    [LM.LEFT_HIP]: lm(0.48, 0.35),
    [LM.RIGHT_HIP]: lm(0.52, 0.35),
    [LM.LEFT_KNEE]: lm(0.48, 0.22),
    [LM.RIGHT_KNEE]: lm(0.52, 0.22),
    [LM.LEFT_ANKLE]: lm(0.48, 0.1),
    [LM.RIGHT_ANKLE]: lm(0.52, 0.1),
    [LM.LEFT_FOOT_INDEX]: lm(0.48, 0.07),
    [LM.RIGHT_FOOT_INDEX]: lm(0.52, 0.07),
    [LM.LEFT_HEEL]: lm(0.48, 0.12),
    [LM.RIGHT_HEEL]: lm(0.52, 0.12),
  })
}

/** Piked handstand with bent elbows — should trigger shoulder/hip/elbow corrections. */
export function sampleNeedsWorkHandstand(): Landmark[] {
  return fillPose({
    [LM.NOSE]: lm(0.55, 0.4),
    [LM.LEFT_SHOULDER]: lm(0.45, 0.55),
    [LM.RIGHT_SHOULDER]: lm(0.52, 0.58),
    [LM.LEFT_ELBOW]: lm(0.4, 0.65),
    [LM.RIGHT_ELBOW]: lm(0.5, 0.7),
    [LM.LEFT_WRIST]: lm(0.42, 0.82),
    [LM.RIGHT_WRIST]: lm(0.52, 0.84),
    [LM.LEFT_HIP]: lm(0.58, 0.38),
    [LM.RIGHT_HIP]: lm(0.62, 0.4),
    [LM.LEFT_KNEE]: lm(0.7, 0.28),
    [LM.RIGHT_KNEE]: lm(0.74, 0.3),
    [LM.LEFT_ANKLE]: lm(0.78, 0.18),
    [LM.RIGHT_ANKLE]: lm(0.86, 0.22),
    [LM.LEFT_FOOT_INDEX]: lm(0.8, 0.15),
    [LM.RIGHT_FOOT_INDEX]: lm(0.88, 0.19),
  })
}
