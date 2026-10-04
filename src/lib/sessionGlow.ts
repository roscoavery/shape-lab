import type { TodayCalendarEvent } from './calendarClient'
import { WEEKDAYS, parseClassTimeMinutes, type CoachClassOffering } from './coachClasses'

/**
 * Calendar-aware glow for the coach Today start buttons.
 *
 * The app watches the calendar for classes, lessons, schools, and camps.
 * When one is starting within 5 minutes or is currently in progress, the
 * matching Start button glows so the coach just follows the guide.
 * The glow stops once the session is actually started.
 */

export type SessionKind = 'class' | 'lesson' | 'school' | 'camp'

/** Minutes before start time the glow kicks in. */
export const GLOW_LEAD_MINUTES = 5

const CLASS_WORDS = ['class', 'team', 'squad', 'group class']
const LESSON_WORDS = ['lesson', 'private', '1:1', '1-1', '1 on 1', 'semi-private']
const SCHOOL_WORDS = ['school']
const CAMP_WORDS = ['camp', 'clinic']

function titleHas(title: string, words: string[]): boolean {
  const t = title.toLowerCase()
  return words.some((w) => t.includes(w))
}

/**
 * Best-guess classification of a calendar event into a session kind.
 * Lesson links or a matched athlete mean lesson. Otherwise title keywords.
 * Falls back to 'class' since most scheduled hours are classes.
 */
export function classifySessionEvent(ev: TodayCalendarEvent): SessionKind {
  if (ev.lessonLinks.length > 0 || ev.matchedAthleteId) return 'lesson'
  const title = ev.title ?? ''
  if (titleHas(title, SCHOOL_WORDS)) return 'school'
  if (titleHas(title, CAMP_WORDS)) return 'camp'
  if (titleHas(title, LESSON_WORDS)) return 'lesson'
  if (titleHas(title, CLASS_WORDS)) return 'class'
  return 'class'
}

export type GlowState = {
  /** Session kinds whose Start button should glow right now. */
  glowing: Set<SessionKind>
  /** The event closest to now per kind, for pre-selection and highlighting. */
  closest: Partial<Record<SessionKind, TodayCalendarEvent>>
}

/**
 * Which Start buttons should glow at `now`.
 *
 * A kind glows when it has a calendar event today whose start is within
 * GLOW_LEAD_MINUTES from now, or that is currently in progress (now between
 * start and end). The closest such event per kind is returned for
 * pre-selection (lesson athlete) and list highlighting (class picker).
 */
export function getSessionGlow(
  events: TodayCalendarEvent[],
  now: Date = new Date(),
): GlowState {
  const glowing = new Set<SessionKind>()
  const closest: Partial<Record<SessionKind, TodayCalendarEvent>> = {}
  const nowMs = now.getTime()
  const leadMs = GLOW_LEAD_MINUTES * 60 * 1000
  const todayKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`

  for (const ev of events) {
    const start = Date.parse(ev.startAt)
    const end = Date.parse(ev.endAt || ev.startAt)
    if (!Number.isFinite(start)) continue
    // Only today's events drive the glow.
    if (ev.startAt.slice(0, 10) !== todayKey) continue
    const endMs = Number.isFinite(end) ? end : start
    const inWindow = start - leadMs <= nowMs && nowMs <= endMs
    if (!inWindow) continue
    const kind = classifySessionEvent(ev)
    glowing.add(kind)
    const prev = closest[kind]
    if (!prev || Math.abs(start - nowMs) < Math.abs(Date.parse(prev.startAt) - nowMs)) {
      closest[kind] = ev
    }
  }
  return { glowing, closest }
}

/**
 * Which class offering is closest to right now, for guiding the coach on
 * the class picker list. Uses each offering's weekday + time to find the
 * nearest upcoming (or most recently started) class.
 */
export function closestOfferingToNow(
  offerings: CoachClassOffering[],
  now: Date = new Date(),
): CoachClassOffering | null {
  if (offerings.length === 0) return null
  const nowDay = now.getDay() // 0 = Sunday, matches WEEKDAYS order
  const nowMinutes = now.getHours() * 60 + now.getMinutes()
  let best: CoachClassOffering | null = null
  let bestDelta = Infinity
  for (const o of offerings) {
    const dayIdx = WEEKDAYS.indexOf(o.weekday)
    if (dayIdx < 0) continue
    const mins = parseClassTimeMinutes(o.time)
    // Days until this offering's next occurrence (0 = today).
    let dayDelta = (dayIdx - nowDay + 7) % 7
    let deltaMinutes = dayDelta * 24 * 60 + (mins - nowMinutes)
    // If today's class already started more than 2 hours ago, count next week.
    if (deltaMinutes < -120) deltaMinutes += 7 * 24 * 60
    if (Math.abs(deltaMinutes) < Math.abs(bestDelta)) {
      bestDelta = deltaMinutes
      best = o
    }
  }
  return best
}
