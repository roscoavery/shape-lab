import { describe, it, mock } from 'node:test'
import assert from 'node:assert/strict'

/**
 * Removed-athlete tombstones (build 1270, src/lib/storage.ts): a delete
 * must survive the next read for every profile id, not just ath_ ids.
 * The old ath_ prefix filter silently dropped par_ and coa_ tombstones,
 * so a deleted parent profile reappeared on the next revision poll.
 *
 * Importing storage pulls ./shippedRefs, whose module calls Vite's
 * import.meta.glob at load time and cannot load outside the app bundle,
 * so it is stubbed here (same as familyView.test). localStorage is
 * stubbed on globalThis (same shape as closedDays.test).
 */

mock.module('./shippedRefs.ts', {
  cache: false,
  exports: {
    DEFAULT_REFERENCE_PATHS: {},
    SHIPPED_REFERENCE_IDS: [],
    pickReferencePhoto: () => null,
  },
} as Parameters<typeof mock.module>[1])

type StorageStub = {
  getItem: (key: string) => string | null
  setItem: (key: string, value: string) => void
  removeItem: (key: string) => void
}

const backing = new Map<string, string>()
const localStorageStub: StorageStub = {
  getItem: (key) => (backing.has(key) ? (backing.get(key) as string) : null),
  setItem: (key, value) => {
    backing.set(key, String(value))
  },
  removeItem: (key) => {
    backing.delete(key)
  },
}
;(globalThis as unknown as { localStorage: StorageStub }).localStorage = localStorageStub

const { loadRemovedAthleteIds, saveRemovedAthleteIds, noteRemovedAthlete } = await import('./storage.ts')

describe('loadRemovedAthleteIds', () => {
  it('keeps par_ and coa_ tombstones instead of dropping them', () => {
    backing.clear()
    saveRemovedAthleteIds(['ath_someone', 'par_acc_1', 'coa_acc_2'])
    assert.deepEqual(loadRemovedAthleteIds(), ['ath_someone', 'par_acc_1', 'coa_acc_2'])
  })

  it('never keeps ath_ryan', () => {
    backing.clear()
    saveRemovedAthleteIds(['ath_ryan', 'par_acc_1'])
    assert.deepEqual(loadRemovedAthleteIds(), ['par_acc_1'])
  })

  it('noteRemovedAthlete records a parent id and it survives the next read', () => {
    backing.clear()
    noteRemovedAthlete('par_acc_9')
    assert.deepEqual(loadRemovedAthleteIds(), ['par_acc_9'])
    noteRemovedAthlete('par_acc_9')
    assert.deepEqual(loadRemovedAthleteIds(), ['par_acc_9'])
  })
})
