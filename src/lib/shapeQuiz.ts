/**
 * Multiple-choice shape quiz for the Learn tab.
 * Mix of "name this description" and "name this picture" questions.
 */

import { curriculumShapeIds } from './educationCopy'
import { SHAPES } from '../config/shapes'
import { pickReferencePhoto } from './storage'
import type { ReferencePhoto, ShapeDef } from '../types'

export type QuizKind = 'describe' | 'picture'

export type QuizChoice = { id: string; label: string }

export type QuizQuestion = {
  id: string
  kind: QuizKind
  shapeId: string
  prompt: string
  photoUrl: string | null
  choices: QuizChoice[]
  answerId: string
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j]!, a[i]!]
  }
  return a
}

function distractors(correct: ShapeDef, pool: ShapeDef[], n: number): ShapeDef[] {
  const others = pool.filter((s) => s.id !== correct.id && s.category === correct.category)
  const rest = pool.filter((s) => s.id !== correct.id && s.category !== correct.category)
  return shuffle([...others, ...rest]).slice(0, n)
}

/**
 * Build a quiz from pathway shapes (falls back to the full library).
 * Picture questions only appear when a reference photo exists.
 */
export function buildShapeQuiz(
  photos: ReferencePhoto[],
  count = 8,
): QuizQuestion[] {
  const pathway = curriculumShapeIds()
  const pool = SHAPES.filter((s) => pathway.has(s.id))
  const source = pool.length >= 6 ? pool : SHAPES
  const withPhoto = source.filter((s) => Boolean(pickReferencePhoto(photos, s.id, null)?.dataUrl))

  const describePool = shuffle(source)
  const picturePool = shuffle(withPhoto)
  const questions: QuizQuestion[] = []
  let di = 0
  let pi = 0

  while (questions.length < count && (di < describePool.length || pi < picturePool.length)) {
    const wantPicture = questions.length % 2 === 1 && pi < picturePool.length
    if (wantPicture) {
      const shape = picturePool[pi++]!
      const photo = pickReferencePhoto(photos, shape.id, null)
      if (!photo?.dataUrl) continue
      const opts = shuffle([shape, ...distractors(shape, source, 3)]).slice(0, 4)
      questions.push({
        id: `pic_${shape.id}_${questions.length}`,
        kind: 'picture',
        shapeId: shape.id,
        prompt: 'What shape is this?',
        photoUrl: photo.dataUrl,
        choices: opts.map((s) => ({ id: s.id, label: s.name })),
        answerId: shape.id,
      })
    } else if (di < describePool.length) {
      const shape = describePool[di++]!
      const body = shape.bodyPosition?.trim() || shape.description
      const opts = shuffle([shape, ...distractors(shape, source, 3)]).slice(0, 4)
      questions.push({
        id: `desc_${shape.id}_${questions.length}`,
        kind: 'describe',
        shapeId: shape.id,
        prompt: body
          ? `Which shape is this?\n\n${body}`
          : 'Which shape is being described?',
        photoUrl: null,
        choices: opts.map((s) => ({ id: s.id, label: s.name })),
        answerId: shape.id,
      })
    } else {
      break
    }
  }

  return questions
}
