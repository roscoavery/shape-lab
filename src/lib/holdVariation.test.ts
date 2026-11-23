import test from 'node:test'
import assert from 'node:assert/strict'
import {
  holdVariationDisplayName,
  variationFromSourceLabel,
  variationKeyForLog,
} from './holdVariation'

test('display: plain hold keeps the base title', () => {
  assert.equal(holdVariationDisplayName(undefined, 'Hollow arms down'), 'Hollow arms down')
  assert.equal(holdVariationDisplayName('', 'Side plank'), 'Side plank')
})

test('display: variation leads the drill name', () => {
  assert.equal(
    holdVariationDisplayName('Bent-knee', 'Hollow arms down'),
    'Bent-knee Hollow arms down',
  )
  assert.equal(
    holdVariationDisplayName('On knees', 'Side plank'),
    'On knees Side plank',
  )
  assert.equal(
    holdVariationDisplayName('Bird dogs', 'Superman'),
    'Bird dogs Superman',
  )
  assert.equal(holdVariationDisplayName('Tucked', 'Hollow arms down'), 'Tucked Hollow arms down')
})

test('display: side support stands alone', () => {
  assert.equal(holdVariationDisplayName('Side support', 'Side plank'), 'Side support')
})

test('display: back to wall drops the repeated wall', () => {
  assert.equal(
    holdVariationDisplayName('Back to wall', 'Wall handstand'),
    'Back to wall handstand',
  )
})

test('display: arms up drops arms down from the base title', () => {
  assert.equal(
    holdVariationDisplayName('Arms up', 'Hollow arms down'),
    'Arms up Hollow',
  )
  assert.equal(
    holdVariationDisplayName('Arms up · Bent-knee', 'Hollow arms down'),
    'Arms up · Bent-knee Hollow',
  )
})

test('grouping key: variation is its own hold type', () => {
  assert.equal(
    variationKeyForLog({ shapeId: 'hollow_arms_down', variation: 'Bent-knee' }),
    'hollow_arms_down::bent-knee',
  )
  assert.equal(
    variationKeyForLog({ shapeId: 'hollow_arms_down' }),
    'hollow_arms_down::',
  )
  assert.notEqual(
    variationKeyForLog({ shapeId: 'hollow_arms_down', variation: 'Bent-knee' }),
    variationKeyForLog({ shapeId: 'hollow_arms_down' }),
  )
  assert.equal(
    variationKeyForLog({ shapeId: 'side_plank', variation: 'Side support' }),
    'side_plank::side support',
  )
})

test('backfill: bent-knee parsed from lesson and class labels', () => {
  assert.equal(
    variationFromSourceLabel('Lesson · Hollow · arms down · Bent-knee'),
    'Bent-knee',
  )
  assert.equal(
    variationFromSourceLabel('In class · Hollow · arms down · Bent-knee (Connections (Monday 5pm))'),
    'Bent-knee',
  )
  assert.equal(
    variationFromSourceLabel('Lesson · Hollow · arms down'),
    undefined,
  )
})

test('backfill: arms up composes with the spec', () => {
  assert.equal(variationFromSourceLabel('Lesson · Hollow · arms up'), 'Arms up')
  assert.equal(
    variationFromSourceLabel('Lesson · Hollow · arms up · Tucked'),
    'Arms up · Tucked',
  )
  assert.equal(
    variationFromSourceLabel('In class · Hollow · arms down · Curl up (Reps)'),
    'Curl up',
  )
})

test('backfill: side plank specs and sides', () => {
  assert.equal(
    variationFromSourceLabel('Lesson · Side plank · right · Side support'),
    'Side support',
  )
  assert.equal(
    variationFromSourceLabel('In class · Side plank · left · On knees (Connections)'),
    'On knees',
  )
  assert.equal(
    variationFromSourceLabel('Lesson · Side plank · right'),
    undefined,
  )
})

test('backfill: other specs, contest labels, and non-matches', () => {
  assert.equal(
    variationFromSourceLabel('Wall handstand contest · L'),
    'L',
  )
  assert.equal(
    variationFromSourceLabel('Lesson · Superman · Bird dogs'),
    'Bird dogs',
  )
  assert.equal(
    variationFromSourceLabel('Lesson · Wall handstand · Piked'),
    'Piked',
  )
  assert.equal(variationFromSourceLabel('Lesson · Hollow · arms down'), undefined)
  assert.equal(variationFromSourceLabel('Lesson · Push-ups · Wide hands'), 'Wide hands')
  assert.equal(variationFromSourceLabel(undefined), undefined)
  assert.equal(variationFromSourceLabel(''), undefined)
})
