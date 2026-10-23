import type { CoachLesson } from '../../config/coachAnatomy'
import type { PhysicsQuizItem } from '../../config/physicsQuiz'
import type { Lesson, ModuleId, QuestionAnswer, QuestionPublic } from './types'

/**
 * Wraps an existing Learn lesson so it can sit beside new Coach education
 * lessons without being copied or rewritten. The id is kept in `legacyId`.
 */
export function adaptLegacyLesson(l: CoachLesson, moduleId: ModuleId): Lesson {
  return {
    id: `legacy-${l.id}`,
    moduleId,
    title: l.title,
    kicker: l.kicker,
    minutes: Math.max(2, Math.round(l.body.join(' ').split(/\s+/).length / 180)),
    review: 'draft',
    legacyId: l.id,
    blocks: [
      {
        kind: 'callout',
        tone: 'note',
        text: 'Existing ShapeLab lesson, shown unchanged. It has not gone through the Coach education source and medical review.',
      },
      ...l.body.map((text) => ({ kind: 'p' as const, text })),
    ],
    gym: l.gym,
  }
}

/** Legacy quiz items keep their ids. Public and answer halves are split here. */
export function adaptLegacyQuestion(q: PhysicsQuizItem): { pub: QuestionPublic; ans: QuestionAnswer } {
  return {
    pub: {
      id: `legacy-${q.id}`,
      topicId: q.lessonId,
      kind: 'single',
      difficulty: 'applied',
      critical: false,
      prompt: q.prompt,
      choices: q.choices.map((c) => ({ id: c.id, label: c.label })),
      sourceIds: [],
    },
    ans: { id: `legacy-${q.id}`, answerId: q.answerId, explain: q.explain },
  }
}
