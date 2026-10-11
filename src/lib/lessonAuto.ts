import {
  fetchTodayEvents,
  hasCalendarApiToken,
  authorizeCalendarFromSession,
  type TodayCalendarEvent,
} from './calendarClient'
import { getSessionGlow } from './sessionGlow'
import {
  findLiveLesson,
  endLessonSession,
  getLessonSession,
  saveLessonSession,
} from './lessonStore'
import type { LessonSession } from '../types'
import { getActiveMeeting } from './coachClasses'

/**
 * Lesson auto-start and auto-end, run from the app's every-minute clock so it
 * works no matter which tab is open (the old check lived in the Today view
 * and never ran while he was on the calendar).
 *
 * - Auto-start: a 1-on-1 lesson with a matched athlete starts at its calendar
 *   time, exactly like classes. Manual linking in the calendar never starts
 *   one; the clock does.
 * - Auto-end: a live calendar-linked lesson ends at its calendar end time.
 *   Notes and wins can be added afterward from the recap.
 */

export type LessonAutoStart = {
  kind: 'start'
  athleteIds: string[]
  calendar: {
    eventId: string
    title: string
    startAt: string
    endAt: string
    notes?: string | null
  }
}

export type LessonAutoAction = LessonAutoStart | { kind: 'end'; sessionId: string }

async function todayLessonEvents(): Promise<TodayCalendarEvent[]> {
  if (!hasCalendarApiToken()) await authorizeCalendarFromSession()
  const { events } = await fetchTodayEvents()
  return events
}

/** A lesson that should start right now, or null. */
export async function checkLessonAutoStart(
  coachId: string,
  now: Date = new Date(),
): Promise<LessonAutoStart | null> {
  let events: TodayCalendarEvent[]
  try {
    events = await todayLessonEvents()
  } catch {
    return null
  }
  const glow = getSessionGlow(events, now)
  const lessonEvent = glow.closest.lesson
  if (!glow.glowing.has('lesson') || !lessonEvent?.matchedAthleteId) return null
  // Don't start over something already live.
  if (getActiveMeeting(coachId) || findLiveLesson(coachId)) return null
  return {
    kind: 'start',
    athleteIds: [lessonEvent.matchedAthleteId],
    calendar: {
      eventId: lessonEvent.id,
      title: lessonEvent.title,
      startAt: lessonEvent.startAt,
      endAt: lessonEvent.endAt,
      notes: lessonEvent.notes ?? null,
    },
  }
}

/**
 * Ends the coach's live calendar-linked lesson once its calendar end time
 * has passed. Returns the ended session id, or null.
 */
export function checkLessonAutoEnd(coachId: string, now: Date = new Date()): string | null {
  const live = findLiveLesson(coachId)
  if (!live || !live.calendarEndAt) return null
  const endMs = Date.parse(live.calendarEndAt)
  if (!Number.isFinite(endMs)) return null
  if (now.getTime() <= endMs) return null
  const ended = endLessonSession(live.id)
  return ended ? ended.id : null
}

export type LessonEndWarning = {
  sessionId: string
  /** Effective end time (includes extensions) in ms. */
  endMs: number
  /** 2 minutes before a scheduled end, 1 minute once extended. */
  warnMs: number
}

/**
 * A lesson that is about to end and should prompt the coach, or null.
 * First warning fires about 2 minutes before the scheduled end; after the
 * coach extends, warnings fire 1 minute before each new end time.
 */
export function checkLessonEndWarning(
  coachId: string,
  now: Date = new Date(),
): LessonEndWarning | null {
  const live = findLiveLesson(coachId)
  if (!live || live.endedAt || !live.calendarEndAt) return null
  const endMs = Date.parse(live.calendarEndAt)
  if (!Number.isFinite(endMs)) return null
  const leadMs = (live.calendarEndExtended ? 1 : 2) * 60 * 1000
  const nowMs = now.getTime()
  if (nowMs < endMs - leadMs || nowMs >= endMs) return null
  return { sessionId: live.id, endMs, warnMs: endMs - leadMs }
}

/** Push the lesson's end time 5 minutes later. Returns the updated session. */
export function extendLessonEnd(sessionId: string, minutes = 5): LessonSession | null {
  const session = getLessonSession(sessionId)
  if (!session || session.endedAt) return null
  const currentEnd = session.calendarEndAt ? Date.parse(session.calendarEndAt) : NaN
  const base = Number.isFinite(currentEnd) ? currentEnd : Date.now()
  const next = saveLessonSession({
    ...session,
    calendarEndAt: new Date(base + minutes * 60 * 1000).toISOString(),
    calendarEndExtended: true,
  })
  return next
}
