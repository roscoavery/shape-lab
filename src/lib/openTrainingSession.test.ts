import { beforeEach, describe, it, mock } from 'node:test'
import assert from 'node:assert/strict'

/**
 * Open training session store (src/lib/openTrainingSession.ts): the "which
 * school / camp / clinic is open right now" marker that survives leaving
 * the Today view.
 *
 * Importing openTrainingSession pulls trainingEvents → storage →
 * shippedRefs, whose module calls Vite's import.meta.glob at load time and
 * cannot load outside the app bundle, so it is stubbed here (same as
 * sessionGlow.test). localStorage is stubbed on globalThis (same shape as
 * parentPin.test).
 */

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
;(globalThis as { localStorage?: StorageStub }).localStorage = localStorageStub
;(globalThis as { window?: { localStorage: StorageStub } }).window = {
  localStorage: localStorageStub,
}

mock.module('./shippedRefs.ts', {
  cache: false,
  // Node 24's runtime names this option `exports`; the bundled
  // @types/node still calls it `namedExports`, hence the cast.
  exports: {
    DEFAULT_REFERENCE_PATHS: {},
    SHIPPED_REFERENCE_IDS: [],
    pickReferencePhoto: () => null,
  },
} as Parameters<typeof mock.module>[1])

const {
  clearOpenTrainingSession,
  getOpenTrainingSession,
  getRestorableOpenTrainingSession,
  setOpenTrainingSession,
  subscribeOpenTrainingSession,
} = await import('./openTrainingSession.ts')

const EVENTS_KEY = 'shape-lab.trainingEvents.v1'
const OPEN_KEY = 'shapelab:open-training-session.v1'

// A training event row in the store, so restore can find it.
function seedEvent(id: string, coachId = 'coach_1') {
  localStorageStub.setItem(
    EVENTS_KEY,
    JSON.stringify({
      kind: 'shape-lab-training-events',
      version: 1,
      exportedAt: '',
      events: [
        {
          id,
          name: 'BA High School',
          kind: 'school',
          athleteIds: [],
          coachIds: [coachId],
          createdAt: new Date().toISOString(),
        },
      ],
      removedEventIds: [],
    }),
  )
}

function seedOpened(eventId: string, coachId: string, openedAt: string) {
  localStorageStub.setItem(OPEN_KEY, JSON.stringify({ eventId, coachId, openedAt }))
}

beforeEach(() => {
  backing.clear()
})

describe('openTrainingSession', () => {
  it('remembers the open session and clears it', () => {
    assert.equal(getOpenTrainingSession(), null)
    setOpenTrainingSession('evt_1', 'coach_1')
    assert.equal(getOpenTrainingSession()?.eventId, 'evt_1')
    assert.equal(getOpenTrainingSession()?.coachId, 'coach_1')
    clearOpenTrainingSession()
    assert.equal(getOpenTrainingSession(), null)
  })

  it('notifies subscribers on set and clear, but not on an identical set', () => {
    let calls = 0
    const unsub = subscribeOpenTrainingSession(() => {
      calls += 1
    })
    setOpenTrainingSession('evt_1', 'coach_1')
    setOpenTrainingSession('evt_1', 'coach_1')
    clearOpenTrainingSession()
    clearOpenTrainingSession()
    unsub()
    setOpenTrainingSession('evt_1', 'coach_1')
    assert.equal(calls, 2)
  })

  it('restores a session opened today by the same coach whose event exists', () => {
    seedEvent('evt_1')
    setOpenTrainingSession('evt_1', 'coach_1')
    assert.equal(getRestorableOpenTrainingSession('coach_1')?.eventId, 'evt_1')
  })

  it('does not restore a session owned by another coach', () => {
    seedEvent('evt_1')
    setOpenTrainingSession('evt_1', 'coach_1')
    assert.equal(getRestorableOpenTrainingSession('coach_2'), null)
  })

  it('does not restore when the event is gone', () => {
    setOpenTrainingSession('evt_gone', 'coach_1')
    assert.equal(getRestorableOpenTrainingSession('coach_1'), null)
  })

  it('does not restore a session opened on an earlier day', () => {
    seedEvent('evt_1')
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    seedOpened('evt_1', 'coach_1', yesterday)
    assert.equal(getRestorableOpenTrainingSession('coach_1'), null)
  })

  it('does not restore without a signed-in coach', () => {
    seedEvent('evt_1')
    setOpenTrainingSession('evt_1', 'coach_1')
    assert.equal(getRestorableOpenTrainingSession(null), null)
    assert.equal(getRestorableOpenTrainingSession(undefined), null)
  })
})
