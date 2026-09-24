import type { IncomingMessage, ServerResponse } from 'node:http'
import { sendJson } from '../instagramResolve.ts'
import { readRequestBody } from '../libraryStore.ts'
import { readRosterFile } from '../rosterStore.ts'
import type { Athlete } from '../../src/types.ts'
import { randomBytes } from 'node:crypto'

function newId(prefix: string): string {
  return `${prefix}_${randomBytes(10).toString('hex')}`
}
import { userFromRequest } from '../auth/sessions.ts'
import {
  authorizeCalendarRequest,
  issueCalendarToken,
  verifyCoachPasscode,
} from './coachAuth.ts'
import { decryptSecret, encryptSecret, hasCredentialKey, redactSecrets } from './crypto.ts'
import { normalizeAlias } from './matching.ts'
import { decodeCredential, icloudCalendarProvider } from './providers/icloud.ts'
import { syncConnectionForCoach } from './sync.ts'
import {
  addAlias,
  addLessonLink,
  calendarsForConnection,
  connectionForCoach,
  eventsForCoachInRange,
  eventsForCoachOnDay,
  persistDb,
  readCalendarDb,
  removeConnectionData,
  saveCalendars,
  saveConnection,
  upsertEvents,
  upsertManualMatch,
} from './store.ts'
import type {
  CalendarConnection,
  ConnectedCalendar,
  CalendarEventFilterMode,
} from './types.ts'

function safeErrorMessage(err: unknown): string {
  const raw = err instanceof Error ? err.message : 'REQUEST_FAILED'
  return redactSecrets(raw).slice(0, 200)
}

function publicConnection(c: CalendarConnection) {
  return {
    id: c.id,
    provider: c.provider,
    status: c.status,
    appleIdEmail: c.appleIdEmail,
    eventFilter: c.eventFilter,
    lastSuccessfulSyncAt: c.lastSuccessfulSyncAt,
    lastErrorCode: c.lastErrorCode,
    createdAt: c.createdAt,
    updatedAt: c.updatedAt,
  }
}

export async function handleCalendarApi(
  req: IncomingMessage,
  res: ServerResponse,
  subpath: string,
): Promise<boolean> {
  const path = subpath.replace(/^\/+/, '')
  const segments = path.split('/').filter(Boolean)

  if (
    segments[0] === 'cron-sync' &&
    (req.method === 'POST' || req.method === 'GET') &&
    segments.length === 1
  ) {
    const secret =
      process.env.CALENDAR_CRON_SECRET?.trim() || process.env.CRON_SECRET?.trim() || ''
    const headerSecret =
      (typeof req.headers['x-calendar-cron-secret'] === 'string' &&
        req.headers['x-calendar-cron-secret']) ||
      ''
    const bearer =
      typeof req.headers.authorization === 'string' &&
      req.headers.authorization.startsWith('Bearer ')
        ? req.headers.authorization.slice(7).trim()
        : ''
    if (!secret || (headerSecret !== secret && bearer !== secret)) {
      sendJson(res, 401, { error: 'UNAUTHORIZED' })
      return true
    }
    const db = await readCalendarDb()
    const roster = (await readRosterFile()).athletes as Athlete[]
    const results: { connectionId: string; coachId: string; ok: boolean; code?: string }[] = []
    for (const conn of db.connections.filter((c) => c.status !== 'disconnected')) {
      const r = await syncConnectionForCoach(conn, roster)
      results.push({
        connectionId: conn.id,
        coachId: conn.coachId,
        ok: r.ok,
        code: r.ok ? undefined : r.code,
      })
    }
    sendJson(res, 200, { synced: results.length, results })
    return true
  }

  if (segments[0] === 'mine' && req.method === 'GET' && segments.length === 1) {
    const user = await userFromRequest(req)
    if (!user || user.kiosk) {
      sendJson(res, 401, { error: 'UNAUTHORIZED' })
      return true
    }
    const roster = ((await readRosterFile()).athletes ?? []) as Athlete[]
    const allowed = new Set<string>()
    if (user.rosterProfileId) allowed.add(user.rosterProfileId)
    for (const id of user.linkedAthleteIds ?? []) allowed.add(id)
    const me = roster.find((a) => a.id === user.rosterProfileId)
    if (me) {
      for (const id of me.linkedAthleteIds ?? []) allowed.add(id)
    }
    const url = new URL(req.url ?? '/', 'http://local')
    const asked = url.searchParams.get('athleteId')
    if (asked && (user.role === 'admin' || user.role === 'gymOwner' || allowed.has(asked))) {
      allowed.add(asked)
    }
    const from = Date.parse(url.searchParams.get('from') || new Date().toISOString())
    const to = Date.parse(
      url.searchParams.get('to') || new Date(Date.now() + 21 * 86400000).toISOString(),
    )
    const db = await readCalendarDb()
    const events = db.events
      .filter((e) => {
        if (e.status === 'cancelled') return false
        if (!e.matchedAthleteId || !allowed.has(e.matchedAthleteId)) return false
        const start = Date.parse(e.startAt)
        return Number.isFinite(start) && start >= from && start <= to
      })
      .sort((a, b) => a.startAt.localeCompare(b.startAt))
    sendJson(res, 200, {
      events: events.map((e) => {
        const coach = roster.find((a) => a.id === e.coachId)
        return {
          id: e.id,
          title: e.title,
          startAt: e.startAt,
          endAt: e.endAt,
          location: e.location,
          matchedAthleteId: e.matchedAthleteId,
          coachId: e.coachId,
          coachName: coach?.name || 'Coach',
        }
      }),
    })
    return true
  }

  if (segments[0] === 'auth' && req.method === 'POST' && segments.length === 1) {
    if (!hasCredentialKey()) {
      sendJson(res, 503, { error: 'CALENDAR_NOT_CONFIGURED' })
      return true
    }
    try {
      const body = JSON.parse(await readRequestBody(req)) as {
        coachId?: string
        passcode?: string
      }
      if (!body.coachId || !body.passcode) {
        sendJson(res, 400, { error: 'MISSING_FIELDS' })
        return true
      }
      const verified = await verifyCoachPasscode(body.coachId, body.passcode)
      if (!verified.ok) {
        sendJson(res, 403, { error: verified.code })
        return true
      }
      sendJson(res, 200, {
        token: issueCalendarToken(body.coachId),
        expiresInHours: 12,
      })
    } catch {
      sendJson(res, 400, { error: 'BAD_REQUEST' })
    }
    return true
  }

  if (segments[0] === 'auth-session' && req.method === 'POST' && segments.length === 1) {
    const sessionAuth = await authorizeCalendarRequest(req)
    if ('error' in sessionAuth) {
      sendJson(res, sessionAuth.status, { error: sessionAuth.error })
      return true
    }
    sendJson(res, 200, {
      token: issueCalendarToken(sessionAuth.coachId),
      coachId: sessionAuth.coachId,
      expiresInHours: 12,
    })
    return true
  }

  const auth = await authorizeCalendarRequest(req)
  if ('error' in auth) {
    sendJson(res, auth.status, { error: auth.error })
    return true
  }
  const coachId = auth.coachId

  if (segments[0] === 'status' && req.method === 'GET' && segments.length === 1) {
    const db = await readCalendarDb()
    const conn = connectionForCoach(db, coachId)
    if (!conn) {
      sendJson(res, 200, { connected: false })
      return true
    }
    sendJson(res, 200, {
      connected: true,
      connection: publicConnection(conn),
      calendars: calendarsForConnection(db, conn.id),
    })
    return true
  }

  if (segments[0] === 'connect' && req.method === 'POST' && segments.length === 1) {
    if (!hasCredentialKey()) {
      sendJson(res, 503, { error: 'CALENDAR_NOT_CONFIGURED' })
      return true
    }
    try {
      const body = JSON.parse(await readRequestBody(req)) as {
        appleIdEmail?: string
        appSpecificPassword?: string
        provider?: 'icloud'
      }
      const email = body.appleIdEmail?.trim()
      const password = body.appSpecificPassword?.trim()
      if (!email || !password) {
        sendJson(res, 400, { error: 'MISSING_CREDENTIALS' })
        return true
      }
      const credential = { appleIdEmail: email, appSpecificPassword: password }
      await icloudCalendarProvider.validateConnection(credential)
      const discovered = await icloudCalendarProvider.listCalendars(credential)

      const db = await readCalendarDb()
      const existing = connectionForCoach(db, coachId)
      const now = new Date().toISOString()
      const conn: CalendarConnection = {
        id: existing?.id ?? newId('ccn'),
        coachId,
        provider: 'icloud',
        encryptedCredential: encryptSecret(JSON.stringify(credential)),
        appleIdEmail: email,
        status: 'connected',
        eventFilter: existing?.eventFilter ?? 'all',
        lastSuccessfulSyncAt: existing?.lastSuccessfulSyncAt ?? null,
        lastErrorCode: null,
        createdAt: existing?.createdAt ?? now,
        updatedAt: now,
      }
      await saveConnection(conn)

      const selectedIds = new Set(
        calendarsForConnection(db, conn.id)
          .filter((c) => c.enabled)
          .map((c) => c.providerCalendarId),
      )
      const rows: ConnectedCalendar[] = discovered.map((d) => ({
        id: newId('cca'),
        connectionId: conn.id,
        providerCalendarId: d.providerCalendarId,
        displayName: d.displayName,
        enabled: selectedIds.size ? selectedIds.has(d.providerCalendarId) : true,
        color: d.color ?? null,
      }))
      await saveCalendars(conn.id, rows)

      sendJson(res, 200, {
        connection: publicConnection(conn),
        calendars: rows,
      })
    } catch (err) {
      sendJson(res, 400, { error: 'CONNECT_FAILED', message: safeErrorMessage(err) })
    }
    return true
  }

  if (segments[0] === 'calendars' && req.method === 'PUT' && segments.length === 1) {
    try {
      const body = JSON.parse(await readRequestBody(req)) as {
        calendars?: { providerCalendarId: string; enabled: boolean }[]
        eventFilter?: CalendarEventFilterMode
      }
      const db = await readCalendarDb()
      const conn = connectionForCoach(db, coachId)
      if (!conn || conn.coachId !== coachId) {
        sendJson(res, 404, { error: 'NO_CONNECTION' })
        return true
      }
      const current = calendarsForConnection(db, conn.id)
      const patch = new Map(
        (body.calendars ?? []).map((c) => [c.providerCalendarId, c.enabled]),
      )
      const next = current.map((c) => ({
        ...c,
        enabled: patch.has(c.providerCalendarId) ? Boolean(patch.get(c.providerCalendarId)) : c.enabled,
      }))
      await saveCalendars(conn.id, next)
      if (body.eventFilter === 'all' || body.eventFilter === 'coaching_likely') {
        const fresh = await readCalendarDb()
        const updated = fresh.connections.map((c) =>
          c.id === conn.id ? { ...c, eventFilter: body.eventFilter!, updatedAt: new Date().toISOString() } : c,
        )
        await persistDb({ ...fresh, connections: updated })
      }
      sendJson(res, 200, { ok: true })
    } catch {
      sendJson(res, 400, { error: 'BAD_REQUEST' })
    }
    return true
  }

  if (segments[0] === 'sync' && req.method === 'POST' && segments.length === 1) {
    const db = await readCalendarDb()
    const conn = connectionForCoach(db, coachId)
    if (!conn) {
      sendJson(res, 404, { error: 'NO_CONNECTION' })
      return true
    }
    const roster = (await readRosterFile()).athletes as Athlete[]
    const result = await syncConnectionForCoach(conn, roster)
    if (!result.ok) {
      sendJson(res, 502, { error: result.code })
      return true
    }
    sendJson(res, 200, { ok: true })
    return true
  }

  if (segments[0] === 'disconnect' && req.method === 'POST' && segments.length === 1) {
    const db = await readCalendarDb()
    const conn = connectionForCoach(db, coachId)
    if (!conn) {
      sendJson(res, 200, { ok: true })
      return true
    }
    const next = removeConnectionData(db, conn.id, coachId)
    await persistDb(next)
    sendJson(res, 200, { ok: true })
    return true
  }

  if (segments[0] === 'today' && req.method === 'GET' && segments.length === 1) {
    const url = new URL(req.url ?? '/', 'http://local')
    const tz = url.searchParams.get('tz') || 'UTC'
    const db = await readCalendarDb()
    const events = eventsForCoachOnDay(db, coachId, tz).sort((a, b) =>
      a.startAt.localeCompare(b.startAt),
    )
    const links = db.lessonLinks.filter((l) => l.coachId === coachId)
    sendJson(res, 200, {
      events: events.map((e) => ({
        ...e,
        notes: e.description || '',
        lessonLinks: links.filter((l) => l.calendarEventId === e.id),
      })),
    })
    return true
  }

  if (segments[0] === 'events' && req.method === 'GET' && segments.length === 1) {
    const url = new URL(req.url ?? '/', 'http://local')
    const from = url.searchParams.get('from') || new Date(Date.now() - 30 * 86400000).toISOString()
    const to = url.searchParams.get('to') || new Date(Date.now() + 90 * 86400000).toISOString()
    const db = await readCalendarDb()
    const events = eventsForCoachInRange(db, coachId, from, to).sort((a, b) =>
      a.startAt.localeCompare(b.startAt),
    )
    const links = db.lessonLinks.filter((l) => l.coachId === coachId)
    sendJson(res, 200, {
      events: events.map((e) => ({
        ...e,
        notes: e.description || '',
        lessonLinks: links.filter((l) => l.calendarEventId === e.id),
      })),
    })
    return true
  }

  if (segments[0] === 'events' && req.method === 'POST' && segments.length === 1) {
    try {
      const body = JSON.parse(await readRequestBody(req)) as {
        title?: string
        startAt?: string
        endAt?: string
        location?: string
        providerCalendarId?: string
      }
      const title = body.title?.trim()
      if (!title || !body.startAt || !body.endAt) {
        sendJson(res, 400, { error: 'MISSING_FIELDS' })
        return true
      }
      const db = await readCalendarDb()
      const conn = connectionForCoach(db, coachId)
      if (!conn) {
        sendJson(res, 404, { error: 'NO_CONNECTION' })
        return true
      }
      const calendars = calendarsForConnection(db, conn.id).filter((c) => c.enabled)
      const calendar =
        calendars.find((c) => c.providerCalendarId === body.providerCalendarId) ?? calendars[0]
      if (!calendar) {
        sendJson(res, 400, { error: 'NO_CALENDARS_SELECTED' })
        return true
      }
      const credential = decodeCredential(decryptSecret(conn.encryptedCredential))
      const created = await icloudCalendarProvider.createEvent?.(credential, calendar, {
        title,
        startAt: body.startAt,
        endAt: body.endAt,
        location: body.location,
      })
      if (!created) {
        sendJson(res, 501, { error: 'CREATE_NOT_SUPPORTED' })
        return true
      }
      const now = new Date().toISOString()
      const row = {
        id: newId('cev'),
        coachId,
        connectionId: conn.id,
        providerCalendarId: created.providerCalendarId,
        providerEventId: created.providerEventId,
        recurrenceInstanceKey: created.recurrenceInstanceKey,
        title: created.title,
        description: created.description,
        startAt: created.startAt,
        endAt: created.endAt,
        timeZone: created.timeZone,
        location: created.location,
        status: created.status,
        lastModifiedAt: created.lastModifiedAt,
        matchedAthleteId: null,
        matchStatus: 'needs_athlete' as const,
        matchConfidence: 0,
        createdAt: now,
        updatedAt: now,
      }
      await persistDb(upsertEvents(await readCalendarDb(), [row]))
      sendJson(res, 200, { event: { ...row, description: undefined, lessonLinks: [] } })
    } catch (err) {
      sendJson(res, 502, { error: 'CREATE_FAILED', message: safeErrorMessage(err) })
    }
    return true
  }

  if (segments[0] === 'events' && segments.length >= 2) {
    const eventId = segments[1]
    if (req.method === 'DELETE' && segments.length === 2) {
      try {
        const db = await readCalendarDb()
        const ev = db.events.find((e) => e.id === eventId && e.coachId === coachId)
        if (!ev) {
          sendJson(res, 404, { error: 'NOT_FOUND' })
          return true
        }
        const conn = connectionForCoach(db, coachId)
        if (!conn) {
          sendJson(res, 404, { error: 'NO_CONNECTION' })
          return true
        }
        const calendar = calendarsForConnection(db, conn.id).find(
          (c) => c.providerCalendarId === ev.providerCalendarId,
        )
        if (!calendar) {
          sendJson(res, 400, { error: 'CALENDAR_NOT_FOUND' })
          return true
        }
        const credential = decodeCredential(decryptSecret(conn.encryptedCredential))
        const removed = await icloudCalendarProvider.deleteEvent?.(credential, calendar, ev.providerEventId, {
          start: new Date(Date.parse(ev.startAt) - 7 * 86400000),
          end: new Date(Date.parse(ev.endAt || ev.startAt) + 7 * 86400000),
        })
        if (!removed) {
          sendJson(res, 404, { error: 'REMOTE_NOT_FOUND' })
          return true
        }
        await persistDb({
          ...db,
          events: db.events.filter((e) => e.id !== eventId),
          lessonLinks: db.lessonLinks.filter((l) => l.calendarEventId !== eventId),
        })
        sendJson(res, 200, { ok: true })
      } catch (err) {
        sendJson(res, 502, { error: 'DELETE_FAILED', message: safeErrorMessage(err) })
      }
      return true
    }
    if (req.method === 'POST' && segments[2] === 'match') {
      try {
        const body = JSON.parse(await readRequestBody(req)) as {
          athleteId?: string
          saveSeries?: boolean
          saveTitle?: boolean
        }
        if (!body.athleteId) {
          sendJson(res, 400, { error: 'MISSING_ATHLETE' })
          return true
        }
        const db = await readCalendarDb()
        const ev = db.events.find((e) => e.id === eventId && e.coachId === coachId)
        if (!ev) {
          sendJson(res, 404, { error: 'NOT_FOUND' })
          return true
        }
        const seriesKey = ev.recurrenceInstanceKey.split('|')[0] ?? ev.providerEventId
        await upsertManualMatch({
          coachId,
          eventId,
          athleteId: body.athleteId,
          saveSeries: Boolean(body.saveSeries),
          saveTitle: Boolean(body.saveTitle),
          seriesKey,
          connectionId: ev.connectionId,
          title: ev.title,
        })
        sendJson(res, 200, { ok: true })
      } catch {
        sendJson(res, 400, { error: 'BAD_REQUEST' })
      }
      return true
    }
  }

  if (segments[0] === 'aliases' && req.method === 'POST') {
    try {
      const body = JSON.parse(await readRequestBody(req)) as { athleteId?: string; alias?: string }
      if (!body.athleteId || !body.alias?.trim()) {
        sendJson(res, 400, { error: 'MISSING_FIELDS' })
        return true
      }
      const row = await addAlias(coachId, body.athleteId, body.alias)
      sendJson(res, 200, { alias: { ...row, normalizedAlias: normalizeAlias(body.alias) } })
    } catch {
      sendJson(res, 400, { error: 'BAD_REQUEST' })
    }
    return true
  }

  if (segments[0] === 'lesson-link' && req.method === 'POST') {
    try {
      const body = JSON.parse(await readRequestBody(req)) as {
        lessonId?: string
        calendarEventId?: string
        athleteId?: string
      }
      if (!body.lessonId || !body.calendarEventId || !body.athleteId) {
        sendJson(res, 400, { error: 'MISSING_FIELDS' })
        return true
      }
      const db = await readCalendarDb()
      const ev = db.events.find((e) => e.id === body.calendarEventId && e.coachId === coachId)
      if (!ev) {
        sendJson(res, 404, { error: 'EVENT_NOT_FOUND' })
        return true
      }
      const link = await addLessonLink({
        lessonId: body.lessonId,
        calendarEventId: body.calendarEventId,
        athleteId: body.athleteId,
        coachId,
      })
      sendJson(res, 200, { link })
    } catch {
      sendJson(res, 400, { error: 'BAD_REQUEST' })
    }
    return true
  }

  sendJson(res, 404, { error: 'NOT_FOUND' })
  return true
}
