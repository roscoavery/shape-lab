/**
 * Upcoming matched calendar lessons, recent classes, and hold progress
 * for an athlete (and the parent looking at that athlete).
 */

import type { Athlete, HomeworkLog, LessonNote, LessonSession } from '../types'
import { fetchCalendarMine, type AthleteCalendarEvent } from './calendarClient'
import {
  classLabel,
  getOffering,
  hydrateCoachClasses,
  loadMeetings,
  subscribeCoachClasses,
  type ClassMeeting,
} from './coachClasses'
import { noteVisibleToAthlete } from './noteAudience'
import { sessionsForAthlete, subscribeLessons } from './lessonStore'
import { localDateKey, logsChrono } from './homeworkLogView'
import { loadAthletes, logProperHoldSeconds } from './storage'

export type UpcomingLesson = {
  id: string
  title: string
  startAt: string
  endAt: string
  coachName: string
  location?: string
}

export type RecentVisit = {
  id: string
  kind: 'lesson' | 'class'
  title: string
  when: string
  coachName: string
  notes: string[]
}

export type HoldGain = {
  name: string
  from: number
  to: number
}

function coachName(id: string, roster: Athlete[]): string {
  return roster.find((a) => a.id === id)?.name?.trim() || 'Coach'
}

function holdSeconds(log: HomeworkLog): number {
  return logProperHoldSeconds(log) || log.totalHoldSeconds || 0
}

export function formatWhen(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export async function loadUpcomingLessons(athleteId: string): Promise<UpcomingLesson[]> {
  const from = new Date(Date.now() - 30 * 60 * 1000)
  const to = new Date(Date.now() + 21 * 86400000)
  const events = await fetchCalendarMine(from, to, athleteId)
  const roster = loadAthletes()
  return events
    .filter((ev) => ev.matchedAthleteId === athleteId)
    .map((ev) => toUpcoming(ev, roster))
}

function toUpcoming(ev: AthleteCalendarEvent, roster: Athlete[]): UpcomingLesson {
  return {
    id: ev.id,
    title: ev.title || 'Lesson',
    startAt: ev.startAt,
    endAt: ev.endAt,
    coachName: ev.coachName || coachName(ev.coachId, roster),
    location: ev.location || undefined,
  }
}

function athleteNotes(notes: LessonNote[] | undefined): string[] {
  return (notes ?? [])
    .filter(noteVisibleToAthlete)
    .map((n) => n.text.trim())
    .filter(Boolean)
}

export function recentVisitsForAthlete(athleteId: string, limit = 6): RecentVisit[] {
  const roster = loadAthletes()
  const lessons: RecentVisit[] = sessionsForAthlete(athleteId)
    .filter((s: LessonSession) => Boolean(s.endedAt) && !s.hiddenAt)
    .map((s) => ({
      id: s.id,
      kind: 'lesson' as const,
      title: s.calendarTitle || s.planSnapshot?.title || 'Private lesson',
      when: s.endedAt || s.startedAt,
      coachName: coachName(s.coachId, roster),
      notes: athleteNotes(s.notes),
    }))

  const classes: RecentVisit[] = loadMeetings()
    .filter((m: ClassMeeting) => m.endedAt && m.attendees.some((row) => row.athleteId === athleteId))
    .map((m) => {
      const offering = getOffering(m.offeringId)
      return {
        id: m.id,
        kind: 'class' as const,
        title: offering ? classLabel(offering) : 'Class',
        when: m.endedAt || m.startedAt,
        coachName: coachName(m.coachId, roster),
        notes: athleteNotes(m.notes),
      }
    })

  return [...lessons, ...classes]
    .sort((a, b) => b.when.localeCompare(a.when))
    .slice(0, limit)
}

export function holdGains(logs: HomeworkLog[]): HoldGain[] {
  const byKey = new Map<string, number[]>()
  for (const log of logsChrono(logs).slice().reverse()) {
    const secs = holdSeconds(log)
    if (secs <= 0) continue
    const raw = (log.sourceLabel || log.shapeId || 'Hold').replace(/^In class · /i, '')
    const name = raw.split(' (')[0]?.trim() || 'Hold'
    const list = byKey.get(name) ?? []
    list.push(Math.round(secs))
    byKey.set(name, list)
  }
  const out: HoldGain[] = []
  for (const [name, times] of byKey) {
    if (times.length < 2) continue
    const from = times[times.length - 2]!
    const to = times[times.length - 1]!
    if (to > from) out.push({ name, from, to })
  }
  return out.slice(0, 6)
}

export function dayHeading(dayKey: string, now = new Date()): string {
  const today = localDateKey(now.toISOString())
  const y = new Date(now)
  y.setDate(y.getDate() - 1)
  const yesterday = localDateKey(y.toISOString())
  if (dayKey === today) return 'Today'
  if (dayKey === yesterday) return 'Yesterday'
  const d = new Date(`${dayKey}T12:00:00`)
  if (Number.isNaN(d.getTime())) return dayKey
  return d.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })
}

export function subscribeAthleteDesk(cb: () => void): () => void {
  const offLessons = subscribeLessons(cb)
  const offClasses = subscribeCoachClasses(cb)
  void hydrateCoachClasses().then(cb)
  return () => {
    offLessons()
    offClasses()
  }
}
