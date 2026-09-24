import type { Athlete } from '../../src/types.ts'
import { randomBytes } from 'node:crypto'

function newId(prefix: string): string {
  return `${prefix}_${randomBytes(10).toString('hex')}`
}
import { decryptSecret } from './crypto.ts'
import { coachingLikelyTitle, matchEventToAthlete } from './matching.ts'
import { decodeCredential, icloudCalendarProvider } from './providers/icloud.ts'
import {
  getSyncState,
  persistDb,
  readCalendarDb,
  setSyncState,
  upsertEvents,
} from './store.ts'
import type { CalendarConnection, CalendarEvent, CalendarEventFilterMode } from './types.ts'

export function defaultSyncWindow(now = new Date()): { start: Date; end: Date } {
  const start = new Date(now)
  start.setDate(start.getDate() - 30)
  start.setHours(0, 0, 0, 0)
  const end = new Date(now)
  end.setDate(end.getDate() + 90)
  end.setHours(23, 59, 59, 999)
  return { start, end }
}

function coachAthletes(all: Athlete[], coachId: string): Athlete[] {
  return all.filter((a) => {
    if (a.id === coachId) return false
    const role = a.role
    return role !== 'coach' && role !== 'gym_owner' && role !== 'parent'
  })
}

function passesFilter(title: string, mode: CalendarEventFilterMode): boolean {
  if (mode === 'all') return true
  return coachingLikelyTitle(title)
}

export async function syncConnectionForCoach(
  connection: CalendarConnection,
  coachAthleteList: Athlete[],
): Promise<{ ok: true } | { ok: false; code: string }> {
  let db = await readCalendarDb()
  const calendars = db.connectedCalendars.filter((c) => c.connectionId === connection.id && c.enabled)
  if (!calendars.length) {
    await persistDb(
      await readCalendarDb().then((d) => ({
        ...d,
        connections: d.connections.map((c) =>
          c.id === connection.id
            ? {
                ...c,
                lastErrorCode: 'NO_CALENDARS_SELECTED',
                status: 'error',
                updatedAt: new Date().toISOString(),
              }
            : c,
        ),
      })),
    )
    return { ok: false, code: 'NO_CALENDARS_SELECTED' }
  }

  try {
    const credential = decodeCredential(decryptSecret(connection.encryptedCredential))
    const prior = getSyncState(db, connection.id)
    const window = defaultSyncWindow()
    const result = await icloudCalendarProvider.syncEvents(credential, calendars, window, {
      syncTokens: prior.calendarSyncTokens,
      ctags: prior.calendarCtags,
    })

    const roster = coachAthletes(coachAthleteList, connection.coachId)
    const now = new Date().toISOString()
    const mapped: CalendarEvent[] = []

    for (const norm of result.events) {
      if (!passesFilter(norm.title, connection.eventFilter)) continue
      const seriesKey = norm.recurrenceInstanceKey.split('|')[0] ?? norm.providerEventId
      const match = matchEventToAthlete({
        title: norm.title,
        seriesKey,
        connectionId: connection.id,
        coachAthletes: roster,
        aliases: db.aliases.filter((a) => a.coachId === connection.coachId),
        seriesMappings: db.eventMappings.filter((m) => m.coachId === connection.coachId),
        titleMappings: db.titleMappings.filter((m) => m.coachId === connection.coachId),
      })

      const existing = db.events.find(
        (e) =>
          e.connectionId === connection.id &&
          e.providerCalendarId === norm.providerCalendarId &&
          e.providerEventId === norm.providerEventId &&
          e.recurrenceInstanceKey === norm.recurrenceInstanceKey,
      )

      mapped.push({
        id: existing?.id ?? newId('cev'),
        coachId: connection.coachId,
        connectionId: connection.id,
        providerCalendarId: norm.providerCalendarId,
        providerEventId: norm.providerEventId,
        recurrenceInstanceKey: norm.recurrenceInstanceKey,
        title: norm.title,
        description: norm.description,
        startAt: norm.startAt,
        endAt: norm.endAt,
        timeZone: norm.timeZone,
        location: norm.location,
        status: norm.status,
        lastModifiedAt: norm.lastModifiedAt,
        matchedAthleteId: existing?.matchedAthleteId ?? match.athleteId,
        matchStatus: existing?.matchedAthleteId ? 'matched' : match.matchStatus,
        matchConfidence: existing?.matchedAthleteId ? 1 : match.matchConfidence,
        createdAt: existing?.createdAt ?? now,
        updatedAt: now,
      })
    }

    db = upsertEvents(db, mapped)
    db = setSyncState(db, {
      connectionId: connection.id,
      calendarSyncTokens: result.syncTokens ?? prior.calendarSyncTokens,
      calendarCtags: result.ctags ?? prior.calendarCtags,
    })
    db = {
      ...db,
      connections: db.connections.map((c) =>
        c.id === connection.id
          ? {
              ...c,
              status: 'connected',
              lastSuccessfulSyncAt: new Date().toISOString(),
              lastErrorCode: null,
              updatedAt: new Date().toISOString(),
            }
          : c,
      ),
    }
    await persistDb(db)
    return { ok: true }
  } catch (err) {
    const code =
      err instanceof Error && err.message === 'CALENDAR_CREDENTIAL_KEY_MISSING'
        ? 'SERVER_CONFIG'
        : 'SYNC_FAILED'
    db = await readCalendarDb()
    await persistDb({
      ...db,
      connections: db.connections.map((c) =>
        c.id === connection.id
          ? {
              ...c,
              status: 'error',
              lastErrorCode: code,
              updatedAt: new Date().toISOString(),
            }
          : c,
      ),
    })
    return { ok: false, code }
  }
}
