import type { PhysicsQuizItem } from '../config/physicsQuiz'
import { PHYSICS_QUIZ_BANK } from '../config/physicsQuiz'
import { ANATOMY_QUIZ_BANK } from '../config/anatomyQuiz'
import { PROGRESSION_QUIZ_BANK } from '../config/progressionQuiz'
import { PROGRESSION_DEEP_QUIZ_BANK } from '../config/progressionDeepQuiz'
import { MOVEMENTS_QUIZ_BANK } from '../config/movementsQuiz'
import { SHAPE_BODY_QUIZ_BANK } from '../config/shapeBodyQuiz'

export type StudyQuestion = PhysicsQuizItem

export type AnatomyTrack = 'all' | 'joints' | 'tissues' | 'prevention'
export type ProgressionTrack = 'all' | 'levels' | 'blocks' | 'deep'
export type PhysicsTrack = 'all' | 'core'

const ANATOMY_JOINTS = new Set(['movement-names', 'struggle-hypermobile'])
const ANATOMY_TISSUES = new Set(['tissues-grades'])
const ANATOMY_PREVENTION = new Set(['injury-prevention'])
const PROG_LEVELS = new Set(['four-levels'])
const PROG_BLOCKS = new Set([
  'normal-fear',
  'mental-block',
  'physical-block',
  'emotional-block',
  'levels-and-blocks',
])

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j]!, a[i]!]
  }
  return a
}

export function buildFrom(bank: PhysicsQuizItem[], count = 8): StudyQuestion[] {
  const pool = shuffle(bank)
  return pool.slice(0, Math.min(count, pool.length)).map((q) => ({
    ...q,
    choices: shuffle(q.choices),
  }))
}

export function buildPhysicsQuiz(track: PhysicsTrack = 'all'): StudyQuestion[] {
  if (track === 'core') {
    const core = new Set(['inertia', 'angular-momentum', 'moment-of-inertia'])
    return buildFrom(
      PHYSICS_QUIZ_BANK.filter((q) => core.has(q.lessonId)),
      8,
    )
  }
  return buildFrom(PHYSICS_QUIZ_BANK, 10)
}

export function buildAnatomyQuiz(track: AnatomyTrack = 'all'): StudyQuestion[] {
  const bank =
    track === 'joints'
      ? ANATOMY_QUIZ_BANK.filter((q) => ANATOMY_JOINTS.has(q.lessonId))
      : track === 'tissues'
        ? ANATOMY_QUIZ_BANK.filter((q) => ANATOMY_TISSUES.has(q.lessonId))
        : track === 'prevention'
          ? ANATOMY_QUIZ_BANK.filter((q) => ANATOMY_PREVENTION.has(q.lessonId))
          : ANATOMY_QUIZ_BANK
  return buildFrom(bank.length >= 6 ? bank : ANATOMY_QUIZ_BANK, 8)
}

export function buildProgressionQuiz(track: ProgressionTrack = 'all'): StudyQuestion[] {
  if (track === 'deep') return buildFrom(PROGRESSION_DEEP_QUIZ_BANK, 8)
  const bank =
    track === 'levels'
      ? PROGRESSION_QUIZ_BANK.filter((q) => PROG_LEVELS.has(q.lessonId))
      : track === 'blocks'
        ? PROGRESSION_QUIZ_BANK.filter((q) => PROG_BLOCKS.has(q.lessonId))
        : [...PROGRESSION_QUIZ_BANK, ...PROGRESSION_DEEP_QUIZ_BANK]
  return buildFrom(bank.length >= 6 ? bank : PROGRESSION_QUIZ_BANK, 8)
}

export function buildMovementsQuiz(): StudyQuestion[] {
  return buildFrom(MOVEMENTS_QUIZ_BANK, 8)
}

export function buildShapeBodyQuiz(): StudyQuestion[] {
  return buildFrom(SHAPE_BODY_QUIZ_BANK, 8)
}
