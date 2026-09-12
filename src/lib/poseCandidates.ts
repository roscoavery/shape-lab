import type { Landmark } from '../types'

/** Latest MediaPipe poses this frame. Hold clock reads every candidate. */
let last: Landmark[][] = []

export function rememberPoseCandidates(poses: Landmark[][]): void {
  last = poses
}

export function getPoseCandidates(): Landmark[][] {
  return last
}
