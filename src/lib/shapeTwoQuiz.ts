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
    prompt: 'This is a fall stance. If the back heel slaps flat too soon, what usually went wrong?',
    choices: [
      { id: 'a', label: 'They shortened the stance and stopped the fall early' },
      { id: 'b', label: 'They pointed the front toes too hard' },
      { id: 'c', label: 'They looked at the ceiling' },
      { id: 'd', label: 'They used zombie arms' },
    ],
    answerId: 'a',
    explain: 'The starting lunge is long and the back heel stays up. A flat heel means they already finished — too short, too soon.',
  },
  {
    shapeId: 'lunge_land',
    prompt: 'A finish stance fails if the back knee softens. Why?',
    choices: [
      { id: 'a', label: 'It turns the finish into a pass-through C' },
      { id: 'b', label: 'The front heel has to lift' },
      { id: 'c', label: 'The arms have to drop' },
      { id: 'd', label: 'They cannot look at their hands' },
    ],
    answerId: 'a',
    explain: 'A landing lunge keeps a straight back leg. Bend that knee and you built a mountain climber, not a finish.',
  },
  {
    shapeId: 'mountain_climber',
    prompt: 'When is this shape allowed in tumbling?',
    choices: [
      { id: 'a', label: 'Only as a pass-through — never as the finish they hold' },
      { id: 'b', label: 'As the finish of every cartwheel' },
      { id: 'c', label: 'As the start of a back handspring' },
      { id: 'd', label: 'Whenever they want a rest' },
    ],
    answerId: 'a',
    explain: 'Two bent knees and a C is travel. Finishes live in a split stance or a stand.',
  },
  {
    shapeId: 'hollow_arms_down',
    prompt: 'If the low back peels off the floor here, the first fix is:',
    choices: [
      { id: 'a', label: 'Posterior tilt — ribs down, belt buckle toward the nose' },
      { id: 'b', label: 'Reach the arms higher' },
      { id: 'c', label: 'Lift the chin and look at the toes' },
      { id: 'd', label: 'Bend the knees into a tuck' },
    ],
    answerId: 'a',
    explain: 'Hollow is a trunk job first. Arms are a lever. If the back leaves the floor, shorten the lever and find the tilt before you add time.',
  },
  {
    shapeId: 'hollow_arms_up',
    prompt: 'Same trunk job as the short-lever hollow. What usually fails first when the lever gets longer?',
    choices: [
      { id: 'a', label: 'The ribs pop and the low back leaves the floor' },
      { id: 'b', label: 'The toes stop pointing' },
      { id: 'c', label: 'They look at the ceiling' },
      { id: 'd', label: 'The stance gets shorter' },
    ],
    answerId: 'a',
    explain: 'Arms-up hollow keeps the same posterior tilt. A longer lever just makes the tilt harder to hold.',
  },
  {
    shapeId: 'superman',
    prompt: 'This hold is the opposite of a hollow. What job are the hips doing?',
    choices: [
      { id: 'a', label: 'Stay long and lifted — not a tumbling C' },
      { id: 'b', label: 'Posterior tilt like a hollow' },
      { id: 'c', label: 'Stack over the shoulders' },
      { id: 'd', label: 'Finish a cartwheel' },
    ],
    answerId: 'a',
    explain: 'Superman is a long prone hold. A tumbling arch is a different shape and a different relationship to the floor.',
  },
  {
    shapeId: 'lunge_start',
    prompt: 'This stance is the fall. What happens if they stand it up like a finish?',
    choices: [
      { id: 'a', label: 'They cut the travel short and lose the pass' },
      { id: 'b', label: 'The front heel has to lift' },
      { id: 'c', label: 'The arms have to drop' },
      { id: 'd', label: 'They cannot look at their hands' },
    ],
    answerId: 'a',
    explain: 'Starting lunge is the longer fall from passé. Standing it up early turns the fall into a stuck finish.',
  },
  {
    shapeId: 'lunge_land',
    prompt: 'This is the stuck finish. What would turn it back into travel?',
    choices: [
      { id: 'a', label: 'Soften the back knee into a C' },
      { id: 'b', label: 'Point the front toes harder' },
      { id: 'c', label: 'Cover the ears' },
      { id: 'd', label: 'Look at the hands' },
    ],
    answerId: 'a',
    explain: 'A landing lunge keeps a straight back leg. Bend that knee and you built a mountain climber, not a finish.',
  },
  {
    shapeId: 'candlestick',
    prompt: 'This inversion is a stack, not a sit-up. What job keeps it a candle?',
    choices: [
      { id: 'a', label: 'Hips over shoulders, legs long — hold the line' },
      { id: 'b', label: 'Pull the knees in to rest' },
      { id: 'c', label: 'Roll the belly toward the floor' },
      { id: 'd', label: 'Turn it into a short split stance' },
    ],
    answerId: 'a',
    explain: 'Candlestick is a long inverted stack. Tucking the knees changes the job to tucked candle.',
  },
  {
    shapeId: 'tucked_candle',
    prompt: 'Same stack as a long candle. Why would you shorten the legs?',
    choices: [
      { id: 'a', label: 'Cut the lever while the hips still sit over the shoulders' },
      { id: 'b', label: 'Drop the arms to the sides' },
      { id: 'c', label: 'Roll onto the belly' },
      { id: 'd', label: 'Turn the stance into a lunge' },
    ],
    answerId: 'a',
    explain: 'Tucked candle keeps the shoulder stack and shortens the legs so they can find the inversion first.',
  },
  {
    shapeId: 'zombie',
    prompt: 'This is a standing hollow. What job are the arms doing?',
    choices: [
      { id: 'a', label: 'Cover the ears, ribs in, eyes through the hands' },
      { id: 'b', label: 'Open a high V and lift the chest' },
      { id: 'c', label: 'Rest by the sides so the neck can look up' },
      { id: 'd', label: 'Reach a T so the shoulders can drop' },
    ],
    answerId: 'a',
    explain: 'Zombie is a standing hollow. Shoulders shrugged, arms covering the ears, eyes toward where they came from.',
  },
  {
    shapeId: 'seated_pike',
    prompt: 'This is a seated hollow. What fails the pike first?',
    choices: [
      { id: 'a', label: 'Soft knees or a popped chest' },
      { id: 'b', label: 'Arms covering the ears' },
      { id: 'c', label: 'Pointed toes' },
      { id: 'd', label: 'Looking at the hands' },
    ],
    answerId: 'a',
    explain: 'Pike with zombie arms: long legs, upright hollow chest. Soft knees or an open chest dump the hollow.',
  },
  {
    shapeId: 'handstand',
    prompt: 'This inversion is a stack. What usually makes it a banana?',
    choices: [
      { id: 'a', label: 'Ribs and butt leave the line' },
      { id: 'b', label: 'The toes stay pointed' },
      { id: 'c', label: 'The ears stay covered' },
      { id: 'd', label: 'The shoulders stay shrugged' },
    ],
    answerId: 'a',
    explain: 'The still is a stacked handstand. Banana is ribs and hips leaving the line, not a missing pointed toe.',
  },
  {
    shapeId: 'passe',
    prompt: 'This is the pull before the fall. What job is the standing leg doing?',
    choices: [
      { id: 'a', label: 'Stay straight while the other knee comes up' },
      { id: 'b', label: 'Bend into a C so they can travel' },
      { id: 'c', label: 'Flatten the back heel like a finish' },
      { id: 'd', label: 'Hollow on the floor' },
    ],
    answerId: 'a',
    explain: 'Passé: pull the knee up, keep the stance leg straight, then fall into the longer starting lunge.',
  },
  {
    shapeId: 'arch',
    prompt: 'This is a tumbling C on the belly. What job are the hips doing that Superman does not?',
    choices: [
      { id: 'a', label: 'Lift and fold so the back can bend' },
      { id: 'b', label: 'Stay long and quiet' },
      { id: 'c', label: 'Stack over the shoulders' },
      { id: 'd', label: 'Finish a split stance' },
    ],
    answerId: 'a',
    explain: 'Arch is a prone C. Superman stays long. If the hips do not lift, you built the wrong hold.',
  },
  {
    shapeId: 'pike_open_shoulders',
    prompt: 'Same seated pike, different arm job. What are the shoulders doing here?',
    choices: [
      { id: 'a', label: 'Reaching the chest open instead of covering the ears' },
      { id: 'b', label: 'Shrugging into a standing hollow' },
      { id: 'c', label: 'Holding a wall banana' },
      { id: 'd', label: 'Resting by the hips' },
    ],
    answerId: 'a',
    explain: 'Open-shoulder pike keeps the long legs. The chest reaches open instead of zombie-covering the ears.',
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
    lunge_start: 'The fall — longer, still traveling',
    lunge_land: 'The finish — shorter, they stuck it',
    mountain_climber: 'Only a pass-through, never a hold',
    hollow_arms_down: 'Short lever hollow — easier to keep the back down',
    hollow_arms_up: 'Long lever hollow — same trunk, harder hold',
    candlestick: 'Long inverted stack on the shoulders',
    tucked_candle: 'Same stack, legs shortened',
    seated_pike: 'Seated hollow with a closed pike',
    pike_open_shoulders: 'Seated pike reaching the chest open',
    handstand: 'Free stacked inversion',
    wall_handstand: 'Inversion that uses a wall — banana is the usual miss',
    arch: 'Prone C — hips lift, back bends',
    superman: 'Prone long — hips stay long, not a tumbling arch',
    zombie: 'Standing hollow',
    stand_clean: 'Quiet stand, arms pinned',
    tuck: 'Closed tuck, rounded',
    tuck_open_shoulders: 'Tuck with the chest open',
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
    prompt: 'These shapes get mixed up. What job is this still doing — not just what it looks like?',
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
