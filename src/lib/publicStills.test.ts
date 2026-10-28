import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { publicShapeStillPairs, type PublicStillData } from './publicStills.ts'

const WALL_PICK: PublicStillData = {
  mainStills: { wall_handstand: 'coach_mu0oexyb_1s60mv' },
  removedStillIds: [],
  removedCoachStillIds: ['default_wall_handstand_0'],
  coachStills: [
    { shapeId: 'wall_handstand', stillId: 'coach_mu0oexyb_1s60mv', file: 'coach_coach_mu0oexyb_1s60mv.jpg' },
  ],
  igStills: [],
}

describe('publicShapeStillPairs', () => {
  it('shows the picked upload for wall handstand, never the deleted shipped still', () => {
    const pairs = publicShapeStillPairs('wall_handstand', ['wall_handstand.jpg'], WALL_PICK)
    assert.equal(pairs.length, 1)
    assert.equal(pairs[0]?.stillId, 'coach_mu0oexyb_1s60mv')
    assert.equal(pairs[0]?.url, '/references/coach_coach_mu0oexyb_1s60mv.jpg')
    assert.ok(!pairs.some((p) => p.stillId === 'default_wall_handstand_0'))
    assert.ok(!pairs.some((p) => p.url.includes('wall_handstand.jpg')))
  })

  it('falls back to the first surviving shipped still with no pick', () => {
    const pairs = publicShapeStillPairs('handstand', ['handstand.jpg'], {
      mainStills: {},
      removedStillIds: [],
      removedCoachStillIds: [],
      coachStills: [],
      igStills: [],
    })
    assert.equal(pairs[0]?.stillId, 'default_handstand_0')
    assert.equal(pairs[0]?.url, '/references/handstand.jpg')
  })

  it('puts the main pick first when other stills survive', () => {
    const pairs = publicShapeStillPairs('candlestick', ['candlestick.jpg', 'candlestick_drill.jpg', 'candlestick_arms_down.jpg'], {
      mainStills: { candlestick: 'coach_c1' },
      removedStillIds: [],
      removedCoachStillIds: [],
      coachStills: [{ shapeId: 'candlestick', stillId: 'coach_c1', file: 'coach_coach_c1.jpg' }],
      igStills: [],
    })
    assert.equal(pairs[0]?.stillId, 'coach_c1')
    assert.ok(pairs.length > 1)
  })

  it('excludes a shipped still tombstoned by file name', () => {
    const pairs = publicShapeStillPairs('handstand', ['handstand.jpg'], {
      mainStills: {},
      removedStillIds: [],
      removedCoachStillIds: ['handstand.jpg'],
      coachStills: [],
      igStills: [],
    })
    assert.deepEqual(pairs, [])
  })

  it('excludes a tombstoned upload and returns empty when nothing survives', () => {
    const pairs = publicShapeStillPairs('wall_handstand', ['wall_handstand.jpg'], {
      ...WALL_PICK,
      removedCoachStillIds: ['default_wall_handstand_0', 'coach_mu0oexyb_1s60mv'],
    })
    assert.deepEqual(pairs, [])
  })

  it('ignores a main pick that points at a deleted still', () => {
    const pairs = publicShapeStillPairs('wall_handstand', ['wall_handstand.jpg'], {
      ...WALL_PICK,
      mainStills: { wall_handstand: 'default_wall_handstand_0' },
    })
    assert.equal(pairs[0]?.stillId, 'coach_mu0oexyb_1s60mv')
  })
})
