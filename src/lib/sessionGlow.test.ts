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

const { classifySessionEvent, getSessionGlow, closestOfferingToNow } = await import('./sessionGlow.ts')
import type { CoachClassOffering } from './coachClasses.ts'

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

describe('getSessionGlow with a school-typed event', () => {
  // The BA fixture is the Thursday school block: 2:00-4:30pm.
  const school = () => ev({ eventType: 'school' })

  it('a school-typed event glows at its start time', () => {
    const glow = getSessionGlow([school()], new Date('2026-11-12T14:00:00'))
    assert.equal(glow.glowing.has('school'), true)
    assert.equal(glow.closest.school?.id, 'evt_1')
  })

  it('a school-typed event glows 5 minutes before it starts', () => {
    const glow = getSessionGlow([school()], new Date('2026-11-12T13:55:00'))
    assert.equal(glow.glowing.has('school'), true)
  })

  it('a school-typed event does not glow 6 minutes before it starts', () => {
    const glow = getSessionGlow([school()], new Date('2026-11-12T13:54:00'))
    assert.equal(glow.glowing.has('school'), false)
  })

  it('a school-typed event stops glowing after it ends', () => {
    const glow = getSessionGlow([school()], new Date('2026-11-12T16:31:00'))
    assert.equal(glow.glowing.has('school'), false)
  })

  it('school wins the glow even when the title says lesson', () => {
    const glow = getSessionGlow(
      [ev({ eventType: 'school', title: 'Private lesson' })],
      new Date('2026-11-12T14:00:00'),
    )
    assert.equal(glow.glowing.has('school'), true)
    assert.equal(glow.glowing.has('lesson'), false)
  })
})

describe('closestOfferingToNow with closed days', () => {
  // Monday 2026-11-23 and Wednesday 2026-11-25.
  const connections = (partial?: Partial<CoachClassOffering>): CoachClassOffering => ({
    id: 'cls_connections',
    coachId: 'coach_1',
    name: 'Connections',
    weekday: 'Monday',
    time: '5pm',
    createdAt: '2026-01-01T00:00:00.000Z',
    rosterIds: [],
    ...partial,
  })
  const elevate = (): CoachClassOffering => ({
    id: 'cls_elevate',
    coachId: 'coach_1',
    name: 'Elevate',
    weekday: 'Wednesday',
    time: '4pm',
    createdAt: '2026-01-01T00:00:00.000Z',
    rosterIds: [],
  })

  it('picks the class starting soonest when nothing is closed', () => {
    const now = new Date(2026, 10, 23, 16, 0)
    assert.equal(closestOfferingToNow([connections(), elevate()], now)?.id, 'cls_connections')
  })

  it('skips a closed today and picks the next class instead', () => {
    const now = new Date(2026, 10, 23, 16, 0)
    assert.equal(
      closestOfferingToNow([connections(), elevate()], now, ['2026-11-23'])?.id,
      'cls_elevate',
    )
  })

  it('skips two closed Mondays in a row', () => {
    const now = new Date(2026, 10, 23, 16, 0)
    assert.equal(
      closestOfferingToNow([connections(), elevate()], now, ['2026-11-23', '2026-11-30'])?.id,
      'cls_elevate',
    )
  })

  it('an unrelated closed day changes nothing', () => {
    const now = new Date(2026, 10, 23, 16, 0)
    assert.equal(
      closestOfferingToNow([connections(), elevate()], now, ['2026-11-24'])?.id,
      'cls_connections',
    )
  })

  it('a closed Wednesday pushes Elevate to next week', () => {
    const now = new Date(2026, 10, 25, 15, 0)
    assert.equal(closestOfferingToNow([connections(), elevate()], now)?.id, 'cls_elevate')
    assert.equal(
      closestOfferingToNow([connections(), elevate()], now, ['2026-11-25'])?.id,
      'cls_connections',
    )
  })
})
