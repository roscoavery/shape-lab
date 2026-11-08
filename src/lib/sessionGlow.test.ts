import { describe, it, mock } from 'node:test'
import assert from 'node:assert/strict'
import type { TodayCalendarEvent } from './calendarClient.ts'

/**
 * Event-type classification (src/lib/sessionGlow.ts): an explicit type set
 * by the coach wins over the title heuristic and over a matched athlete.
 *
 * Importing sessionGlow pulls coachClasses → storage, and storage
 * re-exports three names from ./shippedRefs, whose module calls Vite's
 * import.meta.glob at load time and cannot load outside the app bundle.
 * Nothing in the sessionGlow path calls those re-exports, so they are
 * stubbed here; classifySessionEvent runs for real. Run with
 * --experimental-test-module-mocks (same as the main suite).
 */
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

const { classifySessionEvent } = await import('./sessionGlow.ts')

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

describe('classifySessionEvent with an explicit event type', () => {
  it('an explicit school type wins over a matched athlete', () => {
    assert.equal(classifySessionEvent(ev({ eventType: 'school', matchedAthleteId: 'ath_1' })), 'school')
  })

  it('an explicit school type wins over a lesson title', () => {
    assert.equal(classifySessionEvent(ev({ eventType: 'school', title: 'Private lesson' })), 'school')
  })

  it('an explicit lesson type wins over a school title', () => {
    assert.equal(classifySessionEvent(ev({ eventType: 'lesson', title: 'BA High School coaching' })), 'lesson')
  })

  it('an explicit camp or clinic type classifies as camp or clinic', () => {
    assert.equal(classifySessionEvent(ev({ eventType: 'camp' })), 'camp')
    assert.equal(classifySessionEvent(ev({ eventType: 'clinic' })), 'clinic')
  })

  it('an unmarked event still uses the title heuristic', () => {
    assert.equal(classifySessionEvent(ev({})), 'school')
    assert.equal(classifySessionEvent(ev({ title: 'Private lesson' })), 'lesson')
    assert.equal(classifySessionEvent(ev({ title: 'Connections' })), 'class')
  })

  it('an unmarked event with a matched athlete is still a lesson', () => {
    assert.equal(classifySessionEvent(ev({ matchedAthleteId: 'ath_1' })), 'lesson')
  })
})
