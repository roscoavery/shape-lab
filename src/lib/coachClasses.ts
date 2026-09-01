/**
 * Classes a coach teaches (name + day + time) and live meetings
 * so Today can track who showed up for shape test / homework.
 */

import type { Athlete } from '../types'
import { createId } from './storage'
import { displayPersonName, namesMatch, splitPersonName } from './classStation'

export const WEEKDAYS = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
] as const

export type Weekday = (typeof WEEKDAYS)[number]

export type CoachClassOffering = {
  id: string
  coachId: string
  name: string
  weekday: Weekday
  time: string
  createdAt: string
}

export type ClassAttendee = {
  athleteId?: string
  firstName: string
  lastName: string
  source: 'profile' | 'shape_test' | 'manual'
  at: string
}

export type ClassMeeting = {
  id: string
  offeringId: string
  coachId: string
  startedAt: string
  endedAt?: string
  attendees: ClassAttendee[]
}

type File = {
  kind: 'shape-lab-coach-classes'
  offerings: CoachClassOffering[]
  meetings: ClassMeeting[]
  activeMeetingId: string | null
}

const KEY = 'shape-lab.coachClasses.v1'
const listeners = new Set<() => void>()

function emptyFile(): File {
  return { kind: 'shape-lab-coach-classes', offerings: [], meetings: [], activeMeetingId: null }
}

function read(): File {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return emptyFile()
    const data = JSON.parse(raw) as File
    if (data?.kind !== 'shape-lab-coach-classes') return emptyFile()
    return {
      kind: 'shape-lab-coach-classes',
      offerings: Array.isArray(data.offerings) ? data.offerings : [],
      meetings: Array.isArray(data.meetings) ? data.meetings : [],
      activeMeetingId: data.activeMeetingId ?? null,
    }
  } catch {
    return emptyFile()
  }
}

function write(file: File) {
  try {
    localStorage.setItem(KEY, JSON.stringify(file))
  } catch {
    /* quota */
  }
  for (const cb of listeners) cb()
}

export function subscribeCoachClasses(cb: () => void): () => void {
  listeners.add(cb)
  return () => listeners.delete(cb)
}

export function classLabel(offering: CoachClassOffering): string {
  const time = offering.time.trim()
  return time ? `${offering.name} (${offering.weekday} ${time})` : `${offering.name} (${offering.weekday})`
}

export function loadOfferings(coachId?: string | null): CoachClassOffering[] {
  const all = read().offerings
  return coachId ? all.filter((o) => o.coachId === coachId) : all
}

export function saveOffering(input: {
  id?: string
  coachId: string
  name: string
  weekday: Weekday
  time: string
}): CoachClassOffering {
  const file = read()
  const existing = input.id ? file.offerings.find((o) => o.id === input.id) : undefined
  const row: CoachClassOffering = {
    id: existing?.id ?? createId('cls'),
    coachId: input.coachId,
    name: input.name.trim(),
    weekday: input.weekday,
    time: input.time.trim(),
    createdAt: existing?.createdAt ?? new Date().toISOString(),
  }
  file.offerings = [row, ...file.offerings.filter((o) => o.id !== row.id)]
  write(file)
  return row
}

export function removeOffering(id: string) {
  const file = read()
  file.offerings = file.offerings.filter((o) => o.id !== id)
  write(file)
}

export function loadMeetings(coachId?: string | null): ClassMeeting[] {
  const all = read().meetings
  return (coachId ? all.filter((m) => m.coachId === coachId) : all).sort((a, b) =>
    b.startedAt.localeCompare(a.startedAt),
  )
}

export function getMeeting(id: string | null | undefined): ClassMeeting | null {
  if (!id) return null
  return read().meetings.find((m) => m.id === id) ?? null
}

export function getActiveMeeting(coachId?: string | null): ClassMeeting | null {
  const file = read()
  if (!file.activeMeetingId) return null
  const meeting = file.meetings.find((m) => m.id === file.activeMeetingId && !m.endedAt)
  if (!meeting) return null
  if (coachId && meeting.coachId !== coachId) return null
  return meeting
}

export function startClassMeeting(offering: CoachClassOffering): ClassMeeting {
  const file = read()
  const meeting: ClassMeeting = {
    id: createId('mtg'),
    offeringId: offering.id,
    coachId: offering.coachId,
    startedAt: new Date().toISOString(),
    attendees: [],
  }
  file.meetings = [meeting, ...file.meetings].slice(0, 200)
  file.activeMeetingId = meeting.id
  write(file)
  return meeting
}

export function endClassMeeting(id: string): ClassMeeting | null {
  const file = read()
  const meeting = file.meetings.find((m) => m.id === id)
  if (!meeting) return null
  meeting.endedAt = new Date().toISOString()
  if (file.activeMeetingId === id) file.activeMeetingId = null
  write(file)
  return meeting
}

export function markClassAttendance(input: {
  athleteId?: string
  firstName: string
  lastName: string
  source: ClassAttendee['source']
  meetingId?: string | null
}): ClassMeeting | null {
  const file = read()
  const meeting = input.meetingId
    ? file.meetings.find((m) => m.id === input.meetingId)
    : file.activeMeetingId
      ? file.meetings.find((m) => m.id === file.activeMeetingId && !m.endedAt)
      : null
  if (!meeting || meeting.endedAt) return null
  const first = input.firstName.trim()
  const last = input.lastName.trim()
  const already = meeting.attendees.some((a) => {
    if (input.athleteId && a.athleteId === input.athleteId) return true
    return namesMatch(a, first, last)
  })
  if (!already) {
    meeting.attendees = [
      ...meeting.attendees,
      {
        athleteId: input.athleteId,
        firstName: first,
        lastName: last,
        source: input.source,
        at: new Date().toISOString(),
      },
    ]
    write(file)
  } else if (input.athleteId) {
    let changed = false
    meeting.attendees = meeting.attendees.map((a) => {
      if (a.athleteId === input.athleteId || namesMatch(a, first, last)) {
        if (!a.athleteId) changed = true
        return { ...a, athleteId: a.athleteId || input.athleteId }
      }
      return a
    })
    if (changed) write(file)
  }
  return meeting
}

export function resolveAttendeeAthletes(meeting: ClassMeeting, athletes: Athlete[]): Athlete[] {
  const out: Athlete[] = []
  const seen = new Set<string>()
  for (const row of meeting.attendees) {
    const match =
      (row.athleteId ? athletes.find((a) => a.id === row.athleteId) : undefined) ??
      athletes.find((a) => namesMatch(a, row.firstName, row.lastName))
    if (match && !seen.has(match.id)) {
      seen.add(match.id)
      out.push(match)
    }
  }
  return out
}

export function attendeeLabel(row: ClassAttendee, athletes: Athlete[]): string {
  const profile = row.athleteId ? athletes.find((a) => a.id === row.athleteId) : undefined
  return profile?.name || displayPersonName(row.firstName, row.lastName) || 'Athlete'
}

export function athleteToAttendee(athlete: Athlete): Omit<ClassAttendee, 'at' | 'source'> {
  const parts = splitPersonName(athlete.name)
  return {
    athleteId: athlete.id,
    firstName: athlete.firstName || parts.firstName,
    lastName: athlete.lastName || parts.lastName,
  }
}
