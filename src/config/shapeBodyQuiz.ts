import type { PhysicsQuizItem } from './physicsQuiz'

/** Shape test 2: body-position distinctions, not “name this still.” */
export const SHAPE_BODY_QUIZ_BANK: PhysicsQuizItem[] = [
  {
    id: 'heel-up',
    lessonId: 'lunge_start',
    prompt: 'Which split-stance picture asks for the back heel UP on the ball of the foot?',
    choices: [
      { id: 'a', label: 'Longer stance, back heel up, back leg long' },
      { id: 'b', label: 'Shorter stance, back heel flat, back leg long' },
      { id: 'c', label: 'Two bent knees and a rounded C' },
      { id: 'd', label: 'Both long-line stances, heel either way' },
    ],
    answerId: 'a',
    explain:
      'The longer fall keeps the back heel up. The shorter finish presses that heel flat. Two bent knees is a pass-through, not a finish.',
  },
  {
    id: 'heel-flat',
    lessonId: 'lunge_land',
    prompt: 'A short finish stance has heels closer and the back heel is:',
    choices: [
      { id: 'a', label: 'Up on the ball of the foot' },
      { id: 'b', label: 'Flat on the floor' },
      { id: 'c', label: 'Rolled in on the arch' },
      { id: 'd', label: 'Off the floor like a kick' },
    ],
    answerId: 'b',
    explain: 'Short finish: closer heels, back heel flat, back leg straight. Do not roll in on the arch.',
  },
  {
    id: 'two-knees',
    lessonId: 'mountain_climber',
    prompt: 'A pass-through is different from a finish stance because:',
    choices: [
      { id: 'a', label: 'The back heel is flat and the back is a long open line' },
      { id: 'b', label: 'Both knees bend and the upper body is a rounded C' },
      { id: 'c', label: 'It is the finish for every cartwheel' },
      { id: 'd', label: 'The back leg stays straight and the heel stays up' },
    ],
    answerId: 'b',
    explain:
      'Pass-through: two bent knees, C upper body. A finish stance has a straight back leg and a straight back.',
  },
  {
    id: 'not-finish',
    lessonId: 'mountain_climber',
    prompt: 'We never finish a tumbling skill in:',
    choices: [
      { id: 'a', label: 'A short stance with a flat back heel' },
      { id: 'b', label: 'A longer stance with the back heel up' },
      { id: 'c', label: 'A rounded C with two bent knees' },
      { id: 'd', label: 'A stand with arms pinned to the sides' },
    ],
    answerId: 'c',
    explain: 'The C with two bent knees is pass-through only. Finishes live in a split stance or a stand.',
  },
  {
    id: 'stance-length',
    lessonId: 'lunge_start',
    prompt: 'Compared with a short finish stance, the fall stance is:',
    choices: [
      { id: 'a', label: 'Shorter, heels closer' },
      { id: 'b', label: 'Longer' },
      { id: 'c', label: 'The same length' },
      { id: 'd', label: 'A straddle' },
    ],
    answerId: 'b',
    explain: 'The fall from one-leg balance is longer. The finish is shorter, heels closer, back heel flat.',
  },
  {
    id: 'c-vs-line',
    lessonId: 'mountain_climber',
    prompt: 'A long open diagonal from the back foot through the hands is the picture for:',
    choices: [
      { id: 'a', label: 'Two bent knees and a rounded C' },
      { id: 'b', label: 'A split stance with a long back and open shoulders' },
      { id: 'c', label: 'Shoulders stacked, knees pulled in' },
      { id: 'd', label: 'On the back with arms by the sides' },
    ],
    answerId: 'b',
    explain:
      'Both finish stances want a straight back and open shoulders, one diagonal. The pass-through rounds into a C and bends the back knee.',
  },
  {
    id: 'hollow-arms',
    lessonId: 'hollow',
    prompt: 'Arms up versus arms down on the back. The body position that stays the same is:',
    choices: [
      { id: 'a', label: 'The arm path only. The trunk can arch.' },
      { id: 'b', label: 'A posterior tilt, ribs in, and a long low back that does not dump' },
      { id: 'c', label: 'Bent knees and a C like a pass-through' },
      { id: 'd', label: 'Shoulder extension behind the body' },
    ],
    answerId: 'b',
    explain: 'The trunk stays the same. Arms up or down change the lever, not the right to dump the low back.',
  },
  {
    id: 'superman-vs-arch',
    lessonId: 'superman',
    prompt: 'Belly-down long line versus other relationships to the floor. This one is:',
    choices: [
      { id: 'a', label: 'On the belly, long hips, arms by the ears' },
      { id: 'b', label: 'On the back, ribs in' },
      { id: 'c', label: 'A standing C with two bent knees' },
      { id: 'd', label: 'A short split stance, one heel flat' },
    ],
    answerId: 'a',
    explain: 'Belly down, hips long, arms by the ears. A tumbling arch is a different relationship to the floor.',
  },
  {
    id: 'lunge-back-leg',
    lessonId: 'lunge_land',
    prompt: 'On both the longer fall and the short finish the back leg should be:',
    choices: [
      { id: 'a', label: 'Bent with a rounded C' },
      { id: 'b', label: 'Straight' },
      { id: 'c', label: 'One knee pulled up' },
      { id: 'd', label: 'Folded into a pike' },
    ],
    answerId: 'b',
    explain: 'Both finish stances keep the back leg straight. A bent back knee turns the picture into a pass-through.',
  },
  {
    id: 'open-after',
    lessonId: 'lunge_start',
    prompt: 'On a split stance we count the shape in this order:',
    choices: [
      { id: 'a', label: 'Open the shoulders first, then find the feet' },
      { id: 'b', label: 'Find the feet and hips first, then open the shoulders' },
      { id: 'c', label: 'Bend the back knee, then C the chest' },
      { id: 'd', label: 'Tuck, then twist' },
    ],
    answerId: 'b',
    explain: 'Hit the stance first. Then open. Open shoulders do not replace the foot and hip picture.',
  },
  {
    id: 'side-view',
    lessonId: 'lunge_land',
    prompt: 'The longer fall, the short finish, and the rounded pass-through should be filmed from:',
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
    prompt: 'One-leg balance before the longer fall. That balance itself is:',
    choices: [
      { id: 'a', label: 'Two bent knees and a C' },
      { id: 'b', label: 'Knee pulled up, stance leg straight' },
      { id: 'c', label: 'A short stance with a flat back heel' },
      { id: 'd', label: 'On the back with ribs in' },
    ],
    answerId: 'b',
    explain: 'Pull the knee up, keep the stance leg straight, then fall into the longer stance.',
  },
]
