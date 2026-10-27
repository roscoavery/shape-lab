import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { itemMatchesQuery, type RefItem } from './clipStore'

function item(partial: Partial<RefItem>): RefItem {
  return {
    id: 'muse_test',
    kind: 'instagram',
    name: 'Bounce backhandspring drill',
    url: 'https://www.instagram.com/reel/DfAnrv8N9ss/',
    createdAt: '2026-10-27T00:00:00.000Z',
    ...partial,
  }
}

describe('itemMatchesQuery creator-handle search', () => {
  it('matches a bare reel URL by its stored creator handle', () => {
    const clip = item({ postedBy: 'coachwithpatience' })
    assert.equal(itemMatchesQuery(clip, 'coachwithpatience'), true)
  })

  it('matches with or without the @ prefix', () => {
    const clip = item({ postedBy: 'coachwithpatience' })
    assert.equal(itemMatchesQuery(clip, '@coachwithpatience'), true)
    assert.equal(itemMatchesQuery(clip, '@CoachWithPatience'), true)
  })

  it('does not match a different creator', () => {
    const clip = item({ postedBy: 'kyoko_negishi' })
    assert.equal(itemMatchesQuery(clip, 'coachwithpatience'), false)
  })

  it('does not match when the item carries no handle anywhere', () => {
    const clip = item({})
    assert.equal(itemMatchesQuery(clip, 'coachwithpatience'), false)
  })

  it('still requires every word to appear somewhere', () => {
    const clip = item({ postedBy: 'coachwithpatience', keywords: ['round off'] })
    assert.equal(itemMatchesQuery(clip, 'coachwithpatience round'), true)
    assert.equal(itemMatchesQuery(clip, 'coachwithpatience full'), false)
  })
})
