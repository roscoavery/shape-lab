/**
 * Classes a coach teaches (name + day + time), a standing roster,
 * live meetings, and notes — gym-wide via /api/coach-classes.
 */

import type { Athlete, ClassExtraExercise, LessonNote } from '../types'
import { normalizeClassExtras } from './classExercises'
import { createId } from './storage'
import { displayPersonName, namesMatch, splitPersonName } from './classStation'
import { RYAN_PROFILE_ID } from './ryanProfile'

export const DEFAULT_CLASS_TYPES: {
  id: string
  name: string
  weekday: Weekday
  time: string
}[] = [
  { id: 'cls_connections', name: 'Connections', weekday: 'Monday', time: '5pm' },
  { id: 'cls_elevate', name: 'Elevate', weekday: 'Wednesday', time: '4pm' },
  { id: 'cls_reps_logan', name: 'Reps w/ Logan', weekday: 'Thursday', time: '6pm' },
]

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
  /** Coaches listed on this class. coachId stays the creator. */
  coachIds?: string[]
  name: string
  weekday: Weekday
  time: string
  createdAt: string
  updatedAt?: string
  /** Standing roster — who is usually in this class. */
  rosterIds: string[]
  /**
   * Extra holds / reps shown on this class clock next to the four core drills.
   * Hollow / Superman / side plank / wall handstand stay as they are.
   */
  extraExercises?: ClassExtraExercise[]
}

export type ClassAttendee = {
  athleteId?: string
  firstName: string
  lastName: string
  source: 'profile' | 'shape_test' | 'manual' | 'roster'
  at: string
  /**
   * On the athlete’s Class nights list. Missing on old ended meetings
   * means logged. Live “here tonight” rows start false until End class
   * asks to log them.
   */
  logged?: boolean
}

export type ClassMeeting = {
  id: string
  offeringId: string
  coachId: string
  startedAt: string
  endedAt?: string
  attendees: ClassAttendee[]
  notes: LessonNote[]
  /** Set when the coach chooses Log / Don’t log at End class. */
  attendanceLogged?: boolean
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
    coachIds: Array.isArray(raw.coachIds)
      ? raw.coachIds.filter((id): id is string => typeof id === 'string' && Boolean(id))
      : raw.coachId
        ? [raw.coachId]
        : [],
    name: raw.name,
    weekday: (raw.weekday as Weekday) || 'Monday',
    time: raw.time || '',
    createdAt: raw.createdAt || new Date().toISOString(),
    updatedAt: raw.updatedAt,
    rosterIds: Array.isArray(raw.rosterIds) ? raw.rosterIds.filter((id) => typeof id === 'string') : [],
    extraExercises: normalizeClassExtras(raw.extraExercises),
  }
}

function normalizeAttendee(raw: Partial<ClassAttendee>): ClassAttendee | null {
  if (!raw) return null
  const firstName = typeof raw.firstName === 'string' ? raw.firstName : ''
  const lastName = typeof raw.lastName === 'string' ? raw.lastName : ''
  if (!raw.athleteId && !firstName && !lastName) return null
  return {
    athleteId: typeof raw.athleteId === 'string' ? raw.athleteId : undefined,
    firstName,
    lastName,
    source: raw.source === 'shape_test' || raw.source === 'manual' || raw.source === 'roster'
      ? raw.source
      : 'profile',
    at: raw.at || new Date().toISOString(),
    logged: typeof raw.logged === 'boolean' ? raw.logged : undefined,
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
    attendees: Array.isArray(raw.attendees)
      ? raw.attendees.map(normalizeAttendee).filter((a): a is ClassAttendee => Boolean(a))
      : [],
    notes: Array.isArray(raw.notes) ? raw.notes : [],
    attendanceLogged:
      typeof raw.attendanceLogged === 'boolean' ? raw.attendanceLogged : undefined,
  }
}

/** Profile Class nights — live “here tonight” and unlogged ends stay off. */
export function attendeeCountsOnProfile(
  meeting: Pick<ClassMeeting, 'endedAt' | 'attendanceLogged'>,
  row: Pick<ClassAttendee, 'logged'>,
): boolean {
  if (row.logged === false) return false
  if (row.logged === true) return true
  if (meeting.attendanceLogged === false) return false
  return Boolean(meeting.endedAt)
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

export function offeringCoachIds(offering: Pick<CoachClassOffering, 'coachId' | 'coachIds'>): string[] {
  return [...new Set([offering.coachId, ...(offering.coachIds ?? [])].filter(Boolean))]
}

export function classCoachesLabel(
  offering: Pick<CoachClassOffering, 'coachId' | 'coachIds'>,
  athletes: Athlete[],
): string {
  const names = offeringCoachIds(offering)
    .map((id) => athletes.find((a) => a.id === id)?.name.split(' ')[0] ?? '')
    .filter(Boolean)
  if (names.length === 0) return ''
  if (names.length === 1) return names[0]
  if (names.length === 2) return `${names[0]} and ${names[1]}`
  return `${names[0]} + ${names.length - 1}`
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

/** Connections, Elevate, and Reps w/ Logan — skip names that already exist. */
export function ensureDefaultClassTypes(coachId?: string | null): CoachClassOffering[] {
  const file = read()
  const byName = new Set(file.offerings.map((o) => o.name.trim().toLowerCase()))
  const byId = new Set(file.offerings.map((o) => o.id))
  const owner = coachId?.trim() || RYAN_PROFILE_ID
  let added = false
  for (const seed of DEFAULT_CLASS_TYPES) {
    if (byId.has(seed.id) || byName.has(seed.name.toLowerCase())) continue
    file.offerings.push({
      id: seed.id,
      coachId: owner,
      name: seed.name,
      weekday: seed.weekday,
      time: seed.time,
      createdAt: new Date().toISOString(),
      rosterIds: [],
    })
    byName.add(seed.name.toLowerCase())
    byId.add(seed.id)
    added = true
  }
  if (added) write(file)
  return file.offerings
}

export function saveOffering(input: {
  id?: string
  coachId: string
  coachIds?: string[]
  name: string
  weekday: Weekday
  time: string
  rosterIds?: string[]
  extraExercises?: ClassExtraExercise[]
}): CoachClassOffering {
  const file = read()
  const existing = input.id ? file.offerings.find((o) => o.id === input.id) : undefined
  const coachIds = [
    ...new Set(
      (input.coachIds ?? existing?.coachIds ?? [input.coachId || existing?.coachId || '']).filter(Boolean),
    ),
  ]
  const row: CoachClassOffering = {
    id: existing?.id ?? createId('cls'),
    coachId: input.coachId || existing?.coachId || coachIds[0] || '',
    coachIds,
    name: input.name.trim(),
    weekday: input.weekday,
    time: input.time.trim(),
    createdAt: existing?.createdAt ?? new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    rosterIds: input.rosterIds ?? existing?.rosterIds ?? [],
    extraExercises: normalizeClassExtras(
      input.extraExercises ?? existing?.extraExercises ?? [],
    ),
  }
  file.offerings = [row, ...file.offerings.filter((o) => o.id !== row.id)]
  write(file)
  return row
}

export function setOfferingCoaches(id: string, coachIds: string[]): CoachClassOffering | null {
  const file = read()
  const existing = file.offerings.find((o) => o.id === id)
  if (!existing) return null
  const ids = [...new Set(coachIds.filter(Boolean))]
  const row: CoachClassOffering = {
    ...existing,
    coachIds: ids,
    coachId: ids.includes(existing.coachId) ? existing.coachId : ids[0] || existing.coachId,
    updatedAt: new Date().toISOString(),
  }
  file.offerings = file.offerings.map((o) => (o.id === id ? row : o))
  write(file)
  return row
}

export function setOfferingExtras(
  id: string,
  extraExercises: ClassExtraExercise[],
): CoachClassOffering | null {
  const file = read()
  const existing = file.offerings.find((o) => o.id === id)
  if (!existing) return null
  const row: CoachClassOffering = {
    ...existing,
    extraExercises: normalizeClassExtras(extraExercises),
    updatedAt: new Date().toISOString(),
  }
  file.offerings = file.offerings.map((o) => (o.id === id ? row : o))
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
  const open = file.activeMeetingId
    ? file.meetings.find((m) => m.id === file.activeMeetingId && !m.endedAt)
    : null
  if (open) return open
  const now = new Date().toISOString()
  const meeting: ClassMeeting = {
    id: createId('mtg'),
    offeringId: offering.id,
    coachId: offering.coachId,
    startedAt: now,
    attendees: [],
    notes: [],
    attendanceLogged: false,
  }
  file.meetings = [meeting, ...file.meetings].slice(0, 200)
  file.activeMeetingId = meeting.id
  write(file)
  return meeting
}

export function endClassMeeting(
  id: string,
  opts?: { logAttendance?: boolean },
): ClassMeeting | null {
  const file = read()
  const meeting = file.meetings.find((m) => m.id === id)
  if (!meeting) return null
  const log = opts?.logAttendance === true
  meeting.endedAt = new Date().toISOString()
  meeting.attendanceLogged = log
  meeting.attendees = meeting.attendees.map((a) => ({
    ...a,
    logged: log ? true : a.logged === true,
  }))
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
  /** Profile / admin edit. Live class leaves this false until End class. */
  logged?: boolean
}): ClassMeeting | null {
  const file = read()
  const meeting = input.meetingId
    ? file.meetings.find((m) => m.id === input.meetingId)
    : file.activeMeetingId
      ? file.meetings.find((m) => m.id === file.activeMeetingId && !m.endedAt)
      : null
  if (!meeting) return null
  const first = input.firstName.trim()
  const last = input.lastName.trim()
  const logged = input.logged ?? Boolean(meeting.endedAt)
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
        logged,
      },
    ]
    if (logged) meeting.attendanceLogged = true
    write(file)
  } else {
    let changed = false
    meeting.attendees = meeting.attendees.map((a) => {
      const match =
        (input.athleteId && a.athleteId === input.athleteId) ||
        (first && last && namesMatch(a, first, last))
      if (!match) return a
      const next = {
        ...a,
        athleteId: a.athleteId || input.athleteId,
        logged: input.logged !== undefined ? input.logged : a.logged,
      }
      if (next.athleteId !== a.athleteId || next.logged !== a.logged) changed = true
      return next
    })
    if (logged) {
      meeting.attendanceLogged = true
      changed = true
    }
    if (changed) write(file)
  }
  return meeting
}

export function removeClassAttendance(meetingId: string, athleteId: string): ClassMeeting | null {
  const file = read()
  const meeting = file.meetings.find((m) => m.id === meetingId)
  if (!meeting) return null
  const before = meeting.attendees.length
  meeting.attendees = meeting.attendees.filter((a) => a.athleteId !== athleteId)
  if (meeting.attendees.length === before) return meeting
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
    if (!res.ok) {
      ensureDefaultClassTypes(RYAN_PROFILE_ID)
      return
    }
    const data = (await res.json()) as CoachClassFile
    if (data?.kind !== 'shape-lab-coach-classes') {
      ensureDefaultClassTypes(RYAN_PROFILE_ID)
      return
    }
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
    ensureDefaultClassTypes(RYAN_PROFILE_ID)
  } catch {
    ensureDefaultClassTypes(RYAN_PROFILE_ID)
  }
}
