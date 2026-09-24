import { describe, it, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { decryptSecret, encryptSecret, redactSecrets } from './crypto.ts'

describe('calendar crypto', () => {
  const prev = process.env.CALENDAR_CREDENTIAL_KEY
  before(() => {
    process.env.CALENDAR_CREDENTIAL_KEY = 'test-key-for-unit-tests-only'
  })
  after(() => {
    process.env.CALENDAR_CREDENTIAL_KEY = prev
  })

  it('round-trips encryption', () => {
    const secret = 'abcd-efgh-ijkl-mnop'
    const blob = encryptSecret(secret)
    assert.notEqual(blob, secret)
    assert.equal(decryptSecret(blob), secret)
  })

  it('redacts emails and app passwords', () => {
    const text = redactSecrets('Failed for coach@example.com with abcd-efgh-ijkl-mnop')
    assert.ok(!text.includes('coach@example.com'))
    assert.ok(!text.includes('abcd-efgh'))
  })
})
