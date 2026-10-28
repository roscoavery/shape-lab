import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  answeredQuestionIds,
  applyIntakeField,
  CORE_INTAKE,
  intakeAnswerLines,
  isValidDateOfBirth,
  pendingIntake,
  publicIntakeQuestions,
  upsertIntakeAnswer,
  weeklyQuestionId,
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

describe('injury questions', () => {
  it('sits right after parent phone, before the skill questions', () => {
    const ids = CORE_INTAKE.map((q) => q.id)
    assert.equal(ids[2], 'injuryAware')
    assert.equal(ids[3], 'injuryDetails')
    assert.ok(ids.indexOf('injuryDetails') < ids.indexOf('shoulderOpen'))
  })

  it('asks for details only after a yes', () => {
    const detail = CORE_INTAKE.find((q) => q.id === 'injuryDetails')!
    assert.equal(detail.kind, 'text')
    assert.equal(detail.showIf?.({ injuryAware: 'yes' }), true)
    assert.equal(detail.showIf?.({ injuryAware: 'no' }), false)
    assert.equal(detail.showIf?.({}), false)
  })

  it('pendingIntake shows the detail once yes is stored', () => {
    const a = athlete({
      intakeAnswers: [
        { questionId: 'injuryAware', prompt: '', answer: 'yes', askedAt: '2026-10-28T00:00:00Z' },
      ],
    })
    assert.ok(pendingIntake(a).some((q) => q.id === 'injuryDetails'))
    const no = athlete({
      intakeAnswers: [
        { questionId: 'injuryAware', prompt: '', answer: 'no', askedAt: '2026-10-28T00:00:00Z' },
      ],
    })
    assert.equal(pendingIntake(no).some((q) => q.id === 'injuryDetails'), false)
  })
})

describe('publicIntakeQuestions', () => {
  it('includes the weekly body-feeling question under its week-keyed id', () => {
    const list = publicIntakeQuestions([], {}, '2026-W44')
    const weekly = list.find((q) => q.id === weeklyQuestionId('week_energy', '2026-W44'))
    assert.ok(weekly)
    assert.equal(weekly?.prompt, 'How is your body feeling for tumbling this week?')
    assert.equal(list.at(-1)?.id, weekly?.id)
  })

  it('skips the weekly question once answered this week, asks again next week', () => {
    const answered = [weeklyQuestionId('week_energy', '2026-W44')]
    assert.equal(
      publicIntakeQuestions(answered, {}, '2026-W44').some((q) => q.id.startsWith('week_energy')),
      false,
    )
    assert.equal(
      publicIntakeQuestions(answered, {}, '2026-W45').some((q) => q.id.startsWith('week_energy')),
      true,
    )
  })
})

describe('intakeAnswerLines', () => {
  it('shows what the athlete said, newest row wins, codes as labels', () => {
    const a = athlete({
      vUps: 'under_10',
      intakeAnswers: [
        { questionId: 'vUps', prompt: '', answer: 'under_10', askedAt: '2026-10-20T00:00:00Z' },
        { questionId: 'vUps', prompt: '', answer: 'over_20', askedAt: '2026-10-28T00:00:00Z' },
        { questionId: 'hollowHold', prompt: '', answer: 'over_min', askedAt: '2026-10-28T00:00:00Z' },
        {
          questionId: 'injuryAware',
          prompt: '',
          answer: 'yes',
          askedAt: '2026-10-28T00:00:00Z',
        },
        {
          questionId: 'injuryDetails',
          prompt: '',
          answer: 'Sprained left ankle, three weeks ago.',
          askedAt: '2026-10-28T00:00:00Z',
        },
        {
          questionId: 'week_energy_2026-W43',
          prompt: '',
          answer: 'sore',
          askedAt: '2026-10-21T00:00:00Z',
        },
        {
          questionId: 'week_energy_2026-W44',
          prompt: '',
          answer: 'fresh',
          askedAt: '2026-10-28T00:00:00Z',
        },
      ],
    })
    const lines = intakeAnswerLines(a)
    const byId = new Map(lines.map((l) => [l.id, l.answer]))
    assert.equal(byId.get('vUps'), 'Over 20')
    assert.equal(byId.get('hollowHold'), 'Over a minute')
    assert.equal(byId.get('injuryAware'), 'Yes')
    assert.equal(byId.get('injuryDetails'), 'Sprained left ankle, three weeks ago.')
    assert.equal(byId.get('week_energy'), 'Fresh')
    assert.equal(lines.some((l) => l.id === 'photo'), false)
  })

  it('falls back to stored fields and skips non-answers', () => {
    const a = athlete({
      handstandWall: 'over_min',
      intakeAnswers: [
        { questionId: 'twistDirection', prompt: '', answer: 'not_sure', askedAt: '' },
        { questionId: 'vUps', prompt: '', answer: '', askedAt: '' },
      ],
    })
    const lines = intakeAnswerLines(a)
    const byId = new Map(lines.map((l) => [l.id, l.answer]))
    assert.equal(byId.get('handstandWall'), 'Over a minute')
    assert.equal(byId.has('twistDirection'), false)
    assert.equal(byId.has('vUps'), false)
  })

  it('is empty when nothing is answered', () => {
    assert.deepEqual(intakeAnswerLines(athlete({})), [])
  })
})
