import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { deriveQuizMisses } from './quizResultsStore.ts'

const questions = [
  { shapeId: 'tuck', shapeName: 'Tuck' },
  { shapeId: 'pike', shapeName: 'Pike' },
  { shapeId: 'layout', shapeName: 'Layout' },
]

describe('deriveQuizMisses', () => {
  it('returns nothing when every answer matches', () => {
    assert.deepEqual(deriveQuizMisses(questions, ['Tuck', 'Pike', 'Layout']), [])
  })

  it('lists each miss with the shape and the picked answer', () => {
    assert.deepEqual(deriveQuizMisses(questions, ['Tuck', 'Tuck', 'Layout']), [
      { shapeId: 'pike', shapeName: 'Pike', picked: 'Tuck' },
    ])
  })

  it('counts an unanswered question as missed', () => {
    assert.deepEqual(deriveQuizMisses(questions, ['Tuck']), [
      { shapeId: 'pike', shapeName: 'Pike', picked: '' },
      { shapeId: 'layout', shapeName: 'Layout', picked: '' },
    ])
  })

  it('ignores answers beyond the question list and malformed questions', () => {
    assert.deepEqual(
      deriveQuizMisses([...questions, { shapeId: '', shapeName: '' }, null], ['Tuck', 'Pike', 'Layout', 'Extra']),
      [],
    )
  })

  it('returns nothing for non-array input', () => {
    assert.deepEqual(deriveQuizMisses(null, ['Tuck']), [])
    assert.deepEqual(deriveQuizMisses(questions, 'Tuck'), [])
  })
})
