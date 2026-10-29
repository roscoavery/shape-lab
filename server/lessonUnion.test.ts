import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { union, addAthleteToSessionRow } from './lessonStore.ts'

function session(
  id: string,
  overrides: Record<string, unknown>,
): Record<string, unknown> {
  return {
    id,
    athleteId: 'ath_berkley',
    coachId: 'coach_ryan',
    startedAt: '2026-10-28T20:00:00.000Z',
    notes: [],
    holds: [],
    ...overrides,
  }
}

describe('lesson union athleteIds', () => {
  it('newer row wins fields but keeps athletes added on the older copy', () => {
    const staleAdd = session('les_1', {
      athleteIds: ['ath_berkley', 'ath_baylor'],
      startedAt: '2026-10-28T20:00:00.000Z',
    })
    const staleEnd = session('les_1', {
      athleteIds: ['ath_berkley'],
      endedAt: '2026-10-28T22:22:03.000Z',
    })
    const [merged] = union([staleAdd], [staleEnd]) as Record<string, unknown>[]
    assert.equal(merged.endedAt, '2026-10-28T22:22:03.000Z')
    assert.deepEqual(merged.athleteIds, ['ath_berkley', 'ath_baylor'])
  })

  it('older incoming copy does not clobber fields but its extra athlete survives', () => {
    const current = session('les_1', {
      athleteIds: ['ath_berkley'],
      endedAt: '2026-10-28T22:22:03.000Z',
    })
    const older = session('les_1', {
      athleteIds: ['ath_berkley', 'ath_baylor'],
      startedAt: '2026-10-28T20:00:00.000Z',
    })
    const [merged] = union([current], [older]) as Record<string, unknown>[]
    assert.equal(merged.endedAt, '2026-10-28T22:22:03.000Z')
    assert.deepEqual(merged.athleteIds, ['ath_berkley', 'ath_baylor'])
  })

  it('equal stamps keep the incoming row and union the ids', () => {
    const a = session('les_1', { athleteIds: ['ath_berkley'], notes: ['n1'] })
    const b = session('les_1', { athleteIds: ['ath_baylor'], notes: ['n2'] })
    const [merged] = union([a], [b]) as Record<string, unknown>[]
    assert.deepEqual(merged.notes, ['n2'])
    assert.deepEqual(merged.athleteIds, ['ath_berkley', 'ath_baylor'])
  })

  it('rows without athleteIds are untouched, including plans', () => {
    const plan = {
      id: 'plan_1',
      athleteId: 'ath_berkley',
      title: 'Old plan',
      updatedAt: '2026-10-28T19:00:00.000Z',
    }
    const newer = { ...plan, title: 'New plan', updatedAt: '2026-10-28T20:00:00.000Z' }
    const [merged] = union([plan], [newer]) as Record<string, unknown>[]
    assert.equal(merged.title, 'New plan')
    assert.equal('athleteIds' in merged, false)
  })

  it('a copy with ids merges into a copy without the array', () => {
    const bare = session('les_1', {})
    const withIds = session('les_1', { athleteIds: ['ath_berkley', 'ath_baylor'] })
    const [merged] = union([bare], [withIds]) as Record<string, unknown>[]
    assert.deepEqual(merged.athleteIds, ['ath_berkley', 'ath_baylor'])
  })
})

describe('addAthleteToSessionRow', () => {
  it('adds a missing athlete after the existing ids', () => {
    const row = session('les_1', { athleteIds: ['ath_berkley'] })
    const { row: next, changed } = addAthleteToSessionRow(row, 'ath_baylor')
    assert.equal(changed, true)
    assert.deepEqual(next.athleteIds, ['ath_berkley', 'ath_baylor'])
    assert.equal(next.startedAt, '2026-10-28T20:00:00.000Z')
  })

  it('is a no-op when the athlete is already in the lesson', () => {
    const row = session('les_1', {
      athleteIds: ['ath_berkley', 'ath_baylor'],
      endedAt: '2026-10-28T22:22:03.000Z',
    })
    const { row: next, changed } = addAthleteToSessionRow(row, 'ath_baylor')
    assert.equal(changed, false)
    assert.equal(next, row)
  })

  it('creates the array from the primary id when the row has none', () => {
    const row = session('les_1', {})
    const { row: next, changed } = addAthleteToSessionRow(row, 'ath_baylor')
    assert.equal(changed, true)
    assert.deepEqual(next.athleteIds, ['ath_berkley', 'ath_baylor'])
  })
})
