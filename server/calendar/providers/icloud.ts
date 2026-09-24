import { createDAVClient } from 'tsdav'
import type { DAVCalendar, DAVObject } from 'tsdav'
import type { CalendarProvider } from './types.ts'
import type { ICloudCredentialPayload, NormalizedCalendarEvent } from '../types.ts'

const ICLOUD_CALDAV = 'https://caldav.icloud.com/'

function parseIcsDate(value: string, tz?: string): { iso: string; timeZone: string } {
  const trimmed = value.trim()
  if (/^\d{8}T\d{6}Z$/i.test(trimmed)) {
    const iso = `${trimmed.slice(0, 4)}-${trimmed.slice(4, 6)}-${trimmed.slice(6, 8)}T${trimmed.slice(9, 11)}:${trimmed.slice(11, 13)}:${trimmed.slice(13, 15)}Z`
    return { iso, timeZone: 'UTC' }
  }
  if (/^\d{8}$/.test(trimmed)) {
    const iso = `${trimmed.slice(0, 4)}-${trimmed.slice(4, 6)}-${trimmed.slice(6, 8)}T00:00:00`
    return { iso: `${iso}Z`, timeZone: tz || 'UTC' }
  }
  if (/^\d{8}T\d{6}$/i.test(trimmed)) {
    const iso = `${trimmed.slice(0, 4)}-${trimmed.slice(4, 6)}-${trimmed.slice(6, 8)}T${trimmed.slice(9, 11)}:${trimmed.slice(11, 13)}:${trimmed.slice(13, 15)}`
    return { iso, timeZone: tz || 'floating' }
  }
  const d = new Date(trimmed)
  if (Number.isFinite(d.getTime())) {
    return { iso: d.toISOString(), timeZone: tz || 'UTC' }
  }
  return { iso: new Date().toISOString(), timeZone: tz || 'UTC' }
}

function unfoldIcs(text: string): string {
  return text.replace(/\r\n[ \t]/g, '').replace(/\n[ \t]/g, '')
}

function parseVeventBlocks(ics: string): string[] {
  const flat = unfoldIcs(ics)
  const blocks: string[] = []
  const re = /BEGIN:VEVENT([\s\S]*?)END:VEVENT/gi
  let m: RegExpExecArray | null
  while ((m = re.exec(flat))) {
    blocks.push(m[1]!)
  }
  return blocks
}

function field(block: string, name: string): string | null {
  const re = new RegExp(`^${name}[^:]*:(.*)$`, 'im')
  const m = block.match(re)
  return m?.[1]?.trim() ?? null
}

function recurrenceInstanceKey(block: string, uid: string): string {
  const rid = field(block, 'RECURRENCE-ID')
  if (rid) return `${uid}|${rid}`
  return uid
}

function mapStatus(status: string | null): NormalizedCalendarEvent['status'] {
  const s = (status ?? '').toUpperCase()
  if (s === 'CANCELLED') return 'cancelled'
  if (s === 'TENTATIVE') return 'tentative'
  return 'confirmed'
}

export function parseVeventToNormalized(
  block: string,
  providerCalendarId: string,
): NormalizedCalendarEvent | null {
  const uid = field(block, 'UID')
  if (!uid) return null
  const summary = field(block, 'SUMMARY') ?? ''
  const description = field(block, 'DESCRIPTION') ?? ''
  const location = field(block, 'LOCATION') ?? ''
  const dtStart = field(block, 'DTSTART')
  const dtEnd = field(block, 'DTEND') ?? dtStart
  if (!dtStart) return null
  const tzStartLine = /^DTSTART;TZID=([^:]+):/im.exec(block)
  const tz = tzStartLine?.[1] ?? undefined
  const start = parseIcsDate(dtStart, tz)
  const end = parseIcsDate(dtEnd ?? dtStart, tz)
  const lastMod = field(block, 'LAST-MODIFIED')
  const stamp = lastMod ? parseIcsDate(lastMod).iso : new Date().toISOString()
  const instanceKey = recurrenceInstanceKey(block, uid)
  return {
    providerEventId: uid,
    recurrenceInstanceKey: instanceKey,
    providerCalendarId,
    title: summary,
    description,
    startAt: start.iso,
    endAt: end.iso,
    timeZone: start.timeZone,
    location,
    status: mapStatus(field(block, 'STATUS')),
    lastModifiedAt: stamp,
  }
}

async function davClient(credential: ICloudCredentialPayload) {
  return createDAVClient({
    serverUrl: ICLOUD_CALDAV,
    credentials: {
      username: credential.appleIdEmail.trim(),
      password: credential.appSpecificPassword.trim(),
    },
    authMethod: 'Basic',
    defaultAccountType: 'caldav',
  })
}

export const icloudCalendarProvider: CalendarProvider = {
  id: 'icloud',

  async validateConnection(credential) {
    const client = await davClient(credential)
    await client.fetchCalendars()
  },

  async listCalendars(credential) {
    const client = await davClient(credential)
    const cals = await client.fetchCalendars()
    return (cals as DAVCalendar[])
      .filter((c) => c.url)
      .map((c) => ({
        providerCalendarId: c.url!,
        displayName: (c.displayName as string) || 'Calendar',
        color: typeof c.calendarColor === 'string' ? c.calendarColor : null,
      }))
  },

  async syncEvents(credential, calendars, window, prior) {
    const client = await davClient(credential)
    const enabled = calendars.filter((c) => c.enabled)
    const events: NormalizedCalendarEvent[] = []
    const syncTokens: Record<string, string> = { ...(prior?.syncTokens ?? {}) }
    const ctags: Record<string, string> = { ...(prior?.ctags ?? {}) }

    const timeRange = {
      start: window.start.toISOString(),
      end: window.end.toISOString(),
    }

    for (const cal of enabled) {
      const objects = (await client.fetchCalendarObjects({
        calendar: { url: cal.providerCalendarId },
        timeRange,
        expand: true,
      })) as DAVObject[]

      for (const obj of objects) {
        const data = typeof obj.data === 'string' ? obj.data : ''
        if (!data.includes('BEGIN:VEVENT')) continue
        for (const block of parseVeventBlocks(data)) {
          const norm = parseVeventToNormalized(block, cal.providerCalendarId)
          if (norm) events.push(norm)
        }
      }

    }

    return { events, syncTokens, ctags }
  },

  normalizeEvent(raw) {
    if (!raw || typeof raw !== 'object') return null
    const row = raw as { block?: string; providerCalendarId?: string }
    if (!row.block || !row.providerCalendarId) return null
    return parseVeventToNormalized(row.block, row.providerCalendarId)
  },

  async createEvent(credential, calendar, input) {
    const client = await davClient(credential)
    const uid = `${crypto.randomUUID()}@shapelab`
    const ics = buildEventIcs({
      uid,
      title: input.title,
      startAt: input.startAt,
      endAt: input.endAt,
      location: input.location,
    })
    await client.createCalendarObject({
      calendar: { url: calendar.providerCalendarId },
      filename: `${uid}.ics`,
      iCalString: ics,
    })
    return {
      providerEventId: uid,
      recurrenceInstanceKey: uid,
      providerCalendarId: calendar.providerCalendarId,
      title: input.title,
      description: '',
      startAt: new Date(input.startAt).toISOString(),
      endAt: new Date(input.endAt).toISOString(),
      timeZone: 'UTC',
      location: input.location ?? '',
      status: 'confirmed' as const,
      lastModifiedAt: new Date().toISOString(),
    }
  },
}

function toIcsUtc(iso: string): string {
  const d = new Date(iso)
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getUTCFullYear()}${p(d.getUTCMonth() + 1)}${p(d.getUTCDate())}T${p(d.getUTCHours())}${p(d.getUTCMinutes())}${p(d.getUTCSeconds())}Z`
}

function buildEventIcs(opts: {
  uid: string
  title: string
  startAt: string
  endAt: string
  location?: string
}): string {
  const summary = opts.title.replace(/[\\;,\n]/g, ' ').trim() || 'Untitled'
  const loc = (opts.location ?? '').replace(/[\\;,\n]/g, ' ').trim()
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Shape Lab//EN',
    'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT',
    `UID:${opts.uid}`,
    `DTSTAMP:${toIcsUtc(new Date().toISOString())}`,
    `DTSTART:${toIcsUtc(opts.startAt)}`,
    `DTEND:${toIcsUtc(opts.endAt)}`,
    `SUMMARY:${summary}`,
    loc ? `LOCATION:${loc}` : '',
    'END:VEVENT',
    'END:VCALENDAR',
  ]
    .filter(Boolean)
    .join('\r\n')
}

export function decodeCredential(json: string): ICloudCredentialPayload {
  const parsed = JSON.parse(json) as ICloudCredentialPayload
  if (!parsed?.appleIdEmail?.trim() || !parsed?.appSpecificPassword?.trim()) {
    throw new Error('INVALID_CREDENTIAL')
  }
  return {
    appleIdEmail: parsed.appleIdEmail.trim(),
    appSpecificPassword: parsed.appSpecificPassword.trim(),
  }
}
