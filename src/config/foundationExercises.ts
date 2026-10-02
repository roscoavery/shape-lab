/**
 * The five Foundation exercises: what they are, how they're challenged,
 * and the camera-angle guidance (2D) — which angle, why, and how to set
 * the phone up. Copy is drafted for Ryan's approval.
 */

export type FoundationExerciseId = 'hollow' | 'plank' | 'wallsit' | 'pushup' | 'vup' | 'superman' | 'sideplank' | 'lever'

export type AngleOption = {
  label: string
  bestFor: 'counting' | 'form' | 'both'
  why: string
}

export type FoundationExercise = {
  id: FoundationExerciseId
  name: string
  kind: 'hold' | 'reps'
  /** Key used for logging + stats. */
  shapeId: string
  /** Display name written on logs. */
  sourceLabel: string
  /** Pose gate for camera holds; null = manual. */
  gate: 'hollow' | 'longbody' | 'wallsit' | 'sideplank' | 'lever' | null
  /** Coach Ryan's perfect demo video URL; empty until he films it. */
  demoVideoUrl?: string
  tagline: string
  angle: {
    best: string
    why: string
    setup: string
    options: AngleOption[]
  }
}

export const FOUNDATION_EXERCISES: FoundationExercise[] = [
  {
    id: 'hollow',
    name: 'Hollow hold',
    kind: 'hold',
    shapeId: 'hollow_arms_down',
    sourceLabel: 'Hollow hold',
    gate: 'hollow',
    tagline: 'The shape behind every layout. How long can you stay hollow?',
    angle: {
      best: 'Side view',
      why: 'The hollow is a side-view shape — your low back, hip fold, and shoulder position all read from the side. The camera can tell when you are in it and when you break.',
      setup: 'Prop your phone on its side about 8 feet away, lens at floor height. Lie with your side to the camera.',
      options: [
        { label: 'Side view', bestFor: 'both', why: 'Low back, hips, and shoulders all visible — best for form checks and for the camera to score your hold.' },
      ],
    },
  },
  {
    id: 'plank',
    name: 'Front plank',
    kind: 'hold',
    shapeId: 'plank',
    sourceLabel: 'Front plank',
    gate: 'longbody',
    tagline: 'Ribs in, glutes on. The handstand lying down.',
    angle: {
      best: 'Side view',
      why: 'Your body line from head to heels is a side-view read. From the front the camera cannot tell if your hips sag.',
      setup: 'Prop your phone on its side about 8 feet away, lens at hip height. Plank with your side to the camera.',
      options: [
        { label: 'Side view', bestFor: 'both', why: 'Hip height and body line visible — best for form checks and camera scoring.' },
      ],
    },
  },
  {
    id: 'wallsit',
    name: 'Wall-sit',
    kind: 'hold',
    shapeId: 'catalog:wall_sit',
    sourceLabel: 'Wall sit',
    gate: 'wallsit',
    tagline: 'Back flat on the wall, knees at 90°. Legs of steel.',
    angle: {
      best: 'Side view',
      why: 'Your knee angle (the whole point — 90°) and your upright torso only read from the side.',
      setup: 'Prop your phone on its side about 8 feet away, lens at hip height. Sit with your side to the camera.',
      options: [
        { label: 'Side view', bestFor: 'both', why: 'Knee angle and torso visible — best for form checks and camera scoring.' },
      ],
    },
  },
  {
    id: 'pushup',
    name: 'Push-ups',
    kind: 'reps',
    shapeId: 'catalog:pushup',
    sourceLabel: 'Push-ups',
    gate: null,
    tagline: 'Chest to a fist-height. How many quality reps?',
    angle: {
      best: 'Side view',
      why: 'One angle does it all here: your elbow bend (for counting) and your plank body line (for form) are both visible from the side. This is the best angle for push-ups, period.',
      setup: 'Prop your phone on its side about 8 feet away, lens at hip height. Push up with your side to the camera.',
      options: [
        { label: 'Side view', bestFor: 'both', why: 'Elbow angle for counting AND body line for form — the one best angle for push-ups.' },
        { label: 'Front 45°', bestFor: 'form', why: 'Shows elbow flare and hand position — useful if your elbows drift out, but worse for counting.' },
      ],
    },
  },
  {
    id: 'vup',
    name: 'V-ups',
    kind: 'reps',
    shapeId: 'catalog:v_up',
    sourceLabel: 'V-ups',
    gate: null,
    tagline: 'Hollow body, reach for the toes. Quality over speed.',
    angle: {
      best: 'Side view',
      why: 'For form, the side shows your hip fold and whether your low back stays heavy. For counting, a front 45° shows the reach more clearly.',
      setup: 'Prop your phone on its side about 8 feet away, lens at floor height. Lie with your side to the camera.',
      options: [
        { label: 'Side view', bestFor: 'form', why: 'Hip fold and low-back position visible — best for checking your form.' },
        { label: 'Front 45°', bestFor: 'counting', why: 'The reach for the toes reads clearly — easier to count clean reps.' },
      ],
    },
  },
  {
    id: 'superman',
    name: 'Superman',
    kind: 'hold',
    shapeId: 'superman',
    sourceLabel: 'Superman',
    gate: 'longbody',
    tagline: 'Chin up, arms and legs lifted. Posterior chain power.',
    angle: {
      best: 'Side view',
      why: 'Chin, arms, legs, and the arch through your back all read from the side. From the front the camera cannot tell if your knees are off the ground.',
      setup: 'Prop your phone on its side about 8 feet away, lens at floor height. Lie with your side to the camera.',
      options: [
        { label: 'Side view', bestFor: 'both', why: 'Limbs-off-ground and back arch visible — best for form checks and camera scoring.' },
      ],
    },
  },
  {
    id: 'sideplank',
    name: 'Side plank',
    kind: 'hold',
    shapeId: 'side_plank',
    sourceLabel: 'Side plank',
    gate: 'sideplank',
    tagline: 'One arm, one edge of the feet. Lateral core that powers twists.',
    angle: {
      best: 'Front view',
      why: 'The straight line from head to heels — and whether your hips sag — reads best from the front. Side view hides the sag.',
      setup: 'Prop your phone upright about 8 feet away, lens at hip height. Face the camera.',
      options: [
        { label: 'Front view', bestFor: 'both', why: 'Body line and hip height visible — best for form checks and camera scoring.' },
        { label: 'Side view', bestFor: 'form', why: 'Shows shoulder stacking over the elbow — useful second angle.' },
      ],
    },
  },
  {
    id: 'lever',
    name: 'Lever',
    kind: 'hold',
    shapeId: 'lever',
    sourceLabel: 'Lever',
    gate: 'lever',
    tagline: 'Chest near parallel, back leg long. The sequence staple.',
    angle: {
      best: 'Side view',
      why: 'The line from your back foot through your body toward your hands is a side-view read. That line is the whole shape.',
      setup: 'Prop your phone on its side about 10 feet away, lens at hip height. Stand with your side to the camera.',
      options: [
        { label: 'Side view', bestFor: 'both', why: 'Torso angle and back-leg line visible — best for form checks and camera scoring.' },
      ],
    },
  },
]

export function getFoundationExercise(id: FoundationExerciseId): FoundationExercise {
  return FOUNDATION_EXERCISES.find((e) => e.id === id)!
}
