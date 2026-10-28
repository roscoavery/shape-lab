/**
 * Questions asked before the shape test from Today → New athlete · shape test.
 * Add a row here each week — unanswered prompts show up on the next test.
 */

import type { Athlete, HoldGuess, IntakeAnswer, VUpGuess, WallHoldGuess } from '../types.ts'
import { FAVORITE_COLORS } from './profileTheme.ts'

export type IntakeChoice = { value: string; label: string }

export type IntakeQuestion = {
  id: string
  prompt: string
  kind: 'choice' | 'skip-phone' | 'photo' | 'color' | 'date' | 'text'
  options?: IntakeChoice[]
  /** Hint text for free-text questions. */
  placeholder?: string
  stillShapeId?: string
  /** Direct still image file (under /references/) — overrides stillShapeId. */
  stillFile?: string
  /** Multiple stills shown side by side (e.g. hollow vs superman). */
  stillShapeIds?: string[]
  /** If true, skip when the athlete already has an answer stored. */
  once?: boolean
  /** ISO week key — asked again next week even if they answered last week. */
  weekly?: boolean
  /** Conditional: only ask when this returns true for the athlete's current answers. */
  showIf?: (answers: Record<string, string>) => boolean
}

/** Birthday, YYYY-MM-DD. Must be a real calendar date and not in the future. */
export function isValidDateOfBirth(value: unknown): value is string {
  if (typeof value !== 'string') return false
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const d = new Date(`${value}T00:00:00Z`)
  if (Number.isNaN(d.getTime())) return false
  if (d.toISOString().slice(0, 10) !== value) return false
  const today = new Date().toISOString().slice(0, 10)
  if (value > today) return false
  if (Number(value.slice(0, 4)) < 1900) return false
  return true
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

/** Hollow / Superman used to be 10s buckets. Fold those into the minute answers. */
export function asMinuteHold(value: string | undefined | null): WallHoldGuess | undefined {
  if (!value) return undefined
  if (value === 'under_min' || value === 'over_min') return value
  if (value === 'contest') return 'over_min'
  if (value === 'under_10' || value === 'over_10' || value === 'over_20') return 'under_min'
  return undefined
}

export const VUP_OPTS: IntakeChoice[] = [
  { value: 'under_10', label: 'Under 10' },
  { value: 'over_10', label: 'Over 10' },
  { value: 'over_20', label: 'Over 20' },
  { value: 'over_30', label: 'Over 30' },
]

export const SHOULDER_OPTS: IntakeChoice[] = [
  { value: '1', label: '1 · easy' },
  { value: '2', label: '2' },
  { value: '3', label: '3' },
  { value: '4', label: '4' },
  { value: '5', label: '5 · hardest' },
  { value: 'not_sure', label: 'Not sure' },
]

const withNotSure = (opts: IntakeChoice[]): IntakeChoice[] => [
  ...opts,
  { value: 'not_sure', label: 'Not sure' },
]

export const WEEK_ENERGY_OPTS: IntakeChoice[] = [
  { value: 'fresh', label: 'Fresh' },
  { value: 'ok', label: 'Okay' },
  { value: 'sore', label: 'Sore' },
  { value: 'tired', label: 'Tired' },
]

/** Permanent pre-test questions. Weekly extras go in WEEKLY_INTAKE. */
export const CORE_INTAKE: IntakeQuestion[] = [
  // Identity first: birthday and parent phone are necessary for every
  // athlete profile and account, so they lead, before the skill questions.
  // The skill questions keep their established relative order after them.
  {
    id: 'birthday',
    prompt: 'What is your birthday?',
    kind: 'date',
    once: true,
  },
  {
    id: 'parentPhone',
    prompt: 'Parent phone, skip if you do not know it yet.',
    kind: 'skip-phone',
    once: true,
  },
  // Health up front, before the skill self-assessment: an injury changes
  // how the answers after it should be read. The detail is free text and
  // only asked after a yes.
  {
    id: 'injuryAware',
    prompt: 'Any injuries you want your coach to be aware of?',
    kind: 'choice',
    once: true,
    options: [
      { value: 'yes', label: 'Yes' },
      { value: 'no', label: 'No' },
    ],
  },
  {
    id: 'injuryDetails',
    prompt: 'Tell your coach a little bit about it.',
    kind: 'text',
    once: true,
    showIf: (a) => a.injuryAware === 'yes',
    placeholder: 'What is hurt, how long it has hurt, and anything your coach should know.',
  },
  {
    id: 'shoulderOpen',
    prompt: 'How hard is fully open shoulders for you? 1 is easy, 5 is hardest.',
    kind: 'choice',
    once: true,
    stillFile: 'shoulder_angle_open_closed.jpg',
    options: SHOULDER_OPTS,
  },
  {
    id: 'handstandWall',
    prompt: 'How long can you hold a wall handstand?',
    kind: 'choice',
    once: true,
    stillShapeId: 'wall_handstand',
    options: withNotSure(WALL_OPTS),
  },
  {
    id: 'handstandFloor',
    prompt: 'How long do you think you can hold a handstand without a wall?',
    kind: 'choice',
    once: true,
    stillShapeId: 'handstand',
    options: withNotSure(HOLD_OPTS),
  },
  {
    id: 'hollowHold',
    prompt: 'How long can you hold a hollow?',
    kind: 'choice',
    once: true,
    stillShapeId: 'hollow_arms_down',
    options: withNotSure(WALL_OPTS),
  },
  {
    id: 'supermanHold',
    prompt: 'How long can you hold a Superman?',
    kind: 'choice',
    once: true,
    stillShapeId: 'superman',
    options: withNotSure(WALL_OPTS),
  },
  {
    id: 'vUps',
    prompt: 'How many V-ups can you do?',
    kind: 'choice',
    once: true,
    stillFile: 'v_ups_diagram.png',
    options: withNotSure(VUP_OPTS),
  },
  {
    id: 'pushUps',
    prompt: 'How many push-ups can you do?',
    kind: 'choice',
    once: true,
    stillFile: 'push_ups_diagram.png',
    options: withNotSure(VUP_OPTS),
  },
  {
    id: 'cartwheelSide',
    prompt: 'Which way do you cartwheel?',
    kind: 'choice',
    once: true,
    options: withNotSure([
      { value: 'left', label: 'Left leg forward' },
      { value: 'right', label: 'Right leg forward' },
    ]),
  },
  {
    id: 'twistDirection',
    prompt: 'Which way do you twist?',
    kind: 'choice',
    once: true,
    options: withNotSure([
      { value: 'left', label: 'Left' },
      { value: 'right', label: 'Right' },
      { value: 'both', label: 'I can twist both ways' },
      { value: 'not_yet', label: "I'm not twisting yet" },
    ]),
  },
  {
    id: 'twistBetter',
    prompt: 'Which is your better side?',
    kind: 'choice',
    once: true,
    showIf: (a) => a.twistDirection === 'both',
    options: withNotSure([
      { value: 'left', label: 'Left is better' },
      { value: 'right', label: 'Right is better' },
    ]),
  },
  {
    id: 'dominantHand',
    prompt: 'Dominant hand?',
    kind: 'choice',
    once: true,
    options: withNotSure([
      { value: 'right', label: 'Right' },
      { value: 'left', label: 'Left' },
      { value: 'both', label: 'Both' },
    ]),
  },
  {
    id: 'skateStance',
    prompt: 'Which way would you ride a skateboard?',
    kind: 'choice',
    once: true,
    options: withNotSure([
      { value: 'regular', label: 'Regular (left foot forward)' },
      { value: 'goofy', label: 'Goofy (right foot forward)' },
    ]),
  },
  {
    id: 'harderShape',
    prompt: 'Which one is harder for you?',
    kind: 'choice',
    once: true,
    stillShapeIds: ['hollow_arms_down', 'superman'],
    options: withNotSure([
      { value: 'hollow', label: 'Hollow' },
      { value: 'superman', label: 'Superman' },
    ]),
  },
  {
    id: 'favoriteColor',
    prompt: 'Favorite color? We theme your profile around it.',
    kind: 'color',
    once: true,
    options: FAVORITE_COLORS.map((c) => ({ value: c.id, label: c.label })),
  },
  {
    id: 'photo',
    prompt: 'Add a profile photo so coaches know who you are on the floor.',
    kind: 'photo',
    once: true,
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
  if (id === 'birthday') return Boolean(athlete.dateOfBirth)
  if (id === 'photo') return Boolean(athlete.photoDataUrl)
  if (id === 'parentPhone') return Boolean(athlete.parentPhone || athlete.phone)
  if (id === 'favoriteColor') return Boolean(athlete.favoriteColor)
  if (id === 'handstandFloor') return Boolean(athlete.handstandFloor)
  if (id === 'handstandWall') return Boolean(athlete.handstandWall)
  if (id === 'hollowHold') return Boolean(athlete.hollowHold)
  if (id === 'supermanHold') return Boolean(athlete.supermanHold)
  if (id === 'vUps') return Boolean(athlete.vUps)
  // A blank or "not sure" row is not an answer: it must not mark the
  // question answered, or a skipped question is never asked again.
  return (athlete.intakeAnswers ?? []).some(
    (a) => a.questionId === id && Boolean(a.answer) && a.answer !== 'not_sure',
  )
}

/**
 * Every CORE_INTAKE question id this athlete has actually answered, from
 * stored profile fields as well as recorded intake answers. The public
 * intake link uses this so already-known info is not asked again.
 */
export function answeredQuestionIds(athlete: Athlete): string[] {
  const ids = new Set<string>()
  for (const a of athlete.intakeAnswers ?? []) {
    if (a.questionId && a.answer && a.answer !== 'not_sure') ids.add(a.questionId)
  }
  for (const q of CORE_INTAKE) {
    if (hasAnswer(athlete, q.id)) ids.add(q.id)
  }
  return [...ids]
}

/**
 * Questions the public intake link still has to ask: core questions the
 * athlete has not answered, plus this week's weekly questions under their
 * week-keyed ids (so next week's ask is a new question, not a repeat).
 * The link used to ask core questions only, so the weekly body-feeling
 * question never showed there. Conditional follow-ups (twist better side,
 * injury details) appear as soon as the answer they depend on is given.
 */
export function publicIntakeQuestions(
  answeredIds: string[],
  current: Record<string, string>,
  week = isoWeekKey(),
): IntakeQuestion[] {
  const answered = new Set(answeredIds)
  const out = CORE_INTAKE.filter((q) => {
    if (answered.has(q.id)) return false
    if (q.showIf && !q.showIf(current)) return false
    return true
  })
  for (const q of WEEKLY_INTAKE) {
    const weekly = { ...q, id: weeklyQuestionId(q.id, week) }
    if (answered.has(weekly.id)) continue
    if (weekly.showIf && !weekly.showIf(current)) continue
    out.push(weekly)
  }
  return out
}

export function pendingIntake(athlete: Athlete): IntakeQuestion[] {
  const week = isoWeekKey()
  const answers: Record<string, string> = {}
  for (const a of athlete.intakeAnswers ?? []) {
    if (a.answer && a.answer !== 'not_sure') answers[a.questionId] = a.answer
  }
  const out: IntakeQuestion[] = []
  for (const q of CORE_INTAKE) {
    if (q.once && hasAnswer(athlete, q.id)) continue
    if (q.showIf && !q.showIf(answers)) continue
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
function pairWallAfterFloor(list: IntakeQuestion[]): IntakeQuestion[] {  // Ryan's order: wall handstand comes BEFORE handstand without a wall.
  const wall = list.find((q) => q.id === 'handstandWall')
  const floorAt = list.findIndex((q) => q.id === 'handstandFloor')
  if (!wall) return list
  const rest = list.filter((q) => q.id !== 'handstandWall')
  if (floorAt === -1) return [wall, ...rest]
  const floorNow = rest.findIndex((q) => q.id === 'handstandFloor')
  return [...rest.slice(0, floorNow), wall, ...rest.slice(floorNow)]
}

export function upsertIntakeAnswer(
  athlete: Athlete,
  row: IntakeAnswer,
): Athlete {
  const rest = (athlete.intakeAnswers ?? []).filter((a) => a.questionId !== row.questionId)
  // "Not sure" doesn't count as answered — the question stays open to be
  // asked again later.
  if (row.answer === 'not_sure') return { ...athlete, intakeAnswers: rest }
  return { ...athlete, intakeAnswers: [row, ...rest].slice(0, 80) }
}

export function applyIntakeField(athlete: Athlete, id: string, value: string): Athlete {
  if (id === 'birthday') {
    return isValidDateOfBirth(value) ? { ...athlete, dateOfBirth: value } : athlete
  }
  if (id === 'parentPhone') return { ...athlete, parentPhone: value }
  if (id === 'favoriteColor') return { ...athlete, favoriteColor: value as Athlete['favoriteColor'] }
  if (id === 'handstandFloor') return { ...athlete, handstandFloor: value as HoldGuess }
  if (id === 'handstandWall') return { ...athlete, handstandWall: value as WallHoldGuess }
  if (id === 'hollowHold') {
    return { ...athlete, hollowHold: asMinuteHold(value) ?? (value as Athlete['hollowHold']) }
  }
  if (id === 'supermanHold') {
    return { ...athlete, supermanHold: asMinuteHold(value) ?? (value as Athlete['supermanHold']) }
  }
  if (id === 'vUps') return { ...athlete, vUps: value as VUpGuess }
  if (id === 'pushUps') return { ...athlete, pushUps: value as VUpGuess }
  if (id === 'shoulderOpen') {
    const num = { '1': 1, '2': 2, '3': 3, '4': 4, '5': 5 }[value] as 1 | 2 | 3 | 4 | 5 | undefined
    return num ? { ...athlete, openShoulderHardness: num } : athlete
  }
  if (id === 'cartwheelSide') return { ...athlete, cartwheelLeg: value as Athlete['cartwheelLeg'] }
  if (id === 'twistDirection') return { ...athlete, twistDirection: value as Athlete['twistDirection'] }
  if (id === 'twistBetter') return { ...athlete, twistBetterSide: value as Athlete['twistBetterSide'] }
  if (id === 'dominantHand') return { ...athlete, dominantHand: value as Athlete['dominantHand'] }
  if (id === 'skateStance') return { ...athlete, skateStance: value as Athlete['skateStance'] }
  if (id === 'harderShape') return { ...athlete, harderShape: value as Athlete['harderShape'] }
  return athlete
}

export function handstandContest(athlete: {
  handstandFloor?: string
  handstandWall?: string
}): boolean {
  return athlete.handstandFloor === 'contest' && athlete.handstandWall === 'over_min'
}

export type IntakeAnswerLine = { id: string; prompt: string; answer: string }

/** Values that mean no answer was given, never shown as one. */
function isNoAnswer(value: string | undefined | null): boolean {
  if (!value) return true
  const v = value.trim()
  return v === '' || v === 'not_sure' || v === 'Skipped'
}

function labelFor(q: IntakeQuestion, value: string): string {
  return q.options?.find((o) => o.value === value)?.label ?? value
}

/** Stored profile-field value for a question, when no answer row exists. */
function fieldValue(athlete: Athlete, id: string): string | undefined {
  switch (id) {
    case 'birthday':
      return athlete.dateOfBirth || undefined
    case 'parentPhone':
      return athlete.parentPhone || athlete.phone || undefined
    case 'favoriteColor':
      return athlete.favoriteColor || undefined
    case 'handstandFloor':
      return athlete.handstandFloor || undefined
    case 'handstandWall':
      return athlete.handstandWall || undefined
    case 'hollowHold':
      return athlete.hollowHold || undefined
    case 'supermanHold':
      return athlete.supermanHold || undefined
    case 'vUps':
      return athlete.vUps || undefined
    case 'pushUps':
      return athlete.pushUps || undefined
    case 'shoulderOpen':
      return athlete.openShoulderHardness ? String(athlete.openShoulderHardness) : undefined
    case 'cartwheelSide':
      return athlete.cartwheelLeg || undefined
    case 'twistDirection':
      return athlete.twistDirection || undefined
    case 'twistBetter':
      return athlete.twistBetterSide || undefined
    case 'dominantHand':
      return athlete.dominantHand || undefined
    case 'skateStance':
      return athlete.skateStance || undefined
    case 'harderShape':
      return athlete.harderShape || undefined
    default:
      return undefined
  }
}

function newestRow(rows: IntakeAnswer[]): IntakeAnswer | undefined {
  let best: IntakeAnswer | undefined
  let bestAt = -1
  for (const row of rows) {
    const at = Date.parse(row.askedAt ?? '') || 0
    if (at >= bestAt) {
      best = row
      bestAt = at
    }
  }
  return best
}

/**
 * What the athlete actually said, for a coach viewing the profile: one
 * line per answered intake question, newest answer wins, option codes
 * shown as their labels, free-text answers verbatim. Falls back to the
 * stored profile field when an answer was recorded without a row. The
 * photo question is left out: the photo itself is on the profile.
 */
export function intakeAnswerLines(athlete: Athlete): IntakeAnswerLine[] {
  const rows = athlete.intakeAnswers ?? []
  const newestById = new Map<string, IntakeAnswer>()
  for (const row of rows) {
    const prev = newestById.get(row.questionId)
    if (!prev || (Date.parse(row.askedAt ?? '') || 0) >= (Date.parse(prev.askedAt ?? '') || 0)) {
      newestById.set(row.questionId, row)
    }
  }
  const lines: IntakeAnswerLine[] = []
  for (const q of CORE_INTAKE) {
    if (q.kind === 'photo') continue
    const row = newestById.get(q.id)
    let value: string | undefined
    if (row && !isNoAnswer(row.answer)) value = row.answer
    else {
      const field = fieldValue(athlete, q.id)
      if (field && !isNoAnswer(field)) value = field
    }
    if (!value) continue
    if (q.id === 'handstandWall' || q.id === 'hollowHold' || q.id === 'supermanHold') {
      value = asMinuteHold(value) ?? value
    }
    if (q.id === 'dominantHand' && value === 'ambidextrous') value = 'both'
    lines.push({ id: q.id, prompt: q.prompt, answer: labelFor(q, value) })
  }
  const weekly = WEEKLY_INTAKE[0]
  if (weekly) {
    const weeklyRows = rows.filter(
      (a) => a.questionId === weekly.id || a.questionId.startsWith(`${weekly.id}_`),
    )
    const latest = newestRow(weeklyRows)
    if (latest && !isNoAnswer(latest.answer)) {
      lines.push({ id: weekly.id, prompt: weekly.prompt, answer: labelFor(weekly, latest.answer) })
    }
  }
  return lines
}
