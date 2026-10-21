import { describe, it, mock } from 'node:test'
import assert from 'node:assert/strict'
import type { Athlete } from '../types'

/**
 * Athlete View targeting (src/lib/familyView.ts): a parent session may
 * view the gym as one of its linked children — and only those.
 *
 * Importing familyView pulls parentLink → storage, and storage re-exports
 * three names from ./shippedRefs, whose module calls Vite's
 * import.meta.glob at load time and cannot load outside the app bundle.
 * Nothing in the familyView path calls those re-exports, so they are
 * stubbed here; every function under test (resolveAthleteViewAthlete,
 * canEnterAthleteView, childAthletes, profileRole) runs for real.
 * The stub is also why the npm script runs node with
 * --experimental-test-module-mocks: the tsx CLI wrapper does not pass
 * that flag through to the test-runner children.
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

const { canEnterAthleteView, resolveAthleteViewAthlete } = await import('./familyView')

function person(partial: Record<string, unknown>): Athlete {
  return partial as unknown as Athlete
}

const parent = person({ id: 'par_1', role: 'parent', linkedAthleteIds: ['ath_1'] })
const sam = person({ id: 'ath_1', role: 'athlete' })
const blake = person({ id: 'ath_2', role: 'athlete' })
const coachRow = person({ id: 'coach_1', role: 'coach' })
const roster = [parent, sam, blake, coachRow]

describe('resolveAthleteViewAthlete', () => {
  it('resolves a child linked on the parent profile', () => {
    assert.equal(resolveAthleteViewAthlete(parent, 'ath_1', roster)?.id, 'ath_1')
  })

  it('resolves a child linked by guardian relationship', () => {
    const guardianLinked = person({
      id: 'ath_2',
      role: 'athlete',
      guardianRelationships: [{ rosterProfileId: 'par_1' }],
    })
    const rows = [parent, sam, guardianLinked]
    assert.equal(resolveAthleteViewAthlete(parent, 'ath_2', rows)?.id, 'ath_2')
  })

  it('returns null for an athlete the parent is not linked to', () => {
    assert.equal(resolveAthleteViewAthlete(parent, 'ath_2', roster), null)
  })

  it('returns null for an unknown athlete id', () => {
    assert.equal(resolveAthleteViewAthlete(parent, 'ath_missing', roster), null)
  })

  it('returns null when the athlete list is empty', () => {
    assert.equal(resolveAthleteViewAthlete(parent, 'ath_1', []), null)
  })

  it('returns null without a parent or a target id', () => {
    assert.equal(resolveAthleteViewAthlete(null, 'ath_1', roster), null)
    assert.equal(resolveAthleteViewAthlete(undefined, 'ath_1', roster), null)
    assert.equal(resolveAthleteViewAthlete(parent, null, roster), null)
    assert.equal(resolveAthleteViewAthlete(parent, undefined, roster), null)
  })

  it('returns null when the viewer is not a parent profile', () => {
    const athleteViewer = person({ id: 'ath_9', role: 'athlete', linkedAthleteIds: ['ath_1'] })
    assert.equal(resolveAthleteViewAthlete(athleteViewer, 'ath_1', roster), null)
  })

  it('returns null when the linked id names a non-athlete profile', () => {
    const oddParent = person({ id: 'par_2', role: 'parent', linkedAthleteIds: ['coach_1'] })
    assert.equal(resolveAthleteViewAthlete(oddParent, 'coach_1', roster), null)
  })
})

describe('canEnterAthleteView', () => {
  it('allows exactly the linked children', () => {
    assert.equal(canEnterAthleteView(parent, 'ath_1', roster), true)
    assert.equal(canEnterAthleteView(parent, 'ath_2', roster), false)
    assert.equal(canEnterAthleteView(parent, 'ath_missing', roster), false)
    assert.equal(canEnterAthleteView(parent, 'ath_1', []), false)
  })
})
