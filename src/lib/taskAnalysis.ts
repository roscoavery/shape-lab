/**
 * Build a readable post-task analysis from the best score seen on each step.
 */

import { getShape } from '../config/shapes'
import { isLungeArmHold, isShoulderCriterionId, isSoftShoulderShape } from '../lib/scoring'
import type { ScoreResult, TaskRunReport, TaskStepReport } from '../types'

export type LiveStepSample = {
  shapeId: string
  required: boolean
  tries?: number
  holdSeconds: number
  best: ScoreResult | null
  qualityHit: boolean
}

function mountainClimberBackCue(score: number): string {
  return score < 62
    ? 'Keep a long line through the back — this is a lunge, not a mountain-climber C.'
    : ''
}

function weakCues(score: ScoreResult, shapeId: string, limit = 3): string[] {
  return [...score.criteria]
    .filter((c) => {
      if (isShoulderCriterionId(c.id) && isSoftShoulderShape(shapeId)) return false
      if (c.id === 'elbows' && isSoftShoulderShape(shapeId)) return false
      if (isLungeArmHold(shapeId) && c.id === 'back_leg') return false
      if (shapeId === 'passe' && c.id !== 'stance_knee' && c.id !== 'passe_height') return false
      if (c.id === 'straight_back') return c.score < 62
      return c.score < 85 && c.weight >= 10
    })
    .sort((a, b) => a.score - b.score)
    .slice(0, limit)
    .map((c) => {
      if (c.id === 'straight_back') return mountainClimberBackCue(c.score) || c.feedback || c.label
      return c.feedback || c.label
    })
    .filter((t) => t && !t.toLowerCase().startsWith('excellent'))
}

function openShoulderWritten(score: ScoreResult, shapeId: string): string | null {
  if (!isSoftShoulderShape(shapeId)) return null
  const sh = score.criteria.find((c) => isShoulderCriterionId(c.id))
  if (!sh) return null
  if (sh.score >= 85) return `Open shoulders ${sh.score}/100 on the snapshot.`
  return `Open shoulders ${sh.score}/100 on the snapshot — ${sh.feedback || 'arms by ears'}. That is the grade from your 3-second best open; it did not block moving on.`
}

/** Tasks 2 review: lead with the real miss (open shoulders on lunges), not a C-back slogan. */
export function writtenCues(score: ScoreResult, shapeId: string, limit = 3): string[] {
  const cues: string[] = []
  const gradeShoulders =
    isSoftShoulderShape(shapeId) && shapeId !== 'passe' && (shapeId.includes('lunge') || shapeId === 'lever')
  if (gradeShoulders) {
    const sh = score.criteria.find((c) => isShoulderCriterionId(c.id))
    if (sh && sh.score < 85) {
      cues.push(
        `Open shoulders ${sh.score}/100 — ${sh.feedback || 'arms by ears'}.`,
      )
    }
  }

  const rest = [...score.criteria]
    .filter((c) => {
      if (isShoulderCriterionId(c.id)) return false
      if (c.id === 'elbows' && isSoftShoulderShape(shapeId)) return c.score < 70
      if (isLungeArmHold(shapeId) && c.id === 'back_leg') return false
      if (shapeId === 'passe' && c.id !== 'stance_knee' && c.id !== 'passe_height') return false
      if (c.id === 'straight_back') return c.score < 62
      return c.score < 85 && c.weight >= 8
    })
    .sort((a, b) => a.score - b.score)
    .map((c) => {
      if (c.id === 'straight_back') return mountainClimberBackCue(c.score) || c.feedback || c.label
      return c.feedback || c.label
    })
    .filter((t) => t && !t.toLowerCase().startsWith('excellent'))

  for (const line of rest) {
    if (cues.length >= limit) break
    if (!cues.includes(line)) cues.push(line)
  }
  return cues.slice(0, limit)
}

export function notesForStep(sample: LiveStepSample): string {
  const shape = getShape(sample.shapeId)
  const name = shape?.name ?? sample.shapeId
  const best = sample.best
  const tag = sample.required ? '' : ' (practice — does not block moving on)'

  if (!best || best.overall <= 5) {
    return sample.required
      ? `${name}: we did not get a clear camera read. Check the side view and try this shape again.`
      : `${name}${tag}: no clear hit this time. Kick up to the best line you can — ribs in, butt in, ears covered.`
  }

  const cues = weakCues(best, sample.shapeId)
  const score = `${best.overall}/100`
  const shoulders = openShoulderWritten(best, sample.shapeId)
  const extra = shoulders ? ` ${shoulders}` : ''

  if (cues.length === 0 && best.overall >= 85) {
    return `${name}${tag}: ${score}. Legs and line are in.${extra}`
  }
  if (cues.length === 0) {
    return `${name}${tag}: ${score}. ${best.mainCorrection ?? 'Keep working the body position.'}${extra}`
  }
  return `${name}${tag}: ${score}. ${cues.join(' ')}${extra}`
}

export function buildTaskReport(args: {
  id: string
  athleteId: string
  taskId: string
  taskName: string
  samples: LiveStepSample[]
}): TaskRunReport {
  const steps: TaskStepReport[] = args.samples.map((s) => {
    const shape = getShape(s.shapeId)
    return {
      shapeId: s.shapeId,
      shapeName: shape?.name ?? s.shapeId,
      required: s.required,
      tries: s.tries,
      bestOverall: s.best?.overall ?? 0,
      qualityHit: s.qualityHit,
      holdSeconds: s.holdSeconds,
      mainCorrection: s.best?.mainCorrection ?? null,
      criteria: (s.best?.criteria ?? []).map((c) => ({
        id: c.id,
        label: c.label,
        score: c.score,
        feedback: c.feedback,
      })),
      notes: notesForStep(s),
    }
  })

  const required = steps.filter((s) => s.required)
  const practice = steps.filter((s) => !s.required)
  const reqLine =
    required.length > 0
      ? `Required shapes: ${required.map((s) => `${s.shapeName} ${s.bestOverall}`).join(', ')}.`
      : ''
  const hs = practice.find((s) => s.shapeId === 'handstand')
  const hsLine = hs
    ? ` Handstand (not required): best ${hs.bestOverall}/100 over ${hs.tries ?? 0} kick-up ${hs.tries === 1 ? 'try' : 'tries'}.`
    : practice.length
      ? ` Practice shapes: ${practice.map((s) => `${s.shapeName} ${s.bestOverall}`).join(', ')}.`
      : ''

  return {
    id: args.id,
    athleteId: args.athleteId,
    taskId: args.taskId,
    taskName: args.taskName,
    createdAt: new Date().toISOString(),
    steps,
    summary: `${args.taskName}. ${reqLine}${hsLine} Read the notes below — those are the written corrections from this run.`.trim(),
  }
}
