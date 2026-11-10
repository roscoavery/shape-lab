/**
 * Shape test 2 — rebuilt from Ryan's approved rework draft (build 1237).
 * The old bank (lookalike job descriptions + fault details) is gone entirely.
 * Every question here does one of the jobs Ryan named: tell two shapes apart,
 * pick which shape a moment calls for, sort shapes into families, or spot the
 * same shape turned a different way. Wording is the draft's wording.
 *
 * Comparison questions carry two stills, shown side by side, and are
 * answered by tapping the still itself: the shape names never appear as
 * answer buttons, or the prompt would give the answer away. The question
 * carries stillChoiceIds, the shape id of each still in display order.
 * Family-sorting questions are pick-all-that-fit
 * (answerIds). The side plank vs side support comparison is deliberately NOT
 * in this bank: the draft flags it "draft answer only" and it ships only with
 * Ryan's words for the tell, which he has not given.
 */

import { pickReferencePhoto } from './shippedRefs'
import type { StudyQuestion } from './studyQuiz'
import type { ReferencePhoto } from '../types'

type BankChoice = { id: string; label: string }

type BankEntry = {
  id: string
  topic: string
  prompt: string
  choices: BankChoice[]
  /** Single-answer questions: the correct choice id. */
  answerId: string
  /** Pick-all-that-fit questions: the exact correct set. */
  answerIds?: string[]
  explain: string
  /** Comparison questions: the two shape ids whose stills show side by side. */
  stills?: [string, string]
}

export const SHAPE_TWO_BANK: BankEntry[] = [
  // 1. Mountain climber vs lunge
  {
    id: 's2-t1-compare',
    topic: 's2-mountain-climber',
    prompt: 'Both stills show one foot in front of the other. Which still is the mountain climber?',
    choices: [
      { id: 'mountain_climber', label: 'Mountain climber' },
      { id: 'lunge_land', label: 'Lunge' },
    ],
    answerId: 'mountain_climber',
    explain: 'Two bent knees and a rounded C upper body. The lunge keeps the back leg straight.',
    stills: ['mountain_climber', 'lunge_land'],
  },
  {
    id: 's2-t1-step',
    topic: 's2-mountain-climber',
    prompt:
      'An athlete steps forward and the back knee bends while the upper body rounds into a C. What shape did they just make?',
    choices: [
      { id: 'a', label: 'A lunge' },
      { id: 'b', label: 'A mountain climber' },
      { id: 'c', label: 'A landing' },
      { id: 'd', label: 'A lever' },
    ],
    answerId: 'b',
    explain:
      'A bent back knee plus a C upper body is the mountain climber, even if the athlete meant to lunge.',
  },
  {
    id: 's2-t1-pause',
    topic: 's2-mountain-climber',
    prompt: 'An athlete pauses in a mountain climber instead of passing through it. What can they do from there?',
    choices: [
      { id: 'a', label: 'Start a handstand, a cartwheel, a round off, or other skills' },
      { id: 'b', label: 'Nothing, it is pass through only' },
      { id: 'c', label: 'Only finish a skill in it' },
      { id: 'd', label: 'Only roll out of it' },
    ],
    answerId: 'a',
    explain:
      'It is commonly meant to be used as a pass through, but it is not pass through only. Ryan teaches athletes to pause in the shape and to start a handstand, a cartwheel, or a round off from that shape, and it is not limited to those.',
  },
  // 2. Starting lunge vs landing lunge
  {
    id: 's2-t2-compare',
    topic: 's2-lunges',
    prompt: 'Both stills are lunges. Which one is the starting lunge?',
    choices: [
      { id: 'lunge_start', label: 'Starting lunge' },
      { id: 'lunge_land', label: 'Landing lunge' },
    ],
    answerId: 'lunge_start',
    explain: 'Look at the back heel. Up means start. Flat means landing. The starting stance is also longer.',
    stills: ['lunge_start', 'lunge_land'],
  },
  {
    id: 's2-t2-heel',
    topic: 's2-lunges',
    prompt: 'Which lunge has the back heel down?',
    choices: [
      { id: 'lunge_start', label: 'Starting lunge' },
      { id: 'lunge_land', label: 'Landing lunge' },
    ],
    answerId: 'lunge_land',
    explain: 'Back heel flat.',
  },
  {
    id: 's2-t2-finish',
    topic: 's2-lunges',
    prompt: 'A cartwheel finishes. Which finish is usual for it?',
    choices: [
      { id: 'a', label: 'A landing lunge or a zombie' },
      { id: 'b', label: 'A mountain climber' },
      { id: 'c', label: 'A C shape' },
      { id: 'd', label: 'A lightning bolt' },
    ],
    answerId: 'a',
    explain:
      'A handstand or a cartwheel usually finishes in a landing lunge or a zombie. That does not mean every skill finishes in one of those. Other skills finish in other positions.',
  },
  // 3. C shape vs mountain climber
  {
    id: 's2-t3-compare',
    topic: 's2-c-shape',
    prompt: 'Both stills show a rounded upper body. Which still is the C shape?',
    choices: [
      { id: 'c_shape', label: 'C shape' },
      { id: 'mountain_climber', label: 'Mountain climber' },
    ],
    answerId: 'c_shape',
    explain:
      'The C shape is a squat with hips under and feet together, no step. The mountain climber has taken a step forward out of it.',
    stills: ['c_shape', 'mountain_climber'],
  },
  {
    id: 's2-t3-step',
    topic: 's2-c-shape',
    prompt: 'What turns a C shape into a mountain climber?',
    choices: [
      { id: 'a', label: 'Straightening the back leg' },
      { id: 'b', label: 'One medium step forward' },
      { id: 'c', label: 'Putting the hands on the floor' },
      { id: 'd', label: 'Opening the shoulders' },
    ],
    answerId: 'b',
    explain: 'That is the app wording for what a mountain climber is.',
  },
  // 4. Tuck shape vs tucked candle
  {
    id: 's2-t4-compare',
    topic: 's2-tuck',
    prompt: 'Both stills show a tucked shape. Which one is the tucked candle?',
    choices: [
      { id: 'tuck_open_shoulders', label: 'Tuck' },
      { id: 'tucked_candle', label: 'Tucked candle' },
    ],
    answerId: 'tucked_candle',
    explain:
      'In the candle the athlete has rolled back and the weight sits on the shoulders and arms. In the tuck the athlete is still sitting up.',
    stills: ['tuck_open_shoulders', 'tucked_candle'],
  },
  {
    id: 's2-t4-same',
    topic: 's2-tuck',
    prompt: 'What is the same in a tuck and a tucked candle?',
    choices: [
      { id: 'a', label: 'The knees are bent and pulled in the same way' },
      { id: 'b', label: 'The legs are straight in both' },
      { id: 'c', label: 'The weight is on the shoulders in both' },
      { id: 'd', label: 'The arms point at the floor in both' },
    ],
    answerId: 'a',
    explain: 'One shape, two places. That idea comes back in topic 8.',
  },
  {
    id: 's2-t4-drill',
    topic: 's2-tuck',
    prompt: 'A drill has an athlete roll back and hold the tuck balanced on their shoulders. What shape are they holding?',
    choices: [
      { id: 'a', label: 'Seated tuck' },
      { id: 'b', label: 'Tucked candle' },
      { id: 'c', label: 'Candlestick' },
      { id: 'd', label: 'Pike' },
    ],
    answerId: 'b',
    explain:
      'The app names the tucked candle as the shape used to teach forward and backward rolls and a lot of back tuck drills.',
  },
  // 5. When certain shapes might be used
  {
    id: 's2-t5-roundoff',
    topic: 's2-when-used',
    prompt:
      'An athlete lands a round off and needs to get the chest up and stand out of it. Which shape is that landing?',
    choices: [
      { id: 'a', label: 'Zombie' },
      { id: 'b', label: 'Mountain climber' },
      { id: 'c', label: 'Lightning bolt' },
      { id: 'd', label: 'C shape' },
    ],
    answerId: 'a',
    explain:
      'The app names zombie as the landing for cartwheel step ins, round offs, and handsprings, and says it helps get the chest up out of a round off to a stand.',
  },
  {
    id: 's2-t5-bhs',
    topic: 's2-when-used',
    prompt:
      'An athlete is connecting into a back handspring and dips into a bend with a rounded torso and arms reaching forward. Which shape is that?',
    choices: [
      { id: 'a', label: 'Landing lunge' },
      { id: 'b', label: 'C shape' },
      { id: 'c', label: 'Front support' },
      { id: 'd', label: 'Side plank' },
    ],
    answerId: 'b',
    explain: 'The app says the C shape is used to connect into a back handspring.',
  },
  // 6. Lightning bolt vs C shape
  {
    id: 's2-t6-compare',
    topic: 's2-lightning-bolt',
    prompt: 'Both stills show bent knees and a chest leaning forward. Which still is the lightning bolt?',
    choices: [
      { id: 'gym_lightning_bolt', label: 'Lightning bolt' },
      { id: 'c_shape', label: 'C shape' },
    ],
    answerId: 'gym_lightning_bolt',
    explain:
      'In the lightning bolt the line from the hips to the hands stays unbroken. In the C shape the torso rounds into a hollow and the arms reach forward out of a squat.',
    stills: ['gym_lightning_bolt', 'c_shape'],
  },
  {
    id: 's2-t6-use',
    topic: 's2-lightning-bolt',
    prompt: 'What is lightning bolt used for?',
    choices: [
      { id: 'a', label: 'Landing a round off' },
      { id: 'b', label: 'An introduction to breaking down a back handspring' },
      { id: 'c', label: 'Finishing a cartwheel' },
      { id: 'd', label: 'A conditioning hold' },
    ],
    answerId: 'b',
    explain:
      'Useful for the intro to back handspring deconstruction, and not a good position to land a round off.',
  },
  // 7. Plank vs support (side plank vs side support omitted: the draft flags it
  // draft-only and it ships only with Ryan's words for the tell)
  {
    id: 's2-t7-compare',
    topic: 's2-plank-support',
    prompt: 'Both stills face the floor in a straight line. Which still is the front plank?',
    choices: [
      { id: 'front_plank', label: 'Front plank' },
      { id: 'gym_front_support', label: 'Front support' },
    ],
    answerId: 'front_plank',
    explain:
      'The plank rests on the forearms with the elbows under the shoulders. The support is up on the hands with straight arms.',
    stills: ['front_plank', 'gym_front_support'],
  },
  {
    id: 's2-t7-difference',
    topic: 's2-plank-support',
    prompt: 'What is the difference between a front plank and a front support?',
    choices: [
      { id: 'a', label: 'The plank is on the forearms and the support is on the hands' },
      { id: 'b', label: 'The plank has bent knees and the support has straight knees' },
      { id: 'c', label: 'The plank faces up and the support faces down' },
      { id: 'd', label: 'There is no difference' },
    ],
    answerId: 'a',
    explain: 'Both hold a straight line from head to heels. The base is what changes.',
  },
  // 8. Same shape, different orientation
  {
    id: 's2-t8-hollow-line',
    topic: 's2-same-shape',
    prompt: 'Front support, zombie, and candlestick are the same shape three ways. What stays the same in all three?',
    choices: [
      { id: 'a', label: 'A hollow straight line with the ribs in' },
      { id: 'b', label: 'Bent knees pulled in tight' },
      { id: 'c', label: 'An arched back with the hips pushed up' },
      { id: 'd', label: 'One foot in front of the other' },
    ],
    answerId: 'a',
    explain: 'Same idea as candlestick and front support, just standing upright.',
  },
  {
    id: 's2-t8-turn',
    topic: 's2-same-shape',
    prompt:
      'An athlete holds a hollow line standing up with arms reaching forward. Turn that same shape upside down onto the shoulders and what is it?',
    choices: [
      { id: 'a', label: 'Candlestick' },
      { id: 'b', label: 'Mountain climber' },
      { id: 'c', label: 'Long bridge' },
      { id: 'd', label: 'Tucked candle' },
    ],
    answerId: 'a',
    explain: 'Standing it is a zombie. On the hands it is a front support. On the shoulders it is a candlestick.',
  },
  {
    id: 's2-t8-tuck-family',
    topic: 's2-same-shape',
    prompt: 'Tuck, tucked candle, and mad cat are the same tuck family. What do all three share?',
    choices: [
      { id: 'a', label: 'Knees bent and pulled in with a rounded back' },
      { id: 'b', label: 'Straight legs and open hips' },
      { id: 'c', label: 'A straight line from hands to toes' },
      { id: 'd', label: 'Arms pressed overhead' },
    ],
    answerId: 'a',
    explain:
      'Seated it is a tuck. Rolled back onto the shoulders it is a tucked candle. On hands and knees with the spine rounded it is a mad cat.',
  },
  {
    id: 's2-t8-ftos',
    topic: 's2-same-shape',
    prompt: 'Feet together open shoulders, stood upside down on the hands, is what shape?',
    choices: [
      { id: 'handstand', label: 'Handstand' },
      { id: 'wall_sit', label: 'Wall sit' },
      { id: 'gym_front_support', label: 'Front support' },
      { id: 'lever', label: 'Lever' },
    ],
    answerId: 'handstand',
    explain:
      'Both are one long straight line with ribs in and open shoulders. Standing, the line runs from feet to hands overhead. In a handstand the same line runs from hands to toes.',
    stills: ['feet_together_open_shoulders', 'handstand'],
  },
  {
    id: 's2-t8-ftos-same',
    topic: 's2-same-shape',
    prompt: 'What stays the same between feet together open shoulders and a handstand?',
    choices: [
      { id: 'a', label: 'One long straight line, ribs in, open shoulders, straight knees' },
      { id: 'b', label: 'The hands are on the floor in both' },
      { id: 'c', label: 'The knees bend in both' },
      { id: 'd', label: 'The back rounds in both' },
    ],
    answerId: 'a',
    explain: 'Only the base changes. Feet on the floor in one, hands on the floor in the other.',
  },
  {
    id: 's2-t8-lever',
    topic: 's2-same-shape',
    prompt: 'Both stills make an L. Which still is the L handstand?',
    choices: [
      { id: 'lever', label: 'Lever' },
      { id: 'l_handstand', label: 'L handstand' },
    ],
    answerId: 'l_handstand',
    explain:
      'The L handstand is upside down on the hands, with one line vertical through the arms and torso and the legs near horizontal. The lever is standing on one foot, with the chest near parallel and the back leg lifted.',
    stills: ['lever', 'l_handstand'],
  },
  {
    id: 's2-t8-lever-same',
    topic: 's2-same-shape',
    prompt: 'A lever and an L handstand are very similar positions with a different orientation. What stays the same in both?',
    choices: [
      { id: 'a', label: 'An L, with one line near vertical and one line near horizontal' },
      { id: 'b', label: 'Knees bent and pulled in tight in both' },
      { id: 'c', label: 'A rounded hollow back in both' },
      { id: 'd', label: 'Both feet on the floor in both' },
    ],
    answerId: 'a',
    explain:
      'In a lever the athlete stands on the front foot with a slight bend in that knee, the chest tilts near parallel, and the back leg lifts so the line runs from the back foot toward the hands. Turn that L onto the hands and it is an L handstand, arms and torso vertical with the legs near horizontal. Only the base and the orientation change.',
  },
  // 9. Hollow variations vs arch variations
  {
    id: 's2-t9-hollow',
    topic: 's2-families',
    prompt: 'Which of these shapes are hollow variations? Pick all that fit.',
    choices: [
      { id: 'hollow_arms_down', label: 'Hollow, arms down' },
      { id: 'zombie', label: 'Zombie' },
      { id: 'superman', label: 'Superman' },
      { id: 'c_shape', label: 'C shape' },
    ],
    answerId: 'hollow_arms_down',
    answerIds: ['hollow_arms_down', 'zombie', 'c_shape'],
    explain:
      'The app calls zombie a standing hollow and the C shape a squat with a hollow rounded torso. Superman lifts into an arch, so it does not fit.',
  },
  {
    id: 's2-t9-arch',
    topic: 's2-families',
    prompt: 'Which of these shapes are arch variations? Pick all that fit.',
    choices: [
      { id: 'arch', label: 'Tight arch' },
      { id: 'hollow_arms_up', label: 'Hollow, arms up' },
      { id: 'rainbow_bridge', label: 'Rainbow bridge' },
      { id: 'long_bridge', label: 'Long bridge' },
    ],
    answerId: 'arch',
    answerIds: ['arch', 'rainbow_bridge', 'long_bridge'],
    explain:
      'The app says the rainbow bridge spreads the arch through every joint, and the long bridge is an arched shape whose less arched version is the flight to hands shape in a back handspring. Hollow arms up is the same hollow as arms down with a longer lever.',
  },
  {
    id: 's2-t9-on-back',
    topic: 's2-families',
    prompt:
      'An athlete is on their back with the lower back pressed to the floor and the feet lifted. Which family is that shape in?',
    choices: [
      { id: 'a', label: 'Hollow family' },
      { id: 'b', label: 'Arch family' },
    ],
    answerId: 'a',
    explain:
      'That is the hollow hold from its app description, lower back compressed to the floor, and the app names it a tumbling staple for round offs, back handsprings, whips, layouts, and fulls.',
  },
  {
    id: 's2-t9-face-down',
    topic: 's2-families',
    prompt:
      'An athlete is face down with the chin up, straight arms behind the ears, and straight knees lifted off the ground. Which family is that shape in?',
    choices: [
      { id: 'a', label: 'Hollow family' },
      { id: 'b', label: 'Arch family' },
    ],
    answerId: 'b',
    explain: 'That is the superman, a prone arch hold. Same floor, opposite bend from the hollow.',
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

/**
 * Same position under a gym-library id: the L handstand still ships as
 * gym_l_handstand, so the scored l_handstand falls back to it.
 */
const STILL_ALIASES: Record<string, string[]> = {
  l_handstand: ['gym_l_handstand'],
}

function photoFor(photos: ReferencePhoto[], shapeId: string): ReferencePhoto | null {
  const direct = pickReferencePhoto(photos, shapeId, null)
  if (direct?.dataUrl) return direct
  for (const alias of STILL_ALIASES[shapeId] ?? []) {
    const p = pickReferencePhoto(photos, alias, null)
    if (p?.dataUrl) return p
  }
  return null
}

function buildQuestion(photos: ReferencePhoto[], entry: BankEntry): StudyQuestion | null {
  let photoUrl: string | null = null
  let stillId: string | null = null
  let photoUrl2: string | null = null
  let stillId2: string | null = null
  let stillChoiceIds: [string, string] | undefined
  if (entry.stills) {
    const stills = entry.stills
    // Vary which still sits on the left so the position cannot be memorized.
    const [first, second] = shuffle(stills)
    const pa = photoFor(photos, first!)
    const pb = photoFor(photos, second!)
    // A comparison question without both stills is meaningless: skip it.
    if (!pa?.dataUrl || !pb?.dataUrl) return null
    photoUrl = pa.dataUrl
    stillId = pa.id
    photoUrl2 = pb.dataUrl
    stillId2 = pb.id
    // Tap-the-still questions only: the two choices ARE the two stills, so
    // the answer is picking a still, not matching a name in the prompt.
    // A two-still question whose choices are something else (s2-t8-ftos:
    // four shape names, the stills just show one shape two ways) keeps its
    // text buttons. The ids ride with the shuffled stills, so tapping the
    // left still always answers the shape that still shows.
    if (
      entry.choices.length === 2 &&
      entry.choices.every((c) => stills.includes(c.id))
    ) {
      stillChoiceIds = [first!, second!]
    }
  }
  return {
    id: entry.id,
    lessonId: entry.topic,
    prompt: entry.prompt,
    choices: shuffle(entry.choices),
    answerId: entry.answerId,
    ...(entry.answerIds ? { answerIds: [...entry.answerIds] } : {}),
    explain: entry.explain,
    photoUrl,
    stillId,
    photoUrl2,
    stillId2,
    ...(stillChoiceIds ? { stillChoiceIds } : {}),
  }
}

export function buildShapeTwoQuiz(photos: ReferencePhoto[]): StudyQuestion[] {
  const built: StudyQuestion[] = []
  for (const entry of SHAPE_TWO_BANK) {
    const q = buildQuestion(photos, entry)
    if (q) built.push(q)
  }
  // Text questions always resolve, so the pool is never short: 10 at a time.
  return shuffle(built).slice(0, 10)
}
