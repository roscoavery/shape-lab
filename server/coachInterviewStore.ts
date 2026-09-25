/**
 * Coach interview answers — Ryan's own words for the Parent Guide.
 * Stored in data/coach-interview.json on the gym computer (auto-mirrored).
 */

import { readJson, writeJson } from './persist.ts'

const FILE = 'data/coach-interview.json'

export type CoachInterviewFile = {
  kind: 'shape-lab-coach-interview'
  version: 1
  updatedAt: string
  answers: Record<string, string>
}

const EMPTY: CoachInterviewFile = {
  kind: 'shape-lab-coach-interview',
  version: 1,
  updatedAt: '',
  answers: {},
}

export async function readCoachInterviewFile(): Promise<CoachInterviewFile> {
  const data = await readJson<CoachInterviewFile>(FILE, { ...EMPTY })
  if (!data || data.kind !== 'shape-lab-coach-interview' || typeof data.answers !== 'object') {
    return { ...EMPTY }
  }
  return data
}

export async function writeCoachInterviewFile(data: unknown): Promise<CoachInterviewFile> {
  const parsed = data as Partial<CoachInterviewFile>
  const answers: Record<string, string> = {}
  const incoming = parsed.answers && typeof parsed.answers === 'object' ? parsed.answers : {}
  for (const [id, text] of Object.entries(incoming)) {
    if (!id || typeof text !== 'string') continue
    const trimmed = text.trim()
    if (trimmed) answers[id] = text
  }
  const next: CoachInterviewFile = {
    kind: 'shape-lab-coach-interview',
    version: 1,
    updatedAt: new Date().toISOString(),
    answers,
  }
  await writeJson(FILE, next)
  return next
}
