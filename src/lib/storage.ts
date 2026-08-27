/**
 * ============================================================================
 * Local browser storage (localStorage)
 * ============================================================================
 * Saves athletes, attempts, curriculum progress, and reference photos
 * on this device only — no server, no account.
 */

import { CURRICULUM_TASKS } from '../config/curriculum'
import type {
  AppSettings,
  Athlete,
  AthleteTaskProgress,
  AttemptRecord,
  HomeworkItem,
  HomeworkLog,
  ReferencePhoto,
  TaskRunReport,
  FlowProgress,
  FlowRunReport,
} from '../types'

const ATHLETES_KEY = 'shape-lab.athletes.v1'
const ATTEMPTS_KEY = 'shape-lab.attempts.v1'
const SETTINGS_KEY = 'shape-lab.settings.v1'
const ACTIVE_ATHLETE_KEY = 'shape-lab.activeAthlete.v1'
const PROGRESS_KEY = 'shape-lab.athleteProgress.v1'
const REFS_KEY = 'shape-lab.referencePhotos.v1'
const HOMEWORK_KEY = 'shape-lab.homework.v1'
const HOMEWORK_LOGS_KEY = 'shape-lab.homeworkLogs.v1'
const TASK_ANALYSES_KEY = 'shape-lab.taskAnalyses.v1'
const FLOW_PROGRESS_KEY = 'shape-lab.tasks2Progress.v1'
const FLOW_ANALYSES_KEY = 'shape-lab.tasks2Analyses.v1'

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

export function loadAthletes(): Athlete[] {
  return readJson<Athlete[]>(ATHLETES_KEY, [])
}

export function saveAthletes(athletes: Athlete[]) {
  writeJson(ATHLETES_KEY, athletes)
}

export function loadAttempts(): AttemptRecord[] {
  return readJson<AttemptRecord[]>(ATTEMPTS_KEY, [])
}

export function saveAttempts(attempts: AttemptRecord[]) {
  writeJson(ATTEMPTS_KEY, attempts)
}

export function addAttempt(attempt: AttemptRecord) {
  const all = loadAttempts()
  all.unshift(attempt)
  writeJson(ATTEMPTS_KEY, all.slice(0, 500))
}

export function loadSettings(): AppSettings {
  const defaults: AppSettings = {
    qualityThresholdOverride: null,
    mirrorVideo: true,
    showAngles: true,
    voiceEnabled: true,
  }
  const raw = readJson<Partial<AppSettings> & { voiceCoaching?: boolean }>(SETTINGS_KEY, {})
  // Migrate older voiceCoaching key if present
  const voiceEnabled =
    raw.voiceEnabled ?? raw.voiceCoaching ?? defaults.voiceEnabled
  return {
    qualityThresholdOverride: raw.qualityThresholdOverride ?? null,
    mirrorVideo: raw.mirrorVideo ?? true,
    showAngles: raw.showAngles ?? true,
    voiceEnabled,
  }
}

export function saveSettings(settings: AppSettings) {
  writeJson(SETTINGS_KEY, settings)
}

export function loadActiveAthleteId(): string | null {
  return localStorage.getItem(ACTIVE_ATHLETE_KEY)
}

export function saveActiveAthleteId(id: string | null) {
  if (!id) localStorage.removeItem(ACTIVE_ATHLETE_KEY)
  else localStorage.setItem(ACTIVE_ATHLETE_KEY, id)
}

export function createId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
}

// ---------------------------------------------------------------------------
// Athlete curriculum progress
// ---------------------------------------------------------------------------

export function defaultTaskProgress(athleteId: string): AthleteTaskProgress {
  return {
    athleteId,
    completions: {},
    currentTaskId: CURRICULUM_TASKS[0]?.id ?? null,
    assignedTaskIds: null,
    skippedTaskIds: [],
    updatedAt: new Date().toISOString(),
  }
}

export function loadAllTaskProgress(): Record<string, AthleteTaskProgress> {
  return readJson<Record<string, AthleteTaskProgress>>(PROGRESS_KEY, {})
}

export function saveAllTaskProgress(map: Record<string, AthleteTaskProgress>) {
  writeJson(PROGRESS_KEY, map)
}

export function loadTaskProgress(athleteId: string): AthleteTaskProgress {
  const all = loadAllTaskProgress()
  const p = all[athleteId] ?? defaultTaskProgress(athleteId)
  return { ...p, skippedTaskIds: p.skippedTaskIds ?? [] }
}

export function saveTaskProgress(progress: AthleteTaskProgress) {
  const all = loadAllTaskProgress()
  all[progress.athleteId] = {
    ...progress,
    updatedAt: new Date().toISOString(),
  }
  saveAllTaskProgress(all)
}

export function recordTaskCompletion(
  athleteId: string,
  taskId: string,
): AthleteTaskProgress {
  const progress = loadTaskProgress(athleteId)
  const next: AthleteTaskProgress = {
    ...progress,
    completions: {
      ...progress.completions,
      [taskId]: (progress.completions[taskId] ?? 0) + 1,
    },
    currentTaskId: taskId,
    updatedAt: new Date().toISOString(),
  }
  saveTaskProgress(next)
  return next
}

/** Unlock the next task without counting a successful finish (escape hatch). */
export function recordTaskSkip(athleteId: string, taskId: string): AthleteTaskProgress {
  const progress = loadTaskProgress(athleteId)
  const skipped = new Set(progress.skippedTaskIds ?? [])
  skipped.add(taskId)
  const next: AthleteTaskProgress = {
    ...progress,
    skippedTaskIds: [...skipped],
    currentTaskId: taskId,
    updatedAt: new Date().toISOString(),
  }
  saveTaskProgress(next)
  return next
}

const MAX_TASK_ANALYSES = 80

export function loadTaskAnalyses(athleteId?: string): TaskRunReport[] {
  const all = readJson<TaskRunReport[]>(TASK_ANALYSES_KEY, [])
  return athleteId ? all.filter((r) => r.athleteId === athleteId) : all
}

export function saveTaskAnalysis(report: TaskRunReport): void {
  const all = readJson<TaskRunReport[]>(TASK_ANALYSES_KEY, [])
  all.unshift(report)
  writeJson(TASK_ANALYSES_KEY, all.slice(0, MAX_TASK_ANALYSES))
}

export function latestTaskAnalysis(
  athleteId: string,
  taskId: string,
): TaskRunReport | null {
  return (
    loadTaskAnalyses(athleteId).find((r) => r.taskId === taskId) ?? null
  )
}

const MAX_FLOW_ANALYSES = 80

export function defaultFlowProgress(athleteId: string): FlowProgress {
  return {
    athleteId,
    completions: {},
    currentId: 'flow_hs_right',
    updatedAt: new Date().toISOString(),
  }
}

export function loadFlowProgress(athleteId: string): FlowProgress {
  const all = readJson<Record<string, FlowProgress>>(FLOW_PROGRESS_KEY, {})
  return all[athleteId] ?? defaultFlowProgress(athleteId)
}

export function saveFlowProgress(progress: FlowProgress) {
  const all = readJson<Record<string, FlowProgress>>(FLOW_PROGRESS_KEY, {})
  all[progress.athleteId] = { ...progress, updatedAt: new Date().toISOString() }
  writeJson(FLOW_PROGRESS_KEY, all)
}

export function recordFlowCompletion(athleteId: string, sequenceId: string): FlowProgress {
  const progress = loadFlowProgress(athleteId)
  const next: FlowProgress = {
    ...progress,
    completions: {
      ...progress.completions,
      [sequenceId]: (progress.completions[sequenceId] ?? 0) + 1,
    },
    currentId: sequenceId,
    updatedAt: new Date().toISOString(),
  }
  saveFlowProgress(next)
  return next
}

export function loadFlowAnalyses(athleteId?: string): FlowRunReport[] {
  const all = readJson<FlowRunReport[]>(FLOW_ANALYSES_KEY, [])
  return athleteId ? all.filter((r) => r.athleteId === athleteId) : all
}

export function saveFlowAnalysis(report: FlowRunReport): void {
  const all = readJson<FlowRunReport[]>(FLOW_ANALYSES_KEY, [])
  const i = all.findIndex((r) => r.id === report.id)
  if (i >= 0) all[i] = report
  else all.unshift(report)
  writeJson(FLOW_ANALYSES_KEY, all.slice(0, MAX_FLOW_ANALYSES))
}

export function markFlowSharedWithCoach(reportId: string): FlowRunReport | null {
  const all = readJson<FlowRunReport[]>(FLOW_ANALYSES_KEY, [])
  const i = all.findIndex((r) => r.id === reportId)
  if (i < 0) return null
  const next = { ...all[i]!, sharedWithCoachAt: new Date().toISOString() }
  all[i] = next
  writeJson(FLOW_ANALYSES_KEY, all)
  return next
}

export function loadCoachInbox(): FlowRunReport[] {
  return loadFlowAnalyses().filter((r) => Boolean(r.sharedWithCoachAt))
}

export function flowHistoryForSequence(
  athleteId: string,
  sequenceId: string,
): FlowRunReport[] {
  return loadFlowAnalyses(athleteId).filter((r) => r.sequenceId === sequenceId)
}

// ---------------------------------------------------------------------------
// Homework (per-athlete drill library + session logs)
// ---------------------------------------------------------------------------

/** Quality-hold seconds on hollow (arms down) that unlock the arms-up level. */
export const HOLLOW_PROGRESS_TARGET_SECONDS = 60

/** Default form standard: score required for "proper hold" time. */
export const DEFAULT_FORM_STANDARD = 85

/** Effective form standard for a homework item (item override or default). */
export function formStandardFor(item: Pick<HomeworkItem, 'formStandard'>): number {
  return item.formStandard ?? DEFAULT_FORM_STANDARD
}

/**
 * Proper-hold seconds of a log, reading legacy v1 logs too:
 * new camera logs → properHoldSeconds, v1 logs → qualityHoldSeconds,
 * manual logs → null (no form data, only total time).
 */
export function logProperHoldSeconds(log: HomeworkLog): number | null {
  if (log.method === 'manual') return null
  return log.properHoldSeconds ?? log.qualityHoldSeconds ?? null
}

/**
 * The 4 automatic homework drills EVERY athlete always has.
 * Order here = display order. `autoKey` is stable; the hollow item's shapeId
 * switches from hollow_arms_down → hollow_arms_up when the athlete levels up.
 */
export const AUTO_HOMEWORK_DEFS: {
  autoKey: string
  shapeId: string
  targetSeconds: number
  notes: string
}[] = [
  {
    autoKey: 'hollow',
    shapeId: 'hollow_arms_down',
    targetSeconds: HOLLOW_PROGRESS_TARGET_SECONDS,
    notes:
      'Start in a pike and inch back until the lower back is flat. Compress the low back, then let the feet lift. Arms by the sides. If the low back will not go down, bend the knees. At 60s quality hold, level up to arms by the ears.',
  },
  {
    autoKey: 'superman',
    shapeId: 'superman',
    targetSeconds: 30,
    notes:
      'Straight arms behind ears, chin off chest, straight knees off the floor, feet & ankles together, toes pointed.',
  },
  {
    autoKey: 'side_plank',
    shapeId: 'side_plank',
    targetSeconds: 30,
    notes: 'Train BOTH sides — log left and right separately.',
  },
  {
    autoKey: 'wall_handstand',
    shapeId: 'wall_handstand',
    targetSeconds: 30,
    notes: 'Stomach-to-wall preferred. Same body standards as freestanding.',
  },
]

export function loadAllHomework(): HomeworkItem[] {
  const items = readJson<HomeworkItem[]>(HOMEWORK_KEY, [])
  let changed = false
  for (const item of items) {
    if (item.shapeId === 'hollow') {
      item.shapeId = 'hollow_arms_up'
      changed = true
    }
  }
  if (changed) saveAllHomework(items)
  return items
}

export function saveAllHomework(items: HomeworkItem[]) {
  writeJson(HOMEWORK_KEY, items)
}

/** Auto items first (in AUTO_HOMEWORK_DEFS order), then added items by date. */
function sortHomework(items: HomeworkItem[]): HomeworkItem[] {
  const autoOrder = new Map(AUTO_HOMEWORK_DEFS.map((d, i) => [d.autoKey, i]))
  return [...items].sort((a, b) => {
    const ai = a.source === 'auto' ? (autoOrder.get(a.autoKey ?? '') ?? 99) : 100
    const bi = b.source === 'auto' ? (autoOrder.get(b.autoKey ?? '') ?? 99) : 100
    if (ai !== bi) return ai - bi
    return a.createdAt.localeCompare(b.createdAt)
  })
}

/**
 * Make sure the athlete has all 4 automatic drills, then return their full
 * homework list (auto drills first). Called on load and on athlete creation.
 */
export function ensureAutoHomework(athleteId: string): HomeworkItem[] {
  const all = loadAllHomework()
  const mine = all.filter((h) => h.athleteId === athleteId)
  const missing = AUTO_HOMEWORK_DEFS.filter(
    (d) => !mine.some((h) => h.source === 'auto' && h.autoKey === d.autoKey),
  )
  if (missing.length > 0) {
    const now = new Date().toISOString()
    const seeded: HomeworkItem[] = missing.map((d) => ({
      id: createId('hw'),
      athleteId,
      shapeId: d.shapeId,
      source: 'auto',
      autoKey: d.autoKey,
      targetSeconds: d.targetSeconds,
      notes: d.notes,
      createdAt: now,
    }))
    all.push(...seeded)
    saveAllHomework(all)
    return sortHomework([...mine, ...seeded])
  }
  return sortHomework(mine)
}

/** Add a coach- or athlete-selected homework item; returns the athlete's list. */
export function addHomeworkItem(item: HomeworkItem): HomeworkItem[] {
  const all = loadAllHomework()
  all.push(item)
  saveAllHomework(all)
  return sortHomework(all.filter((h) => h.athleteId === item.athleteId))
}

/** Update editable fields on a homework item (e.g. formStandard). */
export function updateHomeworkItem(
  id: string,
  patch: Partial<Pick<HomeworkItem, 'formStandard' | 'targetSeconds' | 'notes'>>,
): HomeworkItem | null {
  const all = loadAllHomework()
  const item = all.find((h) => h.id === id)
  if (!item) return null
  Object.assign(item, patch)
  saveAllHomework(all)
  return { ...item }
}

/** Remove a homework item. Auto items are protected and cannot be removed. */
export function removeHomeworkItem(id: string): void {
  const all = loadAllHomework()
  const target = all.find((h) => h.id === id)
  if (!target || target.source === 'auto') return
  saveAllHomework(all.filter((h) => h.id !== id))
}

/**
 * Level up the hollow auto item: switch its shape from hollow_arms_down to
 * hollow_arms_up. Same item id → all history is kept.
 */
export function progressHollowHomework(homeworkId: string): HomeworkItem | null {
  const all = loadAllHomework()
  const item = all.find((h) => h.id === homeworkId)
  if (!item || item.shapeId !== 'hollow_arms_down') return null
  item.shapeId = 'hollow_arms_up'
  item.progressedAt = new Date().toISOString()
  item.notes =
    'Leveled up to arms up. Same hollow — lower back flat, arms by the ears. Do not skip the arms-down minute.'
  saveAllHomework(all)
  return { ...item }
}

export function loadHomeworkLogs(athleteId?: string): HomeworkLog[] {
  const all = readJson<HomeworkLog[]>(HOMEWORK_LOGS_KEY, [])
  return athleteId ? all.filter((l) => l.athleteId === athleteId) : all
}

/** Newest first; capped at 1000 entries across all athletes. */
export function addHomeworkLog(log: HomeworkLog): void {
  const all = readJson<HomeworkLog[]>(HOMEWORK_LOGS_KEY, [])
  all.unshift(log)
  writeJson(HOMEWORK_LOGS_KEY, all.slice(0, 1000))
}

// ---------------------------------------------------------------------------
// Reference photos (base64 data URLs in localStorage)
// ---------------------------------------------------------------------------

export {
  DEFAULT_REFERENCE_PATHS,
  SHIPPED_REFERENCE_IDS,
  pickReferencePhoto,
} from './shippedRefs'

export function loadReferencePhotos(): ReferencePhoto[] {
  return readJson<ReferencePhoto[]>(REFS_KEY, [])
}

export function saveReferencePhotos(photos: ReferencePhoto[]) {
  writeJson(REFS_KEY, photos)
}

export async function saveReferencePhoto(photo: ReferencePhoto): Promise<void> {
  const all = loadReferencePhotos()
  // Replace any existing photo for same shape + athlete scope
  const filtered = all.filter(
    (p) => !(p.shapeId === photo.shapeId && p.athleteId === photo.athleteId),
  )
  filtered.unshift(photo)
  saveReferencePhotos(filtered.slice(0, 120))
}

export async function deleteReferencePhoto(id: string): Promise<void> {
  saveReferencePhotos(loadReferencePhotos().filter((p) => p.id !== id))
}

/** Read a File as a data URL (for localStorage). */
export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(reader.error ?? new Error('Failed to read file'))
    reader.readAsDataURL(file)
  })
}

const TAB_KEY = 'shape-lab.tab.v1'
export const APP_TABS = [
  'tasks',
  'tasks2',
  'homework',
  'learn',
  'compare',
  'coach',
  'history',
  'about',
] as const
export type AppTab = (typeof APP_TABS)[number]

export function loadTab(): AppTab {
  try {
    const v = localStorage.getItem(TAB_KEY)
    if (v && (APP_TABS as readonly string[]).includes(v)) return v as AppTab
  } catch {
    /* private mode */
  }
  return 'tasks'
}

export function saveTab(tab: AppTab) {
  try {
    localStorage.setItem(TAB_KEY, tab)
  } catch {
    /* quota */
  }
}
