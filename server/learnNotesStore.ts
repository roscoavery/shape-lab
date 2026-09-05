/**
 * Gym-computer overlays for Learn physics / anatomy / progression notes.
 */

import { readJson, writeJson } from './persist.ts'

const FILE = 'data/learn-notes.json'

export type LearnNoteOverlay = {
  title?: string
  kicker?: string
  body?: string[]
  gym?: string
}

export type LearnNotesFile = {
  kind: 'shape-lab-learn-notes'
  version: 1
  updatedAt: string
  lessons: Record<string, LearnNoteOverlay>
}

const EMPTY: LearnNotesFile = {
  kind: 'shape-lab-learn-notes',
  version: 1,
  updatedAt: '',
  lessons: {},
}

function cleanOverlay(fields: unknown): LearnNoteOverlay | null {
  if (!fields || typeof fields !== 'object') return null
  const row = fields as Record<string, unknown>
  const title = typeof row.title === 'string' ? row.title : undefined
  const kicker = typeof row.kicker === 'string' ? row.kicker : undefined
  const gym = typeof row.gym === 'string' ? row.gym : undefined
  const body = Array.isArray(row.body)
    ? row.body.filter((p): p is string => typeof p === 'string' && p.trim().length > 0)
    : undefined
  if (!title?.trim() && !kicker?.trim() && !gym?.trim() && !body?.length) return null
  return { title, kicker, gym, body }
}

export async function readLearnNotesFile(): Promise<LearnNotesFile> {
  const data = await readJson<LearnNotesFile>(FILE, { ...EMPTY })
  if (!data || data.kind !== 'shape-lab-learn-notes' || typeof data.lessons !== 'object') {
    return { ...EMPTY }
  }
  return data
}

export async function writeLearnNotesFile(data: unknown): Promise<LearnNotesFile> {
  const parsed = data as Partial<LearnNotesFile>
  const lessons: Record<string, LearnNoteOverlay> = {}
  const incoming = parsed.lessons && typeof parsed.lessons === 'object' ? parsed.lessons : {}
  for (const [id, fields] of Object.entries(incoming)) {
    if (!id) continue
    const cleaned = cleanOverlay(fields)
    if (cleaned) lessons[id] = cleaned
  }
  const next: LearnNotesFile = {
    kind: 'shape-lab-learn-notes',
    version: 1,
    updatedAt: new Date().toISOString(),
    lessons,
  }
  await writeJson(FILE, next)
  return next
}
