/**
 * Two audiences for shape text:
 *  - athlete: tumbling / body-position language for Learn and the shape test
 *  - app: camera, grading contract, SIDE VIEW, thresholds — what scoring needs
 *
 * Shipped strings in shapes.ts stay the source of truth. Ryan can overlay
 * edits in the browser; those live on the gym computer via /api/shape-copy.
 */

import { getShape } from '../config/shapes'
import type { ShapeDef } from '../types'

export type ShapeCopyFields = {
  athlete: string
  app: string
}

const CAMERA_LEAD =
  /^(SIDE(?:\s+OR\s+3\/4)?(?:\s+VIEW)?|FRONT|SIDE\s*\/\s*FRONT|SIDE or 3\/4)[,.]?\s*/i

const CAMERA_SENTENCE =
  /\s*(?:Film|Photograph|Shoot|Stand) from the side[^.]*\.?/gi

const STANDALONE_SENTENCE =
  /\s*Standalone:[^.]*\./gi

const SEQUENCE_CAMERA_SENTENCE =
  /\s*In a sequence,[^.]*camera[^.]*\./gi

const FACE_CAMERA =
  /\s*(?:Do not |Don't )?face(?:ing)? the camera[^.]*\./gi

const WE_GRADE =
  /\s*(?:We (?:need to |still )?see|This is the grading contract)[^.]*\./gi

function tidy(text: string): string {
  return text
    .replace(/\s+/g, ' ')
    .replace(/\s+([.,;:])/g, '$1')
    .replace(/\(\s*\)/g, '')
    .replace(/,\s*,/g, ',')
    .replace(/\.\s*\./g, '.')
    .trim()
}

/** Strip camera / scoring framing so a gymnast reads tumbling, not the computer. */
export function athleteFacingText(text: string): string {
  let out = text.trim()
  out = out.replace(CAMERA_LEAD, '')
  out = out.replace(CAMERA_SENTENCE, ' ')
  out = out.replace(STANDALONE_SENTENCE, ' ')
  out = out.replace(SEQUENCE_CAMERA_SENTENCE, ' ')
  out = out.replace(FACE_CAMERA, ' ')
  out = out.replace(WE_GRADE, ' ')
  out = out.replace(/\bnot face-on[^.]*\./gi, ' ')
  out = out.replace(/\bwe still see it in profile[^.]*\./gi, ' ')
  return tidy(out)
}

function uniqueParagraphs(parts: string[]): string {
  const seen = new Set<string>()
  const out: string[] = []
  for (const raw of parts) {
    const t = athleteFacingText(raw)
    if (!t) continue
    const key = t.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    out.push(t)
  }
  return out.join('\n\n')
}

export function defaultAthleteCopy(shape: ShapeDef): string {
  const tips = (shape.tips ?? []).filter(
    (t) => !/^(film|photograph|shoot|side view|front\.|standalone)/i.test(t.trim()),
  )
  return uniqueParagraphs([shape.description, shape.coachNotes ?? '', ...tips])
}

export function defaultAppNotes(shape: ShapeDef): string {
  const bits: string[] = []
  const view =
    shape.cameraView === 'side'
      ? 'Camera: side or 3/4 — not face-on. Scoring needs the body line.'
      : shape.cameraView === 'front'
        ? 'Camera: front so both arms and legs are visible.'
        : 'Camera: any angle works for this shape.'
  bits.push(view)
  if (shape.bodyPosition) bits.push(shape.bodyPosition.trim())
  if (shape.stanceAware) {
    bits.push(
      'Scoring tries left-leg-forward and right-leg-forward and keeps the better match.',
    )
  }
  bits.push(
    `Category: ${shape.category}. Quality threshold: ${shape.qualityThreshold} (hold / advance).`,
  )
  return bits.filter(Boolean).join('\n\n')
}

export function defaultShapeCopy(shape: ShapeDef): ShapeCopyFields {
  return {
    athlete: defaultAthleteCopy(shape),
    app: defaultAppNotes(shape),
  }
}

export function resolveShapeCopy(
  shape: ShapeDef,
  overlay: ShapeCopyFields | undefined,
): ShapeCopyFields {
  const fallback = defaultShapeCopy(shape)
  return {
    athlete: overlay?.athlete?.trim() || fallback.athlete,
    app: overlay?.app?.trim() || fallback.app,
  }
}

export function copyForShapeId(
  shapeId: string,
  overlays: Record<string, ShapeCopyFields>,
): ShapeCopyFields {
  const shape = getShape(shapeId)
  if (!shape) return { athlete: '', app: '' }
  return resolveShapeCopy(shape, overlays[shapeId])
}
