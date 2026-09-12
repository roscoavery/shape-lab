import type { PhysicsQuizItem } from '../config/physicsQuiz'
import { PHYSICS_QUIZ_BANK } from '../config/physicsQuiz'
import { ANATOMY_QUIZ_BANK } from '../config/anatomyQuiz'
import { PROGRESSION_QUIZ_BANK } from '../config/progressionQuiz'

export type StudyQuestion = PhysicsQuizItem

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j]!, a[i]!]
  }
  return a
}

function buildFrom(bank: PhysicsQuizItem[]): StudyQuestion[] {
  return shuffle(bank).map((q) => ({
    ...q,
    choices: shuffle(q.choices),
  }))
}

export function buildPhysicsQuiz(): StudyQuestion[] {
  return buildFrom(PHYSICS_QUIZ_BANK)
}

export function buildAnatomyQuiz(): StudyQuestion[] {
  return buildFrom(ANATOMY_QUIZ_BANK)
}

export function buildProgressionQuiz(): StudyQuestion[] {
  return buildFrom(PROGRESSION_QUIZ_BANK)
}
