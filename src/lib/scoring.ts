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
 * - Missing landmarks score 0 (they do not get dropped), so a cropped body
 *   cannot pass by skipping arms and legs.
 * - Side / sequence-profile: if left and right disagree a lot, trust the
 *   clearer side. Do not invent a pass.
 * - Quality hold is the written body-position standard vs the shape
 *   threshold — not a pixel match to the coach still.
 * - Cues come from the written criterion, never a coverage slogan.
 * - stanceAware shapes score both “left foot forward” and “right foot forward”
 *   and keep the better match.
 * - Starting lunge, landing lunge, and lever: open shoulders pass at 75%.
 *   Legs and the back-foot → shoulders line must be 85%+ to move on.
 *   Shoulder notes go in the written analysis — they are not a voice loop.
 */

import {
  forwardOffset,
  jointAngle,
  pointDistance,
  segmentAngleFromHorizontal,
  segmentAngleFromVertical,
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

/** Shoulder / elbow vertices — the only joints we L/R-fallback on in profile. */
const ARM_VERTICES = new Set<number>([
  LM.LEFT_SHOULDER,
  LM.RIGHT_SHOULDER,
  LM.LEFT_ELBOW,
  LM.RIGHT_ELBOW,
])

function isArmJointAngle(c: CriterionDef): boolean {
  const vertex = c.points?.[1]
  return c.kind === 'joint_angle' && vertex !== undefined && ARM_VERTICES.has(vertex)
}

/** 75% open-shoulder pass — starting lunge, landing lunge, lever only. */
const SOFT_SHOULDER_SHAPES = new Set(['lunge_start', 'lunge_land', 'lever'])

/** Legs + back-foot → shoulders line: 85% required to move on. */
const LEG_LINE_IDS = new Set([
  'front_knee',
  'back_leg',
  'heel_up',
  'heel_flat',
  'longer_step',
  'closer_step',
  'line_foot_hands',
  'line_foot_shoulders',
  'straight_back',
  'chest_parallel',
])

export function isSoftShoulderShape(shapeId: string): boolean {
  return SOFT_SHOULDER_SHAPES.has(shapeId)
}

export function isShoulderCriterionId(id: string): boolean {
  return id === 'shoulders' || id === 'shoulders_open'
}

/** Voice must not loop these — they belong in the written analysis. */
export function isOpenShoulderCue(text: string | null | undefined): boolean {
  if (!text) return false
  const t = text.toLowerCase()
  return t.includes('open shoulder') || t.includes('arms by ears')
}

function isKeyMiss(shape: ShapeDef, r: { id: string; score: number; weight: number }): boolean {
  if (isShoulderCriterionId(r.id) && isSoftShoulderShape(shape.id)) {
    return r.score < 75
  }
  if (LEG_LINE_IDS.has(r.id) && isSoftShoulderShape(shape.id)) {
    return r.score < 85
  }
  if (r.weight < 10) return false
  return r.score < 65
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

function coachCue(text: string): string {
  let s = text.replace(/\{delta\}/gi, '')
  s = s.replace(/\(\s*[-+]?\d+(?:\.\d+)?\s*°?\s*\)/g, '')
  s = s.replace(/[-+]?\d+(?:\.\d+)?\s*°/g, '')
  s = s.replace(/\s*°/g, '')
  s = s.replace(/\s+off vertical/gi, '')
  s = s.replace(/\s{2,}/g, ' ')
  s = s.replace(/\s+([.,!?;:])/g, '$1')
  s = s.replace(/[—–-]\s*$/g, '')
  s = s.replace(/\s+\./g, '.')
  return s.replace(/\s+/g, ' ').trim()
}

function feedbackFor(
  c: CriterionDef,
  _measured: number,
  deltaLow: number,
  deltaHigh: number,
): string | null {
  let template: string | undefined
  if (deltaLow > 0.5) template = c.feedbackLow ?? c.feedback
  else if (deltaHigh > 0.5) template = c.feedbackHigh ?? c.feedback
  if (!template) return null
  return coachCue(template) || null
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
    nearHit: false,
  }
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
        feedback = coachCue(c.feedbackLow ?? c.feedback ?? '') || null
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
      const raw = c.feedbackLow ?? c.feedbackHigh ?? c.feedback
      feedback = raw ? coachCue(raw) : null
    } else {
      let { score: s, deltaLow, deltaHigh } = scoreAgainstTarget(measured, c)
      // Side-on: far-arm angles are junk. Take the better *arm* only —
      // never the better knee/hip, or a bent back leg hides behind the front.
      if (allowOccludedSide && isArmJointAngle(c)) {
        const other = measureCriterion(swapLeftRight(landmarks), c, {})
        if (other !== null) {
          const alt = scoreAgainstTarget(other, c)
          if (alt.score > s) {
            s = alt.score
            measured = other
            deltaLow = alt.deltaLow
            deltaHigh = alt.deltaHigh
          }
        }
      }
      score = s
      feedback = feedbackFor(c, measured, deltaLow, deltaHigh)
      // Keep the real shoulder grade for the snapshot / written analysis.
      // 75% is enough to *pass* on starting/landing lunge and lever — do not
      // rewrite it to 100.
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
    if (!r.feedback) continue
    // Open shoulders on these shapes are written, not spoken — skip them
    // once they are at the 75% pass, and always skip them as the live nag
    // when legs/line are already in.
    if (isShoulderCriterionId(r.id) && isSoftShoulderShape(shape.id)) continue
    if (r.score < 85) {
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
  if (overall >= 95) {
    mainCorrection = 'Excellent shape — hold it!'
  }

  const important = results.filter((r) => r.weight >= 10)
  const keyMisses = results.filter((r) => isKeyMiss(shape, r))
  const blockingMisses = keyMisses.filter((r) => !isShoulderCriterionId(r.id))
  const linePieces = important.filter((r) => !isShoulderCriterionId(r.id))
  const strongLine = linePieces.filter((r) => r.score >= 85)
  const holdReady =
    overall >= threshold &&
    keyMisses.length === 0 &&
    !(shape.cameraView === 'front' && detected === 'side')
  // “Close” is for a leftover leg/line piece, never for open shoulders.
  const nearHit =
    !holdReady &&
    blockingMisses.length === 1 &&
    linePieces.length >= 2 &&
    strongLine.length >= linePieces.length - 1 &&
    overall >= Math.max(52, threshold - 16)

  return {
    overall,
    criteria: results,
    mainCorrection,
    detectedStance: stance,
    cameraViewDetected: detected,
    viewWarning,
    holdReady,
    nearHit,
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
