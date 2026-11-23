import { describe, it, mock } from 'node:test'
import assert from 'node:assert/strict'

/**
 * Closed days (src/lib/coachClasses.ts): marking days with no classes,
 * un-marking them, ranges, and the auto-start skip plus the lesson-wins
 * guard in checkAutoClass.
 *
 * Importing coachClasses pulls storage → shippedRefs, whose module calls
 * Vite's import.meta.glob at load time and cannot load outside the app
 * bundle, so it is stubbed here (same as sessionGlow.test). localStorage
 * is stubbed on globalThis (same shape as trainingAuto.test) so the
 * stores run for real, and fetch is stubbed so the sync PUTs succeed
 * immediately instead of retrying.
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
;(globalThis as unknown as { window?: { localStorage: StorageStub; addEventListener: () => void } }).window = {
  localStorage: localStorageStub,
  addEventListener: () => {},
}
;(globalThis as unknown as { document?: { addEventListener: () => void; visibilityState: string } }).document = {
  addEventListener: () => {},
  visibilityState: 'visible',
}
;(globalThis as { fetch?: unknown }).fetch = async () =>
  new Response('{}', { status: 200, headers: { 'Content-Type': 'application/json' } })

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
  localDateKey,
  isClosedDay,
  loadClosedDays,
  loadUpcomingClosedDays,
  markClosedDay,
  markClosedDaysRange,
  unmarkClosedDay,
  saveOffering,
  removeOffering,
  checkAutoClass,
  loadMeetings,
  endClassMeeting,
} = await import('./coachClasses.ts')
const { startLessonSession, endLessonSession } = await import('./lessonStore.ts')

describe('closed-day keys', () => {
  it('localDateKey formats a local date as YYYY-MM-DD', () => {
    assert.equal(localDateKey(new Date(2026, 10, 23, 12, 0)), '2026-11-23')
  })

  it('isClosedDay matches a key or a Date and rejects the rest', () => {
    assert.equal(isClosedDay(['2026-11-23'], '2026-11-23'), true)
    assert.equal(isClosedDay(['2026-11-23'], new Date(2026, 10, 23, 9, 0)), true)
    assert.equal(isClosedDay(['2026-11-23'], '2026-11-24'), false)
    assert.equal(isClosedDay([], '2026-11-23'), false)
    assert.equal(isClosedDay(undefined, '2026-11-23'), false)
  })

  it('loadUpcomingClosedDays skips past days', () => {
    assert.equal(markClosedDay('2020-01-06'), true)
    assert.equal(markClosedDay('2026-11-23'), true)
    assert.equal(loadClosedDays().includes('2020-01-06'), true)
    assert.equal(loadUpcomingClosedDays().includes('2020-01-06'), false)
    assert.equal(loadUpcomingClosedDays().includes('2026-11-23'), true)
    assert.equal(unmarkClosedDay('2020-01-06'), true)
    assert.equal(unmarkClosedDay('2026-11-23'), true)
  })
})

describe('marking and un-marking closed days', () => {
  it('marks one day, refuses a duplicate, and un-marks it', () => {
    assert.equal(markClosedDay('2026-11-23'), true)
    assert.equal(loadClosedDays().includes('2026-11-23'), true)
    assert.equal(markClosedDay('2026-11-23'), false)
    assert.equal(unmarkClosedDay('2026-11-23'), true)
    assert.equal(loadClosedDays().includes('2026-11-23'), false)
    assert.equal(unmarkClosedDay('2026-11-23'), false)
  })

  it('marks an inclusive range and refuses to mark it twice', () => {
    assert.equal(markClosedDaysRange('2026-11-24', '2026-11-27'), 4)
    for (const d of ['2026-11-24', '2026-11-25', '2026-11-26', '2026-11-27']) {
      assert.equal(loadClosedDays().includes(d), true)
    }
    assert.equal(markClosedDaysRange('2026-11-24', '2026-11-27'), 0)
    for (const d of ['2026-11-24', '2026-11-25', '2026-11-26', '2026-11-27']) {
      assert.equal(unmarkClosedDay(d), true)
    }
  })

  it('rejects a reversed range and a bad key', () => {
    assert.equal(markClosedDaysRange('2026-11-27', '2026-11-24'), 0)
    assert.equal(markClosedDaysRange('Nov 24', '2026-11-27'), 0)
    assert.equal(markClosedDay('not-a-date'), false)
  })

  it('caps a long range at 62 days', () => {
    assert.equal(markClosedDaysRange('2027-01-01', '2027-04-30'), 62)
    const marked = loadClosedDays().filter((d) => d >= '2027-01-01')
    assert.equal(marked.length, 62)
    for (const d of marked) assert.equal(unmarkClosedDay(d), true)
  })

  it('an un-marked day can be marked again', () => {
    assert.equal(markClosedDay('2026-12-07'), true)
    assert.equal(unmarkClosedDay('2026-12-07'), true)
    assert.equal(markClosedDay('2026-12-07'), true)
    assert.equal(loadClosedDays().includes('2026-12-07'), true)
    assert.equal(unmarkClosedDay('2026-12-07'), true)
  })
})

describe('checkAutoClass with closed days and live lessons', () => {
  // Mondays: 2026-11-23 and 2026-11-30. Connections runs Monday 5pm.
  const offering = saveOffering({
    coachId: 'coach_1',
    name: 'Connections',
    weekday: 'Monday',
    time: '5pm',
  })
  const liveFor = () =>
    loadMeetings().find((m) => m.offeringId === offering.id && !m.endedAt) ?? null

  it('does not auto-start on a closed day', () => {
    assert.equal(markClosedDay('2026-11-23'), true)
    assert.equal(checkAutoClass(new Date(2026, 10, 23, 17, 5)), null)
    assert.equal(liveFor(), null)
    assert.equal(unmarkClosedDay('2026-11-23'), true)
  })

  it('auto-starts on an open day', () => {
    assert.equal(checkAutoClass(new Date(2026, 10, 30, 17, 5)), null)
    const live = liveFor()
    assert.notEqual(live, null)
    if (live) assert.notEqual(endClassMeeting(live.id), null)
    assert.equal(liveFor(), null)
  })

  it('a live lesson wins over a class auto-start', () => {
    const lesson = startLessonSession({ athleteIds: ['ath_1'], coachId: 'coach_1' })
    assert.equal(checkAutoClass(new Date(2026, 10, 30, 17, 5), 'coach_1'), null)
    assert.equal(liveFor(), null)
    assert.notEqual(endLessonSession(lesson.id), null)
    assert.equal(checkAutoClass(new Date(2026, 10, 30, 17, 5), 'coach_1'), null)
    const live = liveFor()
    assert.notEqual(live, null)
    if (live) assert.notEqual(endClassMeeting(live.id), null)
    removeOffering(offering.id)
  })
})
