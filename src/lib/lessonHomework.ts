import { getShape } from '../config/shapes'
import type { HomeworkItem, HomeworkLog } from '../types'
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
  }
  addHomeworkLog(log)
  return log
}
