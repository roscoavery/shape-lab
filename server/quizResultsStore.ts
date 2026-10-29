import { readJson, writeJson } from './persist.ts'

const FILE = 'data/quiz-results.json'

export type QuizResultQuestion = {
  shapeId: string
  shapeName: string
}

export type QuizResultMiss = {
  shapeId: string
  shapeName: string
  picked: string
}

/**
 * What the taker got wrong: one entry per question where the picked
 * answer is not the shown shape's name. Answers beyond the question
 * list are ignored; unanswered questions count as missed.
 */
export function deriveQuizMisses(
  questions: unknown,
  answers: unknown,
): QuizResultMiss[] {
  if (!Array.isArray(questions) || !Array.isArray(answers)) return []
  const missed: QuizResultMiss[] = []
  for (let i = 0; i < questions.length; i++) {
    const q = questions[i] as Record<string, unknown> | undefined
    if (!q || typeof q !== 'object') continue
    const shapeId = typeof q.shapeId === 'string' ? q.shapeId : ''
    const shapeName = typeof q.shapeName === 'string' ? q.shapeName : ''
    if (!shapeId || !shapeName) continue
    const picked = typeof answers[i] === 'string' ? (answers[i] as string) : ''
    if (picked !== shapeName) missed.push({ shapeId, shapeName, picked })
  }
  return missed
}

export type QuizResultsFile = {
  kind: 'shape-lab-quiz-results'
  version: 1
  results: unknown[]
}

export async function readQuizResultsFile(): Promise<QuizResultsFile> {
  const fallback: QuizResultsFile = { kind: 'shape-lab-quiz-results', version: 1, results: [] }
  try {
    const data = await readJson(FILE, fallback)
    if (data && Array.isArray((data as any).results)) {
      return data as QuizResultsFile
    }
  } catch {
    // fall through
  }
  return fallback
}

export async function writeQuizResultsFile(file: QuizResultsFile): Promise<QuizResultsFile> {
  await writeJson(FILE, file)
  return file
}
