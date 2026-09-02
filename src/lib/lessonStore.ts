/**
 * Lesson plans and sessions — gym-wide via /api/lessons, cached locally.
 */

import type { LessonHold, LessonNote, LessonPlan, LessonSession } from '../types'
import { createId } from './storage'

const PLANS_KEY = 'shape-lab.lessonPlans.v1'
const SESSIONS_KEY = 'shape-lab.lessonSessions.v1'
const ACTIVE_KEY = 'shape-lab.activeLesson.v1'

export type LessonFile = {
  kind: 'shape-lab-lessons'
  version: 1
  exportedAt: string
  plans: LessonPlan[]
  sessions: LessonSession[]
}

const listeners = new Set<() => void>()

function emit() {
  for (const cb of listeners) cb()
}

export function subscribeLessons(cb: () => void): () => void {
  listeners.add(cb)
  return () => listeners.delete(cb)
}

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
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    /* quota */
  }
}

export function loadLessonPlans(): LessonPlan[] {
  const list = readJson<LessonPlan[]>(PLANS_KEY, [])
  return Array.isArray(list) ? list : []
}

export function loadLessonSessions(): LessonSession[] {
  const list = readJson<LessonSession[]>(SESSIONS_KEY, [])
  return Array.isArray(list) ? list : []
}

function persist(plans: LessonPlan[], sessions: LessonSession[]) {
  writeJson(PLANS_KEY, plans)
  writeJson(SESSIONS_KEY, sessions.slice(0, 200))
  emit()
  void pushLessons()
}

async function pushLessons() {
  const body: LessonFile = {
    kind: 'shape-lab-lessons',
    version: 1,
    exportedAt: new Date().toISOString(),
    plans: loadLessonPlans(),
    sessions: loadLessonSessions(),
  }
  try {
    await fetch('/api/lessons', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
  } catch {
    /* offline */
  }
}

export async function hydrateLessons(): Promise<void> {
  try {
    const res = await fetch('/api/lessons')
    if (!res.ok) return
    const data = (await res.json()) as LessonFile
    if (data?.kind !== 'shape-lab-lessons') return
    const localPlans = loadLessonPlans()
    const localSessions = loadLessonSessions()
    const plans = mergeById(localPlans, data.plans ?? [], (p) => p.updatedAt)
    const sessions = mergeById(localSessions, data.sessions ?? [], (s) => s.endedAt ?? s.startedAt)
    persist(plans, sessions)
  } catch {
    /* first load */
  }
}

function mergeById<T extends { id: string }>(
  a: T[],
  b: T[],
  stamp: (row: T) => string,
): T[] {
  const map = new Map<string, T>()
  for (const row of [...a, ...b]) {
    if (!row?.id) continue
    const keep = map.get(row.id)
    if (!keep || stamp(row).localeCompare(stamp(keep)) >= 0) map.set(row.id, row)
  }
  return [...map.values()]
}

export function upsertLessonPlan(plan: LessonPlan): LessonPlan {
  const next = { ...plan, updatedAt: new Date().toISOString() }
  const rest = loadLessonPlans().filter((p) => p.id !== next.id)
  persist([next, ...rest], loadLessonSessions())
  return next
}

export function deleteLessonPlan(id: string) {
  persist(
    loadLessonPlans().filter((p) => p.id !== id),
    loadLessonSessions(),
  )
}

export function lessonAthleteIds(
  session: Pick<LessonSession, 'athleteId' | 'athleteIds'>,
): string[] {
  const extra = Array.isArray(session.athleteIds) ? session.athleteIds : []
  return [...new Set([session.athleteId, ...extra].filter(Boolean))]
}

export function sessionIncludesAthlete(
  session: Pick<LessonSession, 'athleteId' | 'athleteIds'>,
  athleteId: string,
): boolean {
  return lessonAthleteIds(session).includes(athleteId)
}

export function lessonNameList(names: string[]): string {
  const clean = names.map((n) => n.trim()).filter(Boolean)
  if (clean.length === 0) return 'athletes'
  if (clean.length === 1) return clean[0]
  if (clean.length === 2) return `${clean[0]} and ${clean[1]}`
  if (clean.length === 3) return `${clean[0]}, ${clean[1]}, and ${clean[2]}`
  return `${clean[0]}, ${clean[1]}, and ${clean.length - 2} more`
}

export function plansForAthlete(athleteId: string): LessonPlan[] {
  return loadLessonPlans()
    .filter((p) => p.athleteId === athleteId)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
}

export function sessionsForAthlete(athleteId: string): LessonSession[] {
  return loadLessonSessions()
    .filter((s) => sessionIncludesAthlete(s, athleteId))
    .sort((a, b) => (b.endedAt ?? b.startedAt).localeCompare(a.endedAt ?? a.startedAt))
}

export function sessionsForCoach(coachId: string): LessonSession[] {
  return loadLessonSessions()
    .filter((s) => s.coachId === coachId)
    .sort((a, b) => (b.endedAt ?? b.startedAt).localeCompare(a.endedAt ?? a.startedAt))
}

export function getLessonSession(id: string | null): LessonSession | null {
  if (!id) return null
  return loadLessonSessions().find((s) => s.id === id) ?? null
}

export function getLessonPlan(id: string | null): LessonPlan | null {
  if (!id) return null
  return loadLessonPlans().find((p) => p.id === id) ?? null
}

export function startLessonSession(opts: {
  athleteId?: string
  athleteIds?: string[]
  coachId: string
  planId?: string | null
}): LessonSession {
  const athleteIds = [...new Set((opts.athleteIds ?? [opts.athleteId]).filter((id): id is string => Boolean(id)))]
  const athleteId = athleteIds[0]
  if (!athleteId) {
    throw new Error('Start a lesson with at least one athlete.')
  }
  const session: LessonSession = {
    id: createId('les'),
    planId: opts.planId ?? null,
    athleteId,
    athleteIds,
    coachId: opts.coachId,
    startedAt: new Date().toISOString(),
    notes: [],
    holds: [],
  }
  persist(loadLessonPlans(), [session, ...loadLessonSessions()])
  setActiveLessonId(session.id)
  return session
}

export function saveLessonSession(session: LessonSession): LessonSession {
  const rest = loadLessonSessions().filter((s) => s.id !== session.id)
  persist(loadLessonPlans(), [session, ...rest])
  return session
}

export function endLessonSession(id: string): LessonSession | null {
  const found = getLessonSession(id)
  if (!found) return null
  const next = { ...found, endedAt: new Date().toISOString() }
  saveLessonSession(next)
  if (loadActiveLessonId() === id) setActiveLessonId(null)
  return next
}

export function addLessonNote(
  sessionId: string,
  text: string,
  context: LessonNote['context'] = 'general',
  topic?: { kind?: LessonNote['topicKind']; id?: string; label?: string },
): LessonSession | null {
  const found = getLessonSession(sessionId)
  const trimmed = text.trim()
  if (!found || !trimmed) return null
  const topicLabel = topic?.label?.trim()
  const note: LessonNote = {
    id: createId('lnt'),
    text: trimmed.slice(0, 800),
    createdAt: new Date().toISOString(),
    context,
    ...(topic?.kind && topicLabel
      ? {
          topicKind: topic.kind,
          topicId: topic.id,
          topicLabel,
        }
      : topicLabel
        ? { topicKind: 'custom' as const, topicLabel }
        : {}),
  }
  return saveLessonSession({ ...found, notes: [note, ...found.notes].slice(0, 200) })
}

export function hideLessonRecap(id: string): LessonSession | null {
  const found = getLessonSession(id)
  if (!found) return null
  return saveLessonSession({ ...found, hiddenAt: new Date().toISOString() })
}

export function unhideLessonRecap(id: string): LessonSession | null {
  const found = getLessonSession(id)
  if (!found) return null
  return saveLessonSession({ ...found, hiddenAt: undefined })
}

export function addLessonHold(sessionId: string, hold: Omit<LessonHold, 'id' | 'createdAt'>): LessonSession | null {
  const found = getLessonSession(sessionId)
  if (!found) return null
  const row: LessonHold = {
    ...hold,
    id: createId('lhd'),
    createdAt: new Date().toISOString(),
  }
  return saveLessonSession({ ...found, holds: [row, ...found.holds].slice(0, 80) })
}

export function loadActiveLessonId(): string | null {
  try {
    return sessionStorage.getItem(ACTIVE_KEY)
  } catch {
    return null
  }
}

export function setActiveLessonId(id: string | null) {
  try {
    if (id) sessionStorage.setItem(ACTIVE_KEY, id)
    else sessionStorage.removeItem(ACTIVE_KEY)
  } catch {
    /* private */
  }
  emit()
}

export function emptyPlan(athleteId: string, coachId: string): LessonPlan {
  const now = new Date().toISOString()
  return {
    id: createId('lpn'),
    athleteId,
    coachId,
    title: 'Lesson plan',
    blocks: [],
    extraExercises: [],
    createdAt: now,
    updatedAt: now,
  }
}
