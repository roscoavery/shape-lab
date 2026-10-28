import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { mergeChalkboardBoards } from './chalkboardStore.ts'

function board(id: string, items: Record<string, unknown>[]) {
  return { id, name: id, items, createdAt: '2026-10-24T03:00:00.000Z', updatedAt: '2026-10-24T03:00:00.000Z' }
}

function item(id: string, title: string, url: string, pinned: boolean) {
  return {
    id,
    boardId: 'chb_week',
    kind: 'clip',
    title,
    url,
    loopA: null,
    loopB: null,
    pinned,
    createdById: 'coach',
    createdByName: 'Ryan',
    createdAt: '2026-10-24T03:30:00.000Z',
  }
}

describe('mergeChalkboardBoards', () => {
  it('moves every source item intact and tombstones the folded board', () => {
    const target = board('chb_all', [item('chk_1', 'First', 'https://example.test/1', true)])
    const source = board('chb_week', [
      item('chk_2', 'Second', '/videos/second.mp4', true),
      item('chk_3', 'Third', 'https://example.test/3', true),
    ])
    const other = board('chb_elevate', [])
    const out = mergeChalkboardBoards(
      [target, source, other],
      ['chb_old'],
      'chb_all',
      'chb_week',
      '2026-10-28T17:00:00.000Z',
    )
    assert.equal(out.moved.length, 2)
    assert.equal(out.skipped.length, 0)
    assert.deepEqual(
      out.boards.map((b) => b.id),
      ['chb_all', 'chb_elevate'],
    )
    assert.deepEqual(out.removedBoardIds, ['chb_old', 'chb_week'])
    const kept = out.boards[0]
    const items = kept.items as Record<string, unknown>[]
    assert.equal(items.length, 3)
    // Moved rows keep their id, relative url, pins and creator; only boardId changes.
    assert.equal(items[1].id, 'chk_2')
    assert.equal(items[1].url, '/videos/second.mp4')
    assert.equal(items[1].boardId, 'chb_all')
    assert.equal(items[1].pinned, true)
    assert.equal(items[1].createdAt, '2026-10-24T03:30:00.000Z')
    assert.equal(items[2].id, 'chk_3')
    assert.equal(kept.updatedAt, '2026-10-28T17:00:00.000Z')
  })

  it('skips items already on the target by url or title', () => {
    const target = board('chb_all', [item('chk_1', 'First', 'https://example.test/1', true)])
    const source = board('chb_week', [
      item('chk_2', 'Other title', 'https://example.test/1', true),
      item('chk_3', 'First', 'https://example.test/other', true),
      item('chk_4', 'Kept', '/videos/kept.mp4', true),
    ])
    const out = mergeChalkboardBoards([target, source], [], 'chb_all', 'chb_week', '2026-10-28T17:00:00.000Z')
    assert.equal(out.moved.length, 1)
    assert.equal(out.moved[0].id, 'chk_4')
    assert.deepEqual(
      out.skipped.map((s) => s.id),
      ['chk_2', 'chk_3'],
    )
    const items = (out.boards[0].items as Record<string, unknown>[])
    assert.equal(items.length, 2)
  })

  it('leaves the file alone when a board is missing', () => {
    const target = board('chb_all', [])
    const out = mergeChalkboardBoards([target], [], 'chb_all', 'chb_missing', '2026-10-28T17:00:00.000Z')
    assert.equal(out.moved.length, 0)
    assert.equal(out.boards.length, 1)
    assert.deepEqual(out.removedBoardIds, [])
  })
})
