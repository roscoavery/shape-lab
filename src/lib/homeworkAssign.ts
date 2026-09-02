/**
 * Build a homework item from a typeahead pick and assign it to one or
 * many athletes (class assign).
 */

import { FLOW_SEQUENCES } from '../config/tasks2'
import { catalogShapeId, getCatalogItem } from '../config/homeworkCatalog'
import { listPublicDrills } from './coachContentStore'
import {
  customHomeworkShapeId,
  drillHomeworkShapeId,
  sequenceHomeworkShapeId,
} from './homeworkLabel'
import { addHomeworkItem, createId, homeworkDedupeKey, loadAllHomework } from './storage'
import type { CoachExercise, HomeworkItem, HomeworkSource, HomeworkTrackMode } from '../types'
import type { HomeworkPick } from '../components/homework/AddHomeworkForm'

export type HomeworkAssignDraft = {
  pick: HomeworkPick
  source?: HomeworkSource
  notes?: string
  mode?: HomeworkTrackMode | ''
  targetSeconds?: number
  targetReps?: number
  grip?: string
  coachExercises?: CoachExercise[]
}

function defaultNotes(shapeId: string): string {
  if (shapeId === 'rainbow_bridge') {
    return 'Feet flat, pointed straight, feet apart, bent knees, hips up high. Spread the arch until the shoulders are open. Push-ups, back bends, hops, and rocks from this bridge.'
  }
  if (shapeId === 'side_plank') {
    return 'Be a pencil. Forearm on the mat, elbow under the shoulder, one foot stacked on the other. Top hand on the hip or up. Head in line — no dangling head, no ribs flaring, no closed hips. Straight knees if you can; or bend them and put weight on the bottom knee. Both sides. Work toward a minute.'
  }
  if (shapeId === 'long_bridge') {
    return 'Only after rainbow-bridge shoulders are open. Straight legs together, heels flat, pushing through the toes, arms in close by the ears, chin to chest. Come down and rock it out.'
  }
  if (shapeId === 'seated_pike') {
    return 'Toes pointed, straight knees, torso upright and rounded hollow, shoulders shrug, arms covering the ears, eyes through the hands. Hands push through — wide fingers, thumbs slightly down, pinkies slightly up. Snap-open drill: pike → hollow arms down → arch (supine).'
  }
  if (shapeId === 'zombie') {
    return 'Standing hollow, arms in front, ears covered. Hands push through — wide fingers, thumbs slightly down, pinkies slightly up. Same finish as the seated pike with zombie arms.'
  }
  return ''
}

export function buildHomeworkItem(
  athleteId: string,
  draft: HomeworkAssignDraft,
): HomeworkItem | null {
  const pick = draft.pick
  const coachEx =
    pick.kind === 'coach'
      ? draft.coachExercises?.find((e) => e.id === pick.id)
      : undefined
  const cat = pick.kind === 'catalog' ? getCatalogItem(pick.id) : undefined
  const seq = pick.kind === 'flow' ? FLOW_SEQUENCES.find((s) => s.id === pick.id) : undefined
  const drill = pick.kind === 'drill' ? listPublicDrills().find((d) => d.id === pick.id) : undefined
  const typed = pick.kind === 'typed' ? pick.name.trim() : ''
  const shapeId =
    pick.kind === 'catalog' && cat
      ? catalogShapeId(cat.id)
      : pick.kind === 'coach' && coachEx
        ? customHomeworkShapeId(coachEx.name)
        : pick.kind === 'drill' && drill
          ? drillHomeworkShapeId(drill.id)
          : pick.kind === 'flow' && seq
            ? sequenceHomeworkShapeId(seq.id)
            : pick.kind === 'typed'
              ? customHomeworkShapeId(typed)
              : pick.kind === 'shape'
                ? pick.id
                : ''
  if (!shapeId) return null
  const label =
    cat?.name ??
    coachEx?.name ??
    drill?.title ??
    seq?.name ??
    (pick.kind === 'typed' ? typed : pick.kind === 'shape' ? undefined : pick.name)
  const notes =
    draft.notes?.trim() ||
    cat?.notes ||
    coachEx?.notes ||
    drill?.notes ||
    seq?.description ||
    defaultNotes(shapeId)
  const trackMode: HomeworkTrackMode | undefined =
    draft.mode ||
    cat?.trackMode ||
    coachEx?.trackMode ||
    (pick.kind === 'typed' ? 'reps' : undefined)
  return {
    id: createId('hw'),
    athleteId,
    shapeId,
    ...(cat
      ? { catalogId: cat.id, customLabel: cat.name, allowWeight: cat.allowWeight }
      : coachEx
        ? { coachExerciseId: coachEx.id, customLabel: coachEx.name }
        : label
          ? { customLabel: label }
          : {}),
    source: draft.source ?? 'coach',
    ...(trackMode ? { trackMode } : {}),
    ...(draft.grip ? { grip: draft.grip } : {}),
    ...(draft.targetSeconds && draft.targetSeconds > 0 ? { targetSeconds: draft.targetSeconds } : {}),
    ...(draft.targetReps && draft.targetReps > 0
      ? { targetReps: draft.targetReps }
      : cat?.targetReps
        ? { targetReps: cat.targetReps }
        : {}),
    ...(notes ? { notes } : {}),
    createdAt: new Date().toISOString(),
  }
}

/** Find an existing homework card or add one from a pick. */
export function ensureHomeworkForPick(
  athleteId: string,
  pick: HomeworkPick,
  source: HomeworkSource = 'athlete',
): HomeworkItem | null {
  const item = buildHomeworkItem(athleteId, { pick, source })
  if (!item) return null
  const existing = loadAllHomework().find(
    (h) => h.athleteId === athleteId && homeworkDedupeKey(h) === homeworkDedupeKey(item),
  )
  if (existing) return existing
  addHomeworkItem(item)
  return item
}

export function assignHomeworkToAthletes(
  athleteIds: string[],
  draft: HomeworkAssignDraft,
): { added: number; skipped: number } {
  let added = 0
  let skipped = 0
  const existing = loadAllHomework()
  for (const athleteId of athleteIds) {
    const item = buildHomeworkItem(athleteId, draft)
    if (!item) {
      skipped += 1
      continue
    }
    const key = homeworkDedupeKey(item)
    if (existing.some((h) => h.athleteId === athleteId && homeworkDedupeKey(h) === key)) {
      skipped += 1
      continue
    }
    addHomeworkItem(item)
    existing.push(item)
    added += 1
  }
  return { added, skipped }
}

export function homeworkPickTitle(pick: HomeworkPick): string {
  return pick.name
}
