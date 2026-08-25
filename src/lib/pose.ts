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

export async function getPoseLandmarker(): Promise<PoseLandmarker> {
  if (!landmarkerPromise) {
    landmarkerPromise = (async () => {
      const vision = await FilesetResolver.forVisionTasks(
        'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.0.1/wasm',
      )
      return PoseLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath:
            'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.tflite',
          delegate: 'GPU',
        },
        runningMode: 'VIDEO',
        numPoses: 1,
        minPoseDetectionConfidence: 0.5,
        minPosePresenceConfidence: 0.5,
        minTrackingConfidence: 0.5,
      })
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
