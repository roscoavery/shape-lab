/**
 * Classes a coach teaches (name + day + time), a standing roster,
 * live meetings, and notes — gym-wide via /api/coach-classes.
 */

import type { Athlete, LessonNote } from '../types'
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
  updatedAt?: string
  /** Standing roster — who is usually in this class. */
  rosterIds: string[]
}

export type ClassAttendee = {
  athleteId?: string
  firstName: string
  lastName: string
  source: 'profile' | 'shape_test' | 'manual' | 'roster'
  at: string
}

export type ClassMeeting = {
  id: string
  offeringId: string
  coachId: string
  startedAt: string
  endedAt?: string
  attendees: ClassAttendee[]
  notes: LessonNote[]
}

export type CoachClassFile = {
  kind: 'shape-lab-coach-classes'
  version: 1
  exportedAt: string
  offerings: CoachClassOffering[]
  meetings: ClassMeeting[]
  activeMeetingId: string | null
}

const KEY = 'shape-lab.coachClasses.v1'
const listeners = new Set<() => void>()

function emptyFile(): CoachClassFile {
  return {
    kind: 'shape-lab-coach-classes',
    version: 1,
    exportedAt: '',
    offerings: [],
    meetings: [],
    activeMeetingId: null,
  }
}

function normalizeOffering(raw: Partial<CoachClassOffering>): CoachClassOffering | null {
  if (!raw?.id || !raw.name) return null
  return {
    id: raw.id,
    coachId: raw.coachId || '',
    name: raw.name,
    weekday: (raw.weekday as Weekday) || 'Monday',
    time: raw.time || '',
    createdAt: raw.createdAt || new Date().toISOString(),
    updatedAt: raw.updatedAt,
    rosterIds: Array.isArray(raw.rosterIds) ? raw.rosterIds.filter((id) => typeof id === 'string') : [],
  }
}

function normalizeMeeting(raw: Partial<ClassMeeting>): ClassMeeting | null {
  if (!raw?.id || !raw.offeringId) return null
  return {
    id: raw.id,
    offeringId: raw.offeringId,
    coachId: raw.coachId || '',
    startedAt: raw.startedAt || new Date().toISOString(),
    endedAt: raw.endedAt,
    attendees: Array.isArray(raw.attendees) ? raw.attendees : [],
    notes: Array.isArray(raw.notes) ? raw.notes : [],
  }
}

function read(): CoachClassFile {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return emptyFile()
    const data = JSON.parse(raw) as CoachClassFile
    if (data?.kind !== 'shape-lab-coach-classes') return emptyFile()
    return {
      kind: 'shape-lab-coach-classes',
      version: 1,
      exportedAt: data.exportedAt ?? '',
      offerings: (data.offerings ?? []).map(normalizeOffering).filter((o): o is CoachClassOffering => !!o),
      meetings: (data.meetings ?? []).map(normalizeMeeting).filter((m): m is ClassMeeting => !!m),
      activeMeetingId: data.activeMeetingId ?? null,
    }
  } catch {
    return emptyFile()
  }
}

function write(file: CoachClassFile, sync = true) {
  const next: CoachClassFile = {
    ...file,
    kind: 'shape-lab-coach-classes',
    version: 1,
    exportedAt: new Date().toISOString(),
  }
  try {
    localStorage.setItem(KEY, JSON.stringify(next))
  } catch {
    /* quota */
  }
  for (const cb of listeners) cb()
  if (sync) void pushCoachClasses()
}

export function subscribeCoachClasses(cb: () => void): () => void {
  listeners.add(cb)
  return () => listeners.delete(cb)
}

export function classLabel(offering: Pick<CoachClassOffering, 'name' | 'weekday' | 'time'>): string {
  const time = offering.time.trim()
  return time ? `${offering.name} (${offering.weekday} ${time})` : `${offering.name} (${offering.weekday})`
}

export function loadCoachClassFile(): CoachClassFile {
  return read()
}

/** Gym-wide class list. Every coach on this link sees the same offerings. */
export function loadOfferings(_coachId?: string | null): CoachClassOffering[] {
  return read().offerings.slice().sort((a, b) => a.name.localeCompare(b.name))
}

export function getOffering(id: string | null | undefined): CoachClassOffering | null {
  if (!id) return null
  return read().offerings.find((o) => o.id === id) ?? null
}

export function saveOffering(input: {
  id?: string
  coachId: string
  name: string
  weekday: Weekday
  time: string
  rosterIds?: string[]
}): CoachClassOffering {
  const file = read()
  const existing = input.id ? file.offerings.find((o) => o.id === input.id) : undefined
  const row: CoachClassOffering = {
    id: existing?.id ?? createId('cls'),
    coachId: input.coachId || existing?.coachId || '',
    name: input.name.trim(),
    weekday: input.weekday,
    time: input.time.trim(),
    createdAt: existing?.createdAt ?? new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    rosterIds: input.rosterIds ?? existing?.rosterIds ?? [],
  }
  file.offerings = [row, ...file.offerings.filter((o) => o.id !== row.id)]
  write(file)
  return row
}

export function setOfferingRoster(id: string, rosterIds: string[]): CoachClassOffering | null {
  const file = read()
  const existing = file.offerings.find((o) => o.id === id)
  if (!existing) return null
  const row: CoachClassOffering = {
    ...existing,
    rosterIds: [...new Set(rosterIds)],
    updatedAt: new Date().toISOString(),
  }
  file.offerings = file.offerings.map((o) => (o.id === id ? row : o))
  write(file)
  return row
}

export function toggleOfferingRoster(id: string, athleteId: string): CoachClassOffering | null {
  const file = read()
  const existing = file.offerings.find((o) => o.id === id)
  if (!existing) return null
  const has = existing.rosterIds.includes(athleteId)
  return setOfferingRoster(id, has ? existing.rosterIds.filter((x) => x !== athleteId) : [...existing.rosterIds, athleteId])
}

export function removeOffering(id: string) {
  const file = read()
  file.offerings = file.offerings.filter((o) => o.id !== id)
  write(file)
}

export function loadMeetings(_coachId?: string | null): ClassMeeting[] {
  return read().meetings.slice().sort((a, b) => b.startedAt.localeCompare(a.startedAt))
}

export function getMeeting(id: string | null | undefined): ClassMeeting | null {
  if (!id) return null
  return read().meetings.find((m) => m.id === id) ?? null
}

export function getActiveMeeting(_coachId?: string | null): ClassMeeting | null {
  const file = read()
  if (!file.activeMeetingId) return null
  return file.meetings.find((m) => m.id === file.activeMeetingId && !m.endedAt) ?? null
}

export function startClassMeeting(offering: CoachClassOffering): ClassMeeting {
  const file = read()
  const now = new Date().toISOString()
  const attendees: ClassAttendee[] = offering.rosterIds.map((athleteId) => ({
    athleteId,
    firstName: '',
    lastName: '',
    source: 'roster' as const,
    at: now,
  }))
  const meeting: ClassMeeting = {
    id: createId('mtg'),
    offeringId: offering.id,
    coachId: offering.coachId,
    startedAt: now,
    attendees,
    notes: [],
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
    return first && last ? namesMatch(a, first, last) : false
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
      if (a.athleteId === input.athleteId || (first && last && namesMatch(a, first, last))) {
        if (!a.athleteId) changed = true
        return { ...a, athleteId: a.athleteId || input.athleteId }
      }
      return a
    })
    if (changed) write(file)
  }
  return meeting
}

export function removeClassAttendance(meetingId: string, athleteId: string): ClassMeeting | null {
  const file = read()
  const meeting = file.meetings.find((m) => m.id === meetingId)
  if (!meeting || meeting.endedAt) return null
  meeting.attendees = meeting.attendees.filter((a) => a.athleteId !== athleteId)
  write(file)
  return meeting
}

export function addClassNote(
  meetingId: string,
  text: string,
  topic?: { kind?: LessonNote['topicKind']; id?: string; label?: string },
): ClassMeeting | null {
  const file = read()
  const meeting = file.meetings.find((m) => m.id === meetingId)
  if (!meeting) return null
  const note: LessonNote = {
    id: createId('cnote'),
    text: text.trim(),
    createdAt: new Date().toISOString(),
    context: 'general',
    topicKind: topic?.kind,
    topicId: topic?.id,
    topicLabel: topic?.label,
  }
  if (!note.text) return meeting
  meeting.notes = [note, ...(meeting.notes ?? [])].slice(0, 200)
  write(file)
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

export function rosterAthletes(offering: CoachClassOffering | null | undefined, athletes: Athlete[]): Athlete[] {
  if (!offering) return []
  return offering.rosterIds
    .map((id) => athletes.find((a) => a.id === id))
    .filter((a): a is Athlete => Boolean(a))
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

function mergeById<T extends { id: string }>(a: T[], b: T[], stamp: (row: T) => string): T[] {
  const map = new Map<string, T>()
  for (const row of [...a, ...b]) {
    if (!row?.id) continue
    const keep = map.get(row.id)
    if (!keep || stamp(row).localeCompare(stamp(keep)) >= 0) map.set(row.id, row)
  }
  return [...map.values()]
}

async function pushCoachClasses() {
  const file = read()
  try {
    await fetch('/api/coach-classes', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(file),
    })
  } catch {
    /* offline */
  }
}

export async function hydrateCoachClasses(): Promise<void> {
  try {
    const res = await fetch('/api/coach-classes')
    if (!res.ok) return
    const data = (await res.json()) as CoachClassFile
    if (data?.kind !== 'shape-lab-coach-classes') return
    const local = read()
    const offerings = mergeById(
      local.offerings,
      (data.offerings ?? []).map(normalizeOffering).filter((o): o is CoachClassOffering => !!o),
      (o) => o.updatedAt || o.createdAt,
    )
    const meetings = mergeById(
      local.meetings,
      (data.meetings ?? []).map(normalizeMeeting).filter((m): m is ClassMeeting => !!m),
      (m) => m.endedAt || m.startedAt,
    )
    const live = local.activeMeetingId && meetings.some((m) => m.id === local.activeMeetingId && !m.endedAt)
      ? local.activeMeetingId
      : data.activeMeetingId && meetings.some((m) => m.id === data.activeMeetingId && !m.endedAt)
        ? data.activeMeetingId
        : local.activeMeetingId
    write({ ...local, offerings, meetings, activeMeetingId: live ?? null }, false)
  } catch {
    /* first load */
  }
}
