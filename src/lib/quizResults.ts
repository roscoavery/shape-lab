export type QuizResultMiss = {
  shapeId: string
  shapeName: string
  picked: string
}

export type QuizResultQuestion = {
  shapeId: string
  shapeName: string
}

export type QuizResult = {
  id: string
  athleteId: string | null
  firstName: string
  lastName: string
  score: number
  total: number
  answers: string[]
  questions: QuizResultQuestion[]
  missed?: QuizResultMiss[]
  takenAt: string
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object'
}

function asMiss(value: unknown): QuizResultMiss | null {
  if (!isRecord(value)) return null
  if (typeof value.shapeId !== 'string' || typeof value.shapeName !== 'string') return null
  return {
    shapeId: value.shapeId,
    shapeName: value.shapeName,
    picked: typeof value.picked === 'string' ? value.picked : '',
  }
}

export function normalizeQuizResult(value: unknown): QuizResult | null {
  if (!isRecord(value)) return null
  if (typeof value.id !== 'string' || !value.id) return null
  const score = Number(value.score)
  const total = Number(value.total)
  if (!Number.isFinite(score) || !Number.isFinite(total)) return null
  const questions = (Array.isArray(value.questions) ? value.questions : [])
    .filter(isRecord)
    .map((q) => ({
      shapeId: typeof q.shapeId === 'string' ? q.shapeId : '',
      shapeName: typeof q.shapeName === 'string' ? q.shapeName : '',
    }))
    .filter((q) => q.shapeId && q.shapeName)
  const missed = Array.isArray(value.missed)
    ? value.missed.map(asMiss).filter((m): m is QuizResultMiss => m !== null)
    : undefined
  return {
    id: value.id,
    athleteId: typeof value.athleteId === 'string' && value.athleteId ? value.athleteId : null,
    firstName: typeof value.firstName === 'string' ? value.firstName : '',
    lastName: typeof value.lastName === 'string' ? value.lastName : '',
    score,
    total,
    answers: Array.isArray(value.answers)
      ? value.answers.filter((a): a is string => typeof a === 'string')
      : [],
    questions,
    missed,
    takenAt: typeof value.takenAt === 'string' ? value.takenAt : '',
  }
}

/** Misses for a result: the stored list, or derived from questions + answers. */
export function quizResultMisses(result: QuizResult): QuizResultMiss[] {
  if (result.missed) return result.missed
  const missed: QuizResultMiss[] = []
  for (let i = 0; i < result.questions.length; i++) {
    const q = result.questions[i]!
    const picked = result.answers[i] ?? ''
    if (picked !== q.shapeName) missed.push({ shapeId: q.shapeId, shapeName: q.shapeName, picked })
  }
  return missed
}

/** Whether the record can say what was missed at all. */
export function quizResultKnowsMisses(result: QuizResult): boolean {
  return result.questions.length > 0
}

export function pickLatestQuizResult(results: QuizResult[]): QuizResult | null {
  if (results.length === 0) return null
  return [...results].sort((a, b) => b.takenAt.localeCompare(a.takenAt))[0] ?? null
}

export async function fetchQuizResults(athlete: {
  id: string
  firstName?: string
  lastName?: string
}): Promise<QuizResult[]> {
  const params = new URLSearchParams({ athleteId: athlete.id })
  if (athlete.firstName) params.set('firstName', athlete.firstName)
  if (athlete.lastName) params.set('lastName', athlete.lastName)
  const res = await fetch(`/api/quiz-results?${params.toString()}`)
  if (!res.ok) return []
  const data = await res.json().catch(() => ({}))
  if (!Array.isArray(data?.results)) return []
  return data.results.map(normalizeQuizResult).filter((r: unknown): r is QuizResult => r !== null)
}

export function formatQuizDate(takenAt: string): string {
  const d = new Date(takenAt)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}
