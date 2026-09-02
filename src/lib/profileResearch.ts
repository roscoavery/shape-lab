/**
 * Push My Profile / class-station answers into research so laterality
 * and shape-feel correlations stay current.
 */

import { studyById } from '../config/researchStudies'
import type { Athlete } from '../types'
import {
  loadResearch,
  observationFor,
  saveResearch,
  upsertObservation,
  type ResearchAnswer,
} from './research'

export async function syncAthleteProfileToResearch(
  athlete: Athlete,
  recorderId?: string,
): Promise<void> {
  const who = recorderId || athlete.id
  const file = await loadResearch()
  let next = file

  const laterality = studyById('laterality')
  if (laterality) {
    const existing = observationFor(next, laterality.id, athlete.id)
    const answers: Record<string, ResearchAnswer> = { ...(existing?.answers ?? {}) }
    if (athlete.dominantHand) {
      answers.dominantHand =
        athlete.dominantHand === 'ambidextrous' ? 'both' : athlete.dominantHand
    }
    if (athlete.twistDirection === 'both') {
      answers.twistBothWays = 'yes'
      if (athlete.twistBetterSide) {
        answers.twistDirection = athlete.twistBetterSide
        answers.twistBetterSide = athlete.twistBetterSide
      }
    } else if (athlete.twistDirection === 'not_yet') {
      answers.twistDirection = 'not_yet'
      answers.twistBothWays = 'no'
      delete answers.twistBetterSide
    } else if (athlete.twistDirection) {
      answers.twistDirection = athlete.twistDirection
      answers.twistBothWays = 'no'
      delete answers.twistBetterSide
    }
    if (athlete.skateStance) {
      answers.skateboards = 'yes'
      answers.skateStance = athlete.skateStance
      answers.skateFrontFoot = athlete.skateStance === 'regular' ? 'left' : 'right'
    }
    if (athlete.cartwheelLeg && !answers.tumbleFrontFoot) {
      answers.tumbleFrontFoot = athlete.cartwheelLeg
    }
    if (Object.keys(answers).length > 0) {
      next = upsertObservation(next, {
        study: laterality,
        subjectId: athlete.id,
        recorderId: who,
        answers,
        existing,
      })
    }
  }

  const feel = studyById('shape-feel')
  if (feel) {
    const existing = observationFor(next, feel.id, athlete.id)
    const answers: Record<string, ResearchAnswer> = { ...(existing?.answers ?? {}) }
    if (athlete.cartwheelLeg) answers.cartwheelLeg = athlete.cartwheelLeg
    if (athlete.harderShape) answers.harderShape = athlete.harderShape
    if (athlete.openShoulderHardness) {
      answers.openShoulderHardness = String(athlete.openShoulderHardness)
    }
    if (Object.keys(answers).length > 0) {
      next = upsertObservation(next, {
        study: feel,
        subjectId: athlete.id,
        recorderId: who,
        answers,
        existing,
      })
    }
  }

  if (next !== file) await saveResearch(next)
}
