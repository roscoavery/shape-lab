import assert from 'node:assert/strict'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import test from 'node:test'
import { ASSESSMENTS, MASTERY_LEVELS, masteryFor } from '../../src/content/coachEd/assessments.ts'
import { QUESTION_BANK } from '../../src/content/coachEd/questions/bank.generated.ts'
import { QUESTION_ANSWERS } from './answers.generated.ts'
import { drawQuestionIds, gradeAttempt, normalizePassPercent, questionPool } from './grading.ts'
import {
  applyMediaStatus,
  applyReview,
  CoachEdError,
  EMPTY_COACH_ED,
  EMPTY_PROGRESS,
  findOpenAttempt,
  normalizeFile,
  OPEN_ATTEMPT_MS,
  startAttempt,
  summarize,
  accountProgress,
} from './model.ts'
import { canUseCoachEd } from './routes.ts'
import type { AuthUser } from '../auth/types.ts'

const actor = { accountId: 'acc_admin', displayName: 'Admin' }
const fresh = () => normalizeFile(structuredClone(EMPTY_COACH_ED))
const freshProgress = () => structuredClone(EMPTY_PROGRESS)

function user(role: AuthUser['role'], kiosk = false): AuthUser {
  return { accountId: 'a', email: 'a@b.c', role, displayName: 'A', linkedAthleteIds: [], linkedAccountIds: [], kiosk }
}

test('answer keys line up with the public bank', () => {
  assert.equal(QUESTION_BANK.length, QUESTION_ANSWERS.length)
  const ans = new Map(QUESTION_ANSWERS.map((a) => [a.id, a]))
  for (const q of QUESTION_BANK) {
    const a = ans.get(q.id)
    assert.ok(a, `answer for ${q.id}`)
    assert.ok(q.choices.some((c) => c.id === a.answerId), `${q.id} answer is one of the choices`)
    assert.equal(a.critical, q.critical, `${q.id} critical flag matches`)
    assert.equal(a.topicId, q.topicId)
    assert.ok(a.explain.length > 20, `${q.id} has an explanation`)
  }
})

test('public bank carries no answer fields and answers spread across positions', () => {
  for (const q of QUESTION_BANK) {
    assert.deepEqual(
      Object.keys(q).sort(),
      ['choices', 'critical', 'difficulty', 'id', 'kind', 'prompt', 'sourceIds', 'topicId'],
    )
    for (const c of q.choices) assert.deepEqual(Object.keys(c).sort(), ['id', 'label'])
  }
  const positions = new Set(QUESTION_ANSWERS.map((a) => a.answerId))
  assert.ok(positions.size >= 3, 'correct choice is not stuck on one letter')
})

test('nothing under src imports answer files or raw question source', () => {
  const walk = (dir: string): string[] =>
    readdirSync(dir).flatMap((f) => {
      const p = join(dir, f)
      return statSync(p).isDirectory() ? walk(p) : /\.(ts|tsx)$/.test(f) ? [p] : []
    })
  for (const f of walk(join(process.cwd(), 'src'))) {
    const body = readFileSync(f, 'utf8')
    const imports = body.split('\n').filter((l) => /^\s*(import|export)\b.*\bfrom\b|import\(/.test(l)).join('\n')
    assert.ok(!/answers\.generated|questions\.raw|server\/coachEd/.test(imports), `${f} must not import answer keys`)
  }
})

test('every assessment draws questions, always including every critical one', () => {
  assert.equal(ASSESSMENTS.length, 14)
  for (const a of ASSESSMENTS) {
    const ids = drawQuestionIds(a.id)
    assert.ok(ids && ids.length >= 4, `${a.id} draws at least 4 questions`)
    const pool = questionPool(a)
    const crit = pool.filter((q) => q.critical).map((q) => q.id)
    for (const c of crit) assert.ok(ids.includes(c), `${a.id} includes critical ${c}`)
    assert.equal(new Set(ids).size, ids.length)
    assert.ok(ids.length <= Math.max(a.size, crit.length))
  }
  assert.equal(drawQuestionIds('nope'), null)
})

test('85 percent threshold boundary', () => {
  const ids = QUESTION_ANSWERS.filter((q) => !q.critical).slice(0, 20).map((q) => q.id)
  const key = new Map(QUESTION_ANSWERS.map((q) => [q.id, q.answerId]))
  const answers = (wrong: number) => {
    const given: Record<string, string> = {}
    ids.forEach((id, i) => {
      given[id] = i < wrong ? (key.get(id) === 'a' ? 'b' : 'a') : (key.get(id) as string)
    })
    return given
  }
  assert.equal(gradeAttempt(ids, answers(0)).passed, true)
  assert.equal(gradeAttempt(ids, answers(3)).passed, true, '17/20 = 85%')
  assert.equal(gradeAttempt(ids, answers(4)).passed, false, '16/20 = 80%')
  assert.equal(gradeAttempt(ids, answers(4), 80).passed, true, 'threshold is configurable')
})

test('a missed critical question fails even with a high score', () => {
  const crit = QUESTION_ANSWERS.find((q) => q.critical)!
  const others = QUESTION_ANSWERS.filter((q) => !q.critical).slice(0, 19)
  const given: Record<string, string> = {}
  for (const o of others) given[o.id] = o.answerId
  given[crit.id] = crit.answerId === 'a' ? 'b' : 'a'
  const g = gradeAttempt([crit.id, ...others.map((o) => o.id)], given)
  assert.ok(g.percent >= 95)
  assert.deepEqual(g.criticalMissed, [crit.id])
  assert.equal(g.passed, false)
})

test('unanswered questions count as wrong and empty attempts never pass', () => {
  const ids = QUESTION_ANSWERS.slice(0, 5).map((q) => q.id)
  const g = gradeAttempt(ids, {})
  assert.equal(g.correct, 0)
  assert.equal(g.passed, false)
  assert.equal(gradeAttempt([], {}).passed, false)
  assert.equal(gradeAttempt(['missing'], {}).total, 0)
})

test('pass percent is clamped', () => {
  assert.equal(normalizePassPercent('x'), 85)
  assert.equal(normalizePassPercent(10), 50)
  assert.equal(normalizePassPercent(120), 100)
  assert.equal(normalizePassPercent(90.4), 90)
})

test('review: approval needs reviewer, in-preparation entries cannot be approved', () => {
  const f = fresh()
  assert.throws(() => applyReview(f, { kind: 'condition', id: 'concussion', status: 'approved' }, actor), CoachEdError)
  assert.throws(
    () => applyReview(f, { kind: 'condition', id: 'scoliosis', status: 'approved', reviewerName: 'A', reviewerRole: 'MD' }, actor),
    /in preparation/,
  )
  assert.throws(() => applyReview(f, { kind: 'condition', id: 'nope', status: 'draft' }, actor), /Unknown/)
  applyReview(f, { kind: 'condition', id: 'concussion', status: 'in_review', note: 'sent to athletic trainer' }, actor)
  assert.equal(f.conditions.concussion.status, 'in_review')
  applyReview(f, { kind: 'condition', id: 'concussion', status: 'approved', reviewerName: 'Dr. Example', reviewerRole: 'Sports medicine physician' }, actor)
  assert.equal(f.conditions.concussion.reviewerName, 'Dr. Example')
  assert.equal(f.revisions.length, 2)
  assert.equal(f.revisions[0].from, 'draft')
  assert.equal(f.revisions[1].from, 'in_review')
})

test('media: approval requires reviewer note and verified license facts', () => {
  const f = fresh()
  assert.throws(() => applyMediaStatus(f, { id: 'body-planes-openstax', status: 'approved' }, actor), /reviewer/)
  applyMediaStatus(f, { id: 'body-planes-openstax', status: 'approved', reviewer: 'Anatomy reviewer', note: 'Planes and labels match Gray and Neumann.' }, actor)
  assert.equal(f.media['body-planes-openstax'].status, 'approved')
  assert.equal(f.media['body-planes-openstax'].anatomyReview?.reviewer, 'Anatomy reviewer')
  assert.throws(() => applyMediaStatus(f, { id: 'rej-ganglion-photo', status: 'approved', reviewer: 'x', note: 'y' }, actor), CoachEdError)
  assert.throws(() => applyMediaStatus(f, { id: 'rej-ganglion-photo', status: 'candidate' }, actor), /rejected/)
  assert.throws(() => applyMediaStatus(f, { id: 'salter-harris-gaillard', status: 'rejected' }, actor), /reason/)
  assert.throws(() => applyMediaStatus(f, { id: 'nope', status: 'approved' }, actor), /Unknown/)
})

test('attempt lifecycle: single submit, expiry, per-account isolation', () => {
  const p = freshProgress()
  const t0 = '2026-10-23T10:00:00.000Z'
  const att = startAttempt(p, 'acc1', 'concussion', ['conc-1'], t0)
  assert.equal(findOpenAttempt(p, 'acc1', att.id, t0).id, att.id)
  assert.throws(() => findOpenAttempt(p, 'acc2', att.id, t0), /not found/)
  const late = new Date(Date.parse(t0) + OPEN_ATTEMPT_MS + 1000).toISOString()
  assert.throws(() => findOpenAttempt(p, 'acc1', att.id, late), /expired/)
  att.submittedAt = t0
  assert.throws(() => findOpenAttempt(p, 'acc1', att.id, t0), /already/)
})

test('mastery levels come from passed assessments and are labeled achievements', () => {
  const p = freshProgress()
  const row = accountProgress(p, 'c1')
  assert.equal(summarize(row).mastery, null)
  for (const id of ['injury_fundamentals', 'injury_response', 'concussion']) {
    row.attempts.push({ id: id, assessmentId: id, questionIds: [], startedAt: 'x', submittedAt: '2026-10-23T10:00:00Z', percent: 100, passed: true })
  }
  assert.equal(summarize(row).mastery?.id, 'foundations')
  assert.equal(masteryFor(new Set(MASTERY_LEVELS.at(-1)!.requires))?.id, 'advanced')
  assert.equal(masteryFor(new Set()), null)
})

test('only coaches and gym admin can use coach education', () => {
  assert.equal(canUseCoachEd(user('coach')), true)
  assert.equal(canUseCoachEd(user('admin')), true)
  assert.equal(canUseCoachEd(user('gymOwner')), true)
  assert.equal(canUseCoachEd(user('athlete')), false)
  assert.equal(canUseCoachEd(user('parent')), false)
  assert.equal(canUseCoachEd(user('coach', true)), false)
})
