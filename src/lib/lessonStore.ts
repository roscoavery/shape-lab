/**
 * Lesson plans and sessions — gym-wide via /api/lessons, cached locally.
 */

import type { LessonHold, LessonNote, LessonPlan, LessonSession } from '../types'
import { createId } from './storage'
import { gymWriteFetch } from './gymWritePace'

const PLANS_KEY = 'shape-lab.lessonPlans.v1'
const SESSIONS_KEY = 'shape-lab.lessonSessions.v1'
const ACTIVE_KEY = 'shape-lab.activeLesson.v1'
const REMOVED_SESSIONS_KEY = 'shape-lab.removedLessonSessions.v1'
const REMOVED_PLANS_KEY = 'shape-lab.removedLessonPlans.v1'

export type LessonFile = {
  kind: 'shape-lab-lessons'
  version: 1
  exportedAt: string
  plans: LessonPlan[]
  sessions: LessonSession[]
  /** Session ids dropped on any device — do not resurrect on merge. */
  removedSessionIds?: string[]
  /** Plan ids dropped on any device — do not resurrect on merge. */
  removedPlanIds?: string[]
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

function asIdList(raw: unknown): string[] {
  if (!Array.isArray(raw)) return []
  return [...new Set(raw.filter((id): id is string => typeof id === 'string' && Boolean(id)))]
}

function mergeIdLists(...lists: Array<string[] | undefined>): string[] {
  return asIdList(lists.flatMap((list) => list ?? []))
}

export function loadRemovedSessionIds(): string[] {
  return asIdList(readJson<string[]>(REMOVED_SESSIONS_KEY, []))
}

export function loadRemovedPlanIds(): string[] {
  return asIdList(readJson<string[]>(REMOVED_PLANS_KEY, []))
}

/** Record dropped ids as tombstones so union merges can't resurrect them. */
function recordRemoved(sessionIds: string[], planIds: string[]) {
  if (sessionIds.length > 0) {
    writeJson(REMOVED_SESSIONS_KEY, mergeIdLists(loadRemovedSessionIds(), sessionIds))
  }
  if (planIds.length > 0) {
    writeJson(REMOVED_PLANS_KEY, mergeIdLists(loadRemovedPlanIds(), planIds))
  }
}

function persist(plans: LessonPlan[], sessions: LessonSession[]) {
  writeJson(PLANS_KEY, plans)
  writeJson(SESSIONS_KEY, sessions.slice(0, 200))
  emit()
  void pushLessons()
  ensureLessonFlush()
}

let flushBound = false
function ensureLessonFlush() {
  if (flushBound || typeof window === 'undefined') return
  flushBound = true
  const flush = () => {
    try {
      const body = JSON.stringify({
        kind: 'shape-lab-lessons',
        version: 1,
        exportedAt: new Date().toISOString(),
        plans: loadLessonPlans(),
        sessions: loadLessonSessions(),
        removedSessionIds: loadRemovedSessionIds(),
        removedPlanIds: loadRemovedPlanIds(),
      } satisfies LessonFile)
      void gymWriteFetch('/api/lessons', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body,
        keepalive: true,
      })
    } catch {
      /* leaving the app */
    }
  }
  window.addEventListener('pagehide', flush)
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flush()
  })
}

async function pushLessons() {
  const body: LessonFile = {
    kind: 'shape-lab-lessons',
    version: 1,
    exportedAt: new Date().toISOString(),
    plans: loadLessonPlans(),
    sessions: loadLessonSessions(),
    removedSessionIds: loadRemovedSessionIds(),
    removedPlanIds: loadRemovedPlanIds(),
  }
  try {
    await gymWriteFetch('/api/lessons', {
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
    // Tombstones merge monotonically and win over union: a dropped id stays
    // dropped even if a stale copy (local or remote) still carries the row.
    const removedSessionIds = mergeIdLists(loadRemovedSessionIds(), data.removedSessionIds)
    const removedPlanIds = mergeIdLists(loadRemovedPlanIds(), data.removedPlanIds)
    writeJson(REMOVED_SESSIONS_KEY, removedSessionIds)
    writeJson(REMOVED_PLANS_KEY, removedPlanIds)
    const goneSessions = new Set(removedSessionIds)
    const gonePlans = new Set(removedPlanIds)
    const localPlans = loadLessonPlans().filter((p) => p?.id && !gonePlans.has(p.id))
    const localSessions = loadLessonSessions().filter((s) => s?.id && !goneSessions.has(s.id))
    const plans = mergeById(localPlans, data.plans ?? [], (p) => p.updatedAt).filter(
      (p) => p?.id && !gonePlans.has(p.id),
    )
    const sessions = mergeById(localSessions, data.sessions ?? [], sessionStamp).filter(
      (s) => s?.id && !goneSessions.has(s.id),
    )
    persist(plans, sessions)
    // If the server is missing any local tombstone ids, teach it so other
    // devices learn the deletes on their next poll.
    const serverRemovedSessions = asIdList(data.removedSessionIds)
    const serverRemovedPlans = asIdList(data.removedPlanIds)
    const serverLacks =
      removedSessionIds.some((id) => !serverRemovedSessions.includes(id)) ||
      removedPlanIds.some((id) => !serverRemovedPlans.includes(id))
    if (serverLacks) await pushLessons()
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
  recordRemoved([], [id])
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

function snapshotPlan(plan: LessonPlan | null): LessonSession['planSnapshot'] | undefined {
  if (!plan) return undefined
  return {
    title: plan.title,
    blocks: plan.blocks,
    extraExercises: plan.extraExercises,
  }
}

/** Live plan file, or the snapshot baked onto the session. */
export function planForSession(session: LessonSession | null): LessonPlan | null {
  if (!session) return null
  const live = getLessonPlan(session.planId)
  if (live) return live
  const snap = session.planSnapshot
  if (!snap) return null
  return {
    id: session.planId ?? `snap-${session.id}`,
    athleteId: session.athleteId,
    coachId: session.coachId,
    title: snap.title,
    blocks: snap.blocks,
    extraExercises: snap.extraExercises,
    createdAt: session.startedAt,
    updatedAt: session.startedAt,
  }
}

export function attachPlanToLiveLesson(
  coachId: string,
  athleteIds: string[],
  plan: LessonPlan,
): LessonSession | null {
  const live = findLiveLesson(coachId, athleteIds)
  if (!live) return null
  return saveLessonSession({
    ...live,
    planId: plan.id,
    planSnapshot: snapshotPlan(plan),
  })
}

function sessionStamp(s: LessonSession): string {
  const lastNote = s.notes[0]?.createdAt ?? ''
  const lastHold = s.holds[0]?.createdAt ?? ''
  const stamps = [s.endedAt ?? '', s.coachEndedAt ?? '', lastNote, lastHold, s.startedAt]
  return stamps.sort((a, b) => b.localeCompare(a))[0] || s.startedAt
}

export function findLiveLesson(coachId: string, athleteIds?: string[]): LessonSession | null {
  const live = loadLessonSessions().filter(
    (s) => s.coachId === coachId && !s.endedAt && !s.hiddenAt,
  )
  if (live.length === 0) return null
  if (athleteIds?.length) {
    const key = [...new Set(athleteIds)].sort().join('|')
    const match = live.find((s) => [...lessonAthleteIds(s)].sort().join('|') === key)
    if (match) return match
  }
  return [...live].sort((a, b) => b.startedAt.localeCompare(a.startedAt))[0] ?? null
}

export function resumeLessonSession(id: string): LessonSession | null {
  const found = getLessonSession(id)
  if (!found || found.endedAt) return null
  setActiveLessonId(found.id)
  return found
}

export function startLessonSession(opts: {
  athleteId?: string
  athleteIds?: string[]
  coachId: string
  planId?: string | null
  calendar?: {
    eventId: string
    title: string
    startAt: string
    endAt: string
    notes?: string | null
  } | null
}): LessonSession {
  const athleteIds = [...new Set((opts.athleteIds ?? [opts.athleteId]).filter((id): id is string => Boolean(id)))]
  const athleteId = athleteIds[0]
  if (!athleteId) {
    throw new Error('Start a lesson with at least one athlete.')
  }
  const incomingPlan = opts.planId ? getLessonPlan(opts.planId) : null
  const existing = findLiveLesson(opts.coachId, athleteIds)
  if (existing) {
    const calendarNotes = existing.calendarNotes || opts.calendar?.notes?.trim() || null
    const next = {
      ...existing,
      planId: opts.planId ?? existing.planId,
      planSnapshot: incomingPlan
        ? snapshotPlan(incomingPlan)
        : existing.planSnapshot ?? snapshotPlan(getLessonPlan(existing.planId)),
      calendarEventId: existing.calendarEventId ?? opts.calendar?.eventId ?? null,
      calendarTitle: existing.calendarTitle ?? opts.calendar?.title ?? null,
      calendarStartAt: existing.calendarStartAt ?? opts.calendar?.startAt ?? null,
      calendarEndAt: existing.calendarEndAt ?? opts.calendar?.endAt ?? null,
      calendarNotes,
      notes:
        calendarNotes && !existing.notes.some((n) => n.topicLabel === 'From calendar')
          ? [
              {
                id: createId('lnt'),
                text: calendarNotes.slice(0, 800),
                createdAt: existing.startedAt,
                context: 'general' as const,
                audience: 'athlete' as const,
                topicKind: 'custom' as const,
                topicLabel: 'From calendar',
              },
              ...existing.notes,
            ]
          : existing.notes,
    }
    saveLessonSession(next)
    setActiveLessonId(next.id)
    return next
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
    planSnapshot: snapshotPlan(incomingPlan),
    calendarEventId: opts.calendar?.eventId ?? null,
    calendarTitle: opts.calendar?.title ?? null,
    calendarStartAt: opts.calendar?.startAt ?? null,
    calendarEndAt: opts.calendar?.endAt ?? null,
    calendarNotes: opts.calendar?.notes?.trim() || null,
  }
  const notes = session.calendarNotes
    ? [
        {
          id: createId('lnt'),
          text: session.calendarNotes.slice(0, 800),
          createdAt: session.startedAt,
          context: 'general' as const,
          audience: 'athlete' as const,
          topicKind: 'custom' as const,
          topicLabel: 'From calendar',
        },
        ...session.notes,
      ]
    : session.notes
  persist(loadLessonPlans(), [{ ...session, notes }, ...loadLessonSessions()])
  setActiveLessonId(session.id)
  return { ...session, notes }
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
  topic?: { kind?: LessonNote['topicKind']; id?: string; label?: string; audience?: LessonNote['audience'] },
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
    audience: topic?.audience === 'coach' ? 'coach' : 'athlete',
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

export function removeLessonNote(sessionId: string, noteId: string): LessonSession | null {
  const found = getLessonSession(sessionId)
  if (!found) return null
  const notes = found.notes.filter((n) => n.id !== noteId)
  if (notes.length === found.notes.length) return found
  return saveLessonSession({ ...found, notes })
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
    const live = localStorage.getItem(ACTIVE_KEY) || sessionStorage.getItem(ACTIVE_KEY)
    return live || null
  } catch {
    return null
  }
}

export function setActiveLessonId(id: string | null) {
  try {
    if (id) {
      localStorage.setItem(ACTIVE_KEY, id)
      sessionStorage.setItem(ACTIVE_KEY, id)
    } else {
      localStorage.removeItem(ACTIVE_KEY)
      sessionStorage.removeItem(ACTIVE_KEY)
    }
  } catch {
    /* private */
  }
  emit()
}

export function saveLessonTimes(
  sessionId: string,
  times: { coachStartedAt?: string; coachEndedAt?: string },
): LessonSession | null {
  const found = getLessonSession(sessionId)
  if (!found) return null
  return saveLessonSession({
    ...found,
    ...(times.coachStartedAt !== undefined ? { coachStartedAt: times.coachStartedAt || undefined } : {}),
    ...(times.coachEndedAt !== undefined ? { coachEndedAt: times.coachEndedAt || undefined } : {}),
  })
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

/**
 * Find groups of duplicate lesson sessions: same athlete, same calendar day,
 * all ended. Returns one group per athlete+day with 2+ sessions, so the UI
 * shows a single merge prompt per group instead of one per pair (which
 * explodes combinatorially and never converges as pairs are merged).
 */
export interface DuplicateLessonGroup {
  athleteId: string
  day: string
  sessions: LessonSession[]
}

export function findDuplicateLessonGroups(): DuplicateLessonGroup[] {
  const sessions = loadLessonSessions().filter((s) => s.endedAt && !s.hiddenAt)
  const byKey = new Map<string, DuplicateLessonGroup>()
  for (const s of sessions) {
    const ids = lessonAthleteIds(s)
    if (ids.length === 0) continue
    const day = (s.startedAt ?? '').slice(0, 10)
    if (!day) continue
    // Group key uses the first athlete id; multi-athlete sessions are rare
    // and still consolidate under their primary athlete.
    const key = `${ids[0]}|${day}`
    let g = byKey.get(key)
    if (!g) {
      g = { athleteId: ids[0], day, sessions: [] }
      byKey.set(key, g)
    }
    g.sessions.push(s)
  }
  return [...byKey.values()].filter((g) => g.sessions.length >= 2)
}

/**
 * Merge every session in a duplicate group into one: combines notes, holds,
 * athlete lists, keeps the earliest start / latest end. The surviving session
 * keeps the earliest session's id. All others are deleted.
 */
export function mergeLessonGroup(sessions: LessonSession[]): LessonSession | null {
  if (sessions.length < 2) return null
  const sorted = [...sessions].sort((x, y) =>
    (x.startedAt ?? '').localeCompare(y.startedAt ?? ''),
  )
  const base = sorted[0]
  const rest = sorted.slice(1)

  const athleteIds = Array.from(
    new Set(sorted.flatMap((s) => lessonAthleteIds(s))),
  )
  const notes = sorted
    .flatMap((s) => s.notes ?? [])
    .sort((x, y) => (x.createdAt ?? '').localeCompare(y.createdAt ?? ''))
  const holds = sorted
    .flatMap((s) => s.holds ?? [])
    .sort((x, y) => (x.createdAt ?? '').localeCompare(y.createdAt ?? ''))
  const startedAt = sorted.map((s) => s.startedAt).filter(Boolean).sort()[0] ?? base.startedAt
  const endedAt = sorted.map((s) => s.endedAt).filter(Boolean).sort().pop() ?? base.endedAt

  const merged: LessonSession = {
    ...base,
    athleteIds,
    notes,
    holds,
    startedAt,
    endedAt,
    planId: base.planId ?? rest.find((s) => s.planId)?.planId ?? null,
    planSnapshot: base.planSnapshot ?? rest.find((s) => s.planSnapshot)?.planSnapshot,
    calendarEventId: base.calendarEventId ?? rest.find((s) => s.calendarEventId)?.calendarEventId ?? null,
    calendarTitle: base.calendarTitle ?? rest.find((s) => s.calendarTitle)?.calendarTitle ?? null,
  }
  const removeIds = new Set(rest.map((s) => s.id))
  const remaining = loadLessonSessions().filter((s) => !removeIds.has(s.id) && s.id !== base.id)
  recordRemoved([...removeIds], [])
  persist(loadLessonPlans(), [merged, ...remaining])
  return merged
}

/**
 * Find lesson sessions that look like duplicates: same athlete, same calendar
 * day, both ended. Used to offer consolidation when a lesson was accidentally
 * started twice (e.g., on two devices).
 */
export function findDuplicateLessons(): Array<{ a: LessonSession; b: LessonSession }> {
  const sessions = loadLessonSessions().filter((s) => s.endedAt && !s.hiddenAt)
  const pairs: Array<{ a: LessonSession; b: LessonSession }> = []
  const seen = new Set<string>()
  for (let i = 0; i < sessions.length; i++) {
    for (let j = i + 1; j < sessions.length; j++) {
      const a = sessions[i]
      const b = sessions[j]
      if (a.athleteId !== b.athleteId) continue
      const dayA = (a.startedAt ?? '').slice(0, 10)
      const dayB = (b.startedAt ?? '').slice(0, 10)
      if (!dayA || dayA !== dayB) continue
      const key = [a.id, b.id].sort().join('|')
      if (seen.has(key)) continue
      seen.add(key)
      pairs.push({ a, b })
    }
  }
  return pairs
}

/**
 * Merge session `b` into session `a`: combines notes, holds, athlete lists,
 * and keeps the earliest start / latest end. Deletes `b`.
 * The surviving session keeps `a`'s id.
 */
export function mergeLessonSessions(aId: string, bId: string): LessonSession | null {
  const a = getLessonSession(aId)
  const b = getLessonSession(bId)
  if (!a || !b) return null

  const athleteIds = Array.from(
    new Set([...lessonAthleteIds(a), ...lessonAthleteIds(b)]),
  )
  const notes = [...(a.notes ?? []), ...(b.notes ?? [])].sort((x, y) =>
    (x.createdAt ?? '').localeCompare(y.createdAt ?? ''),
  )
  const holds = [...(a.holds ?? []), ...(b.holds ?? [])].sort((x, y) =>
    (x.createdAt ?? '').localeCompare(y.createdAt ?? ''),
  )
  const startedAt = [a.startedAt, b.startedAt].filter(Boolean).sort()[0] ?? a.startedAt
  const endedAt = [a.endedAt, b.endedAt].filter(Boolean).sort().pop() ?? a.endedAt

  const merged: LessonSession = {
    ...a,
    athleteIds,
    notes,
    holds,
    startedAt,
    endedAt,
    planId: a.planId ?? b.planId,
    planSnapshot: a.planSnapshot ?? b.planSnapshot,
    calendarEventId: a.calendarEventId ?? b.calendarEventId,
    calendarTitle: a.calendarTitle ?? b.calendarTitle,
  }
  const rest = loadLessonSessions().filter((s) => s.id !== aId && s.id !== bId)
  recordRemoved([bId], [])
  persist(loadLessonPlans(), [merged, ...rest])
  return merged
}

/** Hide a duplicate pair from the merge prompt without merging. */
const MERGE_DISMISSED_KEY = 'sl-lesson-merge-dismissed'
export function dismissLessonMergePair(aId: string, bId: string): void {
  try {
    const raw = localStorage.getItem(MERGE_DISMISSED_KEY)
    const list: string[] = raw ? JSON.parse(raw) : []
    const key = [aId, bId].sort().join('|')
    if (!list.includes(key)) {
      list.push(key)
      localStorage.setItem(MERGE_DISMISSED_KEY, JSON.stringify(list.slice(-50)))
    }
  } catch {
    /* ignore */
  }
}

export function isLessonMergeDismissed(aId: string, bId: string): boolean {
  try {
    const raw = localStorage.getItem(MERGE_DISMISSED_KEY)
    const list: string[] = raw ? JSON.parse(raw) : []
    return list.includes([aId, bId].sort().join('|'))
  } catch {
    return false
  }
}

/** Hide a duplicate group from the merge prompt without merging. */
export function dismissLessonMergeGroup(athleteId: string, day: string): void {
  try {
    const raw = localStorage.getItem(MERGE_DISMISSED_KEY)
    const list: string[] = raw ? JSON.parse(raw) : []
    const key = `group|${athleteId}|${day}`
    if (!list.includes(key)) {
      list.push(key)
      localStorage.setItem(MERGE_DISMISSED_KEY, JSON.stringify(list.slice(-50)))
    }
  } catch {
    /* ignore */
  }
}

export function isLessonMergeGroupDismissed(athleteId: string, day: string): boolean {
  try {
    const raw = localStorage.getItem(MERGE_DISMISSED_KEY)
    const list: string[] = raw ? JSON.parse(raw) : []
    return list.includes(`group|${athleteId}|${day}`)
  } catch {
    return false
  }
}
