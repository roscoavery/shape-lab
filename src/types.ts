/**
 * ============================================================================
 * Shape Lab — shared TypeScript types
 * ============================================================================
 * Coaches: you usually edit shapes.ts / sequences.ts, not this file.
 * These types describe how shapes, criteria, athletes, and attempts are stored.
 */

/** MediaPipe Pose landmark (normalized 0–1 coordinates). */
export type Landmark = {
  x: number
  y: number
  z: number
  visibility?: number
}

/** How a single scoring rule measures the body. */
export type CriterionKind =
  | 'joint_angle' // Angle at one joint (e.g. elbow)
  | 'segment_vs_vertical' // Line between two points vs true vertical
  | 'segment_vs_horizontal' // Line between two points vs true horizontal
  | 'point_distance' // Distance between two landmarks (normalized)
  | 'symmetry' // Absolute difference between two joint angles
  | 'composite_min' // Takes the worse (min) of several sub-measurements

/**
 * One reusable scoring criterion.
 *
 * COACH EDIT TIPS:
 * - target: ideal value (degrees for angles, 0–1 for distances)
 * - tolerance: how far from target still scores 100
 * - weight: relative importance (all weights are normalized to sum to 100%)
 * - Outside tolerance, score falls off toward 0 using falloffDegrees / falloffUnits
 */
export type CriterionDef = {
  /** Stable id used in UI and history, e.g. "elbows" */
  id: string
  /** Short label shown in the score panel */
  label: string
  kind: CriterionKind

  /**
   * For joint_angle: [proximal, joint, distal] landmark indices
   * Example elbows: [shoulder, elbow, wrist]
   */
  points?: [number, number, number]

  /**
   * For segment_vs_*: [pointA, pointB] landmark indices
   * Angle is measured of the segment A→B relative to vertical or horizontal.
   */
  segment?: [number, number]

  /**
   * For point_distance: [pointA, pointB]
   * Distance is in normalized image units (roughly 0–1 of frame width).
   */
  pair?: [number, number]

  /**
   * For symmetry: two joint triplets; score is based on |angle1 - angle2|
   * Ideal difference is usually 0.
   */
  leftPoints?: [number, number, number]
  rightPoints?: [number, number, number]

  /**
   * For composite_min: list of criterion ids defined on the same shape.
   * Useful for "elbows" = min(leftElbow, rightElbow).
   */
  of?: string[]

  /** Ideal value (degrees or distance units). Use targetMin/targetMax for a range. */
  target?: number
  /** Inclusive ideal range. Prefer this over target when a band is OK. */
  targetMin?: number
  targetMax?: number

  /**
   * Within this many units of the target/range, score = 100.
   * Degrees for angles; normalized units for distances.
   */
  tolerance: number

  /**
   * Beyond tolerance, score drops from 100 → 0 across this many extra units.
   * Larger = more forgiving. Default 40 for angles.
   */
  falloff?: number

  /** Relative weight in the overall score (any positive number). */
  weight: number

  /**
   * Feedback when the measured value is BELOW the target/range
   * (after subtracting tolerance). Use {delta} for how many degrees/units short.
   */
  feedbackLow?: string

  /**
   * Feedback when the measured value is ABOVE the target/range.
   * Use {delta} for how many degrees/units over.
   */
  feedbackHigh?: string

  /** Fallback feedback if side-specific messages are omitted. */
  feedback?: string
}

export type ShapeCategory = 'static' | 'hold' | 'transition'

/**
 * One gymnastics shape definition.
 * Add new shapes by copying an existing block in shapes.ts.
 */
export type ShapeDef = {
  id: string
  name: string
  description: string
  category: ShapeCategory
  /** Minimum overall score (0–100) to count quality hold time / advance sequences */
  qualityThreshold: number
  /** Optional coaching tips shown in the UI */
  tips?: string[]
  criteria: CriterionDef[]
}

export type SequenceStep = {
  shapeId: string
  /** Seconds the athlete must stay above qualityThreshold to advance */
  holdSeconds: number
}

export type SequenceDef = {
  id: string
  name: string
  description: string
  steps: SequenceStep[]
}

export type Athlete = {
  id: string
  name: string
  notes?: string
  createdAt: string
}

export type CriterionScore = {
  id: string
  label: string
  score: number
  measured: number | null
  weight: number
  feedback: string | null
}

export type ScoreResult = {
  overall: number
  criteria: CriterionScore[]
  mainCorrection: string | null
}

export type AttemptRecord = {
  id: string
  athleteId: string
  shapeId: string
  shapeName: string
  overall: number
  criteria: { id: string; label: string; score: number }[]
  totalHoldSeconds: number
  qualityHoldSeconds: number
  mainCorrection: string | null
  savedAt: string
}

export type AppSettings = {
  qualityThresholdOverride: number | null
  mirrorVideo: boolean
  showAngles: boolean
}
