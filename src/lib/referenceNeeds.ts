/**
 * One coach reference photo per practiced shape — shot list for Ryan.
 * Extra / learn-only shapes live in the glossary Extra folder (no camera scoring).
 */

import { CURRICULUM_TASKS } from '../config/curriculum'
import { SHAPES, getShape } from '../config/shapes'
import { curriculumShapeIds } from './educationCopy'
import type { ReferencePhoto, ShapeDef } from '../types'

/** Homework drills that are practiced on camera but not on the task pathway. */
export const HOMEWORK_SHAPE_IDS = [
  'hollow_arms_down',
  'hollow',
  'superman',
  'side_plank',
  'wall_handstand',
] as const

export type ShotNeed = {
  shapeId: string
  name: string
  group: 'pathway' | 'homework'
  /** How to film this one photo. */
  shoot: string
}

const SHOTS: Record<string, string> = {
  stand_clean: 'FRONT. Stand tall, feet glued, arms by the sides. Full body in frame.',
  feet_together_open_shoulders:
    'FRONT or 3/4. Feet glued, knees straight, arms covering ears, hands to the ceiling.',
  arms_low_v_back: 'SIDE. Standing. Low V arms reaching slightly back. Elbows straight.',
  arms_front_middle: 'SIDE. Standing. Arms reaching forward at middle / chest height.',
  arms_open_shoulders: 'FRONT or 3/4. Standing. Arms by ears, shoulders fully open.',
  arms_t: 'FACE the camera. Standing. Both arms straight out to the sides (T).',
  arms_high_v_chest: 'FRONT. Standing. High V (not covering the ears), chest open.',
  passe: 'FRONT or 3/4. Stance leg straight, other foot at the knee, FTOS arms up.',
  lunge_start:
    'SIDE. Starting lunge: back HEEL UP, open shoulders / arms by ears, one line back foot → hands.',
  lunge_arms_low_v: 'SIDE. Lunge (back foot may be FLAT). Low V arms slightly back.',
  lunge_arms_front: 'SIDE. Lunge (back foot may be FLAT). Arms forward at middle height.',
  lunge_arms_open: 'SIDE. Lunge (back foot may be FLAT). Open shoulders, arms by ears.',
  lunge_arms_t: 'FACE the camera. Lunge (back foot may be FLAT). Arms in a T.',
  lunge_arms_high_v: 'FRONT or 3/4. Lunge (back foot may be FLAT). High V, chest out.',
  lever: 'SIDE. Chest parallel, open shoulders, one line back foot → hands (T-scale).',
  handstand: 'SIDE or 3/4. Stacked HS — not stomach-to-wall. Tight body line.',
  lunge_land: 'SIDE. Landing lunge: back heel FLAT, closer step, open shoulders.',
  c_shape: 'FRONT or 3/4. Standing artistic C-curve, arms framing the head.',
  mountain_climber: 'SIDE. Smaller step than a lunge, C upper body, back knee bent.',
  hollow_arms_down: 'SIDE. Hollow on the floor, arms glued by the sides, low back down.',
  hollow: 'SIDE. Hollow, arms by the ears, low back down.',
  superman: 'SIDE. Prone, straight arms behind ears, chin off chest, knees off the floor.',
  side_plank: 'SIDE. Body in one line, hips up. One photo (either side is fine).',
  wall_handstand: 'SIDE. Stomach-to-wall preferred. Same stacked body as freestanding.',
}

export function practicedShapeIds(): Set<string> {
  const ids = curriculumShapeIds()
  for (const id of HOMEWORK_SHAPE_IDS) ids.add(id)
  return ids
}

/** Ordered shot list: pathway order, then homework. */
export function neededShotList(): ShotNeed[] {
  const seen = new Set<string>()
  const out: ShotNeed[] = []
  for (const task of CURRICULUM_TASKS) {
    for (const step of task.steps) {
      if (seen.has(step.shapeId)) continue
      const s = getShape(step.shapeId)
      if (!s) continue
      seen.add(s.id)
      out.push({
        shapeId: s.id,
        name: s.name,
        group: 'pathway',
        shoot: SHOTS[s.id] ?? shotFallback(s),
      })
    }
  }
  for (const id of HOMEWORK_SHAPE_IDS) {
    if (seen.has(id)) continue
    const s = getShape(id)
    if (!s) continue
    seen.add(id)
    out.push({
      shapeId: s.id,
      name: s.name,
      group: 'homework',
      shoot: SHOTS[s.id] ?? shotFallback(s),
    })
  }
  return out
}

function shotFallback(s: ShapeDef): string {
  const view =
    s.cameraView === 'side' ? 'SIDE view.' : s.cameraView === 'front' ? 'FACE the camera.' : 'Full body in frame.'
  return `${view} One clear still of the finished position.`
}

/** Built-in library shapes that are not practiced on camera (learn-only). */
export function builtinExtraShapes(): ShapeDef[] {
  const practiced = practicedShapeIds()
  return SHAPES.filter((s) => !practiced.has(s.id)).sort((a, b) => a.name.localeCompare(b.name))
}

/**
 * A stored coach reference is a shared upload (data URL), not an athlete hit-ref
 * and not a missing public/ file path.
 */
export function hasCoachReference(photos: ReferencePhoto[], shapeId: string): boolean {
  return photos.some(
    (p) =>
      p.shapeId === shapeId &&
      p.athleteId == null &&
      typeof p.dataUrl === 'string' &&
      p.dataUrl.startsWith('data:image'),
  )
}

export function missingCoachReferences(photos: ReferencePhoto[]): ShotNeed[] {
  return neededShotList().filter((s) => !hasCoachReference(photos, s.shapeId))
}

/** Shared coach photo for a practiced/library shape (ignores athlete hits). */
export function pickCoachReference(
  photos: ReferencePhoto[],
  shapeId: string,
): ReferencePhoto | null {
  return photos.find((p) => p.shapeId === shapeId && p.athleteId == null && p.dataUrl) ?? null
}
