import { readJson, writeJson } from './persist.ts'

const FILE = 'data/quiz-results.json'

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
