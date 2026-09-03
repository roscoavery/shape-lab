import { catalogShapeId, getCatalogItem } from '../config/homeworkCatalog'
import { getShape } from '../config/shapes'
import type { ClassExtraExercise, HomeworkItem, HomeworkLog } from '../types'
import { customHomeworkShapeId } from './homeworkLabel'
import {
  addHomeworkItem,
  addHomeworkLog,
  createId,
  ensureAutoHomework,
  homeworkDedupeKey,
} from './storage'

/** Write a lesson hold onto the athlete’s homework log (not the coach’s). */
export function logLessonHoldOnAthleteHomework(args: {
  athleteId: string
  coachId: string
  coachName: string
  lessonId: string
  shapeId: string
  shapeName: string
  totalHoldSeconds: number
  properHoldSeconds: number
  score: number
  method: 'camera' | 'manual'
  side?: 'left' | 'right'
}): HomeworkLog | null {
  if (!args.athleteId || args.totalHoldSeconds < 0.2) return null

  const items = ensureAutoHomework(args.athleteId)
  const library = getShape(args.shapeId)
  const custom = !library || args.shapeId.startsWith('custom:')
  const shapeId = custom ? customHomeworkShapeId(args.shapeName) : args.shapeId
  const probe: Pick<HomeworkItem, 'athleteId' | 'shapeId'> & { customLabel?: string } = {
    athleteId: args.athleteId,
    shapeId,
    ...(custom ? { customLabel: args.shapeName.trim() } : {}),
  }
  const key = homeworkDedupeKey(probe)
  let item = items.find((row) => homeworkDedupeKey(row) === key)
  if (!item) {
    const next = addHomeworkItem({
      id: createId('hw'),
      athleteId: args.athleteId,
      shapeId,
      ...(custom ? { customLabel: args.shapeName.trim() } : {}),
      source: 'coach',
      createdAt: new Date().toISOString(),
      notes: `Added from a lesson with ${args.coachName}.`,
    })
    item = next.find((row) => homeworkDedupeKey(row) === key)
  }
  if (!item) return null

  const log: HomeworkLog = {
    id: createId('hwlog'),
    athleteId: args.athleteId,
    homeworkId: item.id,
    shapeId: item.shapeId,
    date: new Date().toISOString(),
    method: args.method,
    totalHoldSeconds: Number(args.totalHoldSeconds.toFixed(2)),
    ...(args.method === 'camera'
      ? { properHoldSeconds: Number(args.properHoldSeconds.toFixed(2)) }
      : {}),
    score: args.score,
    loggedFrom: 'lesson',
    lessonId: args.lessonId,
    coachId: args.coachId,
    coachName: args.coachName,
    ...(args.side ? { side: args.side } : {}),
    ...(args.side ? { sourceLabel: `Lesson · ${args.shapeName}` } : {}),
  }
  addHomeworkLog(log)
  return log
}

/** Log a lesson extra that is counted as reps (push-ups, custom, …). */
export function logLessonRepsOnAthleteHomework(args: {
  athleteId: string
  coachId: string
  coachName: string
  lessonId: string
  extra: ClassExtraExercise
  reps: number
  sets?: number
}): HomeworkLog | null {
  if (!args.athleteId || args.reps <= 0) return null
  const items = ensureAutoHomework(args.athleteId)
  const cat = args.extra.kind === 'catalog' && args.extra.refId ? getCatalogItem(args.extra.refId) : undefined
  const shapeId = cat
    ? catalogShapeId(cat.id)
    : args.extra.kind === 'shape' && args.extra.refId
      ? args.extra.refId
      : customHomeworkShapeId(args.extra.label)
  const customLabel = cat?.name ?? args.extra.label
  const probe: Pick<HomeworkItem, 'athleteId' | 'shapeId'> & {
    customLabel?: string
    catalogId?: string
  } = {
    athleteId: args.athleteId,
    shapeId,
    customLabel,
    ...(cat ? { catalogId: cat.id } : {}),
  }
  const key = homeworkDedupeKey(probe)
  let item = items.find((row) => homeworkDedupeKey(row) === key)
  if (!item) {
    const next = addHomeworkItem({
      id: createId('hw'),
      athleteId: args.athleteId,
      shapeId,
      customLabel,
      source: 'coach',
      trackMode: 'reps',
      ...(cat ? { catalogId: cat.id } : {}),
      createdAt: new Date().toISOString(),
      notes: `Added from a lesson with ${args.coachName}.`,
    })
    item = next.find((row) => homeworkDedupeKey(row) === key)
  }
  if (!item) return null
  const log: HomeworkLog = {
    id: createId('hwlog'),
    athleteId: args.athleteId,
    homeworkId: item.id,
    shapeId: item.shapeId,
    date: new Date().toISOString(),
    method: 'manual',
    kind: 'reps',
    totalHoldSeconds: 0,
    reps: args.reps,
    ...(args.sets && args.sets > 1 ? { sets: args.sets } : {}),
    score: 0,
    loggedFrom: 'lesson',
    lessonId: args.lessonId,
    coachId: args.coachId,
    coachName: args.coachName,
    trackMode: 'reps',
    sourceLabel:
      args.sets && args.sets > 1
        ? `Lesson · ${args.extra.label} · ${args.sets}×${args.reps}`
        : `Lesson · ${args.extra.label}`,
  }
  addHomeworkLog(log)
  return log
}
