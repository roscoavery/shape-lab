import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { eventsForCoachOnDay, upsertEvents } from './store.ts'
import type { CalendarDb, CalendarEvent } from './types.ts'

function ev(id: string, stamp: string): CalendarEvent {
  return {
    id,
    coachId: 'coach',
    connectionId: 'cn',
    providerCalendarId: 'cal',
    providerEventId: 'uid',
    recurrenceInstanceKey: 'uid',
    title: 'Lesson',
    description: '',
    startAt: '2026-01-01T10:00:00Z',
    endAt: '2026-01-01T11:00:00Z',
    timeZone: 'UTC',
    location: '',
    status: 'confirmed',
    lastModifiedAt: stamp,
    matchedAthleteId: null,
    matchStatus: 'needs_athlete',
    matchConfidence: 0,
    createdAt: stamp,
    updatedAt: stamp,
  }
}

describe('upsertEvents', () => {
  it('prevents duplicate instances and updates by modified time', () => {
    const db: CalendarDb = {
      kind: 'shape-lab-calendar',
      version: 1,
      exportedAt: '',
      connections: [],
      connectedCalendars: [],
      events: [ev('e1', '2026-01-01T00:00:00Z')],
      aliases: [],
      eventMappings: [],
      titleMappings: [],
      lessonLinks: [],
      syncState: [],
    }
    const newer = ev('e2', '2026-01-02T00:00:00Z')
    const merged = upsertEvents(db, [newer])
    assert.equal(merged.events.length, 1)
    assert.equal(merged.events[0]!.id, 'e2')
    assert.equal(merged.events[0]!.lastModifiedAt, '2026-01-02T00:00:00Z')
  })
})

describe('eventsForCoachOnDay', () => {
  it('returns only the requesting coach events', () => {
    const base = ev('e1', '2026-01-01T00:00:00Z')
    const db: CalendarDb = {
      kind: 'shape-lab-calendar',
      version: 1,
      exportedAt: '',
      connections: [],
      connectedCalendars: [],
      events: [
        { ...base, coachId: 'coach_a' },
        { ...base, id: 'e2', coachId: 'coach_b', providerEventId: 'uid2' },
      ],
      aliases: [],
      eventMappings: [],
      titleMappings: [],
      lessonLinks: [],
      syncState: [],
    }
    const rows = eventsForCoachOnDay(db, 'coach_a', 'UTC', new Date('2026-01-01T12:00:00Z'))
    assert.equal(rows.length, 1)
    assert.equal(rows[0]!.coachId, 'coach_a')
  })
})
