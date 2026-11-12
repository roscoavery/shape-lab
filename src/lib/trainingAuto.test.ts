import { describe, it, mock } from 'node:test'
import assert from 'node:assert/strict'
import type { TodayCalendarEvent } from './calendarClient.ts'

/**
 * Training auto-start decision (src/lib/trainingAuto.ts): which school /
 * camp / clinic session the every-minute clock should start. Only the pure
 * pick is tested here; the clock's fetch and find-or-create run in the app.
 *
 * Importing trainingAuto pulls sessionGlow → coachClasses → storage →
 * shippedRefs, whose module calls Vite's import.meta.glob at load time and
 * cannot load outside the app bundle, so it is stubbed here (same as
 * sessionGlow.test). localStorage is stubbed on globalThis (same shape as
 * parentPin.test) so the imported stores can load.
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

const { pickTrainingAutoStart } = await import('./trainingAuto.ts')

function ev(partial: Partial<TodayCalendarEvent>): TodayCalendarEvent {
  return {
    id: 'evt_1',
    title: 'Coach BA High School with Logan',
    startAt: '2026-11-12T14:00:00',
    endAt: '2026-11-12T16:30:00',
    timeZone: 'America/Chicago',
    location: 'Broken Arrow High School',
    status: 'confirmed',
    matchedAthleteId: null,
    matchStatus: 'needs_athlete',
    providerCalendarId: 'cal_1',
    lessonLinks: [],
    ...partial,
  }
}

describe('pickTrainingAutoStart', () => {
  it('starts a school session at its scheduled time', () => {
    const pick = pickTrainingAutoStart(
      [ev({ eventType: 'school' })],
      new Date('2026-11-12T14:00:00'),
      false,
    )
    assert.equal(pick?.trainingKind, 'school')
    assert.equal(pick?.calEvent.id, 'evt_1')
  })

  it('does not start 5 minutes early, even though the glow is on', () => {
    const pick = pickTrainingAutoStart(
      [ev({ eventType: 'school' })],
      new Date('2026-11-12T13:57:00'),
      false,
    )
    assert.equal(pick, null)
  })

  it('does not start before the glow window opens', () => {
    const pick = pickTrainingAutoStart(
      [ev({ eventType: 'school' })],
      new Date('2026-11-12T13:54:00'),
      false,
    )
    assert.equal(pick, null)
  })

  it('does not start after the event ends', () => {
    const pick = pickTrainingAutoStart(
      [ev({ eventType: 'school' })],
      new Date('2026-11-12T16:31:00'),
      false,
    )
    assert.equal(pick, null)
  })

  it('does not start over something already live', () => {
    const pick = pickTrainingAutoStart(
      [ev({ eventType: 'school' })],
      new Date('2026-11-12T14:00:00'),
      true,
    )
    assert.equal(pick, null)
  })

  it('a lesson event never starts a training session', () => {
    const pick = pickTrainingAutoStart(
      [ev({ eventType: 'lesson', matchedAthleteId: 'ath_1' })],
      new Date('2026-11-12T14:00:00'),
      false,
    )
    assert.equal(pick, null)
  })

  it('school wins over camp when both start at the same time', () => {
    const pick = pickTrainingAutoStart(
      [ev({ eventType: 'camp', id: 'evt_camp' }), ev({ eventType: 'school' })],
      new Date('2026-11-12T14:00:00'),
      false,
    )
    assert.equal(pick?.trainingKind, 'school')
  })
})
