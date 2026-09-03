/**
 * Push My Profile / class-station answers into research so laterality
 * and shape-feel correlations stay current.
 */

import { studyById } from '../config/researchStudies'
import type { Athlete } from '../types'
import { asMinuteHold } from './intakeQuestions'
import { isAthleteProfile } from './profileRole'
import {
  loadResearch,
  observationFor,
  saveResearch,
  upsertObservation,
  type ResearchAnswer,
  type ResearchFile,
} from './research'

function answersUnchanged(
  a: Record<string, ResearchAnswer>,
  b: Record<string, ResearchAnswer>,
): boolean {
  return JSON.stringify(a) === JSON.stringify(b)
}

function putStudy(
  file: ResearchFile,
  studyId: string,
  athlete: Athlete,
  recorderId: string,
  answers: Record<string, ResearchAnswer>,
): ResearchFile {
  const study = studyById(studyId)
  if (!study || Object.keys(answers).length === 0) return file
  const existing = observationFor(file, study.id, athlete.id)
  const merged: Record<string, ResearchAnswer> = { ...(existing?.answers ?? {}), ...answers }
  if (existing && answersUnchanged(existing.answers, merged)) return file
  return upsertObservation(file, {
    study,
    subjectId: athlete.id,
    recorderId,
    answers: merged,
    existing,
  })
}

function latestWeekEnergy(athlete: Athlete): string | undefined {
  const row = (athlete.intakeAnswers ?? []).find(
    (a) => a.questionId === 'week_energy' || a.questionId.startsWith('week_energy_'),
  )
  return row?.answer
}

export function mergeAthleteIntoResearch(
  file: ResearchFile,
  athlete: Athlete,
  recorderId?: string,
): ResearchFile {
  if (!isAthleteProfile(athlete)) return file
  const who = recorderId || athlete.id
  let next = file

  const laterality: Record<string, ResearchAnswer> = {}
  if (athlete.dominantHand) {
    laterality.dominantHand =
      athlete.dominantHand === 'ambidextrous' ? 'both' : athlete.dominantHand
  }
  if (athlete.twistDirection === 'both') {
    laterality.twistBothWays = 'yes'
    if (athlete.twistBetterSide) {
      laterality.twistDirection = athlete.twistBetterSide
      laterality.twistBetterSide = athlete.twistBetterSide
    }
  } else if (athlete.twistDirection === 'not_yet') {
    laterality.twistDirection = 'not_yet'
    laterality.twistBothWays = 'no'
  } else if (athlete.twistDirection) {
    laterality.twistDirection = athlete.twistDirection
    laterality.twistBothWays = 'no'
  }
  if (athlete.skateStance) {
    laterality.skateboards = 'yes'
    laterality.skateStance = athlete.skateStance
    laterality.skateFrontFoot = athlete.skateStance === 'regular' ? 'left' : 'right'
  }
  const existingLat = observationFor(file, 'laterality', athlete.id)
  if (athlete.cartwheelLeg && !existingLat?.answers.tumbleFrontFoot) {
    laterality.tumbleFrontFoot = athlete.cartwheelLeg
  }
  next = putStudy(next, 'laterality', athlete, who, laterality)

  const feel: Record<string, ResearchAnswer> = {}
  if (athlete.cartwheelLeg) feel.cartwheelLeg = athlete.cartwheelLeg
  if (athlete.harderShape) feel.harderShape = athlete.harderShape
  if (athlete.openShoulderHardness) {
    feel.openShoulderHardness = String(athlete.openShoulderHardness)
  }
  next = putStudy(next, 'shape-feel', athlete, who, feel)

  const pretest: Record<string, ResearchAnswer> = {}
  if (athlete.favoriteColor) pretest.favoriteColor = athlete.favoriteColor
  if (athlete.handstandFloor) pretest.handstandFloor = athlete.handstandFloor
  if (athlete.handstandWall) pretest.handstandWall = athlete.handstandWall
  if (athlete.hollowHold) pretest.hollowHold = asMinuteHold(athlete.hollowHold) ?? athlete.hollowHold
  if (athlete.supermanHold) {
    pretest.supermanHold = asMinuteHold(athlete.supermanHold) ?? athlete.supermanHold
  }
  if (athlete.vUps) pretest.vUps = athlete.vUps
  const energy = latestWeekEnergy(athlete)
  if (energy) pretest.weekEnergy = energy
  if (athlete.intakeAnswers && athlete.intakeAnswers.length > 0) {
    pretest.notes = athlete.intakeAnswers
      .slice(0, 16)
      .map((a) => `${a.prompt} → ${a.answer}`)
      .join('\n')
  }
  next = putStudy(next, 'pre-test-intake', athlete, who, pretest)

  return next
}

export async function syncAthleteProfileToResearch(
  athlete: Athlete,
  recorderId?: string,
): Promise<void> {
  const file = await loadResearch()
  const next = mergeAthleteIntoResearch(file, athlete, recorderId)
  if (next !== file) await saveResearch(next)
}

/** Backfill Research from the whole roster in one load / save. */
export async function syncRosterToResearch(athletes: Athlete[]): Promise<ResearchFile> {
  const loaded = await loadResearch()
  let file = loaded
  for (const athlete of athletes) {
    file = mergeAthleteIntoResearch(file, athlete, athlete.id)
  }
  if (file === loaded) return file
  const saved = await saveResearch(file)
  return saved ?? file
}
