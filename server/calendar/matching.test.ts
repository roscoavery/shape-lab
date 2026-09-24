import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import type { Athlete } from '../../src/types.ts'
import { matchEventToAthlete, normalizeAlias, coachingLikelyTitle } from './matching.ts'
import type { AthleteCalendarAlias, CalendarEventMapping, CalendarTitleMapping } from './types.ts'

const athletes: Athlete[] = [
  { id: 'a1', name: 'Hannah Smith', firstName: 'Hannah', lastName: 'Smith', createdAt: '' },
  { id: 'a2', name: 'Ann Lee', firstName: 'Ann', lastName: 'Lee', createdAt: '' },
  { id: 'a3', name: 'Anna Park', firstName: 'Anna', lastName: 'Park', createdAt: '' },
]

describe('normalizeAlias', () => {
  it('normalizes spacing and case', () => {
    assert.equal(normalizeAlias('  Hannah   Smith '), 'hannah smith')
  })
})

describe('matchEventToAthlete', () => {
  const base = {
    connectionId: 'c1',
    coachAthletes: athletes,
    aliases: [] as AthleteCalendarAlias[],
    seriesMappings: [] as CalendarEventMapping[],
    titleMappings: [] as CalendarTitleMapping[],
  }

  it('exact full name match', () => {
    const r = matchEventToAthlete({ ...base, title: 'Hannah Smith', seriesKey: 'x' })
    assert.equal(r.athleteId, 'a1')
    assert.equal(r.matchStatus, 'matched')
  })

  it('does not substring-match Ann inside Hannah', () => {
    const r = matchEventToAthlete({ ...base, title: 'Hannah', seriesKey: 'x' })
    assert.notEqual(r.athleteId, 'a2')
  })

  it('ambiguous first names', () => {
    const r = matchEventToAthlete({ ...base, title: 'Ann', seriesKey: 'x' })
    assert.equal(r.matchStatus, 'matched')
    assert.equal(r.athleteId, 'a2')
    const r2 = matchEventToAthlete({ ...base, title: 'Anna', seriesKey: 'y' })
    assert.equal(r2.athleteId, 'a3')
  })

  it('alias match', () => {
    const aliases: AthleteCalendarAlias[] = [
      {
        id: 'al1',
        coachId: 'coach',
        athleteId: 'a1',
        alias: 'Han',
        normalizedAlias: 'han',
        createdAt: '',
      },
    ]
    const r = matchEventToAthlete({ ...base, title: 'Han', seriesKey: 'x', aliases })
    assert.equal(r.athleteId, 'a1')
  })

  it('series mapping wins', () => {
    const seriesMappings: CalendarEventMapping[] = [
      {
        id: 'm1',
        coachId: 'coach',
        connectionId: 'c1',
        seriesKey: 'uid-1',
        athleteId: 'a2',
        createdAt: '',
      },
    ]
    const r = matchEventToAthlete({
      ...base,
      title: 'Anything',
      seriesKey: 'uid-1',
      seriesMappings,
    })
    assert.equal(r.athleteId, 'a2')
  })
})

describe('coachingLikelyTitle', () => {
  it('detects lesson-like titles', () => {
    assert.equal(coachingLikelyTitle('Private lesson - Hannah'), true)
    assert.equal(coachingLikelyTitle('Dentist'), false)
  })
})
