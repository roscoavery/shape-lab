import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import type { Athlete } from '../../src/types.ts'
import {
  matchEventToAthlete,
  normalizeAlias,
  coachingLikelyTitle,
  extractUnmatchedPersonName,
} from './matching.ts'
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

  it('does not treat a different last name on the title as that athlete', () => {
    const r = matchEventToAthlete({ ...base, title: 'Hannah Williams', seriesKey: 'x' })
    assert.equal(r.athleteId, null)
  })

  it('matches Hannah private when that first name is unique', () => {
    const r = matchEventToAthlete({ ...base, title: 'Hannah private', seriesKey: 'x' })
    assert.equal(r.athleteId, 'a1')
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

  it('matches athlete full name inside notes when the title is a parent', () => {
    const r = matchEventToAthlete({
      ...base,
      title: 'Sarah Jones',
      description: 'Lesson for Hannah Smith\\nBring grips',
      seriesKey: 'x',
    })
    assert.equal(r.athleteId, 'a1')
    assert.equal(r.matchStatus, 'matched')
  })

  it('does not pair a first name in notes when two athletes share that first name stem', () => {
    const r = matchEventToAthlete({
      ...base,
      title: 'Parent',
      description: 'See Ann after school',
      seriesKey: 'x',
    })
    assert.equal(r.athleteId, null)
  })

  it('prefers the athlete named in notes when the title is a different roster name', () => {
    const r = matchEventToAthlete({
      ...base,
      title: 'Ann Lee',
      description: 'Private for Hannah Smith',
      seriesKey: 'x',
    })
    assert.equal(r.athleteId, 'a1')
  })

  it('uses a saved series mapping', () => {
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

describe('extractUnmatchedPersonName', () => {
  it('creates from notes, not from a parent name on the title', () => {
    const person = extractUnmatchedPersonName(
      'Sarah Jones',
      'Lesson for Maya Chen\\n555-0100',
      athletes,
    )
    assert.equal(person?.fullName, 'Maya Chen')
  })

  it('does not invent a profile from the title alone', () => {
    const person = extractUnmatchedPersonName('Maya Chen', '', athletes)
    assert.equal(person, null)
  })

  it('skips when two unmatched people are in the notes', () => {
    const person = extractUnmatchedPersonName(
      'Private',
      'Maya Chen with Riley Nguyen',
      athletes,
    )
    assert.equal(person, null)
  })
})

describe('coachingLikelyTitle', () => {
  it('detects lesson-like titles', () => {
    assert.equal(coachingLikelyTitle('Private lesson - Hannah'), true)
    assert.equal(coachingLikelyTitle('Dentist'), false)
  })
})
