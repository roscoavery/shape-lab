import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  answeredQuestionIds,
  applyIntakeField,
  CORE_INTAKE,
  isValidDateOfBirth,
  pendingIntake,
  upsertIntakeAnswer,
} from './intakeQuestions'
import type { Athlete } from '../types'

function athlete(patch: Partial<Athlete> = {}): Athlete {
  return { id: 'ath_test', name: 'Test Athlete', ...patch } as Athlete
}

describe('intake question order', () => {
  it('asks birthday and parent phone first, skill questions keep their order', () => {
    const ids = CORE_INTAKE.map((q) => q.id)
    assert.equal(ids[0], 'birthday')
    assert.equal(ids[1], 'parentPhone')
    const skillOrder = [
      'shoulderOpen',
      'handstandWall',
      'handstandFloor',
      'hollowHold',
      'supermanHold',
      'vUps',
      'pushUps',
      'cartwheelSide',
      'twistDirection',
      'dominantHand',
      'skateStance',
      'harderShape',
      'favoriteColor',
      'photo',
    ]
    const positions = skillOrder.map((id) => ids.indexOf(id))
    assert.ok(positions.every((p) => p >= 0), 'every skill question is present')
    assert.deepEqual([...positions].sort((a, b) => a - b), positions)
  })
})

describe('isValidDateOfBirth', () => {
  it('accepts a real past date', () => {
    assert.equal(isValidDateOfBirth('2014-09-14'), true)
  })
  it('rejects impossible, future, and non-ISO values', () => {
    assert.equal(isValidDateOfBirth('2026-02-30'), false)
    assert.equal(isValidDateOfBirth('2030-01-01'), false)
    assert.equal(isValidDateOfBirth('09/14/2014'), false)
    assert.equal(isValidDateOfBirth('2014-9-4'), false)
    assert.equal(isValidDateOfBirth(''), false)
    assert.equal(isValidDateOfBirth(undefined), false)
  })
})

describe('birthday and parent phone capture', () => {
  it('pendingIntake asks birthday first until a birthday is stored', () => {
    const pending = pendingIntake(athlete({}))
    assert.equal(pending[0]?.id, 'birthday')
    assert.equal(
      pendingIntake(athlete({ dateOfBirth: '2014-09-14' })).some(
        (q) => q.id === 'birthday',
      ),
      false,
    )
  })

  it('a blank recorded answer does not count as answered', () => {
    const a = athlete({
      intakeAnswers: [
        { questionId: 'parentPhone', prompt: '', answer: '', askedAt: '' },
        { questionId: 'cartwheelSide', prompt: '', answer: 'not_sure', askedAt: '' },
      ],
    })
    const pending = pendingIntake(a).map((q) => q.id)
    assert.ok(pending.includes('parentPhone'))
    assert.ok(pending.includes('cartwheelSide'))
  })

  it('a stored phone or birthday counts as answered', () => {
    const a = athlete({ parentPhone: '555-0100', dateOfBirth: '2014-09-14' })
    const pending = pendingIntake(a).map((q) => q.id)
    assert.equal(pending.includes('parentPhone'), false)
    assert.equal(pending.includes('birthday'), false)
  })

  it('applyIntakeField stores only a valid birthday', () => {
    assert.equal(
      applyIntakeField(athlete({}), 'birthday', '2014-09-14').dateOfBirth,
      '2014-09-14',
    )
    assert.equal(
      applyIntakeField(athlete({}), 'birthday', 'not a date').dateOfBirth,
      undefined,
    )
  })

  it('answeredQuestionIds ignores blank rows and includes stored fields', () => {
    const a = athlete({
      dateOfBirth: '2014-09-14',
      photoDataUrl: 'data:image/png;base64,xxx',
      intakeAnswers: [
        { questionId: 'parentPhone', prompt: '', answer: '', askedAt: '' },
        { questionId: 'vUps', prompt: '', answer: 'over_10', askedAt: '' },
      ],
    })
    const ids = answeredQuestionIds(a)
    assert.ok(ids.includes('birthday'))
    assert.ok(ids.includes('photo'))
    assert.ok(ids.includes('vUps'))
    assert.equal(ids.includes('parentPhone'), false)
  })

  it('not_sure never sticks as an answer', () => {
    const next = upsertIntakeAnswer(athlete({}), {
      questionId: 'twistDirection',
      prompt: '',
      answer: 'not_sure',
      askedAt: '',
    })
    assert.equal(next.intakeAnswers?.length, 0)
  })
})
