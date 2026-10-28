import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { combineAthletes, mergeAthleteLists, type Athlete } from './rosterMerge.ts'

function row(overrides: Partial<Athlete> & { id: string }): Athlete {
  return {
    name: 'Layla Glenv',
    createdAt: '2026-10-27T23:00:25.644Z',
    ...overrides,
  } as Athlete
}

describe('combineAthletes name fields', () => {
  it('keeps the newer row’s finished last name over an older intermediate spelling', () => {
    const older = row({
      id: 'ath_layla',
      name: 'Layla Glenv',
      firstName: 'Layla',
      lastName: 'Glenv',
      updatedAt: '2026-10-28T15:35:17.000Z',
    })
    const newer = row({
      id: 'ath_layla',
      name: 'Layla Glenville',
      firstName: 'Layla',
      lastName: 'Glenville',
      updatedAt: '2026-10-28T15:35:21.000Z',
    })
    const merged = combineAthletes(older, newer)
    assert.equal(merged.name, 'Layla Glenville')
    assert.equal(merged.lastName, 'Glenville')
  })

  it('does not resurrect a cleared last name from the older row', () => {
    const older = row({
      id: 'ath_berkley',
      name: 'Berkley Weaver',
      firstName: 'Berkley',
      lastName: 'Weaver',
      updatedAt: '2026-10-28T15:30:00.000Z',
    })
    const newer = row({
      id: 'ath_berkley',
      name: 'Berkley',
      firstName: 'Berkley',
      lastName: '',
      updatedAt: '2026-10-28T15:35:00.000Z',
    })
    const merged = combineAthletes(older, newer)
    assert.equal(merged.name, 'Berkley')
    assert.equal(merged.lastName, '')
  })

  it('falls back to the older row when the newer row has no last name field at all', () => {
    const older = row({
      id: 'ath_layla',
      name: 'Layla Glenville',
      firstName: 'Layla',
      lastName: 'Glenville',
      updatedAt: '2026-10-28T15:30:00.000Z',
    })
    const newer = row({
      id: 'ath_layla',
      name: 'Layla Glenville',
      firstName: 'Layla',
      updatedAt: '2026-10-28T15:35:00.000Z',
    })
    delete (newer as Partial<Athlete>).lastName
    const merged = combineAthletes(older, newer)
    assert.equal(merged.lastName, 'Glenville')
  })

  it('an older intermediate spelling never beats a newer finished one through mergeAthleteLists', () => {
    const local = [
      row({
        id: 'ath_layla',
        name: 'Layla Glenville',
        firstName: 'Layla',
        lastName: 'Glenville',
        updatedAt: '2026-10-28T15:35:21.000Z',
      }),
    ]
    const remote = [
      row({
        id: 'ath_layla',
        name: 'Layla Glenv',
        firstName: 'Layla',
        lastName: 'Glenv',
        updatedAt: '2026-10-28T15:35:17.000Z',
      }),
    ]
    const merged = mergeAthleteLists(local, remote)
    assert.equal(merged[0]?.name, 'Layla Glenville')
    assert.equal(merged[0]?.lastName, 'Glenville')
  })
})
