/**
 * Homework extras that sync with the gym roster:
 * dismissed assignments, coach-authored exercises, injury + back-care journals.
 */

import type { CoachExercise, InjuryEntry, PainJournalEntry } from '../types'

function createId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
}

const DISMISSED_KEY = 'shape-lab.homeworkDismissed.v1'
const COACH_EX_KEY = 'shape-lab.coachExercises.v1'
const INJURY_KEY = 'shape-lab.injuryLogs.v1'
const PAIN_KEY = 'shape-lab.painJournal.v1'

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return fallback
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

function writeJson(key: string, value: unknown) {
  localStorage.setItem(key, JSON.stringify(value))
}

function pushRosterSoon() {
  void import('./rosterSync')
    .then((m) => m.pushServerRoster())
    .catch(() => {})
}

export function loadDismissedHomeworkKeys(): string[] {
  const raw = readJson<unknown>(DISMISSED_KEY, [])
  if (!Array.isArray(raw)) return []
  return raw.filter((k): k is string => typeof k === 'string' && k.length > 0)
}

export function saveDismissedHomeworkKeys(keys: string[]) {
  writeJson(DISMISSED_KEY, [...new Set(keys)])
  pushRosterSoon()
}

export function dismissHomeworkKey(key: string) {
  if (!key) return
  saveDismissedHomeworkKeys([...loadDismissedHomeworkKeys(), key])
}

export function undismissHomeworkKey(key: string) {
  saveDismissedHomeworkKeys(loadDismissedHomeworkKeys().filter((k) => k !== key))
}

export function loadCoachExercises(coachId?: string): CoachExercise[] {
  const all = readJson<CoachExercise[]>(COACH_EX_KEY, [])
  return coachId ? all.filter((e) => e.coachId === coachId) : all
}

export function saveCoachExercises(items: CoachExercise[]) {
  writeJson(COACH_EX_KEY, items)
  pushRosterSoon()
}

export function addCoachExercise(
  input: Omit<CoachExercise, 'id' | 'createdAt'> & { id?: string },
): CoachExercise {
  const next: CoachExercise = {
    id: input.id ?? createId('cx'),
    coachId: input.coachId,
    name: input.name.trim(),
    trackMode: input.trackMode,
    notes: input.notes?.trim() || undefined,
    createdAt: new Date().toISOString(),
  }
  saveCoachExercises([...loadCoachExercises(), next])
  return next
}

export function removeCoachExercise(id: string) {
  saveCoachExercises(loadCoachExercises().filter((e) => e.id !== id))
}

export function loadInjuryLogs(athleteId?: string): InjuryEntry[] {
  const all = readJson<InjuryEntry[]>(INJURY_KEY, [])
  const mine = athleteId ? all.filter((e) => e.athleteId === athleteId) : all
  return mine.sort((a, b) => b.date.localeCompare(a.date))
}

export function saveInjuryLogs(items: InjuryEntry[]) {
  writeJson(INJURY_KEY, items.slice(0, 400))
  pushRosterSoon()
}

export function addInjuryEntry(entry: InjuryEntry) {
  saveInjuryLogs([entry, ...loadInjuryLogs()])
}

export function loadPainJournal(athleteId?: string): PainJournalEntry[] {
  const all = readJson<PainJournalEntry[]>(PAIN_KEY, [])
  const mine = athleteId ? all.filter((e) => e.athleteId === athleteId) : all
  return mine.sort((a, b) => b.date.localeCompare(a.date))
}

export function savePainJournal(items: PainJournalEntry[]) {
  writeJson(PAIN_KEY, items.slice(0, 400))
  pushRosterSoon()
}

export function addPainJournalEntry(entry: PainJournalEntry) {
  savePainJournal([entry, ...loadPainJournal()])
}
