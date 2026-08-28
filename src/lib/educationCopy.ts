/**
 * Derive readable “how to hit this shape” copy from shape criteria + tips.
 * Coaches still edit the source strings in shapes.ts.
 */

import { CURRICULUM_TASKS } from '../config/curriculum'
import { getShape, SHAPES } from '../config/shapes'
import type { CriterionDef, ShapeDef } from '../types'

/**
 * Library names that are the same body position. They share a coach still.
 * Keep both cards; never quiz them against each other.
 */
export const SAME_POSITION_GROUPS: readonly (readonly string[])[] = [
  ['lunge_land', 'lunge_arms_open'],
]

export function samePositionGroup(shapeId: string): string[] {
  const group = SAME_POSITION_GROUPS.find((g) => g.includes(shapeId))
  return group ? [...group] : [shapeId]
}

export function otherSamePositionIds(shapeId: string): string[] {
  return samePositionGroup(shapeId).filter((id) => id !== shapeId)
}

/** Prefer the pathway name when both ids are in the quiz pool. */
export function canonicalSamePositionId(shapeId: string): string {
  return samePositionGroup(shapeId)[0] ?? shapeId
}

export function samePositionDisplayName(shapeId: string): string {
  const group = samePositionGroup(shapeId)
  const names = group.map((id) => getShape(id)?.name ?? id)
  if (names.length < 2) return names[0] ?? shapeId
  return `${names[0]} (also called ${names.slice(1).join(', ')})`
}

/** Visible (non-hidden) criteria coaches/athletes should read. */
export function visibleCriteria(shape: ShapeDef): CriterionDef[] {
  return shape.criteria.filter((c) => !c.id.startsWith('_'))
}

/** Human-friendly target description for a criterion. */
export function formatCriterionTarget(c: CriterionDef): string {
  const unit =
    c.kind === 'point_distance' || c.kind === 'forward_of'
      ? ''
      : c.kind === 'symmetry'
        ? '° difference'
        : '°'

  if (c.targetMin != null && c.targetMax != null) {
    const tol = c.tolerance ? ` (±${c.tolerance}${unit || '°'})` : ''
    if (c.kind === 'point_distance' || c.kind === 'forward_of') {
      return `Aim ${c.targetMin.toFixed(2)}–${c.targetMax.toFixed(2)} (frame units)${c.tolerance ? ` ±${c.tolerance}` : ''}`
    }
    return `Aim ${c.targetMin}–${c.targetMax}${unit}${tol}`
  }

  if (c.target != null) {
    if (c.kind === 'point_distance' || c.kind === 'forward_of') {
      return `Aim near ${c.target}${c.tolerance ? ` (within ${c.tolerance})` : ''}`
    }
    if (c.kind === 'segment_vs_vertical') {
      return `Stay within ~${c.tolerance ?? 0}° of vertical`
    }
    if (c.kind === 'segment_vs_horizontal') {
      return `Stay within ~${c.tolerance ?? 0}° of horizontal`
    }
    if (c.kind === 'symmetry') {
      return `Left/right within ~${c.tolerance ?? 0}°`
    }
    return `Aim ${c.target}${unit}${c.tolerance ? ` (±${c.tolerance}${unit})` : ''}`
  }

  if (c.kind === 'composite_min') {
    return 'Match the stricter of the left/right checks'
  }

  return 'Match the coach standard'
}

/** Strip {delta} placeholders for static education reading. */
function cleanFeedback(text: string | undefined): string | null {
  if (!text) return null
  return text
    .replace(/\s*\{delta\}°?/gi, '')
    .replace(/\s+/g, ' ')
    .replace(/\s+([.,])/g, '$1')
    .trim()
}

/**
 * Coach-friendly cues for hitting a criterion — derived from feedbackLow/High.
 */
export function criterionHowToHit(c: CriterionDef): string[] {
  const cues: string[] = []
  const low = cleanFeedback(c.feedbackLow)
  const high = cleanFeedback(c.feedbackHigh)
  const fallback = cleanFeedback(c.feedback)
  if (low) cues.push(low)
  if (high && high !== low) cues.push(high)
  if (cues.length === 0 && fallback) cues.push(fallback)
  return cues
}

/** Full “how to hit this shape” bullet list for education pages. */
export function howToHitShape(shape: ShapeDef): string[] {
  const fromTips = shape.tips ?? []
  const fromCriteria = visibleCriteria(shape).flatMap((c) => {
    const cues = criterionHowToHit(c)
    if (cues.length === 0) return []
    return cues.map((cue) => `${c.label}: ${cue}`)
  })
  const seen = new Set<string>()
  const out: string[] = []
  if (shape.bodyPosition) out.push(shape.bodyPosition)
  for (const line of [...fromTips, ...fromCriteria]) {
    const key = line.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    out.push(line)
  }
  return out
}

/** Shape ids that appear anywhere in the athlete curriculum pathway. */
export function curriculumShapeIds(): Set<string> {
  const ids = new Set<string>()
  for (const task of CURRICULUM_TASKS) {
    for (const step of task.steps) ids.add(step.shapeId)
  }
  return ids
}

/**
 * Arm-position shapes parked out of Tasks. Still quizzed in Learn.
 * Standing: low V, front middle, open shoulders, T, high V.
 * Lunge: the same five on a landing-lunge stance.
 */
export const ARM_POSITION_SHAPE_IDS: string[] = [
  'arms_low_v_back',
  'arms_front_middle',
  'arms_open_shoulders',
  'arms_t',
  'arms_high_v_chest',
  'lunge_arms_low_v',
  'lunge_arms_front',
  'lunge_arms_open',
  'lunge_arms_t',
  'lunge_arms_high_v',
]

/**
 * Original scoring leftovers that never got a coach still. They stay in
 * shapes.ts for sequences / homework assignment, but they are not empty
 * cards in Learn → Shape library.
 */
const SCAFFOLD_SHAPE_IDS = new Set([
  'lunge',
  'arch',
  'bridge',
  'tucked_handstand',
  'piked_handstand',
  'l_handstand',
])

/**
 * Positions shown in Learn → Shape library: the pathway, homework, and
 * extras Ryan photographed (zombie, pike with zombie arms, candlestick,
 * Superman, Rainbow Bridge, Long Bridge).
 * Arm-position drills live in the Arm positions test, not as a second empty catalog.
 */
export function isLearnLibraryShape(id: string): boolean {
  if (SCAFFOLD_SHAPE_IDS.has(id)) return false
  if (ARM_POSITION_SHAPE_IDS.includes(id)) return false
  return Boolean(getShape(id))
}

export function learnLibraryShapes(): ShapeDef[] {
  return SHAPES.filter((s) => isLearnLibraryShape(s.id))
}

/** Task index (0-based) where a shape first appears in the pathway, or null. */
export function firstPathwayTaskIndex(shapeId: string): number | null {
  const idx = CURRICULUM_TASKS.findIndex((t) =>
    t.steps.some((s) => s.shapeId === shapeId),
  )
  return idx >= 0 ? idx : null
}
