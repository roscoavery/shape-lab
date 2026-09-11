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
let lastVideoTs = 0
let activeModelLabel = 'lite'

const LITE_MODELS = [
  '/models/pose_landmarker_lite.task',
  'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task',
]
const FULL_MODELS = [
  '/models/pose_landmarker_full.task',
  'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_full/float16/1/pose_landmarker_full.task',
]
const POSE_MODELS = [
  ...LITE_MODELS,
  ...FULL_MODELS,
]

export function activePoseModelLabel(): string {
  return activeModelLabel
}

function nextVideoTimestamp(now: number): number {
  if (now <= lastVideoTs) lastVideoTs += 1
  else lastVideoTs = now
  return lastVideoTs
}

async function createLandmarker(
  delegate: 'GPU' | 'CPU',
  numPoses: number,
  modelAssetPath: string,
  opts?: { detect?: number; presence?: number; track?: number },
): Promise<PoseLandmarker> {
  const vision = await FilesetResolver.forVisionTasks(
    'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.0.1/wasm',
  )
  return PoseLandmarker.createFromOptions(vision, {
    baseOptions: {
      modelAssetPath,
      delegate,
    },
    runningMode: 'VIDEO',
    numPoses,
    minPoseDetectionConfidence: opts?.detect ?? 0.45,
    minPosePresenceConfidence: opts?.presence ?? 0.4,
    minTrackingConfidence: opts?.track ?? 0.4,
  })
}

async function createLandmarkerWithFallback(
  delegate: 'GPU' | 'CPU',
  numPoses: number,
  models: string[] = POSE_MODELS,
  opts?: { detect?: number; presence?: number; track?: number },
): Promise<PoseLandmarker> {
  let last: unknown
  for (const path of models) {
    try {
      const lm = await createLandmarker(delegate, numPoses, path, opts)
      activeModelLabel = path.includes('full') ? 'full' : 'lite'
      return lm
    } catch (err) {
      last = err
    }
  }
  throw last instanceof Error ? last : new Error('Pose model failed to load')
}

export async function getPoseLandmarker(quality: 'fast' | 'balanced' | 'accurate' = 'balanced'): Promise<PoseLandmarker> {
  if (!landmarkerPromise) {
    landmarkerPromise = (async () => {
      const preferFull = quality === 'accurate'
      const models = preferFull ? [...FULL_MODELS, ...LITE_MODELS] : [...LITE_MODELS, ...FULL_MODELS]
      const numPoses = quality === 'fast' ? 2 : 3
      const conf =
        quality === 'accurate'
          ? { detect: 0.5, presence: 0.45, track: 0.45 }
          : quality === 'fast'
            ? { detect: 0.4, presence: 0.36, track: 0.36 }
            : { detect: 0.48, presence: 0.42, track: 0.42 }
      try {
        return await createLandmarkerWithFallback('GPU', numPoses, models, conf)
      } catch (err) {
        console.warn('GPU pose landmarker failed, falling back to CPU', err)
        return createLandmarkerWithFallback('CPU', numPoses, models, conf)
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
        return await createLandmarkerWithFallback('GPU', 4, POSE_MODELS, {
          detect: 0.32,
          presence: 0.32,
          track: 0.32,
        })
      } catch (err) {
        console.warn('GPU floor landmarker failed, falling back to CPU', err)
        return createLandmarkerWithFallback('CPU', 4, POSE_MODELS, {
          detect: 0.32,
          presence: 0.32,
          track: 0.32,
        })
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
    .map((pose, poseIdx) => {
      const world = result.worldLandmarks?.[poseIdx]
      return pose.map((lm, i) => ({
        x: lm.x,
        y: lm.y,
        z: world?.[i]?.z ?? lm.z,
        visibility: lm.visibility,
      }))
    })
}

/** VIDEO-mode detect with a monotonic timestamp. Never reuse a stale ts. */
export function detectPosesForVideo(landmarker: PoseLandmarker, video: HTMLVideoElement, now: number) {
  return landmarker.detectForVideo(video, nextVideoTimestamp(now))
}
