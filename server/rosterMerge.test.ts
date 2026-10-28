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

  it('recomposes the display name when the last name arrives on the older-stamped row', () => {
    // Berkley: the stored row showed first-name-only at the top while the
    // last-name field held "Weaver", because the merge took the name from
    // whichever row had the newer stamp instead of from the name parts.
    const disk = row({
      id: 'ath_berkley',
      name: 'Berkley',
      firstName: 'Berkley',
      updatedAt: '2026-10-28T16:00:00.000Z',
    })
    delete (disk as Partial<Athlete>).lastName
    const edited = row({
      id: 'ath_berkley',
      name: 'Berkley',
      firstName: 'Berkley',
      lastName: 'Weaver ',
      updatedAt: '2026-10-28T15:30:00.000Z',
    })
    const merged = combineAthletes(disk, edited)
    assert.equal(merged.name, 'Berkley Weaver')
    assert.equal(merged.lastName, 'Weaver ')
  })

  it('keeps a name-only row’s display name when no name parts exist', () => {
    const older = row({
      id: 'ath_parent',
      name: 'Kimber Weaver',
      updatedAt: '2026-10-28T15:30:00.000Z',
    })
    const newer = row({
      id: 'ath_parent',
      name: 'Kimber Weaver',
      updatedAt: '2026-10-28T15:35:00.000Z',
    })
    delete (older as Partial<Athlete>).firstName
    delete (older as Partial<Athlete>).lastName
    delete (newer as Partial<Athlete>).firstName
    delete (newer as Partial<Athlete>).lastName
    const merged = combineAthletes(older, newer)
    assert.equal(merged.name, 'Kimber Weaver')
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
