import type { TodayCalendarEvent } from './calendarClient'
import {
  loadOfferingsForCoach,
  parseClassTimeMinutes,
  WEEKDAYS,
  type CoachClassOffering,
  type Weekday,
} from './coachClasses'

const PREFS_KEY = 'shape-lab.calendarDisplay.v1'

export type CalendarDisplayPrefs = {
  showShapeLabClasses: boolean
  dedupeByTimeTitle: boolean
}

const DEFAULT_PREFS: CalendarDisplayPrefs = {
  showShapeLabClasses: true,
  dedupeByTimeTitle: true,
}

export function loadCalendarDisplayPrefs(): CalendarDisplayPrefs {
  try {
    const raw = localStorage.getItem(PREFS_KEY)
    if (!raw) return { ...DEFAULT_PREFS }
    const parsed = JSON.parse(raw) as Partial<CalendarDisplayPrefs>
    return {
      showShapeLabClasses: parsed.showShapeLabClasses !== false,
      dedupeByTimeTitle: parsed.dedupeByTimeTitle !== false,
    }
  } catch {
    return { ...DEFAULT_PREFS }
  }
}

export function saveCalendarDisplayPrefs(next: CalendarDisplayPrefs) {
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify(next))
  } catch {
    /* quota */
  }
}

export type CalendarClipboard = {
  title: string
  startAt: string
  endAt: string
  location?: string
  notes?: string
}

const CLIP_KEY = 'shape-lab.calendarClipboard.v1'

export function loadCalendarClipboard(): CalendarClipboard | null {
  try {
    const raw = sessionStorage.getItem(CLIP_KEY)
    if (!raw) return null
    const row = JSON.parse(raw) as CalendarClipboard
    if (!row?.title || !row.startAt || !row.endAt) return null
    return row
  } catch {
    return null
  }
}

export function saveCalendarClipboard(row: CalendarClipboard) {
  try {
    sessionStorage.setItem(CLIP_KEY, JSON.stringify(row))
  } catch {
    /* private */
  }
}

function normTitle(title: string): string {
  return title.trim().toLowerCase().replace(/\s+/g, ' ')
}

function sameInstant(a: string, b: string, slackMs = 120_000): boolean {
  const da = Date.parse(a)
  const db = Date.parse(b)
  if (!Number.isFinite(da) || !Number.isFinite(db)) return false
  return Math.abs(da - db) <= slackMs
}

/** Drop duplicate iCloud + ShapeLab class rows (same title and start). */
export function dedupeCalendarEvents(events: TodayCalendarEvent[]): TodayCalendarEvent[] {
  const kept: TodayCalendarEvent[] = []
  for (const ev of events) {
    const dupe = kept.some(
      (other) =>
        normTitle(other.title) === normTitle(ev.title) &&
        sameInstant(other.startAt, ev.startAt) &&
        sameInstant(other.endAt, ev.endAt, 180_000),
    )
    if (!dupe) kept.push(ev)
  }
  return kept
}

function classStartEnd(day: Date, offering: CoachClassOffering): { startAt: string; endAt: string } {
  const minutes = parseClassTimeMinutes(offering.time)
  const start = new Date(day.getFullYear(), day.getMonth(), day.getDate(), 0, 0, 0, 0)
  if (minutes < 24 * 60) {
    start.setHours(Math.floor(minutes / 60), minutes % 60, 0, 0)
  } else {
    start.setHours(17, 0, 0, 0)
  }
  const end = new Date(start.getTime() + 60 * 60 * 1000)
  return { startAt: start.toISOString(), endAt: end.toISOString() }
}

export function shapeLabClassEvents(
  coachId: string,
  from: Date,
  to: Date,
): TodayCalendarEvent[] {
  const offerings = loadOfferingsForCoach(coachId)
  if (!offerings.length) return []
  const out: TodayCalendarEvent[] = []
  const cursor = new Date(from.getFullYear(), from.getMonth(), from.getDate())
  const endDay = new Date(to.getFullYear(), to.getMonth(), to.getDate())
  while (cursor <= endDay) {
    const weekday = WEEKDAYS[cursor.getDay()] as Weekday
    for (const off of offerings) {
      if (off.weekday !== weekday) continue
      const { startAt, endAt } = classStartEnd(cursor, off)
      if (Date.parse(startAt) > to.getTime() || Date.parse(endAt) < from.getTime()) continue
      const dayKey = startAt.slice(0, 10)
      out.push({
        id: `shapelab-class:${off.id}:${dayKey}`,
        title: off.name,
        startAt,
        endAt,
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
        location: 'Gym class',
        status: 'confirmed',
        matchedAthleteId: null,
        matchStatus: 'class_offering',
        providerCalendarId: 'shapelab-classes',
        notes: `ShapeLab class · ${off.weekday} ${off.time}`,
        lessonLinks: [],
      })
    }
    cursor.setDate(cursor.getDate() + 1)
  }
  return out
}

export function mergeCalendarEvents(
  remote: TodayCalendarEvent[],
  coachId: string,
  from: Date,
  to: Date,
  prefs: CalendarDisplayPrefs,
): TodayCalendarEvent[] {
  let rows = [...remote]
  if (prefs.showShapeLabClasses) {
    rows = [...rows, ...shapeLabClassEvents(coachId, from, to)]
  }
  if (prefs.dedupeByTimeTitle) rows = dedupeCalendarEvents(rows)
  return rows.sort((a, b) => a.startAt.localeCompare(b.startAt))
}

export function eventIsPast(ev: TodayCalendarEvent, now = Date.now()): boolean {
  const end = Date.parse(ev.endAt || ev.startAt)
  return Number.isFinite(end) && end < now
}
