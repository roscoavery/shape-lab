import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { eventOverlapsLocalDay } from './timezone.ts'

describe('eventOverlapsLocalDay', () => {
  it('includes events on the local day', () => {
    const ok = eventOverlapsLocalDay(
      '2026-06-15T14:00:00-04:00',
      '2026-06-15T15:00:00-04:00',
      'America/New_York',
      new Date('2026-06-15T12:00:00Z'),
    )
    assert.equal(ok, true)
  })
})
