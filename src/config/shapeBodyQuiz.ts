import type { PhysicsQuizItem } from './physicsQuiz'

/** Shape test 2: body-position distinctions, not “name this still.” */
export const SHAPE_BODY_QUIZ_BANK: PhysicsQuizItem[] = [
  {
    id: 'heel-up',
    lessonId: 'lunge_start',
    prompt: 'Which lunge asks for the back heel UP on the ball of the foot?',
    choices: [
      { id: 'a', label: 'Starting lunge' },
      { id: 'b', label: 'Landing lunge' },
      { id: 'c', label: 'Mountain climber' },
      { id: 'd', label: 'Both lunges' },
    ],
    answerId: 'a',
    explain:
      'Starting lunge is the only one of these that requires the back heel up. Landing lunge presses the back heel flat. Mountain climber is not a finish lunge.',
  },
  {
    id: 'heel-flat',
    lessonId: 'lunge_land',
    prompt: 'Landing lunge is shorter than the start and the back heel is:',
    choices: [
      { id: 'a', label: 'Up on the ball of the foot' },
      { id: 'b', label: 'Flat on the floor' },
      { id: 'c', label: 'Rolled in on the arch' },
      { id: 'd', label: 'Off the floor like a kick' },
    ],
    answerId: 'b',
    explain: 'Landing lunge: shorter stance, back heel flat, back leg straight, open shoulders. Do not roll in on the arch.',
  },
  {
    id: 'two-knees',
    lessonId: 'mountain_climber',
    prompt: 'Mountain climber is different from both lunges because:',
    choices: [
      { id: 'a', label: 'The back heel is flat and the back is a long open line' },
      { id: 'b', label: 'Both knees bend and the upper body is a tumbling C' },
      { id: 'c', label: 'It is the finish for every cartwheel' },
      { id: 'd', label: 'The back leg stays straight and the heel stays up' },
    ],
    answerId: 'b',
    explain:
      'Mountain climber: two bent knees, C upper body, reach from the middle out. It is a pass-through, never a finish. A lunge has a straight back leg and a straight back.',
  },
  {
    id: 'not-finish',
    lessonId: 'mountain_climber',
    prompt: 'We never finish a tumbling skill in:',
    choices: [
      { id: 'a', label: 'Landing lunge' },
      { id: 'b', label: 'Starting lunge' },
      { id: 'c', label: 'Mountain climber' },
      { id: 'd', label: 'Stand clean' },
    ],
    answerId: 'c',
    explain: 'Mountain climber is pass-through only. Finishes live in a lunge or a stand, not in a C with two bent knees.',
  },
  {
    id: 'stance-length',
    lessonId: 'lunge_start',
    prompt: 'Compared with a landing lunge, a starting lunge stance is:',
    choices: [
      { id: 'a', label: 'Shorter, heels closer' },
      { id: 'b', label: 'Longer' },
      { id: 'c', label: 'The same length' },
      { id: 'd', label: 'A straddle' },
    ],
    answerId: 'b',
    explain: 'Starting lunge is the longer fall from passé. Landing lunge is shorter, heels closer, back heel flat.',
  },
  {
    id: 'c-vs-line',
    lessonId: 'mountain_climber',
    prompt: 'A long open diagonal from the back foot through the hands is the picture for:',
    choices: [
      { id: 'a', label: 'Mountain climber' },
      { id: 'b', label: 'A starting or landing lunge with open shoulders' },
      { id: 'c', label: 'A tucked candle' },
      { id: 'd', label: 'A hollow on the back' },
    ],
    answerId: 'b',
    explain:
      'Both lunges want a straight back and open shoulders, one diagonal. Mountain climber rounds into a C and bends the back knee.',
  },
  {
    id: 'hollow-arms',
    lessonId: 'hollow',
    prompt: 'Hollow arms up versus hollow arms down. The body position that stays the same is:',
    choices: [
      { id: 'a', label: 'The arm path only. The trunk can arch.' },
      { id: 'b', label: 'A posterior tilt, ribs in, and a long low back that does not dump' },
      { id: 'c', label: 'Bent knees and a C like a mountain climber' },
      { id: 'd', label: 'Shoulder extension behind the body' },
    ],
    answerId: 'b',
    explain: 'The hollow is the trunk. Arms up or down change the lever, not the right to dump the low back.',
  },
  {
    id: 'superman-vs-arch',
    lessonId: 'superman',
    prompt: 'Superman (prone) and a tumbling arch are easy to mix up. Superman is:',
    choices: [
      { id: 'a', label: 'On the belly, long hips, arms by the ears' },
      { id: 'b', label: 'On the back in a hollow' },
      { id: 'c', label: 'A standing C with two bent knees' },
      { id: 'd', label: 'A landing lunge' },
    ],
    answerId: 'a',
    explain: 'Superman is prone (belly down). The tumbling arch is a different shape and a different relationship to the floor.',
  },
  {
    id: 'lunge-back-leg',
    lessonId: 'lunge_land',
    prompt: 'On both starting and landing lunges the back leg should be:',
    choices: [
      { id: 'a', label: 'Bent like a mountain climber' },
      { id: 'b', label: 'Straight' },
      { id: 'c', label: 'In passé' },
      { id: 'd', label: 'In a pike' },
    ],
    answerId: 'b',
    explain: 'Both lunges keep the back leg straight. A bent back knee turns the picture into a mountain climber.',
  },
  {
    id: 'open-after',
    lessonId: 'lunge_start',
    prompt: 'On a lunge we count the shape in this order:',
    choices: [
      { id: 'a', label: 'Open the shoulders first, then find the feet' },
      { id: 'b', label: 'Find the lunge first, then open the shoulders' },
      { id: 'c', label: 'Bend the back knee, then C the chest' },
      { id: 'd', label: 'Tuck, then twist' },
    ],
    answerId: 'b',
    explain: 'Hit the lunge first. Then open. Open shoulders do not replace the foot and hip picture.',
  },
  {
    id: 'side-view',
    lessonId: 'lunge_land',
    prompt: 'Starting lunge, landing lunge, and mountain climber should be filmed from:',
    choices: [
      { id: 'a', label: 'The front, so both arms show' },
      { id: 'b', label: 'The side, so you can see stance length, heel, and the C versus the long line' },
      { id: 'c', label: 'Above' },
      { id: 'd', label: 'A diagonal behind the hurdle' },
    ],
    answerId: 'b',
    explain: 'Side view is how you tell these three apart. Front view hides the heel and the C.',
  },
  {
    id: 'passe-vs-lunge',
    lessonId: 'passe',
    prompt: 'Passé into a starting lunge. Passé itself is:',
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
