/**
 * DRAFT — benefit facts for "Strengthen your foundation".
 * Every line is drawn from Ryan's own words (homework catalog cues,
 * shape coachNotes, parent education, interview answers, technique
 * evidence). NOTHING here ships until Ryan approves/edits each line.
 */

export type FoundationFact = {
  id: string
  exercise: string
  /** The benefit, in Ryan's voice (draft). */
  fact: string
  /** Body positions this builds. */
  builds: string[]
  /** Skills it powers. */
  powers: string[]
}

export const FOUNDATION_FACTS_DRAFT: FoundationFact[] = [
  {
    id: 'ff_pushup_plank',
    exercise: 'Push-ups',
    fact: 'Quality reps keep the same plank from the first to the last. That plank is the body you tumble with.',
    builds: ['Front support', 'Plank body line'],
    powers: ['Back handspring', 'Round-off rebound'],
  },
  {
    id: 'ff_vup_hollow',
    exercise: 'V-ups',
    fact: 'Strong V ups lead to stronger standing tucks and stronger layouts. Build them early on!',
    builds: ['Hollow shape'],
    powers: ['Standing tuck', 'Layout'],
  },
  {
    id: 'ff_hollow_basics',
    exercise: 'Handstand hold',
    fact: 'The handstand is a staple in tumbling. The stronger the basics, the stronger the harder skills can be.',
    builds: ['Hollow shape'],
    powers: ['Handstand', 'Back handspring', 'Layout'],
  },
  {
    id: 'ff_layout_fulls',
    exercise: 'Hollow hold',
    fact: 'The stronger my layout is, the stronger my fulls and dubs can be. It all starts with holding the hollow.',
    builds: ['Hollow shape'],
    powers: ['Layout', 'Full', 'Double full'],
  },
  {
    id: 'ff_wallsit_landings',
    exercise: 'Wall-sit',
    fact: 'Strong legs stick landings. The wall-sit builds the exact muscles that absorb a landing without collapsing.',
    builds: ['Landing position'],
    powers: ['Stuck landings', 'Punch front'],
  },
  {
    id: 'ff_sideplank_twist',
    exercise: 'Side plank',
    fact: 'Develops the lateral core and is a useful shape for twist drills.',
    builds: ['Side plank'],
    powers: ['Full', 'Double full'],
  },
  {
    id: 'ff_plank_handstand',
    exercise: 'Front plank',
    fact: 'Strong planks lead to stronger hollows.',
    builds: ['Plank body line'],
    powers: ['Handstand', 'Front support'],
  },
  {
    id: 'ff_shapes_accuracy',
    exercise: 'Hollow hold',
    fact: 'The more accurate your shapes in a slow sequence, the stronger they stay in a fast tumbling pass. Accuracy first, speed second.',
    builds: ['Hollow', 'Pike', 'Tuck', 'Arch'],
    powers: ['Tumbling passes'],
  },
  {
    id: 'ff_bridge_pushup',
    exercise: 'Bridge push-ups',
    fact: 'Bridge push-ups can build up blocking strength and help a ton with training the open shoulder angle most of us struggle with.',
    builds: ['Bridge'],
    powers: ['Back walkover', 'Back handspring'],
  },
]
