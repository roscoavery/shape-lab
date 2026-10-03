/**
 * Shape Shifter sequences: moving between shapes in order.
 * Floor/standing, safe transitions only. The handstand-through sequence is
 * flagged supervised: true and is excluded from the playable rotation.
 * Cues are verbatim from Coach Ryan's shape tips (shape-tips.json).
 * Draft content.
 */
import type { FigurePose } from '../../components/arcade/lab/ShapeFigure'

export type ShapeShifterPosition = {
  shapeName: string
  pose: FigurePose
  cue: string
}

export type ShapeShifterSequence = {
  id: string
  name: string
  shapes: [ShapeShifterPosition, ShapeShifterPosition, ShapeShifterPosition]
  /** Coach-supervised only: shown with a label, never in the playable rotation. */
  supervised?: boolean
}

const LUNGE: FigurePose = { arms: 'up', knees: 'bent', back: 'flat', head: 'neutral', feet: 'apart' }
const LEVER: FigurePose = { arms: 't', knees: 'straight', back: 'flat', head: 'up', feet: 'apart' }
const HOLLOW_DOWN: FigurePose = {
  arms: 'down',
  knees: 'straight',
  back: 'hollow',
  head: 'neutral',
  feet: 'together',
}
const TUCK: FigurePose = { arms: 'up', knees: 'bent', back: 'hollow', head: 'neutral', feet: 'together' }
const FRONT_SUPPORT: FigurePose = {
  arms: 'down',
  knees: 'straight',
  back: 'flat',
  head: 'neutral',
  feet: 'together',
}
const MAD_CAT: FigurePose = { arms: 'down', knees: 'bent', back: 'hollow', head: 'neutral', feet: 'together' }
const PIKE: FigurePose = { arms: 'up', knees: 'straight', back: 'flat', head: 'neutral', feet: 'together' }
const ZOMBIE: FigurePose = { arms: 'front', knees: 'straight', back: 'hollow', head: 'neutral', feet: 'together' }
const C_SHAPE: FigurePose = { arms: 'front', knees: 'straight', back: 'hollow', head: 'neutral', feet: 'together' }
const HANDSTAND: FigurePose = {
  arms: 'up',
  knees: 'straight',
  back: 'flat',
  head: 'neutral',
  feet: 'together',
}

export const SHAPE_SHIFTER_SEQUENCES: ShapeShifterSequence[] = [
  {
    id: 'lunge-lever-lunge',
    name: 'Lever Lunge',
    shapes: [
      { shapeName: 'Lunge', pose: LUNGE, cue: 'Keep hips square and torso tall.' },
      { shapeName: 'Lever', pose: LEVER, cue: 'Tilt the chest toward parallel with the floor.' },
      { shapeName: 'Lunge', pose: LUNGE, cue: 'Arms cover the ears.' },
    ],
  },
  {
    id: 'support-madcat-support',
    name: 'Mad Cat Reset',
    shapes: [
      {
        shapeName: 'Front support',
        pose: FRONT_SUPPORT,
        cue: 'Straight line head to heels. No sag, no pike.',
      },
      {
        shapeName: 'Mad cat',
        pose: MAD_CAT,
        cue: 'Hips under, chest hollow. Round the back, do not arch.',
      },
      {
        shapeName: 'Front support',
        pose: FRONT_SUPPORT,
        cue: 'Squeeze the glutes and brace the core.',
      },
    ],
  },
  {
    id: 'hollow-tuck-hollow',
    name: 'Hollow Tuck Wave',
    shapes: [
      {
        shapeName: 'Hollow (arms down)',
        pose: HOLLOW_DOWN,
        cue: 'Flatten the low back, then let the feet inch off the ground.',
      },
      {
        shapeName: 'Tuck',
        pose: TUCK,
        cue: 'From an open-shoulder pike: bend the knees and pull the feet in.',
      },
      {
        shapeName: 'Hollow (arms down)',
        pose: HOLLOW_DOWN,
        cue: 'Arms by the sides, not overhead.',
      },
    ],
  },
  {
    id: 'pike-tuck-pike',
    name: 'Pike Tuck Roll-Up',
    shapes: [
      {
        shapeName: 'Pike',
        pose: PIKE,
        cue: 'Toes pointed. Straight knees. Legs glued.',
      },
      {
        shapeName: 'Tuck',
        pose: TUCK,
        cue: 'Keep reaching. Arms behind the ears, shoulders open.',
      },
      {
        shapeName: 'Pike',
        pose: PIKE,
        cue: 'Sit in a pike. Do not fold over the legs.',
      },
    ],
  },
  {
    id: 'zombie-cshape-zombie',
    name: 'Zombie C',
    shapes: [
      {
        shapeName: 'Zombie stand',
        pose: ZOMBIE,
        cue: 'Hollow body with half-closed shoulder.',
      },
      {
        shapeName: 'C shape',
        pose: C_SHAPE,
        cue: 'Arms reach forward (not by the ears). Elbows straight.',
      },
      {
        shapeName: 'Zombie stand',
        pose: ZOMBIE,
        cue: 'Butt in.',
      },
    ],
  },
  {
    id: 'lunge-lever-handstand-lunge',
    name: 'Handstand Through',
    supervised: true,
    shapes: [
      { shapeName: 'Lunge', pose: LUNGE, cue: 'Back heel up. Back leg straight. Back straight. Shoulders open.' },
      { shapeName: 'Lever', pose: LEVER, cue: 'Lift the back leg. A little arch is still a lever.' },
      { shapeName: 'Handstand', pose: HANDSTAND, cue: 'Ribs in, butt in. Straight elbows, open shoulders.' },
    ],
  },
]
