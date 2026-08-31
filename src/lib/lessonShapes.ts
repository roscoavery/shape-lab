import { allLibraryShapes, getShape } from '../config/shapes'
import { ARM_POSITION_SHAPE_IDS } from './educationCopy'
import type { ShapeDef } from '../types'

/** The four holds a coach reaches for first during a lesson. */
export const QUICK_HOLD_IDS = [
  'hollow_arms_down',
  'superman',
  'side_plank',
  'wall_handstand',
] as const

export type QuickHoldId = (typeof QUICK_HOLD_IDS)[number]

const QUICK_LABELS: Record<QuickHoldId, string> = {
  hollow_arms_down: 'Hollow',
  superman: 'Superman',
  side_plank: 'Side plank',
  wall_handstand: 'Wall handstand',
}

export function isArmPositionShape(id: string): boolean {
  return ARM_POSITION_SHAPE_IDS.includes(id)
}

/** Generic leftovers — starting/landing lunge and rainbow/long bridge cover these. */
export const LESSON_HIDDEN_SHAPE_IDS = ['lunge', 'bridge'] as const

/** Library shapes a lesson can time or camera-score. */
export function lessonScoreShapes(): ShapeDef[] {
  return allLibraryShapes()
    .filter(
      (s) =>
        !isArmPositionShape(s.id) &&
        !LESSON_HIDDEN_SHAPE_IDS.includes(s.id as (typeof LESSON_HIDDEN_SHAPE_IDS)[number]),
    )
    .sort((a, b) => a.name.localeCompare(b.name))
}

export function quickHoldShapes(): { id: QuickHoldId; label: string; shape: ShapeDef }[] {
  return QUICK_HOLD_IDS.flatMap((id) => {
    const shape = getShape(id)
    return shape ? [{ id, label: QUICK_LABELS[id], shape }] : []
  })
}
