/**
 * Questions asked before the shape test from Today → New athlete · shape test.
 * Add a row here each week — unanswered prompts show up on the next test.
 */

import type { Athlete, HoldGuess, IntakeAnswer, VUpGuess, WallHoldGuess } from '../types'
import { FAVORITE_COLORS } from './profileTheme'

export type IntakeChoice = { value: string; label: string }

export type IntakeQuestion = {
  id: string
  prompt: string
  kind: 'choice' | 'skip-phone' | 'photo' | 'color'
  options?: IntakeChoice[]
  stillShapeId?: string
  /** If true, skip when the athlete already has an answer stored. */
  once?: boolean
  /** ISO week key — asked again next week even if they answered last week. */
  weekly?: boolean
}

export const HOLD_OPTS: IntakeChoice[] = [
  { value: 'under_10', label: 'Under 10 seconds' },
  { value: 'over_10', label: 'Over 10 seconds' },
  { value: 'over_20', label: 'Over 20 seconds' },
  { value: 'contest', label: 'I definitely might win a handstand contest' },
]

export const HOLD_SIMPLE: IntakeChoice[] = [
  { value: 'under_10', label: 'Under 10 seconds' },
  { value: 'over_10', label: 'Over 10 seconds' },
  { value: 'over_20', label: 'Over 20 seconds' },
  { value: 'contest', label: 'I could win a contest at this' },
]

export const WALL_OPTS: IntakeChoice[] = [
  { value: 'under_min', label: 'Under a minute' },
  { value: 'over_min', label: 'Over a minute' },
]

export const VUP_OPTS: IntakeChoice[] = [
  { value: 'under_10', label: 'Under 10' },
  { value: 'over_10', label: 'Over 10' },
  { value: 'over_20', label: 'Over 20' },
  { value: 'over_30', label: 'Over 30' },
]

export const WEEK_ENERGY_OPTS: IntakeChoice[] = [
  { value: 'fresh', label: 'Fresh' },
  { value: 'ok', label: 'Okay' },
  { value: 'sore', label: 'Sore' },
  { value: 'tired', label: 'Tired' },
]

/** Permanent pre-test questions. Weekly extras go in WEEKLY_INTAKE. */
export const CORE_INTAKE: IntakeQuestion[] = [
  {
    id: 'photo',
    prompt: 'Add a profile photo so coaches know who you are on the floor.',
    kind: 'photo',
    once: true,
  },
  {
    id: 'parentPhone',
    prompt: 'Parent phone — skip if you do not know it yet.',
    kind: 'skip-phone',
    once: true,
  },
  {
    id: 'favoriteColor',
    prompt: 'Favorite color? We theme your profile around it.',
    kind: 'color',
    once: true,
    options: FAVORITE_COLORS.map((c) => ({ value: c.id, label: c.label })),
  },
  {
    id: 'handstandFloor',
    prompt: 'How long do you think you can hold a handstand without a wall?',
    kind: 'choice',
    once: true,
    stillShapeId: 'handstand',
    options: HOLD_OPTS,
  },
  {
    id: 'handstandWall',
    prompt: 'How long can you hold a wall handstand?',
    kind: 'choice',
    once: true,
    stillShapeId: 'wall_handstand',
    options: WALL_OPTS,
  },
  {
    id: 'hollowHold',
    prompt: 'How long can you hold a hollow?',
    kind: 'choice',
    once: true,
    stillShapeId: 'hollow_arms_down',
    options: HOLD_SIMPLE,
  },
  {
    id: 'supermanHold',
    prompt: 'How long can you hold a Superman?',
    kind: 'choice',
    once: true,
    stillShapeId: 'superman',
    options: HOLD_SIMPLE,
  },
  {
    id: 'vUps',
    prompt: 'How many V-ups can you do?',
    kind: 'choice',
    once: true,
    options: VUP_OPTS,
  },
]

/**
 * Add a question here each week. It shows until they answer it this ISO week.
 * Answers land on the athlete and in Research.
 */
export const WEEKLY_INTAKE: IntakeQuestion[] = [
  {
    id: 'week_energy',
    prompt: 'How is your body feeling for tumbling this week?',
    kind: 'choice',
    weekly: true,
    options: WEEK_ENERGY_OPTS,
  },
]

export function isoWeekKey(d = new Date()): string {
  const tmp = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()))
  const day = tmp.getUTCDay() || 7
  tmp.setUTCDate(tmp.getUTCDate() + 4 - day)
  const yearStart = new Date(Date.UTC(tmp.getUTCFullYear(), 0, 1))
  const week = Math.ceil(((tmp.getTime() - yearStart.getTime()) / 86400000 + 1) / 7)
  return `${tmp.getUTCFullYear()}-W${String(week).padStart(2, '0')}`
}

export function weeklyQuestionId(baseId: string, week = isoWeekKey()): string {
  return `${baseId}_${week}`
}

function hasAnswer(athlete: Athlete, id: string): boolean {
  if (id === 'photo') return Boolean(athlete.photoDataUrl)
  if (id === 'parentPhone') return Boolean(athlete.parentPhone || athlete.phone)
  if (id === 'favoriteColor') return Boolean(athlete.favoriteColor)
  if (id === 'handstandFloor') return Boolean(athlete.handstandFloor)
  if (id === 'handstandWall') return Boolean(athlete.handstandWall)
  if (id === 'hollowHold') return Boolean(athlete.hollowHold)
  if (id === 'supermanHold') return Boolean(athlete.supermanHold)
  if (id === 'vUps') return Boolean(athlete.vUps)
  return (athlete.intakeAnswers ?? []).some((a) => a.questionId === id)
}

export function pendingIntake(athlete: Athlete): IntakeQuestion[] {
  const week = isoWeekKey()
  const out: IntakeQuestion[] = []
  for (const q of CORE_INTAKE) {
    if (q.once && hasAnswer(athlete, q.id)) continue
    out.push(q)
  }
  for (const q of WEEKLY_INTAKE) {
    const id = q.weekly ? weeklyQuestionId(q.id, week) : q.id
    if (hasAnswer(athlete, id)) continue
    out.push({ ...q, id })
  }
  return pairWallAfterFloor(out)
}

/** Wall handstand always sits on the next card after no-wall. */
function pairWallAfterFloor(list: IntakeQuestion[]): IntakeQuestion[] {
  const wall = list.find((q) => q.id === 'handstandWall')
  const floorAt = list.findIndex((q) => q.id === 'handstandFloor')
  if (!wall) return list
  const rest = list.filter((q) => q.id !== 'handstandWall')
  if (floorAt === -1) return rest.concat(wall)
  const floorNow = rest.findIndex((q) => q.id === 'handstandFloor')
  return [...rest.slice(0, floorNow + 1), wall, ...rest.slice(floorNow + 1)]
}

export function upsertIntakeAnswer(
  athlete: Athlete,
  row: IntakeAnswer,
): Athlete {
  const rest = (athlete.intakeAnswers ?? []).filter((a) => a.questionId !== row.questionId)
  return { ...athlete, intakeAnswers: [row, ...rest].slice(0, 80) }
}

export function applyIntakeField(athlete: Athlete, id: string, value: string): Athlete {
  if (id === 'parentPhone') return { ...athlete, parentPhone: value }
  if (id === 'favoriteColor') return { ...athlete, favoriteColor: value as Athlete['favoriteColor'] }
  if (id === 'handstandFloor') return { ...athlete, handstandFloor: value as HoldGuess }
  if (id === 'handstandWall') return { ...athlete, handstandWall: value as WallHoldGuess }
  if (id === 'hollowHold') return { ...athlete, hollowHold: value as HoldGuess }
  if (id === 'supermanHold') return { ...athlete, supermanHold: value as HoldGuess }
  if (id === 'vUps') return { ...athlete, vUps: value as VUpGuess }
  return athlete
}

export function handstandContest(athlete: {
  handstandFloor?: string
  handstandWall?: string
}): boolean {
  return athlete.handstandFloor === 'contest' && athlete.handstandWall === 'over_min'
}
