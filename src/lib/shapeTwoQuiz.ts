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
    prompt: 'What lower-body picture matches this still?',
    choices: [
      { id: 'a', label: 'A long open line and a straight back leg' },
      { id: 'b', label: 'Both knees bent and a rounded C' },
      { id: 'c', label: 'A flat back heel and a long back line' },
      { id: 'd', label: 'One knee pulled up, stance leg straight' },
    ],
    answerId: 'b',
    explain: 'Mountain climber is pass-through only: two bent knees and a C. Never a finish.',
  },
  {
    shapeId: 'hollow_arms_down',
    prompt: 'Where are the arms relative to the trunk in this still?',
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
    prompt: 'Same trunk as the other floor hold. Where are the arms?',
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
      { id: 'd', label: 'A short split stance, one heel flat' },
    ],
    answerId: 'a',
    explain: 'Superman is prone. A tumbling arch is a different shape and a different relationship to the floor.',
  },
  {
    shapeId: 'lunge_start',
    prompt: 'Compared with a short finish stance, this stance should be:',
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
    prompt: 'On this split stance the back leg should be:',
    choices: [
      { id: 'a', label: 'Bent with a rounded C' },
      { id: 'b', label: 'Straight' },
      { id: 'c', label: 'In passé' },
      { id: 'd', label: 'In a pike' },
    ],
    answerId: 'b',
    explain: 'Both lunges keep the back leg straight. A bent back knee turns it into a mountain climber.',
  },
  {
    shapeId: 'candlestick',
    prompt: 'How are the legs organized in this still?',
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
    prompt: 'What line should this inverted still show?',
    choices: [
      { id: 'a', label: 'Stacked: ribs in, butt in, ears covered, toes pointed' },
      { id: 'b', label: 'Stomach toward a wall, banana back' },
      { id: 'c', label: 'Shoulders stacked, knees pulled in' },
      { id: 'd', label: 'Two bent knees and a rounded C' },
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
  const cues: Record<string, string> = {
    lunge_start: 'Longer stance · back heel up · back leg long',
    lunge_land: 'Shorter stance · back heel flat · back leg long',
    mountain_climber: 'Two bent knees · rounded C · not a finish',
    hollow_arms_down: 'On the back · ribs in · arms by the sides',
    hollow_arms_up: 'On the back · ribs in · arms by the ears',
    candlestick: 'Shoulders stacked · legs long toward the ceiling',
    tucked_candle: 'Shoulders stacked · knees pulled in',
    seated_pike: 'Seated · legs together and long · arms covering the ears',
    pike_open_shoulders: 'Seated · legs long · chest open toward the toes',
    handstand: 'Inverted · stacked line · no wall',
    wall_handstand: 'Inverted · wall nearby · banana is common',
    arch: 'Belly down · hips lifting · a C in the back',
    superman: 'Belly down · hips long · arms by the ears',
    zombie: 'Standing · shrugged shoulders · arms covering the ears',
    stand_clean: 'Standing · arms pinned to the sides',
    tuck: 'Knees in · rounded · arms covering the ears',
    tuck_open_shoulders: 'Knees in · chest open',
  }
  return cues[id] ?? samePositionDisplayName(id)
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
    prompt: 'Same picture family. Which body picture matches this still?',
    photoUrl: pick.photo.dataUrl,
    stillId: pick.photo.id,
    choices: shuffle(options).map((id) => ({ id, label: labelFor(id) })),
    answerId: pick.id,
    explain: `${labelFor(pick.id)}. Check heel, knees, and whether the back is a C or a long line.`,
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
