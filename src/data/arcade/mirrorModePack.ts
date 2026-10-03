import type { FigurePose } from '../../components/arcade/lab/ShapeFigure'

export type MirrorPrompt = {
  id: string
  /** What the avatar is doing. */
  label: string
  pose: FigurePose
  /** The detail to look for while copying. */
  tip: string
}

const STAND: FigurePose = {
  arms: 'down',
  knees: 'straight',
  back: 'flat',
  head: 'neutral',
  feet: 'together',
}

/**
 * Draft prompts for Mirror Mode. Isolated positions first, then combined.
 * All standing and low-risk. The figure is a rough reference. The tip
 * names the detail that makes the copy exact.
 */
export const MIRROR_MODE_PROMPTS: MirrorPrompt[] = [
  {
    id: 'mm-arms-t',
    label: 'Arms in a T',
    pose: { ...STAND, arms: 't' },
    tip: 'Arms straight out at shoulder height, shoulders pressed down away from your ears.',
  },
  {
    id: 'mm-arms-up',
    label: 'Arms overhead',
    pose: { ...STAND, arms: 'up' },
    tip: 'Tall through the fingertips, ribs stacked over your hips. No arching.',
  },
  {
    id: 'mm-lunge',
    label: 'Lunge',
    pose: { arms: 'up', knees: 'bent', back: 'flat', head: 'neutral', feet: 'apart' },
    tip: 'Front knee stacked over the ankle, back leg long, arms reaching up.',
  },
  {
    id: 'mm-passe-prep',
    label: 'Passé prep',
    pose: { ...STAND, knees: 'bent' },
    tip: 'Lift one knee out to the side, toe touching the opposite knee. Standing leg straight, chest tall.',
  },
  {
    id: 'mm-lunge-t',
    label: 'Lunge with T arms',
    pose: { arms: 't', knees: 'bent', back: 'flat', head: 'neutral', feet: 'apart' },
    tip: 'The lunge stays deep and low while the arms hold a level T.',
  },
  {
    id: 'mm-wide-up',
    label: 'Wide stand, arms up',
    pose: { ...STAND, arms: 'up', feet: 'apart' },
    tip: 'Feet wide, arms tall. Big and long in both directions at once.',
  },
  {
    id: 'mm-hollow-stand',
    label: 'Hollow stand',
    pose: { ...STAND, arms: 'up', back: 'hollow' },
    tip: 'Ribs down, pelvis tucked, arms overhead. Squeeze the whole line.',
  },
  {
    id: 'mm-t-hollow',
    label: 'T with a hollow body',
    pose: { ...STAND, arms: 't', back: 'hollow' },
    tip: 'T arms plus a hollow body. The squeeze is what makes it strong.',
  },
]
