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
 * - Criteria tagged needsView:'side' or 'front' are skipped (not failed) when
 *   the athlete is filmed from the wrong angle, so a front-on FTOS photo does
 *   not tank a lunge body-line check.
 * - stanceAware shapes score both “left foot forward” and “right foot forward”
 *   and keep the better match.
 */

import { jointAngle, pointDistance, segmentAngleFromHorizontal, segmentAngleFromVertical } from './angles'
import {
  criterionViewOk,
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
  }
}

function scoreOnce(
  landmarks: Landmark[],
  shape: ShapeDef,
  qualityThresholdOverride: number | null | undefined,
  detected: DetectedView,
  stance: 'left' | 'right',
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
  for (const c of shape.criteria) {
    if (c.kind === 'composite_min') continue
    const m = measuredCache[c.id]
    if (m === null || m === undefined) {
      atomicScores[c.id] = 0
    } else {
      atomicScores[c.id] = scoreAgainstTarget(m, c).score
    }
  }

  const results: CriterionScore[] = []
  let weightedSum = 0
  let weightTotal = 0
  const viewWrong = !viewMatches(shape.cameraView, detected)

  for (const c of shape.criteria) {
    if (c.id.startsWith('_')) continue

    const skipForView = !criterionViewOk(c.needsView, detected)

    let score: number
    let measured = measuredCache[c.id] ?? null
    let feedback: string | null = null

    if (skipForView) {
      score = 0
      feedback =
        c.needsView === 'side'
          ? 'Needs a side view — turn so we can see your body line'
          : 'Needs a front view — face the camera'
    } else if (c.kind === 'composite_min' && c.of) {
      const subScores = c.of.map((id) => atomicScores[id] ?? 0)
      score = subScores.length ? Math.min(...subScores) : 0
      let worstId = c.of[0]
      let worstScore = Infinity
      for (const id of c.of) {
        const s = atomicScores[id] ?? 0
        if (s < worstScore) {
          worstScore = s
          worstId = id
        }
      }
      const worstDef = shape.criteria.find((x) => x.id === worstId)
      const worstMeasured = measuredCache[worstId]
      if (worstDef && worstMeasured !== null && worstMeasured !== undefined) {
        const { deltaLow, deltaHigh } = scoreAgainstTarget(worstMeasured, worstDef)
        feedback = feedbackFor(worstDef, worstMeasured, deltaLow, deltaHigh)
      }
    } else if (measured === null) {
      score = 0
      feedback = 'Landmark not visible'
    } else {
      const { score: s, deltaLow, deltaHigh } = scoreAgainstTarget(measured, c)
      score = s
      feedback = feedbackFor(c, measured, deltaLow, deltaHigh)
    }

    results.push({
      id: c.id,
      label: c.label,
      score: Math.round(score),
      measured: measured === null ? null : Math.round(measured * 10) / 10,
      weight: c.weight,
      feedback,
    })

    if (!skipForView) {
      weightedSum += score * c.weight
      weightTotal += c.weight
    }
  }

  const overall = weightTotal > 0 ? Math.round(weightedSum / weightTotal) : 0

  const sorted = [...results]
    .filter((r) => {
      const def = shape.criteria.find((c) => c.id === r.id)
      return criterionViewOk(def?.needsView, detected)
    })
    .sort((a, b) => a.score - b.score)

  const threshold = qualityThresholdOverride ?? shape.qualityThreshold
  let mainCorrection: string | null = null
  let viewWarning: string | null = null

  if (viewWrong && shape.cameraView === 'side') {
    viewWarning =
      'Side view needed — stand in profile (not face-on or back-on) so we can grade the body line.'
    mainCorrection = viewWarning
  } else if (viewWrong && shape.cameraView === 'front') {
    viewWarning =
      'Face the camera — both arms and legs need to be visible for this shape.'
    mainCorrection = viewWarning
  }

  if (!mainCorrection) {
    for (const r of sorted) {
      if (r.feedback && r.score < 95) {
        mainCorrection = r.feedback
        break
      }
    }
  }
  if (!mainCorrection && overall < threshold) {
    mainCorrection = shape.bodyPosition
      ? 'Match the body-position description'
      : 'Adjust body line to raise score'
  }
  if (overall >= 95 && !viewWrong) {
    mainCorrection = 'Excellent shape — hold it!'
  }

  return {
    overall,
    criteria: results,
    mainCorrection,
    detectedStance: stance,
    cameraViewDetected: detected,
    viewWarning,
  }
}

export type ScoreOptions = {
  /**
   * left = grade as left-foot-forward (shape defs use left = front).
   * right = grade as right-foot-forward.
   * auto (default) = try both on stanceAware shapes and keep the better score.
   */
  stance?: 'left' | 'right' | 'auto'
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

  if (want === 'right') {
    return scoreOnce(swapLeftRight(landmarks), shape, qualityThresholdOverride, detected, 'right')
  }
  if (want === 'left' || !shape.stanceAware) {
    return scoreOnce(landmarks, shape, qualityThresholdOverride, detected, want === 'left' ? 'left' : 'left')
  }

  const left = scoreOnce(landmarks, shape, qualityThresholdOverride, detected, 'left')
  const right = scoreOnce(
    swapLeftRight(landmarks),
    shape,
    qualityThresholdOverride,
    detected,
    'right',
  )
  return left.overall >= right.overall ? left : right
}
