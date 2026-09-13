/**
 * Shape test 2 — harder than “name this still.”
 * Mostly a shown picture: close lookalikes, or one detail on that still.
 */

import { SHAPE_BODY_QUIZ_BANK } from '../config/shapeBodyQuiz'
import { getShape } from '../config/shapes'
import { samePositionDisplayName } from './educationCopy'
import { pickReferencePhoto } from './shippedRefs'
import { buildFrom, type StudyQuestion } from './studyQuiz'
import type { ReferencePhoto, ShapeDef } from '../types'

const HARD_GROUPS: string[][] = [
  ['lunge_start', 'lunge_land', 'mountain_climber'],
  ['hollow_arms_down', 'hollow_arms_up'],
  ['candlestick', 'tucked_candle'],
  ['seated_pike', 'pike_open_shoulders'],
  ['handstand', 'wall_handstand'],
  ['arch', 'superman'],
  ['zombie', 'stand_clean'],
  ['tuck', 'tuck_open_shoulders'],
]

type DetailAsk = {
  shapeId: string
  prompt: string
  choices: { id: string; label: string }[]
  answerId: string
  explain: string
}

const DETAILS: DetailAsk[] = [
  {
    shapeId: 'lunge_start',
    prompt: 'In this still, the back heel should be:',
    choices: [
      { id: 'a', label: 'Up on the ball of the foot' },
      { id: 'b', label: 'Flat on the floor' },
      { id: 'c', label: 'Rolled in on the arch' },
      { id: 'd', label: 'Off the floor like a kick' },
    ],
    answerId: 'a',
    explain: 'Starting lunge is the longer fall. Back heel stays up.',
  },
  {
    shapeId: 'lunge_land',
    prompt: 'In this still, the back heel should be:',
    choices: [
      { id: 'a', label: 'Up on the ball of the foot' },
      { id: 'b', label: 'Flat on the floor' },
      { id: 'c', label: 'Rolled in on the arch' },
      { id: 'd', label: 'Kicked behind' },
    ],
    answerId: 'b',
    explain: 'Landing lunge: shorter stance, back heel flat, back leg straight.',
  },
  {
    shapeId: 'mountain_climber',
    prompt: 'What makes this still a mountain climber, not a lunge?',
    choices: [
      { id: 'a', label: 'A long open line and a straight back leg' },
      { id: 'b', label: 'Both knees bent and a tumbling C' },
      { id: 'c', label: 'A flat back heel and open shoulders' },
      { id: 'd', label: 'A passé on the front leg' },
    ],
    answerId: 'b',
    explain: 'Mountain climber is pass-through only: two bent knees and a C. Never a finish.',
  },
  {
    shapeId: 'hollow_arms_down',
    prompt: 'In this hollow, the arms are:',
    choices: [
      { id: 'a', label: 'By the sides' },
      { id: 'b', label: 'Covering the ears' },
      { id: 'c', label: 'In a T' },
      { id: 'd', label: 'Reaching behind the hips' },
    ],
    answerId: 'a',
    explain: 'Arms-down hollow: low back flat, arms by the sides. Arms-up is the same trunk with arms by the ears.',
  },
  {
    shapeId: 'hollow_arms_up',
    prompt: 'This hollow is the same trunk as arms-down. The arms here are:',
    choices: [
      { id: 'a', label: 'By the sides' },
      { id: 'b', label: 'Glued by the ears' },
      { id: 'c', label: 'In a low V' },
      { id: 'd', label: 'Behind the body' },
    ],
    answerId: 'b',
    explain: 'Arms-up hollow keeps the same posterior tilt. Only the lever changes.',
  },
  {
    shapeId: 'superman',
    prompt: 'This still is on which side of the body?',
    choices: [
      { id: 'a', label: 'Belly down (prone), long hips, arms by the ears' },
      { id: 'b', label: 'On the back in a hollow' },
      { id: 'c', label: 'A standing C' },
      { id: 'd', label: 'A landing lunge' },
    ],
    answerId: 'a',
    explain: 'Superman is prone. A tumbling arch is a different shape and a different relationship to the floor.',
  },
  {
    shapeId: 'lunge_start',
    prompt: 'Compared with a landing lunge, this stance should be:',
    choices: [
      { id: 'a', label: 'Shorter, heels closer' },
      { id: 'b', label: 'Longer' },
      { id: 'c', label: 'The same length' },
      { id: 'd', label: 'A straddle' },
    ],
    answerId: 'b',
    explain: 'Starting lunge is the longer fall from passé. Landing is shorter with a flat back heel.',
  },
  {
    shapeId: 'lunge_land',
    prompt: 'On this lunge the back leg should be:',
    choices: [
      { id: 'a', label: 'Bent like a mountain climber' },
      { id: 'b', label: 'Straight' },
      { id: 'c', label: 'In passé' },
      { id: 'd', label: 'In a pike' },
    ],
    answerId: 'b',
    explain: 'Both lunges keep the back leg straight. A bent back knee turns it into a mountain climber.',
  },
  {
    shapeId: 'candlestick',
    prompt: 'This still is a candlestick when the legs are:',
    choices: [
      { id: 'a', label: 'Straight, hips stacked over the shoulders' },
      { id: 'b', label: 'Tucked, knees to the chest' },
      { id: 'c', label: 'In a straddle sit' },
      { id: 'd', label: 'In a hollow on the back with arms down' },
    ],
    answerId: 'a',
    explain: 'Candlestick is long. Tucked candle pulls the knees in.',
  },
  {
    shapeId: 'tucked_candle',
    prompt: 'What is tucked in this still versus a long candlestick?',
    choices: [
      { id: 'a', label: 'The knees come in. The hips still stack over the shoulders' },
      { id: 'b', label: 'The arms drop to the sides' },
      { id: 'c', label: 'The athlete rolls to the belly' },
      { id: 'd', label: 'The stance becomes a lunge' },
    ],
    answerId: 'a',
    explain: 'Tucked candle keeps the shoulder stack and shortens the legs.',
  },
  {
    shapeId: 'zombie',
    prompt: 'In this still the eyes and arms should look:',
    choices: [
      { id: 'a', label: 'Eyes through the hands, shoulders shrugged, arms covering the ears' },
      { id: 'b', label: 'Chin up, arms in a T' },
      { id: 'c', label: 'Looking at the ceiling, arms by the sides' },
      { id: 'd', label: 'A high V with an open chest' },
    ],
    answerId: 'a',
    explain: 'Zombie is a standing hollow. Shoulders shrugged, arms covering the ears, eyes toward where they came from.',
  },
  {
    shapeId: 'seated_pike',
    prompt: 'This seated pike uses zombie arms. The legs should be:',
    choices: [
      { id: 'a', label: 'Together, knees straight, toes pointed' },
      { id: 'b', label: 'Tucked to the chest' },
      { id: 'c', label: 'In a straddle' },
      { id: 'd', label: 'Bent like a mountain climber' },
    ],
    answerId: 'a',
    explain: 'Pike with zombie arms: long legs, upright hollow chest, arms covering the ears.',
  },
  {
    shapeId: 'handstand',
    prompt: 'This freestanding handstand should look:',
    choices: [
      { id: 'a', label: 'Stacked: ribs in, butt in, ears covered, toes pointed' },
      { id: 'b', label: 'Stomach to the wall, banana back' },
      { id: 'c', label: 'A tucked candle' },
      { id: 'd', label: 'A mountain climber C' },
    ],
    answerId: 'a',
    explain: 'The still is a stacked handstand, not a wall banana.',
  },
  {
    shapeId: 'passe',
    prompt: 'In this still, passé itself is:',
    choices: [
      { id: 'a', label: 'Two bent knees and a C' },
      { id: 'b', label: 'Knee pulled up, stance leg straight' },
      { id: 'c', label: 'A landing lunge with a flat back heel' },
      { id: 'd', label: 'A hollow on the floor' },
    ],
    answerId: 'b',
    explain: 'Passé: pull the knee up, keep the stance leg straight, then fall into the longer starting lunge.',
  },
]

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j]!, a[i]!]
  }
  return a
}

function labelFor(id: string): string {
  return samePositionDisplayName(id)
}

function photoFor(photos: ReferencePhoto[], shapeId: string): ReferencePhoto | null {
  return pickReferencePhoto(photos, shapeId, null)
}

function lookalikeQuestion(
  photos: ReferencePhoto[],
  group: string[],
  index: number,
): StudyQuestion | null {
  const withStill = group
    .map((id) => ({ id, shape: getShape(id), photo: photoFor(photos, id) }))
    .filter((row): row is { id: string; shape: ShapeDef; photo: ReferencePhoto } =>
      Boolean(row.shape && row.photo?.dataUrl),
    )
  if (withStill.length < 2) return null
  const pick = withStill[index % withStill.length]!
  const options = shuffle(withStill.map((row) => row.id)).slice(0, 4)
  if (!options.includes(pick.id)) options[0] = pick.id
  return {
    id: `s2_id_${pick.id}_${index}`,
    lessonId: pick.id,
    prompt: 'These look alike. Which position is this still?',
    photoUrl: pick.photo.dataUrl,
    stillId: pick.photo.id,
    choices: shuffle(options).map((id) => ({ id, label: labelFor(id) })),
    answerId: pick.id,
    explain: `${labelFor(pick.id)} — look at heel, knees, and whether the back is a C or a long line.`,
  }
}

function detailQuestion(photos: ReferencePhoto[], ask: DetailAsk, index: number): StudyQuestion | null {
  const photo = photoFor(photos, ask.shapeId)
  if (!photo?.dataUrl) return null
  return {
    id: `s2_dt_${ask.shapeId}_${index}`,
    lessonId: ask.shapeId,
    prompt: ask.prompt,
    photoUrl: photo.dataUrl,
    stillId: photo.id,
    choices: shuffle(ask.choices),
    answerId: ask.answerId,
    explain: ask.explain,
  }
}

export function buildShapeTwoQuiz(photos: ReferencePhoto[]): StudyQuestion[] {
  const picture: StudyQuestion[] = []
  HARD_GROUPS.forEach((group, i) => {
    const q = lookalikeQuestion(photos, group, i)
    if (q) picture.push(q)
  })
  shuffle(DETAILS).forEach((ask, i) => {
    const q = detailQuestion(photos, ask, i)
    if (q) picture.push(q)
  })
  const mixed = shuffle(picture).slice(0, 10)
  if (mixed.length >= 8) return mixed
  const text = buildFrom(SHAPE_BODY_QUIZ_BANK, 12 - mixed.length)
  return shuffle([...mixed, ...text]).slice(0, 12)
}
