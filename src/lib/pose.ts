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

async function createLandmarker(delegate: 'GPU' | 'CPU'): Promise<PoseLandmarker> {
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
    numPoses: 1,
    minPoseDetectionConfidence: 0.5,
    minPosePresenceConfidence: 0.5,
    minTrackingConfidence: 0.5,
  })
}

export async function getPoseLandmarker(): Promise<PoseLandmarker> {
  if (!landmarkerPromise) {
    landmarkerPromise = (async () => {
      try {
        return await createLandmarker('GPU')
      } catch (err) {
        console.warn('GPU pose landmarker failed, falling back to CPU', err)
        return createLandmarker('CPU')
      }
    })()
  }
  return landmarkerPromise
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
