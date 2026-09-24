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
  lessonLinks: { lessonId: string; athleteId: string }[]
}

function storeToken(token: string) {
  sessionStorage.setItem(TOKEN_KEY, token)
}

export function clearCalendarToken() {
  sessionStorage.removeItem(TOKEN_KEY)
}

function readToken(): string | null {
  try {
    return sessionStorage.getItem(TOKEN_KEY)
  } catch {
    return null
  }
}

async function calendarFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const token = readToken()
  const headers = new Headers(init.headers)
  headers.set('Content-Type', 'application/json')
  if (token) headers.set('Authorization', `Bearer ${token}`)
  return fetch(`/api/calendar${path}`, { ...init, headers })
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

export async function fetchTodayEvents(): Promise<{
  events: TodayCalendarEvent[]
  unauthorized: boolean
}> {
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
  const res = await calendarFetch(`/today?tz=${encodeURIComponent(tz)}`)
  if (res.status === 401) return { events: [], unauthorized: true }
  if (!res.ok) return { events: [], unauthorized: false }
  const data = (await res.json()) as { events?: TodayCalendarEvent[] }
  return { events: data.events ?? [], unauthorized: false }
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
