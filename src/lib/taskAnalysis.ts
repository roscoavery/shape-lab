/**
 * Build a readable post-task analysis from the best score seen on each step.
 */

import { getShape } from '../config/shapes'
import type { ScoreResult, TaskRunReport, TaskStepReport } from '../types'

export type LiveStepSample = {
  shapeId: string
  required: boolean
  tries?: number
  holdSeconds: number
  best: ScoreResult | null
  qualityHit: boolean
}

function weakCues(score: ScoreResult, limit = 3): string[] {
  return [...score.criteria]
    .filter((c) => c.score < 75)
    .sort((a, b) => a.score - b.score)
    .slice(0, limit)
    .map((c) => c.feedback || c.label)
    .filter((t) => t && !t.toLowerCase().startsWith('excellent'))
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

  const cues = weakCues(best)
  const score = `${best.overall}/100`

  if (best.overall >= 85) {
    return `${name}${tag}: ${score}. Solid. Keep that line.`
  }
  if (cues.length === 0) {
    return `${name}${tag}: ${score}. ${best.mainCorrection ?? 'Keep working the body position.'}`
  }
  return `${name}${tag}: ${score}. ${cues.join(' ')}`
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
