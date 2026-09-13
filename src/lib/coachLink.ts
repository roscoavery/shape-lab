/**
 * Athlete-chosen coaches. Those coaches can see homework logs, class
 * attendance, and lessons. Wins / posts / stories stay public.
 */

import type { Athlete, HomeworkItem, HomeworkLog, LessonSession } from '../types'
import { isCoachProfile, isGymAdmin, profileRole } from './profileRole'
import { parentSeesAthlete } from './parentLink'
import { attendeeCountsOnProfile, classLabel, loadMeetings, loadOfferings } from './coachClasses'
import { namesMatch } from './classStation'
import { lessonAthleteIds, sessionsForAthlete, sessionsForCoach } from './lessonStore'
import { listTrainingEvents } from './trainingEvents'
import { homeworkTitle } from './homeworkLabel'
import { loadAllHomework, loadAthletes, loadHomeworkLogs, saveAthletes } from './storage'
import { pushNotice } from './notify'
import { givenName } from './classStation'

export function worksWithCoachIds(athlete: Athlete | null | undefined): string[] {
  if (!athlete) return []
  return [...new Set((athlete.worksWithCoachIds ?? []).filter(Boolean))]
}

export function coachesOf(athlete: Athlete | null | undefined, athletes: Athlete[]): Athlete[] {
  const ids = new Set(worksWithCoachIds(athlete))
  return athletes.filter((a) => ids.has(a.id) && isCoachProfile(a))
}

export function athletesOfCoach(coachId: string, athletes: Athlete[]): Athlete[] {
  return athletes.filter(
    (a) => profileRole(a) === 'athlete' && worksWithCoachIds(a).includes(coachId),
  )
}

export function withWorksWithCoaches(athlete: Athlete, ids: string[]): Athlete {
  return { ...athlete, worksWithCoachIds: [...new Set(ids.filter(Boolean))] }
}

/** Mark that this coach works with the athlete. Persists the roster. */
export function linkAthleteToCoach(athleteId: string, coachId: string): Athlete[] {
  if (!athleteId || !coachId || athleteId === coachId) return loadAthletes()
  const roster = loadAthletes()
  let changed = false
  const next = roster.map((a) => {
    if (a.id !== athleteId) return a
    const linked = worksWithCoachIds(a)
    if (linked.includes(coachId) && a.createdByCoachId) return a
    changed = true
    return {
      ...withWorksWithCoaches(a, [...linked, coachId]),
      createdByCoachId: a.createdByCoachId || coachId,
      updatedAt: new Date().toISOString(),
    }
  })
  if (changed) saveAthletes(next)
  return next
}

export function coachWorkedWithAthlete(coachId: string, athlete: Athlete): boolean {
  if (!coachId || athlete.id === coachId) return false
  if (athlete.createdByCoachId === coachId) return true
  if (worksWithCoachIds(athlete).includes(coachId)) return true
  if (
    loadOfferings().some((offering) => {
      const coaches = new Set([offering.coachId, ...(offering.coachIds ?? [])])
      return coaches.has(coachId) && offering.rosterIds.includes(athlete.id)
    })
  ) {
    return true
  }
  if (sessionsForCoach(coachId).some((session) => lessonAthleteIds(session).includes(athlete.id))) {
    return true
  }
  if (
    listTrainingEvents().some(
      (event) =>
        event.coachIds.includes(coachId) &&
        (event.athleteIds.includes(athlete.id) || (athlete.eventIds ?? []).includes(event.id)),
    )
  ) {
    return true
  }
  return attendedCoachClass(athlete, coachId)
}

function attendedCoachClass(athlete: Athlete, coachId: string): boolean {
  const meetings = loadMeetings()
  const offerings = loadOfferings()
  return meetings.some((meeting) => {
    const offering = offerings.find((o) => o.id === meeting.offeringId)
    const coaches = new Set([
      meeting.coachId,
      ...(offering ? [offering.coachId, ...(offering.coachIds ?? [])] : []),
    ])
    if (!coaches.has(coachId)) return false
    return meeting.attendees.some((row) => {
      if (row.athleteId && row.athleteId === athlete.id) return true
      return (
        namesMatch(row, athlete.firstName ?? '', athlete.lastName ?? '') ||
        namesMatch(athlete, row.firstName, row.lastName)
      )
    })
  })
}

/** Missing or false = private. Only the athlete, parents, and coaches who work with them can open it. */
export function isProfilePublic(athlete: Athlete | null | undefined): boolean {
  return athlete?.profilePublic === true
}

export function canViewAthleteProfile(
  viewer: Athlete | null | undefined,
  athlete: Athlete | null | undefined,
): boolean {
  if (!athlete) return false
  if (isProfilePublic(athlete)) return true
  if (!viewer) return false
  if (viewer.id === athlete.id) return true
  if (isGymAdmin(viewer)) return true
  if (parentSeesAthlete(viewer, athlete.id)) return true
  if (isCoachProfile(viewer) && coachWorkedWithAthlete(viewer.id, athlete)) return true
  return false
}

/** Owner, parent of, listed coach, or gym admin. */
export function canSeePrivateCoaching(
  viewer: Athlete | null | undefined,
  athlete: Athlete | null | undefined,
): boolean {
  if (!viewer || !athlete) return false
  if (viewer.id === athlete.id) return true
  if (isGymAdmin(viewer)) return true
  if (parentSeesAthlete(viewer, athlete.id)) return true
  if (isCoachProfile(viewer) && coachWorkedWithAthlete(viewer.id, athlete)) return true
  return false
}

/** Missing or true = names show on the public profile. */
export function showsCoachesOnProfile(athlete: Athlete | null | undefined): boolean {
  return athlete?.showCoachesOnProfile !== false
}

export function coachesLabel(athlete: Athlete, athletes: Athlete[]): string {
  const names = coachesOf(athlete, athletes).map((c) => c.name.split(' ')[0] || c.name)
  if (names.length === 0) return ''
  if (names.length === 1) return names[0]
  if (names.length === 2) return `${names[0]} and ${names[1]}`
  return `${names[0]} + ${names.length - 1}`
}

export type ClassAttendanceRow = {
  meetingId: string
  className: string
  startedAt: string
}

export function classAttendanceForAthlete(
  athlete: Athlete,
  allAthletes: Athlete[] = [],
): ClassAttendanceRow[] {
  const meetings = loadMeetings()
  const offerings = loadOfferings()
  const out: ClassAttendanceRow[] = []
  for (const meeting of meetings) {
    const here = meeting.attendees.some((row) => {
      if (!attendeeCountsOnProfile(meeting, row)) return false
      if (row.athleteId && row.athleteId === athlete.id) return true
      return namesMatch(row, athlete.firstName ?? '', athlete.lastName ?? '') ||
        namesMatch(athlete, row.firstName, row.lastName)
    })
    if (!here) continue
    const offering = offerings.find((o) => o.id === meeting.offeringId)
    out.push({
      meetingId: meeting.id,
      className: offering ? classLabel(offering) : 'Class',
      startedAt: meeting.startedAt,
    })
  }
  void allAthletes
  return out.sort((a, b) => b.startedAt.localeCompare(a.startedAt)).slice(0, 24)
}

function formatHoldSeconds(s: number): string {
  const n = Math.max(0, s)
  const m = Math.floor(n / 60)
  const sec = Math.round(n - m * 60)
  if (m <= 0) return `${sec}s`
  return `${m}:${String(sec).padStart(2, '0')}`
}

export function formatHomeworkLogLine(log: HomeworkLog, item?: HomeworkItem | null): string {
  const title = item ? homeworkTitle(item) : log.sourceLabel || log.shapeId
  if (log.kind === 'journal' && log.journal) return `${title}: ${log.journal}`
  if (log.kind === 'reps' || (log.reps && log.reps > 0 && log.kind !== 'hold')) {
    if (log.sets && log.sets > 1) return `${title} · ${log.sets}×${log.reps}`
    return `${title} · ${log.reps} rep${log.reps === 1 ? '' : 's'}`
  }
  if (log.kind === 'sequence') {
    return `${title} · sequence${log.reps ? ` ×${log.reps}` : ''}`
  }
  if (log.totalHoldSeconds > 0) {
    const side =
      log.side && !/left|right/i.test(title) ? ` · ${log.side}` : ''
    return `${title}${side} · ${formatHoldSeconds(log.totalHoldSeconds)}`
  }
  return title
}

export function recentHomeworkLogs(athleteId: string, limit = 12): {
  log: HomeworkLog
  item: HomeworkItem | undefined
  line: string
}[] {
  const items = loadAllHomework()
  return loadHomeworkLogs(athleteId)
    .slice()
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-limit)
    .map((log) => {
      const item = items.find((h) => h.id === log.homeworkId)
      return { log, item, line: formatHomeworkLogLine(log, item) }
    })
}

export function lessonsForAthlete(athleteId: string): LessonSession[] {
  return sessionsForAthlete(athleteId)
    .filter((s) => s.endedAt)
    .sort((a, b) => (b.endedAt ?? b.startedAt).localeCompare(a.endedAt ?? a.startedAt))
}

export function notifyCoachesOfHomeworkLog(log: HomeworkLog) {
  const roster = loadAthletes()
  const who = roster.find((a) => a.id === log.athleteId)
  if (!who) return
  const item = loadAllHomework().find((h) => h.id === log.homeworkId)
  const line = formatHomeworkLogLine(log, item)
  const first = givenName(who)
  if (log.loggedFrom === 'class' || log.loggedFrom === 'lesson') return
  const coachIds = new Set(worksWithCoachIds(who))
  for (const row of roster) {
    if (isGymAdmin(row)) coachIds.add(row.id)
  }
  for (const coachId of coachIds) {
    if (coachId === log.athleteId) continue
    void pushNotice({
      toId: coachId,
      kind: 'homework',
      title: `${first} logged homework`,
      body: line,
      href: 'today',
      homeworkLogId: log.id,
      athleteId: who.id,
    })
  }
}
