import { readJson, writeJson } from '../persist.ts'
import type {
  AthleteCalendarAlias,
  CalendarConnection,
  CalendarDb,
  CalendarEvent,
  CalendarEventMapping,
  CalendarSyncState,
  ConnectedCalendar,
  LessonCalendarLink,
  CalendarTitleMapping,
} from './types.ts'
import { randomBytes } from 'node:crypto'

function newId(prefix: string): string {
  return `${prefix}_${randomBytes(10).toString('hex')}`
}
import { normalizeAlias } from './matching.ts'
import { eventOverlapsLocalDay } from './timezone.ts'

const FILE = 'data/calendar.json'

const EMPTY: CalendarDb = {
  kind: 'shape-lab-calendar',
  version: 1,
  exportedAt: '',
  connections: [],
  connectedCalendars: [],
  events: [],
  aliases: [],
  eventMappings: [],
  titleMappings: [],
  lessonLinks: [],
  syncState: [],
}

export async function readCalendarDb(): Promise<CalendarDb> {
  const data = await readJson<CalendarDb>(FILE, { ...EMPTY })
  if (!data || data.kind !== 'shape-lab-calendar') return { ...EMPTY }
  return {
    kind: 'shape-lab-calendar',
    version: 1,
    exportedAt: typeof data.exportedAt === 'string' ? data.exportedAt : '',
    connections: Array.isArray(data.connections) ? data.connections : [],
    connectedCalendars: Array.isArray(data.connectedCalendars) ? data.connectedCalendars : [],
    events: Array.isArray(data.events) ? data.events : [],
    aliases: Array.isArray(data.aliases) ? data.aliases : [],
    eventMappings: Array.isArray(data.eventMappings) ? data.eventMappings : [],
    titleMappings: Array.isArray(data.titleMappings) ? data.titleMappings : [],
    lessonLinks: Array.isArray(data.lessonLinks) ? data.lessonLinks : [],
    syncState: Array.isArray(data.syncState) ? data.syncState : [],
  }
}

async function writeDb(db: CalendarDb): Promise<void> {
  const next = { ...db, exportedAt: new Date().toISOString() }
  await writeJson(FILE, next)
}

export function connectionForCoach(db: CalendarDb, coachId: string): CalendarConnection | null {
  return db.connections.find((c) => c.coachId === coachId && c.status !== 'disconnected') ?? null
}

export function calendarsForConnection(db: CalendarDb, connectionId: string): ConnectedCalendar[] {
  return db.connectedCalendars.filter((c) => c.connectionId === connectionId)
}

export function eventsForCoachOnDay(
  db: CalendarDb,
  coachId: string,
  timeZone: string,
  ref: Date = new Date(),
): CalendarEvent[] {
  return db.events.filter((e) => {
    if (e.coachId !== coachId || e.status === 'cancelled') return false
    return eventOverlapsLocalDay(e.startAt, e.endAt, timeZone, ref)
  })
}

export function upsertEvents(db: CalendarDb, incoming: CalendarEvent[]): CalendarDb {
  const map = new Map<string, CalendarEvent>()
  for (const e of db.events) {
    map.set(`${e.connectionId}|${e.providerCalendarId}|${e.providerEventId}|${e.recurrenceInstanceKey}`, e)
  }
  for (const row of incoming) {
    const key = `${row.connectionId}|${row.providerCalendarId}|${row.providerEventId}|${row.recurrenceInstanceKey}`
    const prev = map.get(key)
    if (!prev || row.lastModifiedAt.localeCompare(prev.lastModifiedAt) >= 0) {
      map.set(key, row)
    }
  }
  return { ...db, events: [...map.values()] }
}

export function removeConnectionData(db: CalendarDb, connectionId: string, coachId: string): CalendarDb {
  return {
    ...db,
    connections: db.connections.filter((c) => c.id !== connectionId),
    connectedCalendars: db.connectedCalendars.filter((c) => c.connectionId !== connectionId),
    events: db.events.filter((e) => e.connectionId !== connectionId),
    eventMappings: db.eventMappings.filter(
      (m) => m.connectionId !== connectionId || m.coachId !== coachId,
    ),
    syncState: db.syncState.filter((s) => s.connectionId !== connectionId),
  }
}

export function getSyncState(db: CalendarDb, connectionId: string): CalendarSyncState {
  return (
    db.syncState.find((s) => s.connectionId === connectionId) ?? {
      connectionId,
      calendarSyncTokens: {},
      calendarCtags: {},
    }
  )
}

export function setSyncState(db: CalendarDb, state: CalendarSyncState): CalendarDb {
  const rest = db.syncState.filter((s) => s.connectionId !== state.connectionId)
  return { ...db, syncState: [...rest, state] }
}

export async function saveConnection(conn: CalendarConnection): Promise<CalendarDb> {
  const db = await readCalendarDb()
  const rest = db.connections.filter((c) => c.coachId !== conn.coachId)
  await writeDb({ ...db, connections: [...rest, conn] })
  return readCalendarDb()
}

export async function saveCalendars(
  connectionId: string,
  rows: ConnectedCalendar[],
): Promise<CalendarDb> {
  const db = await readCalendarDb()
  const rest = db.connectedCalendars.filter((c) => c.connectionId !== connectionId)
  await writeDb({ ...db, connectedCalendars: [...rest, ...rows] })
  return readCalendarDb()
}

export async function patchConnection(
  connectionId: string,
  patch: Partial<CalendarConnection>,
): Promise<CalendarDb> {
  const db = await readCalendarDb()
  const next = db.connections.map((c) =>
    c.id === connectionId ? { ...c, ...patch, updatedAt: new Date().toISOString() } : c,
  )
  await writeDb({ ...db, connections: next })
  return readCalendarDb()
}

export async function persistDb(db: CalendarDb): Promise<void> {
  await writeDb(db)
}

export async function addLessonLink(link: Omit<LessonCalendarLink, 'id' | 'createdAt'>): Promise<LessonCalendarLink> {
  const db = await readCalendarDb()
  const row: LessonCalendarLink = {
    ...link,
    id: newId('ccl'),
    createdAt: new Date().toISOString(),
  }
  const rest = db.lessonLinks.filter(
    (l) => l.lessonId !== row.lessonId && !(l.calendarEventId === row.calendarEventId && l.athleteId === row.athleteId),
  )
  await writeDb({ ...db, lessonLinks: [...rest, row] })
  return row
}

export async function upsertManualMatch(opts: {
  coachId: string
  eventId: string
  athleteId: string
  saveSeries?: boolean
  saveTitle?: boolean
  seriesKey?: string
  connectionId?: string
  title?: string
}): Promise<CalendarDb> {
  const db = await readCalendarDb()
  const events = db.events.map((e) =>
    e.id === opts.eventId
      ? {
          ...e,
          matchedAthleteId: opts.athleteId,
          matchStatus: 'matched' as const,
          matchConfidence: 1,
          updatedAt: new Date().toISOString(),
        }
      : e,
  )
  let eventMappings = db.eventMappings
  let titleMappings = db.titleMappings
  if (opts.saveSeries && opts.seriesKey && opts.connectionId) {
    const row: CalendarEventMapping = {
      id: newId('cem'),
      coachId: opts.coachId,
      connectionId: opts.connectionId,
      seriesKey: opts.seriesKey,
      athleteId: opts.athleteId,
      createdAt: new Date().toISOString(),
    }
    eventMappings = [
      ...eventMappings.filter(
        (m) =>
          !(
            m.coachId === opts.coachId &&
            m.connectionId === opts.connectionId &&
            m.seriesKey === opts.seriesKey
          ),
      ),
      row,
    ]
  }
  if (opts.saveTitle && opts.title) {
    const norm = normalizeAlias(opts.title)
    const row: CalendarTitleMapping = {
      id: newId('ctm'),
      coachId: opts.coachId,
      normalizedTitle: norm,
      athleteId: opts.athleteId,
      createdAt: new Date().toISOString(),
    }
    titleMappings = [
      ...titleMappings.filter((m) => !(m.coachId === opts.coachId && m.normalizedTitle === norm)),
      row,
    ]
  }
  await writeDb({ ...db, events, eventMappings, titleMappings })
  return readCalendarDb()
}

export async function addAlias(
  coachId: string,
  athleteId: string,
  alias: string,
): Promise<AthleteCalendarAlias> {
  const db = await readCalendarDb()
  const row: AthleteCalendarAlias = {
    id: newId('aca'),
    coachId,
    athleteId,
    alias: alias.trim(),
    normalizedAlias: normalizeAlias(alias),
    createdAt: new Date().toISOString(),
  }
  await writeDb({
    ...db,
    aliases: [
      ...db.aliases.filter(
        (a) => !(a.coachId === coachId && a.normalizedAlias === row.normalizedAlias),
      ),
      row,
    ],
  })
  return row
}
