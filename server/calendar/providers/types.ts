import type {
  CalendarProviderId,
  ConnectedCalendar,
  ICloudCredentialPayload,
  NormalizedCalendarEvent,
} from '../types.ts'

export type ProviderCalendar = {
  providerCalendarId: string
  displayName: string
  color?: string | null
}

export type SyncWindow = {
  start: Date
  end: Date
}

export type SyncResult = {
  events: NormalizedCalendarEvent[]
  syncTokens?: Record<string, string>
  ctags?: Record<string, string>
}

export interface CalendarProvider {
  readonly id: CalendarProviderId

  validateConnection(credential: ICloudCredentialPayload): Promise<void>

  listCalendars(credential: ICloudCredentialPayload): Promise<ProviderCalendar[]>

  syncEvents(
    credential: ICloudCredentialPayload,
    calendars: ConnectedCalendar[],
    window: SyncWindow,
    prior?: { syncTokens: Record<string, string>; ctags: Record<string, string> },
  ): Promise<SyncResult>

  normalizeEvent(raw: unknown): NormalizedCalendarEvent | null
}
