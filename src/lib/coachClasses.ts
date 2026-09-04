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
  /** Coach running the hour — shown first. */
  leadCoachId?: string
  /** Coaches helping this hour. */
  helperCoachIds?: string[]
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
  removedOfferingIds?: string[]
  removedMeetingIds?: string[]
}

const KEY = 'shape-lab.coachClasses.v1'
const listeners = new Set<() => void>()
/** Live tab copy — localStorage can miss a write when the phone is full. */
let memoryFile: CoachClassFile | null = null

function emptyFile(): CoachClassFile {
  return {
    kind: 'shape-lab-coach-classes',
    version: 1,
    exportedAt: '',
    offerings: [],
    meetings: [],
    activeMeetingId: null,
    removedOfferingIds: [],
    removedMeetingIds: [],
  }
}

/** Connections Monday 5pm and Connections Wednesday 4pm share this key. */
export function classTypeKey(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, ' ')
}

export function parseClassTimeMinutes(raw: string): number {
  const s = raw.trim().toLowerCase().replace(/\s+/g, '')
  const m = s.match(/^(\d{1,2})(?::(\d{2}))?(am|pm)?$/)
  if (!m) return 24 * 60 + 1
  let hour = Number(m[1])
  const minute = m[2] ? Number(m[2]) : 0
  const ap = m[3]
  if (ap === 'pm' && hour < 12) hour += 12
  if (ap === 'am' && hour === 12) hour = 0
  if (!ap && hour > 0 && hour <= 7) hour += 12
  return hour * 60 + minute
}

export function compareOfferingsByWhen(a: CoachClassOffering, b: CoachClassOffering): number {
  const day = WEEKDAYS.indexOf(a.weekday) - WEEKDAYS.indexOf(b.weekday)
  if (day !== 0) return day
  const time = parseClassTimeMinutes(a.time) - parseClassTimeMinutes(b.time)
  if (time !== 0) return time
  return a.name.localeCompare(b.name)
}

function asIdList(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return [...new Set(value.filter((id): id is string => typeof id === 'string' && Boolean(id)))]
}

function withCoachRoles(raw: Partial<CoachClassOffering>, coachIds: string[]): Pick<
  CoachClassOffering,
  'coachId' | 'coachIds' | 'leadCoachId' | 'helperCoachIds'
> {
  const lead =
    (raw.leadCoachId && coachIds.includes(raw.leadCoachId) && raw.leadCoachId) ||
    (raw.coachId && coachIds.includes(raw.coachId) && raw.coachId) ||
    coachIds[0] ||
    ''
  const helpers = asIdList(raw.helperCoachIds).filter((id) => id !== lead)
  const rest = coachIds.filter((id) => id !== lead && !helpers.includes(id))
  const helperCoachIds = [...helpers, ...rest]
  const ordered = [lead, ...helperCoachIds].filter(Boolean)
  return {
    coachId: lead || ordered[0] || '',
    coachIds: ordered,
    leadCoachId: lead || undefined,
    helperCoachIds,
  }
}

function normalizeOffering(raw: Partial<CoachClassOffering>): CoachClassOffering | null {
  if (!raw?.id || !raw.name) return null
  const coachIds = asIdList(raw.coachIds).length
    ? asIdList(raw.coachIds)
    : raw.coachId
      ? [raw.coachId]
      : []
  const roles = withCoachRoles(raw, coachIds)
  return {
    id: raw.id,
    ...roles,
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

function attendeeKey(row: ClassAttendee): string {
  if (row.athleteId) return `id:${row.athleteId}`
  return `name:${row.firstName.trim().toLowerCase()}|${row.lastName.trim().toLowerCase()}`
}

function combineMeetings(keep: ClassMeeting, incoming: ClassMeeting): ClassMeeting {
  const incomingEnded = Boolean(incoming.endedAt)
  const keepEnded = Boolean(keep.endedAt)
  const newerEnded = incomingEnded && (!keepEnded || (incoming.endedAt || '') >= (keep.endedAt || ''))
  const attendees = new Map<string, ClassAttendee>()
  for (const row of [...keep.attendees, ...incoming.attendees]) {
    const key = attendeeKey(row)
    const have = attendees.get(key)
    attendees.set(key, have ? { ...have, ...row, logged: Boolean(have.logged || row.logged) } : row)
  }
  const notes = new Map<string, (typeof keep.notes)[number]>()
  for (const row of [...keep.notes, ...incoming.notes]) {
    if (row?.id) notes.set(row.id, row)
  }
  return {
    ...keep,
    ...incoming,
    id: keep.id,
    offeringId: keep.offeringId || incoming.offeringId,
    coachId: keep.coachId || incoming.coachId,
    startedAt: keep.startedAt <= incoming.startedAt ? keep.startedAt : incoming.startedAt,
    endedAt: newerEnded ? incoming.endedAt : keep.endedAt || incoming.endedAt,
    attendees: [...attendees.values()],
    notes: [...notes.values()],
    attendanceLogged: incoming.attendanceLogged ?? keep.attendanceLogged,
  }
}

function mergeMeetings(a: ClassMeeting[], b: ClassMeeting[]): ClassMeeting[] {
  const byId = new Map<string, ClassMeeting>()
  const put = (row: ClassMeeting) => {
    const have = byId.get(row.id)
    byId.set(row.id, have ? combineMeetings(have, row) : row)
  }
  for (const row of a) put(row)
  for (const row of b) put(row)
  return [...byId.values()]
}

export function listLiveMeetings(): ClassMeeting[] {
  return read()
    .meetings.filter((m) => !m.endedAt)
    .slice()
    .sort((a, b) => b.startedAt.localeCompare(a.startedAt))
}

export function pickLiveMeetingId(meetings: ClassMeeting[], preferred?: string | null): string | null {
  const live = meetings.filter((m) => !m.endedAt).sort((a, b) => b.startedAt.localeCompare(a.startedAt))
  if (live.length === 0) return null
  if (preferred && live.some((m) => m.id === preferred)) return preferred
  return live[0]!.id
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

function parseFile(raw: string | null): CoachClassFile {
  if (!raw) return emptyFile()
  try {
    const data = JSON.parse(raw) as CoachClassFile
    if (data?.kind !== 'shape-lab-coach-classes') return emptyFile()
    return {
      kind: 'shape-lab-coach-classes',
      version: 1,
      exportedAt: data.exportedAt ?? '',
      offerings: (data.offerings ?? []).map(normalizeOffering).filter((o): o is CoachClassOffering => !!o),
      meetings: (data.meetings ?? []).map(normalizeMeeting).filter((m): m is ClassMeeting => !!m),
      activeMeetingId: data.activeMeetingId ?? null,
      removedOfferingIds: asIdList(data.removedOfferingIds),
      removedMeetingIds: asIdList(data.removedMeetingIds),
    }
  } catch {
    return emptyFile()
  }
}

function offeringStamp(row: Pick<CoachClassOffering, 'updatedAt' | 'createdAt'>): string {
  return row.updatedAt || row.createdAt || ''
}

function combineOfferings(keep: CoachClassOffering, incoming: CoachClassOffering): CoachClassOffering {
  const incomingNewer = offeringStamp(incoming) >= offeringStamp(keep)
  const newer = incomingNewer ? incoming : keep
  const older = incomingNewer ? keep : incoming
  const extras = new Map<string, NonNullable<CoachClassOffering['extraExercises']>[number]>()
  for (const row of [...(older.extraExercises ?? []), ...(newer.extraExercises ?? [])]) {
    if (row?.id) extras.set(row.id, row)
  }
  return {
    ...older,
    ...newer,
    id: keep.id,
    ...withCoachRoles(newer, [
      ...new Set(
        [
          newer.leadCoachId,
          older.leadCoachId,
          newer.coachId,
          older.coachId,
          ...(newer.coachIds ?? []),
          ...(older.coachIds ?? []),
          ...(newer.helperCoachIds ?? []),
          ...(older.helperCoachIds ?? []),
        ].filter((id): id is string => Boolean(id)),
      ),
    ]),
    rosterIds: [...new Set([...(older.rosterIds ?? []), ...(newer.rosterIds ?? [])])],
    extraExercises: extras.size ? [...extras.values()] : newer.extraExercises ?? older.extraExercises,
    createdAt: older.createdAt || newer.createdAt,
    updatedAt: offeringStamp(incoming) >= offeringStamp(keep) ? incoming.updatedAt || keep.updatedAt : keep.updatedAt || incoming.updatedAt,
  }
}

function mergeOfferings(a: CoachClassOffering[], b: CoachClassOffering[]): CoachClassOffering[] {
  const byId = new Map<string, CoachClassOffering>()
  const put = (row: CoachClassOffering) => {
    const have = byId.get(row.id)
    byId.set(row.id, have ? combineOfferings(have, row) : row)
  }
  for (const row of a) put(row)
  for (const row of b) put(row)
  return [...byId.values()]
}

function readStored(): CoachClassFile {
  try {
    return parseFile(localStorage.getItem(KEY))
  } catch {
    return emptyFile()
  }
}

function read(): CoachClassFile {
  const stored = readStored()
  if (memoryFile && memoryFile.offerings.length >= stored.offerings.length) {
    return {
      ...memoryFile,
      offerings: memoryFile.offerings.map((o) => ({ ...o })),
      meetings: memoryFile.meetings.map((m) => ({ ...m })),
    }
  }
  if (memoryFile && memoryFile.offerings.length > 0) {
    return {
      kind: 'shape-lab-coach-classes',
      version: 1,
      exportedAt: memoryFile.exportedAt || stored.exportedAt,
      offerings: mergeOfferings(stored.offerings, memoryFile.offerings),
      meetings: mergeById(stored.meetings, memoryFile.meetings, (m) => m.endedAt || m.startedAt),
      activeMeetingId: memoryFile.activeMeetingId ?? stored.activeMeetingId,
      removedOfferingIds: [
        ...new Set([...(stored.removedOfferingIds ?? []), ...(memoryFile.removedOfferingIds ?? [])]),
      ],
      removedMeetingIds: [
        ...new Set([...(stored.removedMeetingIds ?? []), ...(memoryFile.removedMeetingIds ?? [])]),
      ],
    }
  }
  return stored
}

function write(file: CoachClassFile, sync = true) {
  const removedOfferingIds = asIdList(file.removedOfferingIds)
  const removedMeetingIds = asIdList(file.removedMeetingIds)
  const removed = new Set(removedOfferingIds)
  const droppedMeetings = new Set(removedMeetingIds)
  const next: CoachClassFile = {
    ...file,
    kind: 'shape-lab-coach-classes',
    version: 1,
    exportedAt: new Date().toISOString(),
    offerings: file.offerings
      .map(normalizeOffering)
      .filter((o): o is CoachClassOffering => !!o && !removed.has(o.id)),
    meetings: file.meetings
      .map(normalizeMeeting)
      .filter((m): m is ClassMeeting => !!m && !droppedMeetings.has(m.id)),
    removedOfferingIds,
    removedMeetingIds,
  }
  memoryFile = next
  try {
    localStorage.setItem(KEY, JSON.stringify(next))
  } catch {
    /* quota — memory still has every class in this tab */
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

export function offeringLeadCoachId(
  offering: Pick<CoachClassOffering, 'coachId' | 'coachIds' | 'leadCoachId'>,
): string {
  return offering.leadCoachId || offering.coachId || offering.coachIds?.[0] || ''
}

export function offeringHelperCoachIds(
  offering: Pick<CoachClassOffering, 'coachId' | 'coachIds' | 'leadCoachId' | 'helperCoachIds'>,
): string[] {
  const lead = offeringLeadCoachId(offering)
  if (offering.helperCoachIds?.length) {
    return offering.helperCoachIds.filter((id) => id && id !== lead)
  }
  return [...new Set([...(offering.coachIds ?? []), offering.coachId].filter(Boolean))].filter(
    (id) => id !== lead,
  )
}

export function offeringCoachIds(
  offering: Pick<CoachClassOffering, 'coachId' | 'coachIds' | 'leadCoachId' | 'helperCoachIds'>,
): string[] {
  const lead = offeringLeadCoachId(offering)
  const helpers = offeringHelperCoachIds(offering)
  return [...new Set([lead, ...helpers].filter(Boolean))]
}

export function classCoachesLabel(
  offering: Pick<CoachClassOffering, 'coachId' | 'coachIds' | 'leadCoachId' | 'helperCoachIds'>,
  athletes: Athlete[],
): string {
  const first = (id: string) => athletes.find((a) => a.id === id)?.name.split(' ')[0] ?? ''
  const lead = first(offeringLeadCoachId(offering))
  const helpers = offeringHelperCoachIds(offering).map(first).filter(Boolean)
  if (!lead && helpers.length === 0) return ''
  if (!helpers.length) return lead ? `${lead} running` : ''
  if (!lead) return helpers.length === 1 ? `${helpers[0]} helping` : `${helpers[0]} + ${helpers.length - 1}`
  if (helpers.length === 1) return `${lead} running · ${helpers[0]} helping`
  return `${lead} running · ${helpers[0]} + ${helpers.length - 1} helping`
}

export function loadCoachClassFile(): CoachClassFile {
  return read()
}

/** Gym-wide class list. Every coach on this link sees the same offerings. */
export function loadOfferings(_coachId?: string | null): CoachClassOffering[] {
  const removed = new Set(read().removedOfferingIds ?? [])
  return read()
    .offerings.filter((o) => !removed.has(o.id))
    .slice()
    .sort(compareOfferingsByWhen)
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
  const removed = new Set(file.removedOfferingIds ?? [])
  let added = false
  for (const seed of DEFAULT_CLASS_TYPES) {
    if (removed.has(seed.id) || byId.has(seed.id) || byName.has(seed.name.toLowerCase())) continue
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
  leadCoachId?: string
  helperCoachIds?: string[]
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
      (
        input.coachIds ??
        existing?.coachIds ??
        [input.leadCoachId || input.coachId || existing?.coachId || '']
      ).filter(Boolean),
    ),
  ]
  const roles = withCoachRoles(
    {
      leadCoachId: input.leadCoachId ?? existing?.leadCoachId,
      helperCoachIds: input.helperCoachIds ?? existing?.helperCoachIds,
      coachId: input.coachId || existing?.coachId,
      coachIds,
    },
    coachIds,
  )
  const row: CoachClassOffering = {
    id: existing?.id ?? createId('cls'),
    ...roles,
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
  file.removedOfferingIds = (file.removedOfferingIds ?? []).filter((id) => id !== row.id)
  write(file)
  return row
}

export function setOfferingCoachRoles(
  id: string,
  input: { leadCoachId: string; helperCoachIds: string[] },
): CoachClassOffering | null {
  const file = read()
  const existing = file.offerings.find((o) => o.id === id)
  if (!existing) return null
  const roles = withCoachRoles(
    {
      leadCoachId: input.leadCoachId,
      helperCoachIds: input.helperCoachIds,
      coachId: input.leadCoachId,
    },
    [input.leadCoachId, ...input.helperCoachIds],
  )
  const row: CoachClassOffering = {
    ...existing,
    ...roles,
    updatedAt: new Date().toISOString(),
  }
  file.offerings = file.offerings.map((o) => (o.id === id ? row : o))
  write(file)
  return row
}

export function setOfferingCoaches(id: string, coachIds: string[]): CoachClassOffering | null {
  const lead = coachIds[0] || ''
  return setOfferingCoachRoles(id, {
    leadCoachId: lead,
    helperCoachIds: coachIds.filter((x) => x && x !== lead),
  })
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
  file.removedOfferingIds = [...new Set([...(file.removedOfferingIds ?? []), id])]
  write(file)
}

export function loadMeetings(_coachId?: string | null): ClassMeeting[] {
  return read().meetings.slice().sort((a, b) => b.startedAt.localeCompare(a.startedAt))
}

export function getMeeting(id: string | null | undefined): ClassMeeting | null {
  if (!id) return null
  return read().meetings.find((m) => m.id === id) ?? null
}

export function getActiveMeeting(coachId?: string | null): ClassMeeting | null {
  const live = listLiveMeetings()
  if (live.length === 0) return null
  if (!coachId) return live[0] ?? null
  const offerings = read().offerings
  const mine = live.find((m) => {
    const offering = offerings.find((o) => o.id === m.offeringId)
    return offering ? offeringCoachIds(offering).includes(coachId) : false
  })
  return mine ?? live[0] ?? null
}

export function startClassMeeting(offering: CoachClassOffering): ClassMeeting {
  const file = read()
  const existing = file.meetings.find((m) => m.offeringId === offering.id && !m.endedAt)
  if (existing) {
    file.activeMeetingId = existing.id
    write(file)
    return existing
  }
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

export function deleteClassMeeting(id: string): boolean {
  const file = read()
  const sid = id.trim()
  if (!sid) return false
  const found = file.meetings.some((m) => m.id === sid)
  if (!found && !(file.removedMeetingIds ?? []).includes(sid)) return false
  file.meetings = file.meetings.filter((m) => m.id !== sid)
  file.removedMeetingIds = [...new Set([...(file.removedMeetingIds ?? []), sid])]
  if (file.activeMeetingId === sid) file.activeMeetingId = pickLiveMeetingId(file.meetings)
  write(file)
  return true
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
  if (file.activeMeetingId === id) file.activeMeetingId = pickLiveMeetingId(file.meetings)
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

/** People who have already been marked in this class type — newest meetings first. */
export function priorOfferingAthleteIds(offeringId: string | null | undefined): string[] {
  if (!offeringId) return []
  const seen = new Set<string>()
  const ordered: string[] = []
  for (const meeting of loadMeetings()) {
    if (meeting.offeringId !== offeringId) continue
    for (const row of meeting.attendees) {
      if (!row.athleteId || seen.has(row.athleteId)) continue
      seen.add(row.athleteId)
      ordered.push(row.athleteId)
    }
  }
  return ordered
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

export async function publishClassList(): Promise<boolean> {
  const file = read()
  for (let attempt = 0; attempt < 4; attempt += 1) {
    try {
      const res = await fetch('/api/coach-classes', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(file),
      })
      if (res.ok) return true
    } catch {
      /* retry */
    }
    await new Promise((resolve) => setTimeout(resolve, 400 * (attempt + 1)))
  }
  return false
}

async function pushCoachClasses() {
  await publishClassList()
}

export async function hydrateCoachClasses(): Promise<void> {
  const local = read()
  try {
    const res = await fetch('/api/coach-classes', { cache: 'no-store' })
    if (!res.ok) {
      ensureDefaultClassTypes(RYAN_PROFILE_ID)
      if (read().offerings.length > 0) await pushCoachClasses()
      return
    }
    const data = (await res.json()) as CoachClassFile
    if (data?.kind !== 'shape-lab-coach-classes') {
      ensureDefaultClassTypes(RYAN_PROFILE_ID)
      if (read().offerings.length > 0) await pushCoachClasses()
      return
    }
    const remoteOfferings = (data.offerings ?? [])
      .map(normalizeOffering)
      .filter((o): o is CoachClassOffering => !!o)
    const removedOfferingIds = [
      ...new Set([...(local.removedOfferingIds ?? []), ...asIdList(data.removedOfferingIds)]),
    ]
    const removedMeetingIds = [
      ...new Set([...(local.removedMeetingIds ?? []), ...asIdList(data.removedMeetingIds)]),
    ]
    const removed = new Set(removedOfferingIds)
    const droppedMeetings = new Set(removedMeetingIds)
    const offerings = mergeOfferings(local.offerings, remoteOfferings).filter((o) => !removed.has(o.id))
    const meetings = mergeMeetings(
      local.meetings,
      (data.meetings ?? []).map(normalizeMeeting).filter((m): m is ClassMeeting => !!m),
    ).filter((m) => !droppedMeetings.has(m.id))
    const live = pickLiveMeetingId(meetings, data.activeMeetingId ?? local.activeMeetingId)
    write(
      { ...local, offerings, meetings, activeMeetingId: live, removedOfferingIds, removedMeetingIds },
      false,
    )
    ensureDefaultClassTypes(RYAN_PROFILE_ID)
    const next = read()
    const remoteById = new Map(remoteOfferings.map((o) => [o.id, o]))
    const needPush = next.offerings.some((o) => {
      const remote = remoteById.get(o.id)
      if (!remote) return true
      return (
        o.name !== remote.name ||
        o.weekday !== remote.weekday ||
        o.time !== remote.time ||
        o.rosterIds.length !== remote.rosterIds.length ||
        o.rosterIds.some((id) => !remote.rosterIds.includes(id)) ||
        offeringLeadCoachId(o) !== offeringLeadCoachId(remote) ||
        (o.coachIds?.length ?? 0) !== (remote.coachIds?.length ?? 0) ||
        (o.extraExercises?.length ?? 0) !== (remote.extraExercises?.length ?? 0)
      )
    })
    const remoteRemoved = asIdList(data.removedOfferingIds)
    const remoteRemovedMeetings = asIdList(data.removedMeetingIds)
    const remoteLive = (data.meetings ?? []).filter((m) => m && !m.endedAt)
    if (
      needPush ||
      next.offerings.length !== remoteOfferings.filter((o) => !removed.has(o.id)).length ||
      (next.removedOfferingIds ?? []).some((id) => !remoteRemoved.includes(id)) ||
      (next.removedMeetingIds ?? []).some((id) => !remoteRemovedMeetings.includes(id)) ||
      (next.activeMeetingId && next.activeMeetingId !== data.activeMeetingId) ||
      listLiveMeetings().length !== remoteLive.length
    ) {
      await pushCoachClasses()
    }
  } catch {
    ensureDefaultClassTypes(RYAN_PROFILE_ID)
    if (read().offerings.length > 0) await pushCoachClasses()
  }
}
