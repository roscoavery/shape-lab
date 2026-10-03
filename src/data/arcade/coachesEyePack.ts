/**
 * Coach's Eye pack: "what would you focus on first?" scenarios.
 * Every scenario is grounded in the shape library's fundamentals (lunge
 * position, lever, hollow, front support, arm positions, cartwheel line,
 * handstand line, landing shape). No invented biomechanics. Rationales
 * are practical, coach-voiced, and keep to what the shape tips establish.
 * Draft content.
 */
export type CoachesEyeScenario = {
  id: string
  title: string
  context: string
  question: string
  options: [string, string, string, string]
  /** Indexes into options that count as the coach's priority answer. */
  accepted: number[]
  rationale: string
  drill?: string
}

export const COACHES_EYE_SCENARIOS: CoachesEyeScenario[] = [
  {
    id: 'ce-01',
    title: 'The heavy round-off',
    context:
      "An athlete's round-off keeps landing low with bent knees, and the back handspring after it feels heavy every time.",
    question: 'What would you focus on first?',
    options: [
      'Blocking through the shoulders so the feet land in front, not behind',
      'Snapping the legs together faster in the air',
      'Pointing the toes during the round-off',
      'Running faster into the round-off',
    ],
    accepted: [0],
    rationale:
      'Without the block the feet land behind and bent, and everything after fights that landing. Get the block and the feet land in front with minimal bend. Then the leg snap and the run actually matter.',
    drill: 'front support',
  },
  {
    id: 'ce-02',
    title: 'The curving cartwheel',
    context:
      'An athlete\u2019s cartwheel keeps curving off the line she started on. She finishes facing a different wall.',
    question: 'What would you focus on first?',
    options: [
      'Hands placed in one straight line, one after the other',
      'Pushing harder off the hands',
      'Going faster through the cartwheel',
      'Keeping the head tucked in',
    ],
    accepted: [0],
    rationale:
      'Where the hands go, the body follows. Hands landing in a straight line keep the cartwheel on its line. More push or more speed through crooked hands just rehearses the curve.',
    drill: 'cartwheel',
  },
  {
    id: 'ce-03',
    title: 'The banana handstand',
    context:
      'An athlete\u2019s handstand keeps arching into a banana. Ribs out, butt out, lower back doing all the work.',
    question: 'What would you focus on first?',
    options: [
      'Ribs in, butt in. Squeeze the whole line straight',
      'Kicking up harder to get fully vertical',
      'Looking at the hands instead of the floor',
      'Holding it longer to build endurance',
    ],
    accepted: [0],
    rationale:
      'Ribs in and butt in is what stacks the handstand into one line. Kicking harder into an arched line just practices the arch with more commitment. Holding a banana longer only builds a stronger banana.',
    drill: 'hollow',
  },
  {
    id: 'ce-04',
    title: 'The collapsed lunge',
    context:
      'An athlete\u2019s starting lunge has the back knee bent and the back heel flat on the floor.',
    question: 'What would you focus on first?',
    options: [
      'Back leg straight, back heel up',
      'A wider arm position for balance',
      'A longer stance',
      'A quicker hurdle into the lunge',
    ],
    accepted: [0],
    rationale:
      'The starting lunge exists to push, and a straight back leg with the heel up is the push position. The chest stays tilted forward over the front knee. Arm width and stance length are details that can\u2019t fix a leg that isn\u2019t pushing.',
    drill: 'lunge',
  },
  {
    id: 'ce-05',
    title: 'The chest-down landing',
    context:
      'An athlete lands her back tuck with her chest folded down and takes a step every time, even when the tuck itself looks fine.',
    question: 'What would you focus on first?',
    options: [
      'Finishing tall. Chest up, feet together on the landing',
      'Tucking tighter in the air',
      'Setting higher off the floor',
      'Swinging the arms harder on takeoff',
    ],
    accepted: [0],
    rationale:
      'The landing shape is the part that keeps knees happy and the skill finished. A clean tuck that ends folded over is still an unfinished skill. Build the tall landing first, then add height to something that already finishes.',
  },
  {
    id: 'ce-06',
    title: 'The daylight hollow',
    context:
      'An athlete\u2019s hollow hold keeps rocking and there\u2019s daylight under her lower back the whole time.',
    question: 'What would you focus on first?',
    options: [
      'Pressing the lower back into the floor before anything moves',
      'Lifting the shoulders higher',
      'Pointing the toes harder',
      'Holding it longer to build strength',
    ],
    accepted: [0],
    rationale:
      'The lower back touching is the whole shape. Without it, it isn\u2019t a hollow, it\u2019s an arch with raised shoulders. Higher shoulders on top of a gap just arches more. Earn the contact first.',
    drill: 'hollow',
  },
  {
    id: 'ce-07',
    title: 'The bent-arm round-off',
    context:
      'An athlete\u2019s round-off arms bend and land wide instead of straight by her ears, and her block feels soft.',
    question: 'What would you focus on first?',
    options: [
      'Straight arms covering the ears at hand contact',
      'Pushing harder through the floor',
      'Snapping down faster',
      'Placing the hands wider for stability',
    ],
    accepted: [0],
    rationale:
      'Straight arms by the ears are what make a block possible. Bent arms can\u2019t push through the floor no matter how hard the athlete tries. The push comes from the line, not from effort.',
    drill: 'arm positions',
  },
  {
    id: 'ce-08',
    title: 'The saggy front support',
    context:
      'An athlete\u2019s front support sags at the hips. The line from head to heels has a dip in the middle.',
    question: 'What would you focus on first?',
    options: [
      'Squeezing one straight line from head to heels',
      'Holding it longer for endurance',
      'Looking up to lift the chest',
      'Bending the elbows slightly to take pressure off',
    ],
    accepted: [0],
    rationale:
      'Time in a saggy line just practices the sag. One straight squeezed line for less time beats a long hold of the wrong shape. Endurance comes after the shape is right.',
    drill: 'front support',
  },
  {
    id: 'ce-09',
    title: 'The sitting lever',
    context:
      'An athlete\u2019s lever sinks. She sits into the front leg instead of staying tall through it.',
    question: 'What would you focus on first?',
    options: [
      'A tall lever with a soft front knee. Not locked, not sitting',
      'Taking a bigger step into the lever',
      'Reaching the arms higher',
      'Moving through the lever faster',
    ],
    accepted: [0],
    rationale:
      'The lever is a tall position with a slight bend in the front knee. Sitting into it kills the push the lever exists to make. A bigger step into a sit is just a bigger sit.',
    drill: 'lever',
  },
  {
    id: 'ce-10',
    title: 'The mountain-climber lunge',
    context:
      'An athlete\u2019s starting lunge looks like a mountain climber: back knee bent, back rounded into a C.',
    question: 'What would you focus on first?',
    options: [
      'Straight back leg, heel up, chest tilted forward over the front knee',
      'Bending the front knee more for power',
      'Shortening the stance for control',
      'Looking down at the floor for balance',
    ],
    accepted: [0],
    rationale:
      'The starting lunge is a long push position with the chest tilted forward, not rounded. The mountain-climber version with a bent back knee and C-shaped back can\u2019t push into the skill. More front-knee bend just deepens the wrong shape.',
    drill: 'lunge',
  },
]
