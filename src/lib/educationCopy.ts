/**
 * Derive readable “how to hit this shape” copy from shape criteria + tips.
 * Coaches still edit the source strings in shapes.ts.
 */

import { CURRICULUM_TASKS } from '../config/curriculum'
import type { CriterionDef, ShapeDef } from '../types'

/** Visible (non-hidden) criteria coaches/athletes should read. */
export function visibleCriteria(shape: ShapeDef): CriterionDef[] {
  return shape.criteria.filter((c) => !c.id.startsWith('_'))
}

/** Human-friendly target description for a criterion. */
export function formatCriterionTarget(c: CriterionDef): string {
  const unit =
    c.kind === 'point_distance'
      ? ''
      : c.kind === 'symmetry'
        ? '° difference'
        : '°'

  if (c.targetMin != null && c.targetMax != null) {
    const tol = c.tolerance ? ` (±${c.tolerance}${unit || '°'})` : ''
    if (c.kind === 'point_distance') {
      return `Aim ${c.targetMin.toFixed(2)}–${c.targetMax.toFixed(2)} (frame units)${c.tolerance ? ` ±${c.tolerance}` : ''}`
    }
    return `Aim ${c.targetMin}–${c.targetMax}${unit}${tol}`
  }

  if (c.target != null) {
    if (c.kind === 'point_distance') {
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
  // Prefer tips first, then criterion-derived cues (dedupe exact matches)
  const seen = new Set<string>()
  const out: string[] = []
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

/** Task index (0-based) where a shape first appears in the pathway, or null. */
export function firstPathwayTaskIndex(shapeId: string): number | null {
  const idx = CURRICULUM_TASKS.findIndex((t) =>
    t.steps.some((s) => s.shapeId === shapeId),
  )
  return idx >= 0 ? idx : null
}
