import { withCsrfHeaders } from './authSession'

const TOKEN_KEY = 'shape-lab.calendarApiToken.v1'

export type CalendarConnectionView = {
  id: string
  provider: 'icloud' | 'google'
  status: string
  appleIdEmail?: string
  eventFilter: 'all' | 'coaching_likely'
  lastSuccessfulSyncAt: string | null
  lastErrorCode: string | null
}

export type ConnectedCalendarView = {
  id: string
  connectionId: string
  providerCalendarId: string
  displayName: string
  enabled: boolean
  color?: string | null
}

export type TodayCalendarEvent = {
  id: string
  title: string
  startAt: string
  endAt: string
  timeZone: string
  location: string
  status: string
  matchedAthleteId: string | null
  matchStatus: string
  providerCalendarId: string
  notes?: string
  lessonLinks: { lessonId: string; athleteId: string }[]
}

function storeToken(token: string) {
  try {
    localStorage.setItem(TOKEN_KEY, token)
  } catch {
    /* quota */
  }
  try {
    sessionStorage.setItem(TOKEN_KEY, token)
  } catch {
    /* private */
  }
}

export function clearCalendarToken() {
  try {
    localStorage.removeItem(TOKEN_KEY)
  } catch {
    /* ignore */
  }
  try {
    sessionStorage.removeItem(TOKEN_KEY)
  } catch {
    /* ignore */
  }
}

function readToken(): string | null {
  try {
    return sessionStorage.getItem(TOKEN_KEY) || localStorage.getItem(TOKEN_KEY)
  } catch {
    return null
  }
}

async function calendarFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const token = readToken()
  const headers = withCsrfHeaders(init.headers)
  headers.set('Content-Type', 'application/json')
  if (token) headers.set('Authorization', `Bearer ${token}`)
  return fetch(`/api/calendar${path}`, { ...init, headers, credentials: 'same-origin' })
}

export async function authorizeCalendarFromSession(): Promise<boolean> {
  const res = await calendarFetch('/auth-session', { method: 'POST' })
  if (!res.ok) return false
  const data = (await res.json()) as { token?: string }
  if (!data.token) return false
  storeToken(data.token)
  return true
}

export async function authorizeCalendarApi(coachId: string, passcode: string): Promise<boolean> {
  const res = await fetch('/api/calendar/auth', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ coachId, passcode }),
  })
  if (!res.ok) return false
  const data = (await res.json()) as { token?: string }
  if (!data.token) return false
  storeToken(data.token)
  return true
}

export async function fetchCalendarStatus(): Promise<{
  connected: boolean
  connection?: CalendarConnectionView
  calendars?: ConnectedCalendarView[]
}> {
  const res = await calendarFetch('/status')
  if (!res.ok) return { connected: false }
  return (await res.json()) as {
    connected: boolean
    connection?: CalendarConnectionView
    calendars?: ConnectedCalendarView[]
  }
}

export async function connectICloud(appleIdEmail: string, appSpecificPassword: string) {
  const res = await calendarFetch('/connect', {
    method: 'POST',
    body: JSON.stringify({ appleIdEmail, appSpecificPassword, provider: 'icloud' }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error((data as { message?: string; error?: string }).message ?? data.error ?? 'Connect failed')
  return data as { connection: CalendarConnectionView; calendars: ConnectedCalendarView[] }
}

export async function updateCalendarSelection(
  calendars: { providerCalendarId: string; enabled: boolean }[],
  eventFilter?: 'all' | 'coaching_likely',
) {
  const res = await calendarFetch('/calendars', {
    method: 'PUT',
    body: JSON.stringify({ calendars, eventFilter }),
  })
  if (!res.ok) throw new Error('Save failed')
}

export async function syncCalendarNow() {
  const res = await calendarFetch('/sync', { method: 'POST' })
  if (!res.ok) {
    const data = (await res.json()) as { error?: string }
    throw new Error(data.error ?? 'Sync failed')
  }
}

export async function disconnectCalendar() {
  await calendarFetch('/disconnect', { method: 'POST' })
  clearCalendarToken()
}

export type AthleteCalendarEvent = {
  id: string
  title: string
  startAt: string
  endAt: string
  location: string
  matchedAthleteId: string | null
  coachId: string
  coachName: string
}

export async function fetchCalendarMine(
  from: Date,
  to: Date,
  athleteId?: string,
): Promise<AthleteCalendarEvent[]> {
  const q = new URLSearchParams({
    from: from.toISOString(),
    to: to.toISOString(),
  })
  if (athleteId) q.set('athleteId', athleteId)
  const res = await fetch(`/api/calendar/mine?${q}`, { credentials: 'same-origin' })
  if (!res.ok) return []
  const data = (await res.json()) as { events?: AthleteCalendarEvent[] }
  return data.events ?? []
}

/**
 * iCal (ICS) TEXT fields escape newlines as \n, commas as \,, semicolons as
 * \;, and backslashes as \\. CalDAV servers hand us the raw escaped form,
 * so unescape it once at ingestion. Strings without escape sequences pass
 * through untouched.
 */
export function unescapeIcalText(s: string): string {
  if (!s || !s.includes('\\')) return s
  let out = ''
  for (let i = 0; i < s.length; i++) {
    const c = s[i]
    if (c === '\\' && i + 1 < s.length) {
      const n = s[i + 1]
      if (n === 'n' || n === 'N') {
        out += '\n'
        i += 1
      } else if (n === ',' || n === ';' || n === '\\') {
        out += n
        i += 1
      } else {
        out += c
      }
    } else {
      out += c
    }
  }
  return out
}

function cleanCalendarEvent(ev: TodayCalendarEvent): TodayCalendarEvent {
  return {
    ...ev,
    location: unescapeIcalText(ev.location ?? ''),
    notes: ev.notes ? unescapeIcalText(ev.notes) : ev.notes,
  }
}

export async function fetchTodayEvents(): Promise<{
  events: TodayCalendarEvent[]
  unauthorized: boolean
}> {
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
  const res = await calendarFetch(`/today?tz=${encodeURIComponent(tz)}`)
  if (res.status === 401) return { events: [], unauthorized: true }
  if (!res.ok) return { events: [], unauthorized: false }
  const data = (await res.json()) as { events?: TodayCalendarEvent[] }
  return { events: (data.events ?? []).map(cleanCalendarEvent), unauthorized: false }
}

export async function fetchCalendarRange(from: Date, to: Date): Promise<{
  events: TodayCalendarEvent[]
  unauthorized: boolean
}> {
  const res = await calendarFetch(
    `/events?from=${encodeURIComponent(from.toISOString())}&to=${encodeURIComponent(to.toISOString())}`,
  )
  if (res.status === 401) return { events: [], unauthorized: true }
  if (!res.ok) return { events: [], unauthorized: false }
  const data = (await res.json()) as { events?: TodayCalendarEvent[] }
  return { events: (data.events ?? []).map(cleanCalendarEvent), unauthorized: false }
}

export async function deleteCalendarEvent(eventId: string): Promise<void> {
  const res = await calendarFetch(`/events/${encodeURIComponent(eventId)}`, { method: 'DELETE' })
  if (!res.ok) {
    const data = (await res.json()) as { error?: string; message?: string }
    throw new Error(data.message || data.error || 'Could not delete that event.')
  }
}

export async function createCalendarEvent(input: {
  title: string
  startAt: string
  endAt: string
  location?: string
  providerCalendarId?: string
}): Promise<TodayCalendarEvent> {
  const res = await calendarFetch('/events', {
    method: 'POST',
    body: JSON.stringify(input),
  })
  const data = (await res.json()) as { event?: TodayCalendarEvent; error?: string; message?: string }
  if (!res.ok || !data.event) {
    throw new Error(data.message || data.error || 'Could not create that event.')
  }
  return data.event
}

export function hasCalendarApiToken(): boolean {
  return Boolean(readToken())
}

export async function matchCalendarEvent(
  eventId: string,
  athleteId: string,
  opts?: { saveSeries?: boolean; saveTitle?: boolean },
) {
  const res = await calendarFetch(`/events/${eventId}/match`, {
    method: 'POST',
    body: JSON.stringify({ athleteId, ...opts }),
  })
  if (!res.ok) throw new Error('Match failed')
}

export async function linkLessonCalendarEvent(
  lessonId: string,
  calendarEventId: string,
  athleteId: string,
) {
  await calendarFetch('/lesson-link', {
    method: 'POST',
    body: JSON.stringify({ lessonId, calendarEventId, athleteId }),
  })
}
