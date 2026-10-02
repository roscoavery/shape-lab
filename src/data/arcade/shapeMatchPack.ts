/**
 * Shape Match targets — low-risk floor/standing shapes only.
 * Cues are verbatim from Coach Ryan's shape tips (shape-tips.json).
 * Draft content.
 */
import type { FigurePose } from '../../components/arcade/lab/ShapeFigure'

export type ShapeMatchTarget = {
  id: string
  shapeId: string
  shapeName: string
  cues: [string, string, string]
  pose: FigurePose
}

export const SHAPE_MATCH_PACK: ShapeMatchTarget[] = [
  {
    id: 'hollow-down',
    shapeId: 'hollow_down',
    shapeName: 'Hollow (arms down)',
    cues: [
      'Flatten the low back, then let the feet inch off the ground.',
      'Arms by the sides, not overhead.',
      'If the lower back will not go down, bend the knees.',
    ],
    pose: { arms: 'down', knees: 'straight', back: 'hollow', head: 'neutral', feet: 'together' },
  },
  {
    id: 'superman',
    shapeId: 'superman',
    shapeName: 'Superman',
    cues: [
      'Chin stays up with straight arms behind the ears.',
      'Straight knees off of the ground.',
      'Feet and ankles together.',
    ],
    pose: { arms: 'up', knees: 'straight', back: 'arch', head: 'up', feet: 'together' },
  },
  {
    id: 'front-plank',
    shapeId: 'front_plank',
    shapeName: 'Front plank',
    cues: [
      'Elbows under the shoulders.',
      'Straight line head to heels — no sag, no pike.',
      'Squeeze the glutes and brace the core.',
    ],
    pose: { arms: 'down', knees: 'straight', back: 'flat', head: 'neutral', feet: 'together' },
  },
  {
    id: 'side-plank',
    shapeId: 'side_plank',
    shapeName: 'Side plank',
    cues: [
      'Be a pencil. Straightest line you can squeeze.',
      'Elbow under the shoulder. Forearm on the mat.',
      'One foot stacked on the other.',
    ],
    pose: { arms: 't', knees: 'straight', back: 'flat', head: 'neutral', feet: 'together' },
  },
  {
    id: 'tuck',
    shapeId: 'tuck',
    shapeName: 'Tuck',
    cues: [
      'From an open-shoulder pike: bend the knees and pull the feet in.',
      'Flex the feet — toes to the shins, not pointed.',
      'Keep reaching. Arms behind the ears, shoulders open.',
    ],
    pose: { arms: 'up', knees: 'bent', back: 'hollow', head: 'neutral', feet: 'together' },
  },
  {
    id: 'c-shape',
    shapeId: 'c_shape',
    shapeName: 'C shape',
    cues: [
      'Hips under, chest hollow — round the back, do not arch.',
      'Arms reach forward (not by the ears). Elbows straight.',
      'This C plus one medium step forward is a mountain climber.',
    ],
    pose: { arms: 'front', knees: 'straight', back: 'hollow', head: 'neutral', feet: 'together' },
  },
  {
    id: 'lunge',
    shapeId: 'lunge',
    shapeName: 'Lunge',
    cues: [
      'Keep hips square and torso tall.',
      'Arms cover the ears.',
      'Back heel up. Back leg straight. Back straight. Shoulders open.',
    ],
    pose: { arms: 'up', knees: 'bent', back: 'flat', head: 'neutral', feet: 'apart' },
  },
  {
    id: 'lever',
    shapeId: 'lever',
    shapeName: 'Lever',
    cues: [
      'Tilt the chest toward parallel with the floor.',
      'Open shoulders as far as you can — slightly closed does not ruin it.',
      'Slight bend in the front knee — not locked, not sitting.',
    ],
    pose: { arms: 't', knees: 'straight', back: 'flat', head: 'up', feet: 'apart' },
  },
  {
    id: 'candlestick',
    shapeId: 'candlestick',
    shapeName: 'Candlestick',
    cues: [
      'Open hips, ribs in — same stacked body as a good handstand, just on the shoulders.',
      'Straight knees, pointed toes.',
      'SIDE or 3/4 so the vertical line is obvious.',
    ],
    pose: { arms: 'up', knees: 'straight', back: 'flat', head: 'neutral', feet: 'together' },
  },
  {
    id: 'zombie',
    shapeId: 'zombie',
    shapeName: 'Zombie stand',
    cues: ['Hollow body with half-closed shoulder.', 'Straight knees.', 'Butt in.'],
    pose: { arms: 'front', knees: 'straight', back: 'hollow', head: 'neutral', feet: 'together' },
  },
  {
    id: 'wall-sit',
    shapeId: 'wall_sit',
    shapeName: 'Wall sit',
    cues: [
      'Back flat against the wall.',
      'Thighs parallel to the floor.',
      'Knees over the ankles.',
    ],
    pose: { arms: 'down', knees: 'bent', back: 'flat', head: 'neutral', feet: 'together' },
  },
  {
    id: 'pike',
    shapeId: 'pike_zombie',
    shapeName: 'Pike',
    cues: [
      'Sit in a pike — do not fold over the legs.',
      'Toes pointed. Straight knees. Legs glued.',
      'Torso upright and rounded hollow. Shoulders shrug.',
    ],
    pose: { arms: 'up', knees: 'straight', back: 'flat', head: 'neutral', feet: 'together' },
  },
]
