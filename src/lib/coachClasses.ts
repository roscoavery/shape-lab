/**
 * Classes a coach teaches (name + day + time), a standing roster,
 * live meetings, and notes — gym-wide via /api/coach-classes.
 */

import type { Athlete, ClassExtraExercise, LessonNote } from '../types'
import { normalizeClassExtras } from './classExercises'
import { createId, loadAthletes } from './storage'
import { displayPersonName, namesMatch, splitPersonName } from './classStation'
import { isShapelabAdmin } from './profileRole'
import { RYAN_PROFILE_ID } from './ryanProfile'
import { gymWriteFetch, isStopWriteStatus } from './gymWritePace'

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
  /** Which gym's class this is. Defaults to the coach's home gym. */
  gymName?: string
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
  /**
   * Coaches marked present for this class, with the fraction of the class
   * they covered (1 = whole, 0.75, 0.5, 0.25). Used for coach hours tracking.
   * Coaches are never auto-selected for hold logging.
   */
  coachPresence?: Array<{ coachId: string; fraction: number; at: string }>
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

/** A meeting left live for more than 12 hours was forgotten. End it automatically
 *  so a stale session never blocks the next class. The end time is capped at
 *  3 hours after start so attendance windows stay sane. */
const STALE_MEETING_MS = 12 * 60 * 60 * 1000
const MAX_MEETING_MS = 3 * 60 * 60 * 1000

export function autoEndStaleMeetings(meetings: ClassMeeting[]): { meetings: ClassMeeting[]; ended: number } {
  const now = Date.now()
  let ended = 0
  const next = meetings.map((m) => {
    if (m.endedAt) return m
    const started = Date.parse(m.startedAt)
    if (!Number.isFinite(started) || now - started < STALE_MEETING_MS) return m
    ended += 1
    return { ...m, endedAt: new Date(Math.min(started + MAX_MEETING_MS, now)).toISOString() }
  })
  return { meetings: next, ended }
}

/** Auto-start and auto-end classes based on the schedule.
 *
 *  A class auto-starts at the beginning of its scheduled hour and auto-ends
 *  at the end of the hour. The end still asks whether to log attendance for
 *  everyone there. Manual start/stop outside scheduled hours still works.
 */

const AUTO_END_PROMPT_KEY = 'shapelab:auto-end-prompt'

/** Returns the offering scheduled for the given time, if any. */
export function offeringScheduledAt(
  offerings: CoachClassOffering[],
  at: Date = new Date(),
): CoachClassOffering | null {
  const weekday = WEEKDAYS[at.getDay()]
  const minutes = at.getHours() * 60 + at.getMinutes()
  for (const o of offerings) {
    if (o.weekday !== weekday) continue
    const start = parseClassTimeMinutes(o.time)
    // Class runs for one hour starting at the scheduled time.
    if (minutes >= start && minutes < start + 60) return o
  }
  return null
}

/** Returns true if the given time is past the end of the offering's hour. */
export function isPastClassHour(offering: CoachClassOffering, at: Date = new Date()): boolean {
  const weekday = WEEKDAYS[at.getDay()]
  if (offering.weekday !== weekday) return true
  const start = parseClassTimeMinutes(offering.time)
  const minutes = at.getHours() * 60 + at.getMinutes()
  return minutes >= start + 60
}

/** Check for auto-start/auto-end. Returns the meeting that was auto-ended, if any. */
export function checkAutoClass(at: Date = new Date()): ClassMeeting | null {
  const file = read()
  const offerings = file.offerings
  const scheduled = offeringScheduledAt(offerings, at)

  // Auto-end: any live meeting whose scheduled hour has passed.
  let autoEnded: ClassMeeting | null = null
  for (const m of file.meetings) {
    if (m.endedAt) continue
    const offering = offerings.find((o) => o.id === m.offeringId)
    if (!offering) continue
    if (isPastClassHour(offering, at)) {
      const ended = endClassMeeting(m.id, { logAttendance: false })
      if (ended) {
        autoEnded = ended
        // Flag for the UI to show the "log attendance?" prompt.
        try {
          localStorage.setItem(AUTO_END_PROMPT_KEY, ended.id)
        } catch { /* ignore */ }
      }
    }
  }

  // Auto-start: if a class is scheduled now and none is live for it, start it.
  if (scheduled) {
    const live = file.meetings.find((m) => m.offeringId === scheduled.id && !m.endedAt)
    if (!live) {
      startClassMeeting(scheduled)
    }
  }

  return autoEnded
}

/** Returns the meeting id waiting for an auto-end attendance prompt, if any. */
export function pendingAutoEndPrompt(): string | null {
  try {
    return localStorage.getItem(AUTO_END_PROMPT_KEY)
  } catch {
    return null
  }
}

/** Clears the auto-end prompt flag. */
export function clearAutoEndPrompt(): void {
  try {
    localStorage.removeItem(AUTO_END_PROMPT_KEY)
  } catch { /* ignore */ }
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

/** Classes this coach teaches. Shapelab admin still sees the whole gym list. */
export function loadOfferingsForCoach(coachId: string | null | undefined): CoachClassOffering[] {
  const all = loadOfferings()
  if (!coachId) return all
  const viewer = loadAthletes().find((a) => a.id === coachId) ?? null
  if (isShapelabAdmin(viewer)) return all
  return all.filter((o) => offeringCoachIds(o).includes(coachId))
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
  gymName?: string
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
    gymName: input.gymName ?? existing?.gymName,
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

function closeOtherLiveMeetings(file: CoachClassFile, keepId?: string | null) {
  const now = new Date().toISOString()
  for (const meeting of file.meetings) {
    if (meeting.endedAt || meeting.id === keepId) continue
    meeting.endedAt = now
    meeting.attendanceLogged = false
  }
}

export function startClassMeeting(offering: CoachClassOffering): ClassMeeting {
  const file = read()
  const existing = file.meetings.find((m) => m.offeringId === offering.id && !m.endedAt)
  if (existing) {
    closeOtherLiveMeetings(file, existing.id)
    file.activeMeetingId = existing.id
    write(file)
    return existing
  }
  const now = new Date().toISOString()
  closeOtherLiveMeetings(file)
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
  const now = new Date().toISOString()
  meeting.endedAt = now
  meeting.attendanceLogged = log
  meeting.attendees = meeting.attendees.map((a) => ({
    ...a,
    logged: log ? true : a.logged === true,
  }))
  closeOtherLiveMeetings(file, meeting.id)
  file.activeMeetingId = pickLiveMeetingId(file.meetings)
  write(file)
  return meeting
}

/** Log attendance for an already-ended meeting (e.g., after an auto-end).
 *  Does not change endedAt. */
export function logMeetingAttendance(id: string): ClassMeeting | null {
  const file = read()
  const meeting = file.meetings.find((m) => m.id === id)
  if (!meeting) return null
  meeting.attendanceLogged = true
  meeting.attendees = meeting.attendees.map((a) => ({ ...a, logged: true }))
  write(file)
  return meeting
}

/** Record that the end-of-class prompt was answered with "don't log".
 *  Syncs across devices so the prompt doesn't reappear elsewhere. */
export function skipMeetingAttendance(id: string): ClassMeeting | null {
  const file = read()
  const meeting = file.meetings.find((m) => m.id === id)
  if (!meeting) return null
  meeting.attendanceLogged = false
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

export function setMeetingOffering(meetingId: string, offeringId: string): ClassMeeting | null {
  const file = read()
  const meeting = file.meetings.find((m) => m.id === meetingId)
  const offering = file.offerings.find((o) => o.id === offeringId)
  if (!meeting || !offering) return null
  if (meeting.offeringId === offeringId) return meeting
  meeting.offeringId = offeringId
  write(file)
  return meeting
}

/** Valid fractions of a class a coach can be marked present for. */
export const COACH_FRACTIONS = [1, 0.75, 0.5, 0.25] as const
export type CoachFraction = (typeof COACH_FRACTIONS)[number]

export function coachFractionLabel(fraction: number): string {
  if (fraction >= 1) return 'Whole class'
  if (fraction >= 0.75) return '3/4 of class'
  if (fraction >= 0.5) return 'Half of class'
  return '1/4 of class'
}

/** Mark a coach present for a class. Defaults to the whole class. */
export function markCoachPresent(
  meetingId: string,
  coachId: string,
  fraction: number = 1,
): ClassMeeting | null {
  const file = read()
  const meeting = file.meetings.find((m) => m.id === meetingId)
  if (!meeting) return null
  const list = meeting.coachPresence ?? []
  const existing = list.find((c) => c.coachId === coachId)
  if (existing) {
    existing.fraction = fraction
  } else {
    list.push({ coachId, fraction, at: new Date().toISOString() })
  }
  meeting.coachPresence = list
  write(file)
  return meeting
}

/** Change how much of the class a present coach covered. */
export function setCoachPresenceFraction(
  meetingId: string,
  coachId: string,
  fraction: number,
): ClassMeeting | null {
  return markCoachPresent(meetingId, coachId, fraction)
}

/** Remove a coach from the present list for a class. */
export function unmarkCoachPresent(meetingId: string, coachId: string): ClassMeeting | null {
  const file = read()
  const meeting = file.meetings.find((m) => m.id === meetingId)
  if (!meeting) return null
  meeting.coachPresence = (meeting.coachPresence ?? []).filter((c) => c.coachId !== coachId)
  write(file)
  return meeting
}

/** Coach profiles marked present for this meeting, in attendance order. */
export function resolvePresentCoaches(meeting: ClassMeeting, athletes: Athlete[]): Athlete[] {
  const out: Athlete[] = []
  for (const row of meeting.coachPresence ?? []) {
    const match = athletes.find((a) => a.id === row.coachId)
    if (match && !out.some((a) => a.id === match.id)) out.push(match)
  }
  return out
}

/** Fraction of the class a coach was present for, or 0 if not marked present. */
export function coachPresenceFraction(meeting: ClassMeeting, coachId: string): number {
  return meeting.coachPresence?.find((c) => c.coachId === coachId)?.fraction ?? 0
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
  extra?: {
    kind?: LessonNote['topicKind']
    id?: string
    label?: string
    authorId?: string
    authorName?: string
    audience?: LessonNote['audience']
  },
): ClassMeeting | null {
  const file = read()
  const meeting = file.meetings.find((m) => m.id === meetingId)
  if (!meeting) return null
  const note: LessonNote = {
    id: createId('cnote'),
    text: text.trim(),
    createdAt: new Date().toISOString(),
    context: 'general',
    topicKind: extra?.kind,
    topicId: extra?.id,
    topicLabel: extra?.label,
    authorId: extra?.authorId,
    authorName: extra?.authorName,
    audience: extra?.audience,
  }
  if (!note.text) return meeting
  meeting.notes = [note, ...(meeting.notes ?? [])].slice(0, 200)
  write(file)
  return meeting
}

export function updateClassNote(
  meetingId: string,
  noteId: string,
  text: string,
): ClassMeeting | null {
  const file = read()
  const meeting = file.meetings.find((m) => m.id === meetingId)
  if (!meeting) return null
  const note = (meeting.notes ?? []).find((n) => n.id === noteId)
  if (!note) return meeting
  const next = text.trim()
  if (!next) return meeting
  note.text = next
  write(file)
  return meeting
}

export function removeClassNote(meetingId: string, noteId: string): ClassMeeting | null {
  const file = read()
  const meeting = file.meetings.find((m) => m.id === meetingId)
  if (!meeting) return null
  meeting.notes = (meeting.notes ?? []).filter((n) => n.id !== noteId)
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

export type AttendanceSummary = {
  /** Who was there at the most recent session. */
  lastWeek: Athlete[]
  /** Who usually shows up: in at least half of the last 6 sessions. */
  regulars: Athlete[]
}

/**
 * Who to expect in a class, from actual attendance.
 *
 * Last week = the most recent ended session's roster. Regulars = athletes
 * present in at least half of the last 6 sessions (so the coach sees who
 * usually shows up, not just who was there once).
 */
export function summarizeAttendance(
  offeringId: string,
  athletes: Athlete[],
): AttendanceSummary {
  const empty: AttendanceSummary = { lastWeek: [], regulars: [] }
  if (!offeringId) return empty
  const past = loadMeetings()
    .filter((m) => m.offeringId === offeringId && m.endedAt)
    .sort((a, b) => b.startedAt.localeCompare(a.startedAt))
  if (past.length === 0) return empty

  const byId = new Map(athletes.map((a) => [a.id, a]))
  const resolve = (ids: string[]): Athlete[] => {
    const out: Athlete[] = []
    const seen = new Set<string>()
    for (const id of ids) {
      const a = byId.get(id)
      if (a && !seen.has(id)) {
        seen.add(id)
        out.push(a)
      }
    }
    return out
  }

  const lastWeek = resolve(
    past[0].attendees.map((r) => r.athleteId).filter((id): id is string => Boolean(id)),
  )

  const recent = past.slice(0, 6)
  const counts = new Map<string, number>()
  for (const m of recent) {
    const seenInMeeting = new Set<string>()
    for (const row of m.attendees) {
      if (row.athleteId && !seenInMeeting.has(row.athleteId)) {
        seenInMeeting.add(row.athleteId)
        counts.set(row.athleteId, (counts.get(row.athleteId) ?? 0) + 1)
      }
    }
  }
  const threshold = Math.max(2, Math.ceil(recent.length / 2))
  const regularIds = [...counts.entries()]
    .filter(([, n]) => n >= threshold)
    .sort((a, b) => b[1] - a[1])
    .map(([id]) => id)
  const regulars = resolve(regularIds)

  return { lastWeek, regulars }
}

export function rosterAthletes(offering: CoachClassOffering | null | undefined, athletes: Athlete[]): Athlete[] {
  if (!offering) return []
  return offering.rosterIds
    .map((id) => athletes.find((a) => a.id === id))
    .filter((a): a is Athlete => Boolean(a))
}

/**
 * Ids of athletes who belong to a class: the standing roster plus recent
 * attendees (last week + regulars), so class-scoped things like 'Everyone'
 * tasks reach the right kids even when the roster is a little stale.
 */
export function classMemberIds(offeringId: string, athletes: Athlete[]): Set<string> {
  const ids = new Set<string>()
  const offering = loadOfferings().find((o) => o.id === offeringId)
  if (offering) {
    for (const id of offering.rosterIds) ids.add(id)
  }
  const { lastWeek, regulars } = summarizeAttendance(offeringId, athletes)
  for (const a of lastWeek) ids.add(a.id)
  for (const a of regulars) ids.add(a.id)
  // Also include anyone marked present in today's meetings (including the
  // live one), so "everyone" tasks show during class even for a brand-new
  // class with no roster or history yet.
  const today = new Date()
  const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
  for (const m of loadMeetings()) {
    if (m.offeringId !== offeringId) continue
    const started = new Date(m.startedAt)
    const key = `${started.getFullYear()}-${String(started.getMonth() + 1).padStart(2, '0')}-${String(started.getDate()).padStart(2, '0')}`
    if (key !== todayKey) continue
    for (const att of m.attendees) {
      if (att.athleteId) ids.add(att.athleteId)
    }
  }
  return ids
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
      const res = await gymWriteFetch('/api/coach-classes', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(file),
      })
      if (res.ok) return true
      if (isStopWriteStatus(res.status)) return false
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
    const merged = mergeMeetings(
      local.meetings,
      (data.meetings ?? []).map(normalizeMeeting).filter((m): m is ClassMeeting => !!m),
    ).filter((m) => !droppedMeetings.has(m.id))
    // End any meeting left live for 12+ hours so a forgotten session never sticks.
    const { meetings } = autoEndStaleMeetings(merged)
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

/**
 * Duplicate class meetings: same offering, same calendar day, all ended.
 * One group per offering+day with 2+ meetings, so the UI shows a single
 * merge prompt per group instead of one per pair.
 */
export interface DuplicateClassMeetingGroup {
  offeringId: string
  offeringName: string
  /** Scheduled time of the offering (e.g. "5:00 PM"), shown on the prompt. */
  offeringTime: string
  day: string
  meetings: ClassMeeting[]
}

export function findDuplicateClassMeetingGroups(): DuplicateClassMeetingGroup[] {
  const file = read()
  const removed = new Set(file.removedMeetingIds ?? [])
  const meetings = file.meetings.filter((m) => m.endedAt && !removed.has(m.id))
  const byKey = new Map<string, DuplicateClassMeetingGroup>()
  for (const m of meetings) {
    const day = (m.startedAt ?? '').slice(0, 10)
    if (!day || !m.offeringId) continue
    const key = `${m.offeringId}|${day}`
    let g = byKey.get(key)
    if (!g) {
      const offering = file.offerings.find((o) => o.id === m.offeringId)
      g = {
        offeringId: m.offeringId,
        offeringName: offering?.name ?? 'class',
        offeringTime: offering?.time?.trim() ?? '',
        day,
        meetings: [],
      }
      byKey.set(key, g)
    }
    g.meetings.push(m)
  }
  return [...byKey.values()].filter((g) => {
    if (g.meetings.length < 2) return false
    // Hard safeguard: never offer a merge across different offerings, even
    // if the key logic above changes. A Connections 5pm must never merge
    // with a Connections 6pm.
    const ids = new Set(g.meetings.map((m) => m.offeringId))
    return ids.size === 1
  })
}

/**
 * Merge every meeting in a duplicate group into the earliest-started one:
 * unions attendees (earliest check-in wins), concatenates notes chronologically,
 * unions coach presence (max fraction per coach wins), keeps the earliest
 * start and latest end. Absorbed meetings are deleted through
 * deleteClassMeeting so their tombstones are recorded and the deletes sync.
 */
export function mergeClassMeetingGroup(meetings: ClassMeeting[]): ClassMeeting | null {
  if (meetings.length < 2) return null
  // Hard safeguard: never merge across different offerings.
  if (new Set(meetings.map((m) => m.offeringId)).size !== 1) return null
  const sorted = [...meetings].sort((x, y) =>
    (x.startedAt ?? '').localeCompare(y.startedAt ?? ''),
  )
  const base = sorted[0]
  const rest = sorted.slice(1)

  const attendeeByKey = new Map<string, ClassAttendee>()
  for (const m of sorted) {
    for (const a of m.attendees ?? []) {
      const key = attendeeKey(a)
      const keep = attendeeByKey.get(key)
      if (!keep || (a.at ?? '') < (keep.at ?? '')) attendeeByKey.set(key, a)
    }
  }
  const attendees = [...attendeeByKey.values()].sort((x, y) =>
    (x.at ?? '').localeCompare(y.at ?? ''),
  )

  const notes = sorted
    .flatMap((m) => m.notes ?? [])
    .sort((x, y) => (x.createdAt ?? '').localeCompare(y.createdAt ?? ''))

  const presenceByCoach = new Map<string, { coachId: string; fraction: number; at: string }>()
  for (const m of sorted) {
    for (const c of m.coachPresence ?? []) {
      if (!c.coachId) continue
      const keep = presenceByCoach.get(c.coachId)
      if (!keep || (c.fraction ?? 0) > (keep.fraction ?? 0)) {
        presenceByCoach.set(c.coachId, { coachId: c.coachId, fraction: c.fraction ?? 0, at: c.at ?? '' })
      }
    }
  }
  const coachPresence = [...presenceByCoach.values()].sort((x, y) =>
    (x.at ?? '').localeCompare(y.at ?? ''),
  )

  const startedAt = sorted.map((m) => m.startedAt).filter(Boolean).sort()[0] ?? base.startedAt
  const endedAt = sorted.map((m) => m.endedAt).filter(Boolean).sort().pop() ?? base.endedAt

  const file = read()
  const target = file.meetings.find((m) => m.id === base.id)
  if (!target) return null
  target.attendees = attendees
  target.notes = notes
  target.coachPresence = coachPresence
  target.startedAt = startedAt
  target.endedAt = endedAt
  write(file)
  for (const m of rest) deleteClassMeeting(m.id)
  return target
}

/** Hide a duplicate class group from the merge prompt without merging. */
const CLASS_MERGE_DISMISSED_KEY = 'sl-class-merge-dismissed'

export function dismissClassMergeGroup(offeringId: string, day: string): void {
  try {
    const raw = localStorage.getItem(CLASS_MERGE_DISMISSED_KEY)
    const list: string[] = raw ? JSON.parse(raw) : []
    const key = `group|${offeringId}|${day}`
    if (!list.includes(key)) {
      list.push(key)
      localStorage.setItem(CLASS_MERGE_DISMISSED_KEY, JSON.stringify(list.slice(-50)))
    }
  } catch {
    /* ignore */
  }
}

export function isClassMergeGroupDismissed(offeringId: string, day: string): boolean {
  try {
    const raw = localStorage.getItem(CLASS_MERGE_DISMISSED_KEY)
    const list: string[] = raw ? JSON.parse(raw) : []
    return list.includes(`group|${offeringId}|${day}`)
  } catch {
    return false
  }
}
