import type { LessonSession } from '../types'
import { loadLessonSessions } from './lessonStore'
import { loadMeetings, loadOfferingsForCoach, parseClassTimeMinutes, WEEKDAYS } from './coachClasses'
import type { TodayCalendarEvent } from './calendarClient'

export type CoachReminder =
  | { kind: 'log-wins'; meetings: number; lessons: number }
  | { kind: 'plan-lessons'; sessions: LessonSession[] }
  | { kind: 'plan-calendar-lessons'; events: TodayCalendarEvent[] }

const dateKey = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

const sameDay = (iso: string, d: Date) => iso.slice(0, 10) === dateKey(d)

function dismissed(kind: string, d: Date): boolean {
  try {
    return localStorage.getItem(`sl-reminder-${kind}-${dateKey(d)}`) === '1'
  } catch {
    return false
  }
}

export function dismissReminder(kind: string, d: Date = new Date()): void {
  try {
    localStorage.setItem(`sl-reminder-${kind}-${dateKey(d)}`, '1')
  } catch {
    /* ignore */
  }
}

/**
 * Smart banners for the coach Today tab.
 *
 * - log-wins: after 5pm, if the coach had classes or lessons today that
 *   have ended, nudge them to log wins in the recaps at the bottom of Today.
 * - plan-lessons: lessons on the calendar today or tomorrow with no plan
 *   attached get a planning nudge.
 *
 * Dismissals are per-day; the banner returns tomorrow if the condition holds.
 */
export function getCoachReminders(
  coachId: string,
  now: Date = new Date(),
  calendarEvents: TodayCalendarEvent[] = [],
): CoachReminder[] {
  const out: CoachReminder[] = []
  const today = dateKey(now)
  const tomorrow = new Date(now)
  tomorrow.setDate(tomorrow.getDate() + 1)
  const tomorrowKey = dateKey(tomorrow)

  // --- Lessons needing plans (today or tomorrow, from the calendar) ---
  const sessions = loadLessonSessions().filter((s) => s.coachId === coachId)
  const unplanned = sessions.filter((s) => {
    if (s.endedAt || s.planId) return false
    const start = s.calendarStartAt ?? s.startedAt
    const day = start.slice(0, 10)
    return day === today || day === tomorrowKey
  })
  if (unplanned.length > 0 && !dismissed('plan-lessons', now)) {
    out.push({ kind: 'plan-lessons', sessions: unplanned })
  }

  // --- Calendar lessons with no linked lesson session (not yet in the app) ---
  const linkedEventIds = new Set<string>()
  for (const s of sessions) {
    if (s.calendarEventId) linkedEventIds.add(s.calendarEventId)
  }
  const unlinkedLessons = calendarEvents.filter((ev) => {
    if (linkedEventIds.has(ev.id)) return false
    if (ev.lessonLinks.length > 0) return false
    const day = ev.startAt.slice(0, 10)
    if (day !== today && day !== tomorrowKey) return false
    // Heuristic: lesson-like titles (private, lesson, athlete names).
    // Classes are handled separately via meetings.
    const t = ev.title.toLowerCase()
    return (
      t.includes('lesson') ||
      t.includes('private') ||
      t.includes('1:1') ||
      t.includes('1-1') ||
      ev.matchedAthleteId != null
    )
  })
  if (unlinkedLessons.length > 0 && !dismissed('plan-calendar-lessons', now)) {
    out.push({ kind: 'plan-calendar-lessons', events: unlinkedLessons })
  }

  // --- End-of-day wins nudge ---
  // Only after the last scheduled class of the day has ended (not just 5pm).
  const weekday = WEEKDAYS[now.getDay()]
  const todaysOfferings = loadOfferingsForCoach(coachId).filter((o) => o.weekday === weekday)
  const lastEndMinutes = todaysOfferings.length
    ? Math.max(...todaysOfferings.map((o) => parseClassTimeMinutes(o.time) + 60))
    : 17 * 60
  const nowMinutes = now.getHours() * 60 + now.getMinutes()
  if (nowMinutes >= lastEndMinutes && !dismissed('log-wins', now)) {
    const meetings = loadMeetings(coachId).filter(
      (m) => m.endedAt && sameDay(m.startedAt, now),
    ).length
    const lessons = sessions.filter(
      (s) => s.endedAt && sameDay(s.startedAt, now),
    ).length
    if (meetings + lessons > 0) {
      out.push({ kind: 'log-wins', meetings, lessons })
    }
  }

  return out
}
