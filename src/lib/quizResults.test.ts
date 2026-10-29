import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  normalizeQuizResult,
  pickLatestQuizResult,
  quizResultKnowsMisses,
  quizResultMisses,
  type QuizResult,
} from './quizResults.ts'

function result(overrides: Partial<QuizResult>): QuizResult {
  return {
    id: 'quiz_1',
    athleteId: 'ath_baylor',
    firstName: 'Baylor',
    lastName: 'Weaver',
    score: 2,
    total: 3,
    answers: ['Tuck', 'Tuck', 'Layout'],
    questions: [
      { shapeId: 'tuck', shapeName: 'Tuck' },
      { shapeId: 'pike', shapeName: 'Pike' },
      { shapeId: 'layout', shapeName: 'Layout' },
    ],
    takenAt: '2026-10-28T20:00:00.000Z',
    ...overrides,
  }
}

describe('quizResultMisses', () => {
  it('prefers the stored missed list', () => {
    const r = result({ missed: [{ shapeId: 'pike', shapeName: 'Pike', picked: 'Tuck' }] })
    assert.deepEqual(quizResultMisses(r), [{ shapeId: 'pike', shapeName: 'Pike', picked: 'Tuck' }])
  })

  it('derives misses from questions and answers when none were stored', () => {
    const r = result({ missed: undefined })
    assert.deepEqual(quizResultMisses(r), [{ shapeId: 'pike', shapeName: 'Pike', picked: 'Tuck' }])
  })

  it('reports unknown misses for records saved without questions', () => {
    const r = result({ questions: [], missed: undefined })
    assert.deepEqual(quizResultMisses(r), [])
    assert.equal(quizResultKnowsMisses(r), false)
  })
})

describe('pickLatestQuizResult', () => {
  it('picks the most recent takenAt', () => {
    const older = result({ id: 'quiz_old', takenAt: '2026-10-27T20:00:00.000Z' })
    const newer = result({ id: 'quiz_new', takenAt: '2026-10-28T20:00:00.000Z' })
    assert.equal(pickLatestQuizResult([older, newer])?.id, 'quiz_new')
    assert.equal(pickLatestQuizResult([]), null)
  })
})

describe('normalizeQuizResult', () => {
  it('keeps old name-only records readable', () => {
    const r = normalizeQuizResult({
      id: 'quiz_old',
      firstName: 'Berkley',
      lastName: 'Weaver',
      score: 9,
      total: 12,
      answers: ['Tuck'],
      takenAt: '2026-10-28T19:00:00.000Z',
    })
    assert.equal(r?.athleteId, null)
    assert.deepEqual(r?.questions, [])
    assert.equal(r?.score, 9)
  })

  it('rejects records without an id or a numeric score', () => {
    assert.equal(normalizeQuizResult({ firstName: 'Baylor', score: 9, total: 12 }), null)
    assert.equal(
      normalizeQuizResult({ id: 'quiz_x', firstName: 'Baylor', score: 'nine', total: 12 }),
      null,
    )
  })
})
