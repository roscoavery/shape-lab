import type { PhysicsQuizItem } from './physicsQuiz'

export const MOVEMENTS_QUIZ_BANK: PhysicsQuizItem[] = [
  {
    id: 'wrist-dorsi',
    lessonId: 'movement-names',
    prompt:
      'The handstand block lives in wrist extension. Another correct name for that wrist action is:',
    choices: [
      { id: 'a', label: 'Wrist dorsiflexion (the back of the hand toward the forearm)' },
      { id: 'b', label: 'Wrist plantarflexion' },
      { id: 'c', label: 'Ulnar deviation' },
      { id: 'd', label: 'Shoulder extension' },
    ],
    answerId: 'a',
    explain:
      'Wrist extension and wrist dorsiflexion name the same action: the back of the hand moves toward the forearm. That is the block. Palm toward the forearm is wrist flexion.',
  },
  {
    id: 'toes-plantar',
    lessonId: 'movement-names',
    prompt: 'Pointing the toes is:',
    choices: [
      { id: 'a', label: 'Ankle dorsiflexion' },
      { id: 'b', label: 'Ankle plantarflexion' },
      { id: 'c', label: 'Wrist extension' },
      { id: 'd', label: 'Knee flexion' },
    ],
    answerId: 'b',
    explain:
      'Plantarflexion is a pointed foot and the push of a punch. Dorsiflexion draws the toes toward the shin (landing, hurdle).',
  },
  {
    id: 'ankle-dorsi-not-wrist',
    lessonId: 'movement-names',
    prompt: 'Toes toward the shin on a landing is ankle dorsiflexion. Wrist dorsiflexion is:',
    choices: [
      { id: 'a', label: 'The same joint and the same bone' },
      { id: 'b', label: 'The same word on a different joint: the back of the hand toward the forearm' },
      { id: 'c', label: 'Pointing the fingers' },
      { id: 'd', label: 'Turning the palm up' },
    ],
    answerId: 'b',
    explain:
      'Dorsiflexion means the dorsal side closes toward the segment above it. At the ankle that is toes to shin. At the wrist that is the back of the hand toward the forearm (also called wrist extension).',
  },
  {
    id: 'hip-close',
    lessonId: 'movement-names',
    prompt: '“Close the hips” on a hollow is asking for:',
    choices: [
      { id: 'a', label: 'Hip extension' },
      { id: 'b', label: 'Hip flexion' },
      { id: 'c', label: 'Hip abduction' },
      { id: 'd', label: 'Lumbar extension' },
    ],
    answerId: 'b',
    explain: 'Flexion decreases the joint angle. Closing the hips is hip flexion.',
  },
  {
    id: 'arms-ears',
    lessonId: 'movement-names',
    prompt: 'Arms by the ears on a handstand or high V is mostly:',
    choices: [
      { id: 'a', label: 'Shoulder extension' },
      { id: 'b', label: 'Shoulder flexion' },
      { id: 'c', label: 'Elbow flexion' },
      { id: 'd', label: 'Wrist flexion' },
    ],
    answerId: 'b',
    explain:
      'Shoulder flexion raises the arms toward the ears. Shoulder extension takes the arms down and behind the body.',
  },
  {
    id: 'abduct',
    lessonId: 'movement-names',
    prompt: 'A straddle takes the legs away from center. That hip action is:',
    choices: [
      { id: 'a', label: 'Adduction' },
      { id: 'b', label: 'Abduction' },
      { id: 'c', label: 'Plantarflexion' },
      { id: 'd', label: 'Wrist flexion' },
    ],
    answerId: 'b',
    explain: 'Abduction is away from center. Adduction brings the leg in. A straddle is abduction plus some hip flexion.',
  },
  {
    id: 'ribs-in',
    lessonId: 'movement-names',
    prompt: '“Ribs in” is usually asking the athlete not to dump into:',
    choices: [
      { id: 'a', label: 'Lumbar flexion' },
      { id: 'b', label: 'Lumbar extension' },
      { id: 'c', label: 'Ankle plantarflexion' },
      { id: 'd', label: 'Shoulder flexion' },
    ],
    answerId: 'b',
    explain: 'A dumped low back is lumbar extension. Ribs in asks them to stop that dump.',
  },
  {
    id: 'punch',
    lessonId: 'movement-names',
    prompt: 'The push of a punch off the floor uses the ankle in:',
    choices: [
      { id: 'a', label: 'Dorsiflexion' },
      { id: 'b', label: 'Plantarflexion' },
      { id: 'c', label: 'Inversion only' },
      { id: 'd', label: 'Wrist flexion' },
    ],
    answerId: 'b',
    explain: 'The punch is a pointed, pushing foot. That is plantarflexion. The landing then has to accept dorsiflexion on purpose.',
  },
  {
    id: 'soft-knees',
    lessonId: 'movement-names',
    prompt: 'Soft knees are:',
    choices: [
      { id: 'a', label: 'Knee hyperextension' },
      { id: 'b', label: 'A little knee flexion' },
      { id: 'c', label: 'Hip abduction' },
      { id: 'd', label: 'Ankle inversion' },
    ],
    answerId: 'b',
    explain: 'Soft knees are a little flexion. Hyperextension is past straight, the opposite problem.',
  },
  {
    id: 'block-combo',
    lessonId: 'movement-names',
    prompt: 'A tumbling block is mostly:',
    choices: [
      { id: 'a', label: 'Shoulder flexion and wrist extension (wrist dorsiflexion) into the floor' },
      { id: 'b', label: 'Shoulder extension and wrist flexion' },
      { id: 'c', label: 'Hip abduction and ankle inversion' },
      { id: 'd', label: 'Cervical flexion only' },
    ],
    answerId: 'a',
    explain:
      'The arms reach (shoulder flexion) and the wrists take the floor in extension / dorsiflexion. That is the conversation with the floor.',
  },
]
