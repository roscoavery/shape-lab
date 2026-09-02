/**
 * Gym research studies — tumbling laterality, standing fulls, reasons, fear.
 * Not a generic survey builder. Ryan will add more questions over time;
 * extra ideas go in the Research tab inbox until they become a study here.
 */

export type FieldKind = 'choice' | 'yesno' | 'number' | 'text' | 'multi'

export type StudyOption = {
  value: string
  label: string
}

export type StudyField = {
  id: string
  label: string
  kind: FieldKind
  required?: boolean
  help?: string
  options?: StudyOption[]
  min?: number
  max?: number
  /** Only show this field when another answer is one of `values`. */
  showIf?: { fieldId: string; values: string[] }
}

export type StudyDef = {
  id: string
  title: string
  /** What we are asking, in one sentence. */
  question: string
  /** What we currently think, stated so data can disagree. */
  hypothesis: string
  /** How to collect an observation. */
  method: string
  /** Limits on what the numbers mean. */
  caveats: string
  fields: StudyField[]
}

const YES_NO_UNSURE: StudyOption[] = [
  { value: 'yes', label: 'Yes' },
  { value: 'no', label: 'No' },
  { value: 'unsure', label: 'Not sure' },
]

const LEFT_RIGHT: StudyOption[] = [
  { value: 'left', label: 'Left' },
  { value: 'right', label: 'Right' },
]

const SKILL_DIRECTION: StudyOption[] = [
  { value: 'none', label: 'Do not have one yet' },
  { value: 'left', label: 'Left' },
  { value: 'right', label: 'Right' },
]

export const RESEARCH_STUDIES: StudyDef[] = [
  {
    id: 'laterality',
    title: 'Laterality',
    question:
      'How do handedness, tumble stance, twist direction, doubles and triples, and skate stance line up in this gym?',
    hypothesis:
      'Handedness, the foot in front when tumbling, and twist direction often travel together. Skateboarding stance often matches tumble front foot. Athletes who have a double full or a triple usually twist the same way they already twist. Twisting both ways is uncommon.',
    method:
      'One log per athlete. Record what they actually do — not what they wish they did. A coach can log for anyone; an athlete logs for themselves. Skip a field if you do not know yet.',
    caveats:
      'This is this gym’s sample, not a world census. Counts are not causes. “Right-hand dominant” is what the athlete reports.',
    fields: [
      {
        id: 'dominantHand',
        label: 'Dominant hand',
        kind: 'choice',
        required: true,
        options: [
          { value: 'right', label: 'Right' },
          { value: 'left', label: 'Left' },
          { value: 'both', label: 'Ambidextrous' },
        ],
      },
      {
        id: 'tumbleFrontFoot',
        label: 'Foot in front when tumbling',
        kind: 'choice',
        required: true,
        help: 'The foot that is in front on a roundoff or similar hurdle.',
        options: LEFT_RIGHT,
      },
      {
        id: 'twistDirection',
        label: 'Twist direction',
        kind: 'choice',
        required: true,
        options: [
          { value: 'left', label: 'Twist left' },
          { value: 'right', label: 'Twist right' },
          { value: 'not_yet', label: 'Not twisting yet' },
        ],
      },
      {
        id: 'twistBothWays',
        label: 'Can twist both ways',
        kind: 'yesno',
        required: true,
        options: [
          { value: 'yes', label: 'Yes' },
          { value: 'no', label: 'No' },
        ],
      },
      {
        id: 'twistBetterSide',
        label: 'Better twist side',
        kind: 'choice',
        help: 'If they can twist both ways, which side is stronger.',
        options: LEFT_RIGHT,
        showIf: { fieldId: 'twistBothWays', values: ['yes'] },
      },
      {
        id: 'doubleFull',
        label: 'Double full',
        kind: 'choice',
        required: true,
        help: 'If they have one, which way do they twist it?',
        options: SKILL_DIRECTION,
      },
      {
        id: 'triple',
        label: 'Triple',
        kind: 'choice',
        required: true,
        help: 'If they have one, which way do they twist it?',
        options: SKILL_DIRECTION,
      },
      {
        id: 'skateboards',
        label: 'Also got into skateboarding',
        kind: 'yesno',
        required: true,
        options: [
          { value: 'yes', label: 'Yes' },
          { value: 'no', label: 'No' },
        ],
      },
      {
        id: 'skateStance',
        label: 'Skateboard stance',
        kind: 'choice',
        help: 'Regular is left foot forward. Goofy is right foot forward.',
        options: [
          { value: 'regular', label: 'Regular (left foot forward)' },
          { value: 'goofy', label: 'Goofy (right foot forward)' },
        ],
        showIf: { fieldId: 'skateboards', values: ['yes'] },
      },
      {
        id: 'skateFrontFoot',
        label: 'Skate foot in front',
        kind: 'choice',
        required: true,
        options: LEFT_RIGHT,
        showIf: { fieldId: 'skateboards', values: ['yes'] },
      },
    ],
  },
  {
    id: 'shape-feel',
    title: 'Shape feel',
    question:
      'Which cartwheel leg, which hold feels harder, and how hard is a fully open shoulder?',
    hypothesis:
      'Cartwheel leg often matches tumble front foot. Who finds hollow harder vs Superman may show up on homework hold times. A high open-shoulder rating often pairs with a tighter bridge.',
    method:
      'Asked on the class-station line and on My Profile. One log per athlete. Update it when the answer changes.',
    caveats:
      'Self-report from a busy class line, not a measured test. n is this gym.',
    fields: [
      {
        id: 'cartwheelLeg',
        label: 'Cartwheel leg forward',
        kind: 'choice',
        required: true,
        options: [
          { value: 'left', label: 'Left leg forward' },
          { value: 'right', label: 'Right leg forward' },
        ],
      },
      {
        id: 'harderShape',
        label: 'Which hold feels harder',
        kind: 'choice',
        required: true,
        options: [
          { value: 'hollow', label: 'Hollow' },
          { value: 'superman', label: 'Superman' },
        ],
      },
      {
        id: 'openShoulderHardness',
        label: 'How hard is a fully open shoulder',
        kind: 'choice',
        required: true,
        help: '1 is easy. 5 is “I cannot get there yet.”',
        options: [
          { value: '1', label: '1 · easy' },
          { value: '2', label: '2' },
          { value: '3', label: '3' },
          { value: '4', label: '4' },
          { value: '5', label: '5 · cannot get there yet' },
        ],
      },
    ],
  },
  {
    id: 'standing-full-mats',
    title: 'Standing full · panel mats',
    question:
      'How many layers of panel mat can athletes back tuck up when they first get their standing full?',
    hypothesis:
      'First standing fulls usually happen on several layers of panel mat, not on a bare floor.',
    method:
      'Ask the athlete (or remember) how many layers they could back tuck up onto when they first landed a standing full. 0 means the floor. Count the stack they actually used that day, not the stack they train on now.',
    caveats:
      'Memory of “when I first got it” is fuzzy. Panel brands differ. n is this gym.',
    fields: [
      {
        id: 'panelMatLayers',
        label: 'Panel-mat layers they could back tuck up',
        kind: 'number',
        required: true,
        min: 0,
        max: 20,
        help: '0 is floor. Count the stack at the first standing full.',
      },
      {
        id: 'notes',
        label: 'Notes (optional)',
        kind: 'text',
        help: 'Foam vs sting mat, a coach spotting, anything that changes the picture.',
      },
    ],
  },
  {
    id: 'why-tumble',
    title: 'Why people tumble',
    question: 'Why do people tumble?',
    hypothesis:
      'Fun and the feeling of flight show up more often than competition or being told to.',
    method:
      'The athlete picks every reason that is true for them. Add a note if the list misses it. Reasons can change; log what is true now.',
    caveats: 'Self-report, not a diagnosis of motivation. One gym’s answers.',
    fields: [
      {
        id: 'reasons',
        label: 'Reasons that are true for you',
        kind: 'multi',
        required: true,
        options: [
          { value: 'fun', label: 'It is fun' },
          { value: 'flying', label: 'It feels like flying' },
          { value: 'friends', label: 'Friends / gym culture' },
          { value: 'compete', label: 'Competing / making a team' },
          { value: 'coach', label: 'A coach asked me to' },
          { value: 'identity', label: 'I think of myself as a tumbler' },
          { value: 'other', label: 'Something else (say in notes)' },
        ],
      },
      {
        id: 'notes',
        label: 'Notes (optional)',
        kind: 'text',
      },
    ],
  },
  {
    id: 'fear-blocks',
    title: 'Fear and mental blocks',
    question:
      'How many athletes experience fear when tumbling, and how many have had a mental block caused by emotionally shutting down?',
    hypothesis:
      'Fear while tumbling is common. Some mental blocks follow an emotional shutdown — going blank, freezing, or checking out — not only a physical miss.',
    method:
      'Ask yes / no / not sure. This is not a clinical screen. Notes are optional and stay on this gym computer.',
    caveats:
      'Self-report. “Emotionally shutting down” is the athlete’s words for what happened, not a medical label. Do not use these numbers to diagnose anyone.',
    fields: [
      {
        id: 'hasFear',
        label: 'Have you felt fear while tumbling?',
        kind: 'yesno',
        required: true,
        options: YES_NO_UNSURE,
      },
      {
        id: 'hadBlock',
        label: 'Have you had a mental block on a skill?',
        kind: 'yesno',
        required: true,
        options: YES_NO_UNSURE,
      },
      {
        id: 'blockFromShutdown',
        label:
          'Did that block come after you emotionally shut down (went blank, froze, or checked out)?',
        kind: 'yesno',
        required: true,
        options: YES_NO_UNSURE,
        showIf: { fieldId: 'hadBlock', values: ['yes', 'unsure'] },
      },
      {
        id: 'notes',
        label: 'Notes (optional)',
        kind: 'text',
        help: 'Only if they want to say more. Skip if they do not.',
      },
    ],
  },
  {
    id: 'pre-test-intake',
    title: 'Before the shape test',
    question:
      'Favorite color, handstand / hollow / Superman guesses, V-ups, and weekly check-ins asked on New athlete · shape test.',
    hypothesis:
      'Kids who think they can win a handstand contest and already hold a wall minute are the ones who should be dared. V-up over 30 needs a live prove-it. Weekly energy tracks with homework logs.',
    method:
      'Asked before the pictures test. Answers live on the athlete profile and here. Add a weekly prompt in src/lib/intakeQuestions.ts.',
    caveats: 'Self-report in line, not a timed test. n is this gym.',
    fields: [
      {
        id: 'favoriteColor',
        label: 'Favorite color',
        kind: 'text',
      },
      {
        id: 'handstandFloor',
        label: 'Handstand with no wall',
        kind: 'text',
      },
      {
        id: 'handstandWall',
        label: 'Handstand with a wall',
        kind: 'text',
      },
      {
        id: 'hollowHold',
        label: 'Hollow hold guess',
        kind: 'text',
      },
      {
        id: 'supermanHold',
        label: 'Superman hold guess',
        kind: 'text',
      },
      {
        id: 'vUps',
        label: 'V-ups',
        kind: 'text',
      },
      {
        id: 'notes',
        label: 'Weekly and extra answers',
        kind: 'text',
      },
    ],
  },
]

export function studyById(id: string): StudyDef | undefined {
  return RESEARCH_STUDIES.find((s) => s.id === id)
}

export function fieldVisible(
  field: StudyField,
  answers: Record<string, unknown>,
): boolean {
  if (!field.showIf) return true
  const raw = answers[field.showIf.fieldId]
  const value = typeof raw === 'string' ? raw : ''
  return field.showIf.values.includes(value)
}

export function optionLabel(field: StudyField, value: string): string {
  return field.options?.find((o) => o.value === value)?.label ?? value
}
