import { roundHoldSecondsUp } from '../hooks/useHoldTimer'
import { AUTO_HOMEWORK_DEFS } from './storage'
import { catalogShapeId } from '../config/homeworkCatalog'
import { addLessonHold } from './lessonStore'
import { logLessonHoldOnAthleteHomework, logLessonRepsOnAthleteHomework } from './lessonHomework'
import {
  logClassExtraForAthletes,
  logClassHoldForAthletes,
  logClassRepsForAthletes,
} from './classSessionLog'
import { makeClassExtra } from './classExercises'
import type { ClassExtraExercise, LessonNoteTopicKind } from '../types'

/**
 * Lesson context for the session clock. When present, the clock logs holds
 * and reps as lesson work (loggedFrom 'lesson', tied to the lesson session)
 * instead of class work.
 */
export type LessonClockContext = {
  lessonId: string
  coachId: string
  coachName: string
}

/** Map a class hold drill autoKey to its homework shape id. */
export function shapeIdForAutoKey(autoKey: string): string {
  return AUTO_HOMEWORK_DEFS.find((d) => d.autoKey === autoKey)?.shapeId ?? autoKey
}

type SharedLogArgs = {
  athleteIds: string[]
  lesson?: LessonClockContext
  className?: string
  meetingId?: string
  coachId?: string
  coachName?: string
  /** For non-lesson, non-class contexts (e.g. family practice). */
  loggedFrom?: 'class' | 'family'
}

function extraShapeId(extra: ClassExtraExercise): string {
  if (extra.kind === 'catalog' && extra.refId) return catalogShapeId(extra.refId)
  if (extra.kind === 'shape' && extra.refId) return extra.refId
  return `custom:${extra.label.trim().toLowerCase()}`
}

/**
 * Log a hold for athletes. Class sessions use the class log path; lesson
 * sessions use the lesson log path and also file the hold on the lesson
 * session so the lesson recap shows it.
 */
export function logSessionHold(
  args: SharedLogArgs & {
    autoKey: string
    seconds: number
    label: string
    side?: 'left' | 'right'
  },
): number {
  const { athleteIds, autoKey, seconds, label, side, lesson, className, meetingId, coachId, coachName, loggedFrom } = args
  if (!lesson) {
    return logClassHoldForAthletes({
      athleteIds,
      autoKey:
        autoKey as 'hollow' | 'superman' | 'side_plank' | 'wall_handstand' | 'front_plank' | 'tuck' | 'wall_sit',
      seconds,
      label,
      className,
      meetingId,
      side,
      coachId,
      coachName,
      loggedFrom,
    })
  }
  const shapeId = shapeIdForAutoKey(autoKey)
  const secs = roundHoldSecondsUp(seconds)
  let n = 0
  for (const athleteId of athleteIds) {
    const row = logLessonHoldOnAthleteHomework({
      athleteId,
      coachId: lesson.coachId,
      coachName: lesson.coachName,
      lessonId: lesson.lessonId,
      shapeId,
      shapeName: label,
      totalHoldSeconds: secs,
      properHoldSeconds: 0,
      score: 0,
      method: 'manual',
      ...(side ? { side } : {}),
    })
    if (!row) continue
    n += 1
    addLessonHold(lesson.lessonId, {
      shapeId,
      shapeName: label,
      totalHoldSeconds: secs,
      properHoldSeconds: 0,
      score: 0,
      method: 'manual',
      topicKind: 'shape',
      ...(side ? { side } : {}),
    })
  }
  return n
}

/** Log reps for athletes. Lesson sessions log as lesson work. */
export function logSessionReps(
  args: SharedLogArgs & {
    catalogId: string
    reps: number
    sets?: number
    label: string
    weightLb?: number
  },
): number {
  const { athleteIds, catalogId, reps, sets, label, weightLb, lesson, className, meetingId } = args
  if (!lesson) {
    return logClassRepsForAthletes({ athleteIds, catalogId, reps, sets, label, className, meetingId, weightLb })
  }
  const extra = makeClassExtra({ kind: 'catalog', refId: catalogId, label, trackMode: 'reps' })
  if (!extra) return 0
  let n = 0
  for (const athleteId of athleteIds) {
    const row = logLessonRepsOnAthleteHomework({
      athleteId,
      coachId: lesson.coachId,
      coachName: lesson.coachName,
      lessonId: lesson.lessonId,
      extra,
      reps,
      sets,
    })
    if (row) n += 1
  }
  return n
}

/** Log a pinned class extra (hold or reps) for athletes. Lesson sessions log as lesson work. */
export function logSessionExtra(
  args: SharedLogArgs & {
    extra: ClassExtraExercise
    seconds?: number
    reps?: number
    sets?: number
    weightLb?: number
  },
): number {
  const { athleteIds, extra, seconds, reps, sets, weightLb, lesson, className, meetingId } = args
  if (!lesson) {
    return logClassExtraForAthletes({ athleteIds, extra, seconds, reps, sets, className, meetingId, weightLb })
  }
  const hold = extra.trackMode === 'hold'
  let n = 0
  for (const athleteId of athleteIds) {
    if (hold) {
      const secs = seconds ?? 0
      if (!(secs > 0)) continue
      const shapeId = extraShapeId(extra)
      const topicKind: LessonNoteTopicKind = extra.kind === 'custom' ? 'custom' : 'shape'
      const row = logLessonHoldOnAthleteHomework({
        athleteId,
        coachId: lesson.coachId,
        coachName: lesson.coachName,
        lessonId: lesson.lessonId,
        shapeId,
        shapeName: extra.label,
        totalHoldSeconds: secs,
        properHoldSeconds: 0,
        score: 0,
        method: 'manual',
      })
      if (!row) continue
      n += 1
      addLessonHold(lesson.lessonId, {
        shapeId,
        shapeName: extra.label,
        totalHoldSeconds: roundHoldSecondsUp(secs),
        properHoldSeconds: 0,
        score: 0,
        method: 'manual',
        topicKind,
      })
    } else {
      const nReps = reps ?? 0
      if (!(nReps > 0)) continue
      const row = logLessonRepsOnAthleteHomework({
        athleteId,
        coachId: lesson.coachId,
        coachName: lesson.coachName,
        lessonId: lesson.lessonId,
        extra,
        reps: nReps,
        sets,
      })
      if (row) n += 1
    }
  }
  return n
}
