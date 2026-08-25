/**
 * ============================================================================
 * Scoring engine
 * ============================================================================
 * Turns raw landmarks + a ShapeDef into:
 *   - overall score 0–100
 *   - per-criterion scores
 *   - main correction message
 *
 * Coaches: change targets/tolerances/weights in config/shapes.ts — not here.
 */

import { jointAngle, pointDistance, segmentAngleFromHorizontal, segmentAngleFromVertical } from './angles'
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

/**
 * Map a measured value onto 0–100 using target (or range) + tolerance + falloff.
 *
 * Score is 100 inside [target±tolerance] or [targetMin−tolerance, targetMax+tolerance].
 * Then linear drop to 0 across `falloff` additional units.
 */
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
      // For composites that wrap angle criteria scored individually elsewhere,
      // we store the *worst sub-score* later. Here measured = average of subs
      // for display; actual score uses min of sub-scores in scoreShape.
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

/**
 * Score a full shape against the current pose landmarks.
 */
export function scoreShape(
  landmarks: Landmark[] | null,
  shape: ShapeDef,
  qualityThresholdOverride?: number | null,
): ScoreResult {
  if (!landmarks || landmarks.length < 33) {
    return {
      overall: 0,
      criteria: shape.criteria.map((c) => ({
        id: c.id,
        label: c.label,
        score: 0,
        measured: null,
        weight: c.weight,
        feedback: 'No pose detected',
      })),
      mainCorrection: 'Step into the camera frame',
    }
  }

  // First pass: measure non-composite criteria
  const measuredCache: Record<string, number | null> = {}
  for (const c of shape.criteria) {
    if (c.kind === 'composite_min') continue
    measuredCache[c.id] = measureCriterion(landmarks, c, measuredCache)
  }
  // Second pass: composites (need cache filled)
  for (const c of shape.criteria) {
    if (c.kind !== 'composite_min') continue
    measuredCache[c.id] = measureCriterion(landmarks, c, measuredCache)
  }

  // Pre-score atomic criteria so composites can take min of their scores
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

  for (const c of shape.criteria) {
    // Skip hidden atomic criteria that only exist to feed a composite
    // Convention: id starting with "_" are internal helpers
    if (c.id.startsWith('_')) continue

    let score: number
    let measured = measuredCache[c.id] ?? null
    let feedback: string | null = null

    if (c.kind === 'composite_min' && c.of) {
      const subScores = c.of.map((id) => atomicScores[id] ?? 0)
      score = subScores.length ? Math.min(...subScores) : 0
      // Pick feedback from the worst sub-criterion
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

    weightedSum += score * c.weight
    weightTotal += c.weight
  }

  const overall = weightTotal > 0 ? Math.round(weightedSum / weightTotal) : 0

  // Main correction = lowest-scoring criterion that has feedback
  const sorted = [...results].sort((a, b) => a.score - b.score)
  const threshold = qualityThresholdOverride ?? shape.qualityThreshold
  let mainCorrection: string | null = null
  for (const r of sorted) {
    if (r.feedback && r.score < 95) {
      mainCorrection = r.feedback
      break
    }
  }
  if (!mainCorrection && overall < threshold) {
    mainCorrection = 'Adjust body line to raise score'
  }
  if (overall >= 95) {
    mainCorrection = 'Excellent shape — hold it!'
  }

  return { overall, criteria: results, mainCorrection }
}
