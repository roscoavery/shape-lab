import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import type { Athlete } from '../types'
import type { AuthSessionUser } from './authSession'

/**
 * Session-derived opening profile (build 1270, src/lib/authSession.ts):
 * the signed-in session decides which profile the app opens onto, not a
 * stale device-local value. A parent account always lands on its own
 * par_ row, never on ath_ryan, and never on a row that does not exist on
 * this device yet.
 */

import { sessionProfileId } from './authSession.ts'

function person(partial: Record<string, unknown>): Athlete {
  return partial as unknown as Athlete
}

function user(partial: Record<string, unknown>): AuthSessionUser {
  return partial as unknown as AuthSessionUser
}

const ryan = person({ id: 'ath_ryan', role: 'coach' })
const parLauren = person({ id: 'par_acc_lauren', role: 'parent', linkedAthleteIds: ['ath_reese'] })
const reese = person({ id: 'ath_reese', role: 'athlete' })
const roster = [ryan, parLauren, reese]

describe('sessionProfileId', () => {
  it('gives an admin ath_ryan', () => {
    assert.equal(
      sessionProfileId(user({ accountId: 'acc_admin', role: 'admin' }), roster),
      'ath_ryan',
    )
  })

  it('gives a parent her own par_ row even when her account points at ath_ryan', () => {
    assert.equal(
      sessionProfileId(
        user({ accountId: 'acc_lauren', role: 'parent', rosterProfileId: 'ath_ryan' }),
        roster,
      ),
      'par_acc_lauren',
    )
  })

  it('gives a parent the linked parent row when her own row is not on this device yet', () => {
    const otherParent = person({ id: 'par_acc_other', role: 'parent' })
    assert.equal(
      sessionProfileId(
        user({ accountId: 'acc_lauren', role: 'parent', rosterProfileId: 'par_acc_other' }),
        [ryan, otherParent, reese],
      ),
      'par_acc_other',
    )
  })

  it('gives a parent null when no parent row exists on this device yet', () => {
    assert.equal(
      sessionProfileId(
        user({ accountId: 'acc_lauren', role: 'parent', rosterProfileId: 'ath_ryan' }),
        [ryan, reese],
      ),
      null,
    )
  })

  it('never gives a parent an athlete row', () => {
    assert.equal(
      sessionProfileId(
        user({ accountId: 'acc_lauren', role: 'parent', rosterProfileId: 'ath_reese' }),
        [ryan, reese],
      ),
      null,
    )
  })

  it('gives a coach and an athlete their rosterProfileId unchanged', () => {
    assert.equal(
      sessionProfileId(
        user({ accountId: 'acc_coach', role: 'coach', rosterProfileId: 'coa_acc_coach' }),
        roster,
      ),
      'coa_acc_coach',
    )
    assert.equal(
      sessionProfileId(
        user({ accountId: 'acc_kid', role: 'athlete', rosterProfileId: 'ath_reese' }),
        roster,
      ),
      'ath_reese',
    )
  })

  it('gives null for no session', () => {
    assert.equal(sessionProfileId(null, roster), null)
    assert.equal(sessionProfileId(undefined, roster), null)
  })
})
