import type { LessonSession } from '../types'
import { loadLessonSessions } from './lessonStore'
import { loadMeetings } from './coachClasses'

export type CoachReminder =
  | { kind: 'log-wins'; meetings: number; lessons: number }
  | { kind: 'plan-lessons'; sessions: LessonSession[] }

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
export function getCoachReminders(coachId: string, now: Date = new Date()): CoachReminder[] {
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

  // --- End-of-day wins nudge ---
  if (now.getHours() >= 17 && !dismissed('log-wins', now)) {
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
