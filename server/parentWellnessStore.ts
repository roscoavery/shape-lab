/**
 * Parent personal wellness. Separate from athlete injury / pain journals.
 * Only the parent account (or admin) may read or write this file.
 */

import { readJson, writeJson } from './persist.ts'

const FILE = 'data/parent-wellness.json'

const EXERCISE_IDS = new Set([
  'glute_bridge',
  'bird_dog',
  'back_extension',
  'walking',
  'mobility',
  'other',
])

export type ParentPainEntry = {
  id: string
  date: string
  painLevel: number
  location?: string
  notes?: string
  activity?: string
}

export type ParentExerciseEntry = {
  id: string
  date: string
  exerciseId: string
  label: string
  completed: boolean
  holdSeconds?: number
  reps?: number
  notes?: string
}

export type ParentJournalEntry = {
  id: string
  date: string
  body: string
}

export type ParentWellnessProfile = {
  accountId: string
  updatedAt: string
  currentGoals?: string
  mobilityGoals?: string
  strengthGoals?: string
  painAreas?: string
  painEntries: ParentPainEntry[]
  exercises: ParentExerciseEntry[]
  journal: ParentJournalEntry[]
}

type WellnessFile = {
  kind: 'shape-lab-parent-wellness'
  version: 1
  profiles: Record<string, ParentWellnessProfile>
}

const EMPTY: WellnessFile = { kind: 'shape-lab-parent-wellness', version: 1, profiles: {} }

function text(value: unknown, max: number): string {
  return typeof value === 'string' ? value.trim().slice(0, max) : ''
}

function asPain(row: unknown): ParentPainEntry | null {
  if (!row || typeof row !== 'object') return null
  const r = row as Record<string, unknown>
  if (typeof r.id !== 'string' || typeof r.date !== 'string') return null
  const painLevel = Number(r.painLevel)
  if (!Number.isFinite(painLevel)) return null
  return {
    id: r.id.slice(0, 80),
    date: r.date.slice(0, 40),
    painLevel: Math.min(10, Math.max(0, painLevel)),
    location: text(r.location, 80) || undefined,
    notes: text(r.notes, 800) || undefined,
    activity: text(r.activity, 200) || undefined,
  }
}

function asExercise(row: unknown): ParentExerciseEntry | null {
  if (!row || typeof row !== 'object') return null
  const r = row as Record<string, unknown>
  if (typeof r.id !== 'string' || typeof r.date !== 'string') return null
  const exerciseId = typeof r.exerciseId === 'string' && EXERCISE_IDS.has(r.exerciseId) ? r.exerciseId : 'other'
  return {
    id: r.id.slice(0, 80),
    date: r.date.slice(0, 40),
    exerciseId,
    label: text(r.label, 80) || 'Exercise',
    completed: r.completed !== false,
    holdSeconds: typeof r.holdSeconds === 'number' ? r.holdSeconds : undefined,
    reps: typeof r.reps === 'number' ? r.reps : undefined,
    notes: text(r.notes, 400) || undefined,
  }
}

function asJournal(row: unknown): ParentJournalEntry | null {
  if (!row || typeof row !== 'object') return null
  const r = row as Record<string, unknown>
  if (typeof r.id !== 'string' || typeof r.date !== 'string' || typeof r.body !== 'string') return null
  return { id: r.id.slice(0, 80), date: r.date.slice(0, 40), body: r.body.trim().slice(0, 2000) }
}

export function emptyParentWellness(accountId: string): ParentWellnessProfile {
  return {
    accountId,
    updatedAt: new Date().toISOString(),
    painEntries: [],
    exercises: [],
    journal: [],
  }
}

function sanitizeProfile(accountId: string, raw: unknown): ParentWellnessProfile {
  const base = emptyParentWellness(accountId)
  if (!raw || typeof raw !== 'object') return base
  const r = raw as Record<string, unknown>
  return {
    accountId,
    updatedAt: typeof r.updatedAt === 'string' ? r.updatedAt : new Date().toISOString(),
    currentGoals: text(r.currentGoals, 400) || undefined,
    mobilityGoals: text(r.mobilityGoals, 400) || undefined,
    strengthGoals: text(r.strengthGoals, 400) || undefined,
    painAreas: text(r.painAreas, 200) || undefined,
    painEntries: (Array.isArray(r.painEntries) ? r.painEntries : []).map(asPain).filter((row): row is ParentPainEntry => Boolean(row)).slice(0, 200),
    exercises: (Array.isArray(r.exercises) ? r.exercises : []).map(asExercise).filter((row): row is ParentExerciseEntry => Boolean(row)).slice(0, 400),
    journal: (Array.isArray(r.journal) ? r.journal : []).map(asJournal).filter((row): row is ParentJournalEntry => Boolean(row)).slice(0, 200),
  }
}

async function readFile(): Promise<WellnessFile> {
  const stored = await readJson<WellnessFile>(FILE, EMPTY)
  if (!stored || stored.kind !== 'shape-lab-parent-wellness' || !stored.profiles || typeof stored.profiles !== 'object') {
    return { ...EMPTY, profiles: {} }
  }
  return stored
}

export async function readParentWellness(accountId: string): Promise<ParentWellnessProfile> {
  const file = await readFile()
  return sanitizeProfile(accountId, file.profiles[accountId])
}

export async function writeParentWellness(
  accountId: string,
  raw: unknown,
): Promise<ParentWellnessProfile> {
  const profile = sanitizeProfile(accountId, raw)
  profile.updatedAt = new Date().toISOString()
  const file = await readFile()
  await writeJson(FILE, {
    kind: 'shape-lab-parent-wellness',
    version: 1,
    profiles: { ...file.profiles, [accountId]: profile },
  } satisfies WellnessFile)
  return profile
}
