/**
 * Multiple-choice shape quiz for the Learn tab.
 * Mix of "name this description" and "name this picture" questions.
 */

import {
  ARM_POSITION_SHAPE_IDS,
  canonicalSamePositionId,
  learnLibraryShapes,
  samePositionDisplayName,
  samePositionGroup,
} from './educationCopy'
import { SHAPES } from '../config/shapes'
import { pickReferencePhoto } from './storage'
import { defaultAthleteCopy } from './shapeCopy'
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
  const aliases = new Set(samePositionGroup(correct.id))
  const others = pool.filter((s) => !aliases.has(s.id) && s.category === correct.category)
  const rest = pool.filter((s) => !aliases.has(s.id) && s.category !== correct.category)
  return shuffle([...others, ...rest]).slice(0, n)
}

function quizLabel(shape: ShapeDef): string {
  return samePositionDisplayName(shape.id)
}

/**
 * One question per body position. If landing lunge and lunge · open shoulders
 * are both in the pool, keep the pathway name and skip the duplicate.
 */
function uniquePositions(source: ShapeDef[]): ShapeDef[] {
  const ids = new Set(source.map((s) => s.id))
  const seen = new Set<string>()
  const out: ShapeDef[] = []
  for (const shape of source) {
    const canon = canonicalSamePositionId(shape.id)
    const keep = ids.has(canon) ? canon : shape.id
    if (shape.id !== keep) continue
    if (seen.has(keep)) continue
    seen.add(keep)
    out.push(shape)
  }
  return out
}

export type QuizPool = 'pathway' | 'arm-positions'

/**
 * Build a quiz from the Learn shape library (falls back to the full catalog).
 * Picture questions only appear when a reference photo exists.
 * Arm-positions pool covers standing + lunge arm shapes parked out of Tasks.
 */
export function buildShapeQuiz(
  photos: ReferencePhoto[],
  count = 10,
  pool: QuizPool = 'pathway',
  athleteText?: (shape: ShapeDef) => string,
): QuizQuestion[] {
  const library = learnLibraryShapes()
  const arm = new Set(ARM_POSITION_SHAPE_IDS)
  const poolShapes =
    pool === 'arm-positions' ? SHAPES.filter((s) => arm.has(s.id)) : library
  const source = uniquePositions(poolShapes.length >= 4 ? poolShapes : SHAPES)
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
        choices: opts.map((s) => ({ id: s.id, label: quizLabel(s) })),
        answerId: shape.id,
      })
    } else if (di < describePool.length) {
      const shape = describePool[di++]!
      const body = (athleteText?.(shape) ?? defaultAthleteCopy(shape)).trim()
      const opts = shuffle([shape, ...distractors(shape, source, 3)]).slice(0, 4)
      questions.push({
        id: `desc_${shape.id}_${questions.length}`,
        kind: 'describe',
        shapeId: shape.id,
        prompt: body
          ? `Which shape is this?\n\n${body}`
          : 'Which shape is being described?',
        photoUrl: null,
        choices: opts.map((s) => ({ id: s.id, label: quizLabel(s) })),
        answerId: shape.id,
      })
    } else {
      break
    }
  }

  return questions
}
