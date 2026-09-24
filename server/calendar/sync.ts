import type { Athlete } from '../../src/types.ts'
import { randomBytes } from 'node:crypto'

function newId(prefix: string): string {
  return `${prefix}_${randomBytes(10).toString('hex')}`
}
import { decryptSecret } from './crypto.ts'
import { coachingLikelyTitle, extractContactBits, extractUnmatchedPersonName, matchEventToAthlete, unescapeCalendarText } from './matching.ts'
import { decodeCredential, icloudCalendarProvider } from './providers/icloud.ts'
import { appendCalendarAthlete } from '../rosterStore.ts'
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
    const seenKeys = new Set<string>()
    const enabledIds = new Set(calendars.map((c) => c.providerCalendarId))

    for (const norm of result.events) {
      seenKeys.add(
        `${connection.id}|${norm.providerCalendarId}|${norm.providerEventId}|${norm.recurrenceInstanceKey}`,
      )
      if (!passesFilter(norm.title, connection.eventFilter)) continue
      const seriesKey = norm.recurrenceInstanceKey.split('|')[0] ?? norm.providerEventId
      const existing = db.events.find(
        (e) =>
          e.connectionId === connection.id &&
          e.providerCalendarId === norm.providerCalendarId &&
          e.providerEventId === norm.providerEventId &&
          e.recurrenceInstanceKey === norm.recurrenceInstanceKey,
      )

      const match = matchEventToAthlete({
        title: norm.title,
        description: norm.description,
        seriesKey,
        connectionId: connection.id,
        coachAthletes: roster,
        aliases: db.aliases.filter((a) => a.coachId === connection.coachId),
        seriesMappings: db.eventMappings.filter((m) => m.coachId === connection.coachId),
        titleMappings: db.titleMappings.filter((m) => m.coachId === connection.coachId),
      })

      let athleteId = existing?.matchedAthleteId ?? match.athleteId
      let matchStatus = existing?.matchedAthleteId ? 'matched' : match.matchStatus
      let matchConfidence = existing?.matchedAthleteId ? 1 : match.matchConfidence

      if (!athleteId && matchStatus === 'needs_athlete') {
        const person = extractUnmatchedPersonName(norm.title, norm.description, coachAthleteList)
        if (person) {
          const id = `ath_cal_${randomBytes(8).toString('hex')}`
          const contact = extractContactBits(`${norm.title}\n${norm.description}`)
          const note = unescapeCalendarText(norm.description)
          const saved = await appendCalendarAthlete({
            id,
            name: person.fullName,
            firstName: person.firstName,
            lastName: person.lastName,
            createdByCoachId: connection.coachId,
            ...(contact.email ? { email: contact.email } : {}),
            ...(contact.phone ? { phone: contact.phone } : {}),
            ...(note ? { notes: note.slice(0, 800) } : {}),
          })
          const stub = {
            id: saved.id,
            name: person.fullName,
            firstName: person.firstName,
            lastName: person.lastName,
            createdAt: now,
            role: 'athlete' as const,
            createdFromCalendar: true,
            needsOnboarding: true,
          }
          if (!roster.some((a) => a.id === saved.id)) roster.push(stub as Athlete)
          athleteId = saved.id
          matchStatus = 'matched'
          matchConfidence = 0.85
        }
      }

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
        matchedAthleteId: athleteId,
        matchStatus,
        matchConfidence,
        createdAt: existing?.createdAt ?? now,
        updatedAt: now,
      })
    }

    db = upsertEvents(db, mapped)
    const winStart = window.start.getTime()
    const winEnd = window.end.getTime()
    db = {
      ...db,
      events: db.events.filter((e) => {
        if (e.connectionId !== connection.id) return true
        if (!enabledIds.has(e.providerCalendarId)) return true
        const start = Date.parse(e.startAt)
        if (!Number.isFinite(start) || start < winStart || start > winEnd) return true
        const key = `${e.connectionId}|${e.providerCalendarId}|${e.providerEventId}|${e.recurrenceInstanceKey}`
        return seenKeys.has(key)
      }),
    }
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
