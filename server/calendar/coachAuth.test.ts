import { describe, it, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { issueCalendarToken, verifyCalendarToken } from './coachAuth.ts'

describe('calendar tokens', () => {
  const prev = process.env.CALENDAR_CREDENTIAL_KEY
  before(() => {
    process.env.CALENDAR_CREDENTIAL_KEY = 'test-key-for-unit-tests-only'
  })
  after(() => {
    process.env.CALENDAR_CREDENTIAL_KEY = prev
  })

  it('issues and verifies coach-scoped token', () => {
    const token = issueCalendarToken('coach_1')
    const parsed = verifyCalendarToken(token)
    assert.equal(parsed?.coachId, 'coach_1')
  })

  it('rejects tampered token', () => {
    const token = issueCalendarToken('coach_1')
    const bad = token.slice(0, -2) + 'xx'
    assert.equal(verifyCalendarToken(bad), null)
  })
})
