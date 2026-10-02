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
    fact: 'Hollow body, reach for the toes, control the lower. Quality over speed — the hollow is what keeps you tight in the air.',
    builds: ['Hollow shape'],
    powers: ['Back tuck', 'Layout'],
  },
  {
    id: 'ff_hollow_basics',
    exercise: 'Hollow hold',
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
    id: 'ff_backext_bridge',
    exercise: 'Back extension hold',
    fact: 'A strong back extension is the shape behind every backwards skill — it is the bridge you push through.',
    builds: ['Bridge', 'Arch control'],
    powers: ['Back handspring', 'Back tuck'],
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
    fact: 'Develops the lateral core — and it is a useful shape for twist drills. Twisting power starts on your side.',
    builds: ['Side plank'],
    powers: ['Full', 'Double full'],
  },
  {
    id: 'ff_plank_handstand',
    exercise: 'Front plank',
    fact: 'Ribs in, glutes on, neck long. The plank is the handstand lying down — own it here first.',
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
    fact: 'Hips stay the highest point. Push the floor away — that push is the block in your back handspring.',
    builds: ['Bridge'],
    powers: ['Back walkover', 'Back handspring'],
  },
]
