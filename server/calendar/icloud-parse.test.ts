import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { parseVeventToNormalized } from './providers/icloud.ts'

describe('parseVeventToNormalized', () => {
  it('parses recurring instance key', () => {
    const block = `
UID:abc@icloud
SUMMARY:Private lesson
DTSTART:20260615T140000Z
DTEND:20260615T150000Z
RECURRENCE-ID:20260615T140000Z
LAST-MODIFIED:20260610T120000Z
`
    const norm = parseVeventToNormalized(block, 'https://caldav/cal')
    assert.ok(norm)
    assert.equal(norm!.providerEventId, 'abc@icloud')
    assert.ok(norm!.recurrenceInstanceKey.includes('abc@icloud'))
    assert.equal(norm!.title, 'Private lesson')
  })

  it('marks cancelled status', () => {
    const block = `
UID:x@icloud
SUMMARY:Off
DTSTART:20260615T140000Z
DTEND:20260615T150000Z
STATUS:CANCELLED
`
    const norm = parseVeventToNormalized(block, 'cal')
    assert.equal(norm?.status, 'cancelled')
  })
})
