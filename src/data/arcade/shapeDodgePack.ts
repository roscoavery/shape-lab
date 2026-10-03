import type { FigurePose } from '../../components/arcade/lab/ShapeFigure'

export type ShapeDodgeWall = {
  id: string
  shapeName: string
  pose: FigurePose
  /** The cue for hitting this shape. */
  cue: string
  /** Shown under the figure when the avatar can't draw the real position. */
  note?: string
}

/**
 * Draft walls for Shape Dodge. The figure shows the target shape; for floor
 * shapes the note says so plainly. The cue does the coaching.
 */
export const SHAPE_DODGE_WALLS: ShapeDodgeWall[] = [
  {
    id: 'sdw-hollow-stand',
    shapeName: 'Hollow stand',
    pose: { arms: 'up', knees: 'straight', back: 'hollow', head: 'neutral', feet: 'together' },
    cue: 'Arms up, ribs down, pelvis tucked. One tall hollow line.',
  },
  {
    id: 'sdw-tuck-sit',
    shapeName: 'Tuck sit',
    pose: { arms: 'front', knees: 'bent', back: 'hollow', head: 'neutral', feet: 'together' },
    cue: 'Sit tall, knees pulled to your chest, back rounded. Hug the tuck.',
    note: 'The figure shows the tuck upright. Do it seated on the floor.',
  },
  {
    id: 'sdw-front-support',
    shapeName: 'Front support',
    pose: { arms: 'front', knees: 'straight', back: 'flat', head: 'neutral', feet: 'together' },
    cue: 'Hands under shoulders, body one straight line, squeeze everything tight.',
    note: 'The figure shows the line upright. Hold it as a plank on the floor.',
  },
  {
    id: 'sdw-lunge',
    shapeName: 'Lunge',
    pose: { arms: 'up', knees: 'bent', back: 'flat', head: 'neutral', feet: 'apart' },
    cue: 'Front knee over the ankle, back knee hovering, arms reaching up.',
  },
  {
    id: 'sdw-pike-fold',
    shapeName: 'Pike fold',
    pose: { arms: 'down', knees: 'straight', back: 'flat', head: 'neutral', feet: 'together' },
    cue: 'Hinge at the hips, legs straight, fold forward. Nose toward your knees.',
    note: 'Fold at the hips; the figure stands tall so you can see the straight-leg line.',
  },
  {
    id: 'sdw-c-shape',
    shapeName: 'C shape',
    pose: { arms: 'front', knees: 'straight', back: 'hollow', head: 'neutral', feet: 'together' },
    cue: 'Round the whole body into a C. Arms reaching forward, ribs pulled in.',
  },
]
