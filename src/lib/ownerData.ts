/**
 * Gym owner data — onboarding tracks, class criteria levels, staff news.
 * Local-first (localStorage, `shape-lab.` prefix) following the coachClasses
 * pattern: read/merge, write, listener fan-out. No server sync in v1.
 */
import { createId } from './storage'

/* ------------------------------------------------------------------ */
/* Onboarding                                                          */
/* ------------------------------------------------------------------ */

export type OnboardingItemKind = 'skill_step' | 'evidence' | 'task'

export type OnboardingItem = {
  id: string
  kind: OnboardingItemKind
  /** Display label, e.g. "Round off" or "Shadow 3 classes with Levi". */
  label: string
  /** Skill-path step id (skill_step) or technique-evidence key (evidence). */
  refId?: string
  /** Direct URL for evidence items. */
  url?: string
}

export type OnboardingTrack = {
  id: string
  name: string
  description?: string
  items: OnboardingItem[]
  createdAt: string
  updatedAt?: string
}

export type OnboardingAssignment = {
  id: string
  trackId: string
  coachId: string
  assignedAt: string
  assignedBy?: string
  completedItemIds: string[]
  signedOff?: boolean
  signedOffAt?: string
  signedOffBy?: string
}

/* ------------------------------------------------------------------ */
/* Class criteria (gym levels)                                         */
/* ------------------------------------------------------------------ */

export type GymLevelRequirement = {
  id: string
  label: string
  /** Optional skill-path step id for automatic progress matching. */
  skillStepId?: string
}

export type GymLevel = {
  id: string
  name: string
  description?: string
  order: number
  requirements: GymLevelRequirement[]
  createdAt: string
  updatedAt?: string
}

/* ------------------------------------------------------------------ */
/* Staff hub                                                           */
/* ------------------------------------------------------------------ */

export type StaffNewsPost = {
  id: string
  body: string
  authorId: string
  authorName: string
  createdAt: string
}

/* ------------------------------------------------------------------ */
/* Storage                                                             */
/* ------------------------------------------------------------------ */

const TRACKS_KEY = 'shape-lab.owner.tracks.v1'
const ASSIGNMENTS_KEY = 'shape-lab.owner.assignments.v1'
const LEVELS_KEY = 'shape-lab.owner.levels.v1'
const NEWS_KEY = 'shape-lab.owner.news.v1'

function readList<T>(key: string): T[] {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? (parsed as T[]) : []
  } catch {
    return []
  }
}

function writeList(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    /* quota — keep memory copy */
  }
}

type Listener = () => void
const listeners = new Set<Listener>()
function emit() {
  for (const cb of listeners) cb()
}
export function subscribeOwnerData(cb: Listener): () => void {
  listeners.add(cb)
  return () => listeners.delete(cb)
}

/* ------------------------------- tracks --------------------------- */

export function loadOnboardingTracks(): OnboardingTrack[] {
  return readList<OnboardingTrack>(TRACKS_KEY).filter((t) => t && t.id)
}

export function saveOnboardingTrack(input: {
  id?: string
  name: string
  description?: string
  items: OnboardingItem[]
}): OnboardingTrack {
  const tracks = loadOnboardingTracks()
  const now = new Date().toISOString()
  const existing = input.id ? tracks.find((t) => t.id === input.id) : undefined
  const row: OnboardingTrack = {
    id: existing?.id ?? createId('obt'),
    name: input.name.trim(),
    description: input.description?.trim() || undefined,
    items: input.items,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  }
  writeList(
    TRACKS_KEY,
    [row, ...tracks.filter((t) => t.id !== row.id)],
  )
  emit()
  return row
}

export function deleteOnboardingTrack(id: string) {
  writeList(
    TRACKS_KEY,
    loadOnboardingTracks().filter((t) => t.id !== id),
  )
  // Drop assignments for the deleted track.
  writeList(
    ASSIGNMENTS_KEY,
    loadOnboardingAssignments().filter((a) => a.trackId !== id),
  )
  emit()
}

export function newOnboardingItem(kind: OnboardingItemKind): OnboardingItem {
  return { id: createId('obi'), kind, label: '' }
}

/* ---------------------------- assignments ------------------------- */

export function loadOnboardingAssignments(): OnboardingAssignment[] {
  return readList<OnboardingAssignment>(ASSIGNMENTS_KEY).filter((a) => a && a.id)
}

export function loadAssignmentsForCoach(coachId: string): OnboardingAssignment[] {
  return loadOnboardingAssignments().filter((a) => a.coachId === coachId)
}

export function assignOnboardingTrack(trackId: string, coachId: string, assignedBy?: string): OnboardingAssignment | null {
  const existing = loadOnboardingAssignments().find(
    (a) => a.trackId === trackId && a.coachId === coachId,
  )
  if (existing) return existing
  const row: OnboardingAssignment = {
    id: createId('oba'),
    trackId,
    coachId,
    assignedAt: new Date().toISOString(),
    assignedBy,
    completedItemIds: [],
  }
  writeList(ASSIGNMENTS_KEY, [row, ...loadOnboardingAssignments()])
  emit()
  return row
}

export function unassignOnboardingTrack(assignmentId: string) {
  writeList(
    ASSIGNMENTS_KEY,
    loadOnboardingAssignments().filter((a) => a.id !== assignmentId),
  )
  emit()
}

export function toggleOnboardingItem(assignmentId: string, itemId: string, done: boolean) {
  const rows = loadOnboardingAssignments().map((a) => {
    if (a.id !== assignmentId) return a
    const completedItemIds = done
      ? [...new Set([...a.completedItemIds, itemId])]
      : a.completedItemIds.filter((id) => id !== itemId)
    return { ...a, completedItemIds }
  })
  writeList(ASSIGNMENTS_KEY, rows)
  emit()
}

export function signOffOnboarding(assignmentId: string, signedOff: boolean, by?: string) {
  const now = new Date().toISOString()
  const rows = loadOnboardingAssignments().map((a) => {
    if (a.id !== assignmentId) return a
    return {
      ...a,
      signedOff,
      signedOffAt: signedOff ? now : undefined,
      signedOffBy: signedOff ? by : undefined,
    }
  })
  writeList(ASSIGNMENTS_KEY, rows)
  emit()
}

export function assignmentProgress(
  assignment: Pick<OnboardingAssignment, 'completedItemIds'>,
  track: Pick<OnboardingTrack, 'items'> | null | undefined,
): { done: number; total: number } {
  const total = track?.items.length ?? 0
  if (!track || total === 0) return { done: 0, total: 0 }
  const ids = new Set(track.items.map((i) => i.id))
  const done = assignment.completedItemIds.filter((id) => ids.has(id)).length
  return { done, total }
}

/* ------------------------------- levels --------------------------- */

export function loadGymLevels(): GymLevel[] {
  return readList<GymLevel>(LEVELS_KEY)
    .filter((l) => l && l.id)
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
}

export function saveGymLevel(input: {
  id?: string
  name: string
  description?: string
  order?: number
  requirements: GymLevelRequirement[]
}): GymLevel {
  const levels = loadGymLevels()
  const now = new Date().toISOString()
  const existing = input.id ? levels.find((l) => l.id === input.id) : undefined
  const row: GymLevel = {
    id: existing?.id ?? createId('gyl'),
    name: input.name.trim(),
    description: input.description?.trim() || undefined,
    order: input.order ?? (existing?.order ?? levels.length),
    requirements: input.requirements,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  }
  const next = [row, ...levels.filter((l) => l.id !== row.id)].sort(
    (a, b) => (a.order ?? 0) - (b.order ?? 0),
  )
  writeList(LEVELS_KEY, next)
  emit()
  return row
}

export function deleteGymLevel(id: string) {
  writeList(
    LEVELS_KEY,
    loadGymLevels().filter((l) => l.id !== id),
  )
  emit()
}

export function newLevelRequirement(): GymLevelRequirement {
  return { id: createId('glr'), label: '' }
}

/* ------------------------------ staff news ------------------------ */

export function loadStaffNews(): StaffNewsPost[] {
  return readList<StaffNewsPost>(NEWS_KEY)
    .filter((p) => p && p.id)
    .sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? ''))
    .slice(0, 100)
}

export function postStaffNews(body: string, authorId: string, authorName: string): StaffNewsPost | null {
  const trimmed = body.trim()
  if (!trimmed) return null
  const row: StaffNewsPost = {
    id: createId('snw'),
    body: trimmed.slice(0, 500),
    authorId,
    authorName,
    createdAt: new Date().toISOString(),
  }
  writeList(NEWS_KEY, [row, ...loadStaffNews()].slice(0, 100))
  emit()
  return row
}

export function deleteStaffNews(id: string) {
  writeList(
    NEWS_KEY,
    loadStaffNews().filter((p) => p.id !== id),
  )
  emit()
}
