export type CalendarProviderId = 'icloud' | 'google'

export type CalendarConnectionStatus = 'connected' | 'error' | 'disconnected'

export type CalendarEventFilterMode = 'all' | 'coaching_likely'

export type CalendarMatchStatus =
  | 'matched'
  | 'needs_athlete'
  | 'ambiguous'
  | 'not_lesson'

export type CalendarConnection = {
  id: string
  coachId: string
  provider: CalendarProviderId
  encryptedCredential: string
  appleIdEmail?: string
  status: CalendarConnectionStatus
  eventFilter: CalendarEventFilterMode
  lastSuccessfulSyncAt: string | null
  lastErrorCode: string | null
  createdAt: string
  updatedAt: string
}

export type ConnectedCalendar = {
  id: string
  connectionId: string
  providerCalendarId: string
  displayName: string
  enabled: boolean
  color?: string | null
}

export type CalendarEvent = {
  id: string
  coachId: string
  connectionId: string
  providerCalendarId: string
  providerEventId: string
  recurrenceInstanceKey: string
  title: string
  description: string
  startAt: string
  endAt: string
  timeZone: string
  location: string
  status: 'confirmed' | 'cancelled' | 'tentative'
  lastModifiedAt: string
  matchedAthleteId: string | null
  matchStatus: CalendarMatchStatus
  matchConfidence: number
  createdAt: string
  updatedAt: string
}

export type AthleteCalendarAlias = {
  id: string
  coachId: string
  athleteId: string
  alias: string
  normalizedAlias: string
  createdAt: string
}

export type CalendarEventMapping = {
  id: string
  coachId: string
  connectionId: string
  /** Stable key for recurring series (iCal recurrence-id or derived). */
  seriesKey: string
  athleteId: string
  createdAt: string
}

export type CalendarTitleMapping = {
  id: string
  coachId: string
  normalizedTitle: string
  athleteId: string
  createdAt: string
}

export type LessonCalendarLink = {
  id: string
  lessonId: string
  calendarEventId: string
  athleteId: string
  coachId: string
  createdAt: string
}

export type CalendarSyncState = {
  connectionId: string
  calendarSyncTokens: Record<string, string>
  calendarCtags: Record<string, string>
}

export type CalendarDb = {
  kind: 'shape-lab-calendar'
  version: 1
  exportedAt: string
  connections: CalendarConnection[]
  connectedCalendars: ConnectedCalendar[]
  events: CalendarEvent[]
  aliases: AthleteCalendarAlias[]
  eventMappings: CalendarEventMapping[]
  titleMappings: CalendarTitleMapping[]
  lessonLinks: LessonCalendarLink[]
  syncState: CalendarSyncState[]
}

export type NormalizedCalendarEvent = {
  providerEventId: string
  recurrenceInstanceKey: string
  providerCalendarId: string
  title: string
  description: string
  startAt: string
  endAt: string
  timeZone: string
  location: string
  status: CalendarEvent['status']
  lastModifiedAt: string
}

export type ICloudCredentialPayload = {
  appleIdEmail: string
  appSpecificPassword: string
}
