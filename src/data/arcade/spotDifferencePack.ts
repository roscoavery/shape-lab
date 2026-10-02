import type { FigurePose } from '../../components/arcade/lab/ShapeFigure'

export type SpotDifferencePair = {
  id: string
  prompt: string
  poseA: FigurePose
  poseB: FigurePose
  /** 'both' = equivalent variation: neither figure is wrong. */
  correctSide: 'A' | 'B' | 'both'
  /** Names the visible change (used as the hint). */
  difference: string
  /** Why it matters (revealed after the answer). */
  why: string
}

const BASE: FigurePose = {
  arms: 'up',
  knees: 'straight',
  back: 'flat',
  head: 'neutral',
  feet: 'together',
}

export const SPOT_DIFFERENCE_PAIRS: SpotDifferencePair[] = [
  {
    id: 'sd-hollow-knees',
    prompt: 'Which figure shows the stronger hollow position?',
    poseA: { ...BASE, back: 'hollow' },
    poseB: { ...BASE, back: 'hollow', knees: 'bent' },
    correctSide: 'A',
    difference: "Figure B's knees are bent.",
    why: 'Bent knees shorten the lever and dump the hollow — straight legs keep the tension long.',
  },
  {
    id: 'sd-hollow-arch',
    prompt: 'Which figure is in a hollow — not an arch?',
    poseA: { ...BASE, back: 'hollow' },
    poseB: { ...BASE, back: 'arch' },
    correctSide: 'A',
    difference: "Figure B's back is arched.",
    why: 'An arch breaks the hollow line — ribs down and pelvis tucked is what keeps it hollow.',
  },
  {
    id: 'sd-finish-arms',
    prompt: 'Which figure shows the better finish-tall shape?',
    poseA: { ...BASE },
    poseB: { ...BASE, arms: 'down' },
    correctSide: 'A',
    difference: "Figure B's arms are down at the sides.",
    why: 'Arms up finishes the line through the fingertips — dropping them shortens the whole shape.',
  },
  {
    id: 'sd-feet-line',
    prompt: 'Which figure shows the cleaner line?',
    poseA: { ...BASE },
    poseB: { ...BASE, feet: 'apart' },
    correctSide: 'A',
    difference: "Figure B's feet are apart.",
    why: 'Feet together keeps one clean line — apart splits the tension and reads unfinished.',
  },
  {
    id: 'sd-tuck-knees',
    prompt: 'Which figure is showing a tuck?',
    poseA: { ...BASE, arms: 'front', knees: 'bent', back: 'hollow' },
    poseB: { ...BASE, arms: 'front', back: 'hollow' },
    correctSide: 'A',
    difference: "Figure B's legs are straight.",
    why: 'A tuck needs the knees bent and drawn in — straight legs is a different shape entirely.',
  },
  {
    id: 'sd-arch-head',
    prompt: 'Which figure shows the better head position for an arched shape?',
    poseA: { ...BASE, back: 'arch', head: 'up' },
    poseB: { ...BASE, back: 'arch' },
    correctSide: 'A',
    difference: "Figure B's head is tucked down.",
    why: 'Letting the head follow the arch keeps one long curve instead of a kink at the neck.',
  },
  {
    id: 'sd-t-arms',
    prompt: 'Which figure shows the stronger T position?',
    poseA: { ...BASE, arms: 't' },
    poseB: { ...BASE, arms: 'down' },
    correctSide: 'A',
    difference: "Figure B's arms are down at the sides.",
    why: 'A T needs the arms out at shoulder height — down at the sides is not a T at all.',
  },
  {
    id: 'sd-stand-knees',
    prompt: 'Which figure shows the stronger standing position?',
    poseA: { ...BASE, arms: 'down' },
    poseB: { ...BASE, arms: 'down', knees: 'bent' },
    correctSide: 'A',
    difference: "Figure B's knees are bent.",
    why: 'Soft knees in a standing shape leak tension — straight legs stack the joints.',
  },
  {
    id: 'sd-hollow-arms',
    prompt: 'Which figure shows the stronger hollow?',
    poseA: { ...BASE, back: 'hollow' },
    poseB: { ...BASE, back: 'hollow', arms: 'front' },
    correctSide: 'A',
    difference: "Figure B's arms reach forward instead of up.",
    why: 'Arms overhead complete the hollow line — reaching forward shortens it.',
  },
  {
    id: 'sd-straight-arch',
    prompt: 'Which figure shows a straight line?',
    poseA: { ...BASE },
    poseB: { ...BASE, back: 'arch' },
    correctSide: 'A',
    difference: "Figure B's back is arched.",
    why: 'An arch bends the line — a straight shape needs the ribs stacked over the hips.',
  },
  {
    id: 'sd-neutral-head',
    prompt: 'Are these the same or different?',
    poseA: { ...BASE, arms: 'down' },
    poseB: { ...BASE, arms: 'down', head: 'up' },
    correctSide: 'both',
    difference: "Figure B's head is lifted.",
    why: 'In a neutral stand this is just a style choice — not every visible difference is an error. Context decides what matters.',
  },
  {
    id: 'sd-neutral-feet',
    prompt: 'Are these the same or different?',
    poseA: { ...BASE, arms: 'down' },
    poseB: { ...BASE, arms: 'down', feet: 'apart' },
    correctSide: 'both',
    difference: "Figure B's feet are apart.",
    why: 'A relaxed stance is fine either way — it only becomes an error when the shape is being judged, like a finish position.',
  },
]
