/**
 * One coach reference photo per practiced shape — shot list for Ryan.
 * Extra / learn-only shapes live in the glossary Extra folder (no camera scoring).
 */

import { CURRICULUM_TASKS } from '../config/curriculum'
import { SHAPES, getShape } from '../config/shapes'
import { curriculumShapeIds, isLearnLibraryShape } from './educationCopy'
import {
  pickCoachStill,
  SHIPPED_REFERENCE_IDS,
} from './shippedRefs'
import type { ReferencePhoto, ShapeDef } from '../types'

/** Homework drills that are practiced on camera but not on the task pathway. */
export const HOMEWORK_SHAPE_IDS = [
  'hollow_arms_down',
  'hollow_arms_up',
  'superman',
  'rainbow_bridge',
  'long_bridge',
  'seated_pike',
  'pike_open_shoulders',
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
  stand_clean:
    'FRONT. Cheer ready. Feet glued, arms pinned to the sides, fists or blades. Full body in frame.',
  feet_together_open_shoulders:
    'FRONT or 3/4. Feet glued, knees straight, open hips, ribs in, arms covering ears, chin up and neutral, hands to the ceiling.',
  arms_low_v_back: 'SIDE. Standing. Low V arms reaching slightly back. Elbows straight.',
  arms_front_middle: 'SIDE. Standing. Arms reaching forward at middle / chest height.',
  arms_open_shoulders: 'FRONT or 3/4. Standing. Arms by ears, shoulders fully open.',
  arms_t: 'FACE the camera. Standing. Both arms straight out to the sides (T).',
  arms_high_v_chest: 'FRONT. Standing. High V (not covering the ears), chest open.',
  passe: 'FRONT or 3/4. Stance leg straight, other foot at the knee, FTOS arms up.',
  lunge_start:
    'SIDE. Starting lunge: back HEEL UP, back leg STRAIGHT, back STRAIGHT, shoulders OPEN. Longer than a landing lunge.',
  lunge_arms_low_v: 'SIDE. Landing-lunge stance (heel FLAT, closer feet). Low V arms slightly back.',
  lunge_arms_front: 'SIDE. Landing-lunge stance (heel FLAT, closer feet). Arms forward at middle height.',
  lunge_arms_open:
    'Same photo as landing lunge. No extra shot — this is that position (heel FLAT, open shoulders, arms by ears).',
  lunge_arms_t: 'FACE the camera. Landing-lunge stance (heel FLAT, closer feet). Arms in a T.',
  lunge_arms_high_v: 'FRONT or 3/4. Landing-lunge stance (heel FLAT, closer feet). High V, chest out.',
  lever:
    'SIDE. Slight bend in the front knee. Chest parallel to the floor. One line back foot → hands, also parallel. Open shoulders.',
  handstand:
    'SIDE or 3/4. Freestanding stacked HS. Ribs in, butt in, ears covered, toes pointed. Not stomach-to-wall.',
  lunge_land:
    'SIDE. Landing lunge: back heel FLAT, shorter than a starting lunge, open shoulders, one line heel → hands. Same still as Lunge · open shoulders.',
  c_shape:
    'SIDE. Tumbling C: squat, hollow chest, hips under, arms reaching forward (not a standing side-bend).',
  mountain_climber:
    'SIDE. C plus one medium step (not as big as a lunge). Both knees bent. Upper body in the tumbling C. Arms reaching forward and out from the middle.',
  hollow_arms_down:
    'SIDE. On the back. Start from a pike, inch back until the lower back is FLAT, arms by the sides, feet off the floor.',
  hollow_arms_up:
    'SIDE. Same hollow, arms glued by the ears. Only after a proper 1-minute arms-down hold.',
  zombie:
    'SIDE. Standing hollow, feet together. Arms in front, shoulders shrugged so the arms cover the ears. Eyes forward/down toward where they came from.',
  seated_pike:
    'SIDE or 3/4. Sitting. Pike with zombie arms: toes pointed, straight knees, torso upright and rounded hollow, shoulders shrugged, arms covering the ears, eyes looking through the hands. Wide fingers, pinkies slightly up, thumbs slightly down.',
  pike_open_shoulders:
    'SIDE or 3/4. Sitting. Pike with arms up: legs together, knees straight, toes pointed, torso upright, shoulders open, arms covering the ears, fingers to the ceiling. Close-up and class line both count.',
  superman:
    'SIDE. Two athletes on the stomach. Chin up, straight arms behind the ears, open shoulders, straight knees off the mat, feet and ankles together.',
  rainbow_bridge:
    'SIDE. Rainbow bridge — not a straight-leg competition bridge. Feet flat, toes pointed straight ahead, feet apart, knees bent, hips up high, shoulders open over the hands. Head hangs between the arms.',
  long_bridge:
    'SIDE. Long bridge after rainbow shoulders are open. Straight legs together, heels flat, pushing through the toes, arms covering the ears, chin to chest. Fingers toward the feet.',
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

/** Built-in library extras that are not practiced on camera (learn-only). */
export function builtinExtraShapes(): ShapeDef[] {
  const practiced = practicedShapeIds()
  return SHAPES.filter((s) => isLearnLibraryShape(s.id) && !practiced.has(s.id)).sort((a, b) =>
    a.name.localeCompare(b.name),
  )
}

/**
 * A stored coach reference is a shared upload (data URL), not an athlete hit-ref
 * and not a missing public/ file path.
 */
export function hasCoachReference(photos: ReferencePhoto[], shapeId: string): boolean {
  if (
    photos.some(
      (p) =>
        p.shapeId === shapeId &&
        p.athleteId == null &&
        p.library !== 'ig' &&
        typeof p.dataUrl === 'string' &&
        p.dataUrl.startsWith('data:image'),
    )
  ) {
    return true
  }
  return SHIPPED_REFERENCE_IDS.has(shapeId)
}

export function missingCoachReferences(photos: ReferencePhoto[]): ShotNeed[] {
  return neededShotList().filter((s) => !hasCoachReference(photos, s.shapeId))
}

/** Shared coach photo for a practiced/library shape (ignores athlete hits). */
export function pickCoachReference(
  photos: ReferencePhoto[],
  shapeId: string,
): ReferencePhoto | null {
  const still = pickCoachStill(photos, shapeId)
  if (!still) return null
  const shape = getShape(shapeId)
  return { ...still, notes: still.notes ?? shape?.coachNotes }
}
