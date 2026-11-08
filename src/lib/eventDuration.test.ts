import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { formatDurationMinutes, formatEventDuration } from './eventDuration.ts'

describe('formatDurationMinutes', () => {
  it('says minutes under an hour', () => {
    assert.equal(formatDurationMinutes(30), '30 min')
    assert.equal(formatDurationMinutes(45), '45 min')
    assert.equal(formatDurationMinutes(1), '1 min')
  })
  it('says whole hours without minutes', () => {
    assert.equal(formatDurationMinutes(60), '1 hr')
    assert.equal(formatDurationMinutes(120), '2 hr')
  })
  it('says hours and minutes', () => {
    assert.equal(formatDurationMinutes(90), '1 hr 30 min')
    assert.equal(formatDurationMinutes(150), '2 hr 30 min')
    assert.equal(formatDurationMinutes(165), '2 hr 45 min')
  })
  it('returns blank for unusable lengths', () => {
    assert.equal(formatDurationMinutes(0), '')
    assert.equal(formatDurationMinutes(-30), '')
    assert.equal(formatDurationMinutes(NaN), '')
  })
})

describe('formatEventDuration', () => {
  it('measures start to end', () => {
    assert.equal(
      formatEventDuration('2026-11-08T12:45:00-06:00', '2026-11-08T13:15:00-06:00'),
      '30 min',
    )
    assert.equal(
      formatEventDuration('2026-11-12T14:00:00-06:00', '2026-11-12T16:30:00-06:00'),
      '2 hr 30 min',
    )
  })
  it('returns blank for bad dates or a backwards range', () => {
    assert.equal(formatEventDuration('', '2026-11-08T13:15:00-06:00'), '')
    assert.equal(formatEventDuration('not a date', '2026-11-08T13:15:00-06:00'), '')
    assert.equal(
      formatEventDuration('2026-11-08T13:15:00-06:00', '2026-11-08T12:45:00-06:00'),
      '',
    )
  })
})
