export type TwistView = 'front' | 'back' | 'left' | 'right' | 'top'

export type TwistDetectivePuzzle = {
  id: string
  startView: TwistView
  startLabel: string
  /** Screen direction her nose points — only used for top-view starts. */
  startFacing?: 'left' | 'right' | 'up' | 'down'
  rotation: string
  question: string
  options: [string, string, string, string]
  answer: number
  explanation: string
}

const VIEWS: [string, string, string, string] = ['Front', 'Back', 'Left side', 'Right side']

export const TWIST_DETECTIVE_PUZZLES: TwistDetectivePuzzle[] = [
  {
    id: 'td-front-left-quarter',
    startView: 'front',
    startLabel: 'Maya faces you (front view)',
    rotation: 'a quarter turn to her left',
    question: 'Which way does she face now?',
    options: VIEWS,
    answer: 3,
    explanation:
      'Facing you, her left is on your right — a quarter turn that way points her at screen right. When she faces you, left and right flip from your view.',
  },
  {
    id: 'td-front-right-quarter',
    startView: 'front',
    startLabel: 'Maya faces you (front view)',
    rotation: 'a quarter turn to her right',
    question: 'Which way does she face now?',
    options: VIEWS,
    answer: 2,
    explanation:
      'Facing you, her right is on your left — she ends up facing screen left. Mirror image: her directions are the reverse of yours.',
  },
  {
    id: 'td-back-left-quarter',
    startView: 'back',
    startLabel: 'Maya faces away (back view)',
    rotation: 'a quarter turn to her left',
    question: 'Which way does she face now?',
    options: VIEWS,
    answer: 2,
    explanation:
      'Facing away, her left matches your left — no flip needed. She turns toward screen left.',
  },
  {
    id: 'td-back-right-quarter',
    startView: 'back',
    startLabel: 'Maya faces away (back view)',
    rotation: 'a quarter turn to her right',
    question: 'Which way does she face now?',
    options: VIEWS,
    answer: 3,
    explanation:
      'Facing away, her right matches your right — she turns toward screen right.',
  },
  {
    id: 'td-back-half',
    startView: 'back',
    startLabel: 'Maya faces away (back view)',
    rotation: 'a half turn',
    question: 'Which way does she face now?',
    options: VIEWS,
    answer: 0,
    explanation:
      'A half turn reverses direction — facing away becomes facing you. Direction of the turn does not matter for a half.',
  },
  {
    id: 'td-front-half',
    startView: 'front',
    startLabel: 'Maya faces you (front view)',
    rotation: 'a half turn',
    question: 'Which way does she face now?',
    options: VIEWS,
    answer: 1,
    explanation:
      'A half turn reverses direction — facing you becomes facing away. Direction of the turn does not matter for a half.',
  },
  {
    id: 'td-left-left-quarter',
    startView: 'left',
    startLabel: 'Maya in profile, facing screen-left',
    rotation: 'a quarter turn to her left',
    question: 'Which way does she face now?',
    options: VIEWS,
    answer: 0,
    explanation:
      'In profile facing screen-left, her front is to your left and her left is toward you — turning to her left faces her at the camera.',
  },
  {
    id: 'td-left-right-quarter',
    startView: 'left',
    startLabel: 'Maya in profile, facing screen-left',
    rotation: 'a quarter turn to her right',
    question: 'Which way does she face now?',
    options: VIEWS,
    answer: 1,
    explanation:
      'Her right, in this profile, points away from you — so a quarter turn that way faces her away from the camera.',
  },
  {
    id: 'td-right-left-quarter',
    startView: 'right',
    startLabel: 'Maya in profile, facing screen-right',
    rotation: 'a quarter turn to her left',
    question: 'Which way does she face now?',
    options: VIEWS,
    answer: 1,
    explanation:
      'Facing screen-right, her left points away from you — she ends up facing away from the camera.',
  },
  {
    id: 'td-right-right-quarter',
    startView: 'right',
    startLabel: 'Maya in profile, facing screen-right',
    rotation: 'a quarter turn to her right',
    question: 'Which way does she face now?',
    options: VIEWS,
    answer: 0,
    explanation:
      'Facing screen-right, her right points toward you — she ends up facing the camera.',
  },
  {
    id: 'td-top-left-quarter',
    startView: 'top',
    startLabel: 'From above — her nose points up-screen (away)',
    startFacing: 'up',
    rotation: 'a quarter turn to her left',
    question: 'Which way does she face now?',
    options: VIEWS,
    answer: 2,
    explanation:
      'From above, her left is still her left — watch the blue dot. Turning toward it points her nose screen-left. The dots do not lie even when the camera moves.',
  },
  {
    id: 'td-top-half',
    startView: 'top',
    startLabel: 'From above — her nose points screen-right',
    startFacing: 'right',
    rotation: 'a half turn',
    question: 'Which way does she face now?',
    options: VIEWS,
    answer: 2,
    explanation:
      'From above, a half turn flips the nose to the opposite side — screen-right becomes screen-left. The viewpoint changes what you see, not where she goes.',
  },
  {
    id: 'td-front-left-three-quarter',
    startView: 'front',
    startLabel: 'Maya faces you (front view)',
    rotation: 'a three-quarter turn to her left',
    question: 'Which way does she face now?',
    options: VIEWS,
    answer: 2,
    explanation:
      'Three quarters one way equals one quarter the other: front to screen-right to back to screen-left — she faces screen-left.',
  },
  {
    id: 'td-back-full',
    startView: 'back',
    startLabel: 'Maya faces away (back view)',
    rotation: 'a full twist to her left',
    question: 'Which way does she face now?',
    options: VIEWS,
    answer: 1,
    explanation:
      'A full turn is a full circle — she finishes facing exactly where she started: away.',
  },
  {
    id: 'td-right-half',
    startView: 'right',
    startLabel: 'Maya in profile, facing screen-right',
    rotation: 'a half turn',
    question: 'Which way does she face now?',
    options: VIEWS,
    answer: 2,
    explanation:
      'A half turn reverses her — screen-right becomes screen-left. Direction of the turn does not matter for a half.',
  },
  {
    id: 'td-left-full',
    startView: 'left',
    startLabel: 'Maya in profile, facing screen-left',
    rotation: 'a full turn to her right',
    question: 'Which way does she face now?',
    options: VIEWS,
    answer: 2,
    explanation:
      'A full turn is a full circle — she finishes facing exactly where she started: screen-left.',
  },
]
