import { ASSESSMENTS, assessmentById } from '../../src/content/coachEd/assessments.ts'
import { ASSESSMENT_PASS_PERCENT } from '../../src/content/coachEd/types.ts'
import type { Assessment } from '../../src/content/coachEd/types.ts'
import { QUESTION_ANSWERS, type ServerQuestion } from './answers.generated.ts'

export const MIN_PASS_PERCENT = 50
export const MAX_PASS_PERCENT = 100
export const DEFAULT_PASS_PERCENT = ASSESSMENT_PASS_PERCENT

const byId = new Map(QUESTION_ANSWERS.map((q) => [q.id, q]))

export function questionPool(a: Assessment): ServerQuestion[] {
  const topics = new Set(a.topicIds)
  return QUESTION_ANSWERS.filter((q) => topics.has(q.topicId))
}

export function normalizePassPercent(raw: unknown): number {
  const n = typeof raw === 'number' ? raw : Number(raw)
  if (!Number.isFinite(n)) return DEFAULT_PASS_PERCENT
  return Math.min(MAX_PASS_PERCENT, Math.max(MIN_PASS_PERCENT, Math.round(n)))
}

function shuffled<T>(list: T[], rand: () => number): T[] {
  const out = list.slice()
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

/**
 * Every critical safety question in the pool is always drawn, so a pass can
 * never skip one. The rest of the draw is random up to `size`.
 */
export function drawQuestionIds(assessmentId: string, rand: () => number = Math.random): string[] | null {
  const a = assessmentById(assessmentId)
  if (!a) return null
  const pool = questionPool(a)
  if (pool.length === 0) return null
  const critical = pool.filter((q) => q.critical)
  const rest = shuffled(pool.filter((q) => !q.critical), rand)
  const room = Math.max(0, a.size - critical.length)
  return shuffled([...critical, ...rest.slice(0, room)], rand).map((q) => q.id)
}

export type QuestionResult = {
  id: string
  given: string | null
  correct: boolean
  critical: boolean
  /** Revealed only after the attempt is closed. */
  answerId: string
  explain: string
}

export type GradeResult = {
  total: number
  correct: number
  percent: number
  passPercent: number
  criticalMissed: string[]
  passed: boolean
  results: QuestionResult[]
}

/** Unanswered counts as wrong. A pass needs the percent AND every critical question right. */
export function gradeAttempt(
  questionIds: string[],
  given: Record<string, unknown>,
  passPercent: number = DEFAULT_PASS_PERCENT,
): GradeResult {
  const results: QuestionResult[] = []
  for (const id of questionIds) {
    const q = byId.get(id)
    if (!q) continue
    const g = typeof given[id] === 'string' ? (given[id] as string) : null
    results.push({
      id,
      given: g,
      correct: g === q.answerId,
      critical: q.critical,
      answerId: q.answerId,
      explain: q.explain,
    })
  }
  const total = results.length
  const correct = results.filter((r) => r.correct).length
  const criticalMissed = results.filter((r) => r.critical && !r.correct).map((r) => r.id)
  const meets = total > 0 && correct * 100 >= passPercent * total
  return {
    total,
    correct,
    percent: total ? Math.round((correct / total) * 1000) / 10 : 0,
    passPercent,
    criticalMissed,
    passed: meets && criticalMissed.length === 0,
    results,
  }
}

export function allAssessmentIds(): string[] {
  return ASSESSMENTS.map((a) => a.id)
}
