/**
 * ============================================================================
 * MediaPipe Pose Landmarker setup (free, runs fully in the browser)
 * ============================================================================
 * Model files are loaded from Google's CDN on first use, then cached by the browser.
 * No paid API keys required.
 */

import {
  FilesetResolver,
  PoseLandmarker,
  type PoseLandmarkerResult,
} from '@mediapipe/tasks-vision'
import type { Landmark } from '../types'

let landmarkerPromise: Promise<PoseLandmarker> | null = null
let floorLandmarkerPromise: Promise<PoseLandmarker> | null = null

async function createLandmarker(
  delegate: 'GPU' | 'CPU',
  numPoses: number,
): Promise<PoseLandmarker> {
  // WASM from jsDelivr; pose model is shipped in /public/models (correct .task bundle)
  const vision = await FilesetResolver.forVisionTasks(
    'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.0.1/wasm',
  )
  return PoseLandmarker.createFromOptions(vision, {
    baseOptions: {
      modelAssetPath: '/models/pose_landmarker_lite.task',
      delegate,
    },
    runningMode: 'VIDEO',
    numPoses,
    minPoseDetectionConfidence: 0.45,
    minPosePresenceConfidence: 0.45,
    minTrackingConfidence: 0.45,
  })
}

export async function getPoseLandmarker(): Promise<PoseLandmarker> {
  if (!landmarkerPromise) {
    landmarkerPromise = (async () => {
      try {
        // Two extra candidates let SubjectLock reject a background ghost
        // without changing the Today floor detector (numPoses: 4).
        return await createLandmarker('GPU', 4)
      } catch (err) {
        console.warn('GPU pose landmarker failed, falling back to CPU', err)
        return createLandmarker('CPU', 4)
      }
    })()
  }
  return landmarkerPromise
}

/** Independent Today floor detector. It never receives Compare's stream. */
export async function getFloorPoseLandmarker(): Promise<PoseLandmarker> {
  if (!floorLandmarkerPromise) {
    floorLandmarkerPromise = (async () => {
      try {
        return await createLandmarker('GPU', 4)
      } catch (err) {
        console.warn('GPU floor landmarker failed, falling back to CPU', err)
        return createLandmarker('CPU', 4)
      }
    })()
  }
  return floorLandmarkerPromise
}

const CORE_LM = [0, 11, 12, 23, 24] // nose, shoulders, hips

/** Reject wallpaper / empty-frame ghosts so Train does not start a hold. */
export function landmarksLookPresent(
  pose: Array<{ x: number; y: number; visibility?: number }>,
): boolean {
  if (!pose || pose.length < 25) return false
  const core = CORE_LM.map((i) => pose[i]).filter(Boolean)
  if (core.length < 5) return false
  const visible = core.filter((p) => (p!.visibility ?? 0) >= 0.52)
  if (visible.length < 4) return false
  const xs = visible.map((p) => p!.x)
  const ys = visible.map((p) => p!.y)
  const w = Math.max(...xs) - Math.min(...xs)
  const h = Math.max(...ys) - Math.min(...ys)
  return w > 0.1 && h > 0.16
}

export function resultToLandmarks(
  result: PoseLandmarkerResult,
): Landmark[] | null {
  const pose = result.landmarks?.[0]
  if (!pose || pose.length < 33) return null
  return pose.map((lm) => ({
    x: lm.x,
    y: lm.y,
    z: lm.z,
    visibility: lm.visibility,
  }))
}

export function resultToMultipleLandmarks(result: PoseLandmarkerResult): Landmark[][] {
  return (result.landmarks ?? [])
    .filter((pose) => pose.length >= 33)
    .slice(0, 4)
    .map((pose) =>
      pose.map((lm) => ({
        x: lm.x,
        y: lm.y,
        z: lm.z,
        visibility: lm.visibility,
      })),
    )
}
