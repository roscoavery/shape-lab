/**
 * ============================================================================
 * Scoring engine
 * ============================================================================
 * Turns raw landmarks + a ShapeDef into:
 *   - overall score 0–100  (driven by the written body-position standard)
 *   - per-criterion scores
 *   - main correction message
 *   - camera-view warning when a side/front view is required
 *
 * Coaches: change targets/tolerances/weights in config/shapes.ts — not here.
 *
 * View independence:
 * - Joint angles grade from any facing.
 * - Missing landmarks score 0 (they do not get dropped). A person standing
 *   beside the camera cannot pass by skipping arms/legs that are out of frame.
 * - Side / sequence-profile shapes: if left and right disagree a lot, trust
 *   the better side (the far side is noisy). Do not invent a pass.
 * - A quality hold also needs a full body in frame, not a cropped snapshot.
 * - stanceAware shapes score both “left foot forward” and “right foot forward”
 *   and keep the better match.
 */

import {
  forwardOffset,
  jointAngle,
  pointDistance,
  segmentAngleFromHorizontal,
  segmentAngleFromVertical,
  VISIBILITY_MIN,
} from './angles'
import { LM } from './landmarks'
import {
  detectCameraView,
  swapLeftRight,
  viewMatches,
  type DetectedView,
} from './view'
import type {
  CriterionDef,
  CriterionScore,
  Landmark,
  ScoreResult,
  ShapeDef,
} from '../types'

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n))
}

export function scoreAgainstTarget(
  measured: number,
  criterion: CriterionDef,
): { score: number; deltaLow: number; deltaHigh: number } {
  const tol = criterion.tolerance
  const falloff = criterion.falloff ?? 40

  let low: number
  let high: number

  if (criterion.targetMin !== undefined && criterion.targetMax !== undefined) {
    low = criterion.targetMin - tol
    high = criterion.targetMax + tol
  } else {
    const t = criterion.target ?? 0
    low = t - tol
    high = t + tol
  }

  let score: number
  let deltaLow = 0
  let deltaHigh = 0

  if (measured >= low && measured <= high) {
    score = 100
  } else if (measured < low) {
    deltaLow = low - measured
    score = 100 * (1 - deltaLow / falloff)
  } else {
    deltaHigh = measured - high
    score = 100 * (1 - deltaHigh / falloff)
  }

  return { score: clamp(score, 0, 100), deltaLow, deltaHigh }
}

function measureCriterion(
  landmarks: Landmark[],
  c: CriterionDef,
  measuredCache: Record<string, number | null>,
): number | null {
  switch (c.kind) {
    case 'joint_angle': {
      if (!c.points) return null
      return jointAngle(landmarks, c.points[0], c.points[1], c.points[2])
    }
    case 'segment_vs_vertical': {
      if (!c.segment) return null
      return segmentAngleFromVertical(landmarks, c.segment[0], c.segment[1])
    }
    case 'segment_vs_horizontal': {
      if (!c.segment) return null
      return segmentAngleFromHorizontal(landmarks, c.segment[0], c.segment[1])
    }
    case 'point_distance': {
      if (!c.pair) return null
      return pointDistance(landmarks, c.pair[0], c.pair[1])
    }
    case 'forward_of': {
      if (!c.pair) return null
      return forwardOffset(
        landmarks,
        c.pair[0],
        c.pair[1],
        LM.LEFT_HEEL,
        LM.LEFT_FOOT_INDEX,
      )
    }
    case 'symmetry': {
      if (!c.leftPoints || !c.rightPoints) return null
      const L = jointAngle(
        landmarks,
        c.leftPoints[0],
        c.leftPoints[1],
        c.leftPoints[2],
      )
      const R = jointAngle(
        landmarks,
        c.rightPoints[0],
        c.rightPoints[1],
        c.rightPoints[2],
      )
      if (L === null || R === null) return null
      return Math.abs(L - R)
    }
    case 'composite_min': {
      if (!c.of?.length) return null
      const vals = c.of
        .map((id) => measuredCache[id])
        .filter((v): v is number => v !== null && v !== undefined)
      if (!vals.length) return null
      return vals.reduce((a, b) => a + b, 0) / vals.length
    }
    default:
      return null
  }
}

function feedbackFor(
  c: CriterionDef,
  _measured: number,
  deltaLow: number,
  deltaHigh: number,
): string | null {
  const fmt = (template: string, delta: number) =>
    template.replace(/\{delta\}/g, String(Math.round(delta)))

  if (deltaLow > 0.5) {
    const t = c.feedbackLow ?? c.feedback
    return t ? fmt(t, deltaLow) : null
  }
  if (deltaHigh > 0.5) {
    const t = c.feedbackHigh ?? c.feedback
    return t ? fmt(t, deltaHigh) : null
  }
  return null
}

function emptyResult(shape: ShapeDef, message: string): ScoreResult {
  return {
    overall: 0,
    criteria: shape.criteria
      .filter((c) => !c.id.startsWith('_'))
      .map((c) => ({
        id: c.id,
        label: c.label,
        score: 0,
        measured: null,
        weight: c.weight,
        feedback: message,
      })),
    mainCorrection: message,
    viewWarning: null,
    holdReady: false,
  }
}

const COVERAGE_POINTS = [
  LM.NOSE,
  LM.LEFT_SHOULDER,
  LM.RIGHT_SHOULDER,
  LM.LEFT_HIP,
  LM.RIGHT_HIP,
  LM.LEFT_ANKLE,
  LM.RIGHT_ANKLE,
  LM.LEFT_WRIST,
  LM.RIGHT_WRIST,
] as const

function isUprightShape(shape: ShapeDef): boolean {
  const id = shape.id
  return (
    !id.includes('hollow') &&
    !id.includes('candle') &&
    !id.includes('superman') &&
    !id.includes('plank')
  )
}

function poseCoverage(landmarks: Landmark[]): { visible: number; height: number } {
  let visible = 0
  let minY = 1
  let maxY = 0
  let nY = 0
  for (const i of COVERAGE_POINTS) {
    const p = landmarks[i]
    if (!p || (p.visibility ?? 1) < VISIBILITY_MIN) continue
    visible += 1
    minY = Math.min(minY, p.y)
    maxY = Math.max(maxY, p.y)
    nY += 1
  }
  return { visible, height: nY >= 4 ? maxY - minY : 0 }
}

function scoreOnce(
  landmarks: Landmark[],
  shape: ShapeDef,
  qualityThresholdOverride: number | null | undefined,
  detected: DetectedView,
  stance: 'left' | 'right',
  allowOccludedSide: boolean,
): ScoreResult {
  const measuredCache: Record<string, number | null> = {}
  for (const c of shape.criteria) {
    if (c.kind === 'composite_min') continue
    measuredCache[c.id] = measureCriterion(landmarks, c, measuredCache)
  }
  for (const c of shape.criteria) {
    if (c.kind !== 'composite_min') continue
    measuredCache[c.id] = measureCriterion(landmarks, c, measuredCache)
  }

  const atomicScores: Record<string, number> = {}
  const atomicPresent: Record<string, boolean> = {}
  for (const c of shape.criteria) {
    if (c.kind === 'composite_min') continue
    const m = measuredCache[c.id]
    if (m === null || m === undefined) {
      atomicScores[c.id] = 0
      atomicPresent[c.id] = false
    } else {
      atomicScores[c.id] = scoreAgainstTarget(m, c).score
      atomicPresent[c.id] = true
    }
  }

  const results: CriterionScore[] = []
  let weightedSum = 0
  let weightTotal = 0
  const viewWrong = !viewMatches(shape.cameraView, detected)

  for (const c of shape.criteria) {
    if (c.id.startsWith('_')) continue

    let score: number
    let measured = measuredCache[c.id] ?? null
    let feedback: string | null = null

    if (c.kind === 'composite_min' && c.of) {
      const presentIds = c.of.filter((id) => atomicPresent[id])
      const ids = presentIds.length > 0 ? presentIds : c.of
      const subScores = ids.map((id) => atomicScores[id] ?? 0)
      if (presentIds.length === 0) {
        score = 0
        feedback = 'Need the full body in the frame'
      } else if (presentIds.length === 1 && allowOccludedSide) {
        score = subScores[0] ?? 0
      } else if (allowOccludedSide && subScores.length >= 2) {
        const hi = Math.max(...subScores)
        const lo = Math.min(...subScores)
        // Far-side MediaPipe angles are often junk. Trust the better side
        // only when they wildly disagree — never when both are mediocre.
        score = hi - lo >= 35 ? hi : lo
      } else {
        score = Math.min(...subScores)
      }
      let worstId = ids[0]
      let worstScore = Infinity
      for (const id of ids) {
        const s = atomicScores[id] ?? 0
        if (s < worstScore) {
          worstScore = s
          worstId = id
        }
      }
      const worstDef = shape.criteria.find((x) => x.id === worstId)
      const worstMeasured = worstId ? measuredCache[worstId] : null
      if (worstDef && worstMeasured !== null && worstMeasured !== undefined) {
        const { deltaLow, deltaHigh } = scoreAgainstTarget(worstMeasured, worstDef)
        feedback = feedbackFor(worstDef, worstMeasured, deltaLow, deltaHigh) ?? feedback
      }
    } else if (measured === null) {
      score = 0
      feedback = 'Need the full body in the frame'
    } else {
      const { score: s, deltaLow, deltaHigh } = scoreAgainstTarget(measured, c)
      score = s
      feedback = feedbackFor(c, measured, deltaLow, deltaHigh)
    }

    const skipFromOverall = allowOccludedSide && c.kind === 'symmetry'

    results.push({
      id: c.id,
      label: c.label,
      score: Math.round(score),
      measured: measured === null ? null : Math.round(measured * 10) / 10,
      weight: c.weight,
      feedback: skipFromOverall ? null : feedback,
    })

    if (!skipFromOverall) {
      weightedSum += score * c.weight
      weightTotal += c.weight
    }
  }

  const overall = weightTotal > 0 ? Math.round(weightedSum / weightTotal) : 0

  const sorted = [...results].sort((a, b) => a.score - b.score)

  const threshold = qualityThresholdOverride ?? shape.qualityThreshold
  let mainCorrection: string | null = null
  let viewWarning: string | null = null

  if (viewWrong && shape.cameraView === 'front' && detected === 'side') {
    viewWarning =
      'Face the camera — both arms and legs need to be visible for this shape.'
  }

  for (const r of sorted) {
    if (r.feedback && r.score < 90) {
      mainCorrection = r.feedback
      break
    }
  }
  if (!mainCorrection && viewWarning) {
    mainCorrection = viewWarning
  }
  if (!mainCorrection && overall < threshold) {
    mainCorrection = shape.bodyPosition
      ? 'Match the body-position description'
      : 'Adjust body line to raise score'
  }

  const coverage = poseCoverage(landmarks)
  const upright = isUprightShape(shape)
  const inFrame =
    coverage.visible >= (upright ? 6 : 4) && (!upright || coverage.height >= 0.4)

  const important = results.filter((r) => r.weight >= 10)
  const worstImportant =
    important.length > 0 ? Math.min(...important.map((r) => r.score)) : overall

  const holdReady =
    inFrame &&
    overall >= threshold &&
    worstImportant >= 62 &&
    !(shape.cameraView === 'front' && detected === 'side')

  if (holdReady) {
    mainCorrection = 'Excellent shape — hold it!'
  } else if (!inFrame) {
    mainCorrection = 'Step fully into the frame — head to feet, not beside the screen.'
  }

  return {
    overall,
    criteria: results,
    mainCorrection,
    detectedStance: stance,
    cameraViewDetected: detected,
    viewWarning,
    holdReady,
  }
}

export type ScoreOptions = {
  /**
   * left = grade as left-foot-forward (shape defs use left = front).
   * right = grade as right-foot-forward.
   * auto (default) = try both on stanceAware shapes and keep the better score.
   */
  stance?: 'left' | 'right' | 'auto'
  /**
   * Sequence FTOS (and similar): grade the camera-side of the body so the
   * athlete can stay in profile. Side-view shapes always get this treatment.
   */
  profileOk?: boolean
}

/**
 * Score a full shape against the current pose landmarks.
 */
export function scoreShape(
  landmarks: Landmark[] | null,
  shape: ShapeDef,
  qualityThresholdOverride?: number | null,
  options?: ScoreOptions,
): ScoreResult {
  if (!landmarks || landmarks.length < 33) {
    return emptyResult(shape, 'Step into the camera frame')
  }

  const detected = detectCameraView(landmarks)
  const want = options?.stance ?? 'auto'
  const allowOccludedSide = Boolean(options?.profileOk) || shape.cameraView === 'side'

  if (want === 'right') {
    return scoreOnce(
      swapLeftRight(landmarks),
      shape,
      qualityThresholdOverride,
      detected,
      'right',
      allowOccludedSide,
    )
  }
  if (want === 'left') {
    return scoreOnce(landmarks, shape, qualityThresholdOverride, detected, 'left', allowOccludedSide)
  }
  if (shape.stanceAware || options?.profileOk) {
    const left = scoreOnce(
      landmarks,
      shape,
      qualityThresholdOverride,
      detected,
      'left',
      allowOccludedSide,
    )
    const right = scoreOnce(
      swapLeftRight(landmarks),
      shape,
      qualityThresholdOverride,
      detected,
      'right',
      allowOccludedSide,
    )
    return left.overall >= right.overall ? left : right
  }

  return scoreOnce(landmarks, shape, qualityThresholdOverride, detected, 'left', allowOccludedSide)
}
