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
import { dismissHomeworkKey, loadDismissedHomeworkKeys, undismissHomeworkKey } from './careStore'
import { catalogIdFromShape } from '../config/homeworkCatalog'
import { withDefaultGym } from '../config/gyms'

const ATHLETES_KEY = 'shape-lab.athletes.v1'
const REMOVED_ATHLETES_KEY = 'shape-lab.removedAthletes.v1'
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

/** Last roster applied from the gym link — used if this phone cannot store the full JSON. */
let memoryAthletes: Athlete[] | null = null

function athletesWithoutPhotos(athletes: Athlete[]): Athlete[] {
  return athletes.map(({ photoDataUrl: _photo, ...rest }) => rest)
}

function pushRosterSoon() {
  void import('./rosterSync')
    .then((m) => m.pushServerRoster())
    .catch(() => {})
}

export function loadAthletes(): Athlete[] {
  const stored = readJson<Athlete[]>(ATHLETES_KEY, [])
  if (memoryAthletes && memoryAthletes.length > stored.length) {
    return memoryAthletes.map(withDefaultGym)
  }
  if (stored.length > 0) return stored.map(withDefaultGym)
  return (memoryAthletes ?? []).map(withDefaultGym)
}

export function saveAthletes(athletes: Athlete[]) {
  memoryAthletes = athletes.map(withDefaultGym)
  try {
    writeJson(ATHLETES_KEY, memoryAthletes)
  } catch {
    try {
      writeJson(ATHLETES_KEY, athletesWithoutPhotos(memoryAthletes))
    } catch {
      /* keep the in-memory roster so this tab still shows every profile */
    }
  }
}

export function loadRemovedAthleteIds(): string[] {
  const raw = readJson<unknown>(REMOVED_ATHLETES_KEY, [])
  if (!Array.isArray(raw)) return []
  return raw.filter((id): id is string => typeof id === 'string' && id.startsWith('ath_'))
}

export function saveRemovedAthleteIds(ids: string[]) {
  writeJson(REMOVED_ATHLETES_KEY, [...new Set(ids.filter((id) => id && id !== 'ath_ryan'))])
}

/** Remember an explicit delete so leftover homework cannot resurrect the row. */
export function noteRemovedAthlete(id: string) {
  if (!id || id === 'ath_ryan') return
  saveRemovedAthleteIds([...loadRemovedAthleteIds(), id])
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
    showAngles: false,
    voiceEnabled: true,
    notificationsEnabled: true,
  }
  const raw = readJson<Partial<AppSettings> & { voiceCoaching?: boolean }>(SETTINGS_KEY, {})
  // Migrate older voiceCoaching key if present
  const voiceEnabled =
    raw.voiceEnabled ?? raw.voiceCoaching ?? defaults.voiceEnabled
  return {
    qualityThresholdOverride: raw.qualityThresholdOverride ?? null,
    mirrorVideo: raw.mirrorVideo ?? true,
    showAngles: raw.showAngles ?? false,
    voiceEnabled,
    notificationsEnabled: raw.notificationsEnabled ?? true,
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
  pushRosterSoon()
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
  pushRosterSoon()
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
export const DEFAULT_FORM_STANDARD = 75

/** Effective form standard for a homework item (item override or default). */
export function formStandardFor(
  item: Pick<HomeworkItem, 'formStandard' | 'shapeId'>,
): number {
  if (item.formStandard != null) return item.formStandard
  if (item.shapeId.startsWith('hollow')) return 58
  return DEFAULT_FORM_STANDARD
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
      'Start in a seated pike with zombie arms. Inch back until the lowest part of the lower back touches the ground and stop. Try to get the low back flat to the ground and hold it as long as you can. Then let the feet inch off. Arms by the sides. If the low back will not go down, bend the knees. At 60s quality hold, level up to arms by the ears.',
  },
  {
    autoKey: 'superman',
    shapeId: 'superman',
    targetSeconds: 30,
    notes:
      'Chin stays up with straight arms behind the ears. Straight knees off of the ground. Feet and ankles together. Open-shoulder angle; posterior-chain strength. Work 30s toward a minute.',
  },
  {
    autoKey: 'side_plank',
    shapeId: 'side_plank',
    targetSeconds: 30,
    notes:
      'Be a pencil. Forearm on the mat, elbow under the shoulder, one foot stacked on the other, top hand on the hip or up. Head in line — no dangling head, no ribs flaring, no closed hips. Straight knees if you can; otherwise bend them and put weight on the bottom knee. Train BOTH sides. Work 30s toward a minute.',
  },
  {
    autoKey: 'wall_handstand',
    shapeId: 'wall_handstand',
    targetSeconds: 30,
    notes: 'Stomach-to-wall preferred. Same body standards as freestanding.',
  },
]

function inferAutoKey(item: HomeworkItem): string | undefined {
  if (item.autoKey && AUTO_HOMEWORK_DEFS.some((d) => d.autoKey === item.autoKey)) {
    return item.autoKey
  }
  if (
    item.shapeId === 'hollow' ||
    item.shapeId === 'hollow_arms_down' ||
    item.shapeId === 'hollow_arms_up'
  ) {
    return 'hollow'
  }
  return AUTO_HOMEWORK_DEFS.find((d) => d.shapeId === item.shapeId)?.autoKey
}

/** One card per athlete + drill. Safari / Strict Mode used to keep seeding extras. */
export function homeworkDedupeKey(
  item: Pick<HomeworkItem, 'athleteId' | 'shapeId'> &
    Partial<Pick<HomeworkItem, 'autoKey' | 'source' | 'customLabel' | 'catalogId' | 'coachExerciseId'>>,
): string {
  const aid = item.athleteId || '_'
  const auto = inferAutoKey(item as HomeworkItem)
  // Only the auto hollow card collapses arms-down / arms-up. A class extra
  // like "Hollow arms up" keeps its own homework card.
  if (item.autoKey === 'hollow' || (item.source === 'auto' && auto === 'hollow')) {
    return `${aid}::hollow`
  }
  if (item.shapeId.startsWith('seq:') || item.shapeId.startsWith('drill:')) {
    return `${aid}::${item.shapeId}`
  }
  const catalog = item.catalogId || catalogIdFromShape(item.shapeId)
  if (catalog) return `${aid}::catalog:${catalog}`
  if (item.coachExerciseId) return `${aid}::cx:${item.coachExerciseId}`
  const typed = item.customLabel?.trim().toLowerCase()
  if (typed) return `${aid}::typed:${typed}`
  if (item.shapeId.startsWith('custom:')) return `${aid}::${item.shapeId}`
  return `${aid}::${item.shapeId}`
}

export function filterDismissedHomework(items: HomeworkItem[]): HomeworkItem[] {
  const dismissed = new Set(loadDismissedHomeworkKeys())
  if (dismissed.size === 0) return items
  return items.filter((item) => item.source === 'auto' || !dismissed.has(homeworkDedupeKey(item)))
}

function preferHomeworkItem(a: HomeworkItem, b: HomeworkItem): HomeworkItem {
  if (a.source === 'auto' && b.source !== 'auto') return a
  if (b.source === 'auto' && a.source !== 'auto') return b
  return a.createdAt <= b.createdAt ? a : b
}

export function dedupeHomeworkItems(items: HomeworkItem[]): HomeworkItem[] {
  const best = new Map<string, HomeworkItem>()
  for (const raw of items) {
    const item =
      raw.source === 'auto' && !raw.autoKey && inferAutoKey(raw)
        ? { ...raw, autoKey: inferAutoKey(raw) }
        : raw
    const key = homeworkDedupeKey(item)
    const keep = best.get(key)
    best.set(key, keep ? preferHomeworkItem(keep, item) : item)
  }
  return [...best.values()]
}

/** Point leftover session logs at the card we kept when collapsing copies. */
function remapOrphanHomeworkLogs(before: HomeworkItem[], after: HomeworkItem[]) {
  const kept = new Set(after.map((i) => i.id))
  const dest = new Map(after.map((i) => [homeworkDedupeKey(i), i.id]))
  const from = new Map(before.map((i) => [i.id, homeworkDedupeKey(i)]))
  const logs = readJson<HomeworkLog[]>(HOMEWORK_LOGS_KEY, [])
  let changed = false
  const next = logs.map((l) => {
    if (kept.has(l.homeworkId)) return l
    const key = from.get(l.homeworkId)
    const id = key ? dest.get(key) : undefined
    if (!id) return l
    changed = true
    return { ...l, homeworkId: id }
  })
  if (changed) writeJson(HOMEWORK_LOGS_KEY, next)
}

export function loadAllHomework(): HomeworkItem[] {
  const items = readJson<HomeworkItem[]>(HOMEWORK_KEY, [])
  let changed = false
  for (const item of items) {
    if (item.shapeId === 'hollow') {
      item.shapeId = 'hollow_arms_up'
      changed = true
    }
    if (item.source === 'auto') {
      const key = inferAutoKey(item)
      if (key && item.autoKey !== key) {
        item.autoKey = key
        changed = true
      }
    }
  }
  const deduped = filterDismissedHomework(dedupeHomeworkItems(items))
  if (changed || deduped.length !== items.length) {
    remapOrphanHomeworkLogs(items, deduped)
    writeJson(HOMEWORK_KEY, deduped)
    pushRosterSoon()
    return deduped
  }
  return deduped
}

const homeworkListeners = new Set<() => void>()

function emitHomework() {
  for (const cb of homeworkListeners) cb()
}

export function subscribeHomework(cb: () => void): () => void {
  homeworkListeners.add(cb)
  return () => homeworkListeners.delete(cb)
}

export function saveAllHomework(items: HomeworkItem[]) {
  const cleaned = filterDismissedHomework(dedupeHomeworkItems(items))
  remapOrphanHomeworkLogs(items, cleaned)
  writeJson(HOMEWORK_KEY, cleaned)
  pushRosterSoon()
  emitHomework()
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
  const covered = new Set(
    mine.map((h) => inferAutoKey(h)).filter((k): k is string => Boolean(k)),
  )
  const missing = AUTO_HOMEWORK_DEFS.filter((d) => !covered.has(d.autoKey))
  let changed = false
  let next = mine
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
    next = [...mine, ...seeded]
    changed = true
  }
  for (const item of next) {
    if (item.source !== 'auto') continue
    if (item.autoKey !== 'hollow' && item.autoKey !== 'superman') continue
    const def = AUTO_HOMEWORK_DEFS.find((d) => d.autoKey === item.autoKey)
    if (def && item.notes !== def.notes) {
      item.notes = def.notes
      changed = true
    }
  }
  const cleaned = dedupeHomeworkItems(all)
  if (changed || cleaned.length !== all.length) saveAllHomework(cleaned)
  return sortHomework(cleaned.filter((h) => h.athleteId === athleteId))
}

/** Add a coach- or athlete-selected homework item; returns the athlete's list. */
export function addHomeworkItem(item: HomeworkItem): HomeworkItem[] {
  const all = loadAllHomework()
  const key = homeworkDedupeKey(item)
  undismissHomeworkKey(key)
  if (all.some((h) => h.athleteId === item.athleteId && homeworkDedupeKey(h) === key)) {
    return sortHomework(all.filter((h) => h.athleteId === item.athleteId))
  }
  all.push(item)
  saveAllHomework(all)
  return sortHomework(all.filter((h) => h.athleteId === item.athleteId))
}

/** Update editable fields on a homework item (e.g. formStandard). */
export function updateHomeworkItem(
  id: string,
  patch: Partial<
    Pick<
      HomeworkItem,
      | 'formStandard'
      | 'targetSeconds'
      | 'notes'
      | 'trackMode'
      | 'targetReps'
      | 'grip'
      | 'allowWeight'
    >
  >,
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
  dismissHomeworkKey(homeworkDedupeKey(target))
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
  emitHomework()
  pushRosterSoon()
  void import('./coachLink')
    .then((m) => m.notifyCoachesOfHomeworkLog(log))
    .catch(() => {})
}

export function patchHomeworkLog(
  id: string,
  patch: Partial<HomeworkLog>,
): HomeworkLog | null {
  const all = readJson<HomeworkLog[]>(HOMEWORK_LOGS_KEY, [])
  let found: HomeworkLog | null = null
  const next = all.map((row) => {
    if (row.id !== id) return row
    found = { ...row, ...patch, id: row.id }
    return found
  })
  if (!found) return null
  writeJson(HOMEWORK_LOGS_KEY, next)
  emitHomework()
  pushRosterSoon()
  return found
}

export function removeHomeworkLog(id: string): HomeworkLog | null {
  const all = readJson<HomeworkLog[]>(HOMEWORK_LOGS_KEY, [])
  const found = all.find((l) => l.id === id) ?? null
  if (!found) return null
  writeJson(HOMEWORK_LOGS_KEY, all.filter((l) => l.id !== id))
  emitHomework()
  pushRosterSoon()
  return found
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
  try {
    writeJson(REFS_KEY, photos)
  } catch {
    throw new Error('Storage is full. Delete some IG stills in Learn → IG shapes.')
  }
}

export async function saveReferencePhoto(photo: ReferencePhoto): Promise<void> {
  const all = loadReferencePhotos()
  let next: ReferencePhoto[]
  if (photo.library === 'ig') {
    // Keep every IG crop. Never replace a coach still.
    next = [photo, ...all.filter((p) => p.id !== photo.id)]
  } else {
    next = [
      photo,
      ...all.filter((p) => {
        if (p.library === 'ig') return true
        return !(p.shapeId === photo.shapeId && p.athleteId === photo.athleteId)
      }),
    ]
  }
  const ig = next.filter((p) => p.library === 'ig')
  const other = next.filter((p) => p.library !== 'ig')
  saveReferencePhotos([...ig.slice(0, 80), ...other.slice(0, 80)])
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

// Keep Version 1's selected tab untouched so switching back to the protected
// branch restores its own navigation state.
const TAB_KEY = 'shape-lab.tab.v2-rebuild'
export const APP_TABS = [
  'today',
  'tasks',
  'tasks2',
  'homework',
  'warmup',
  'learn',
  'coachlib',
  'drills',
  'compare',
  'classes',
  'feed',
  'wins',
  'network',
  'research',
  'coach',
  'history',
  'about',
] as const
export type AppTab = (typeof APP_TABS)[number]

export function isRyanOnlyTab(tab: AppTab): boolean {
  return tab === 'tasks' || tab === 'coach' || tab === 'drills'
}

export function loadTab(): AppTab {
  try {
    const v = localStorage.getItem(TAB_KEY)
    if (v && (APP_TABS as readonly string[]).includes(v)) return v as AppTab
  } catch {
    /* private mode */
  }
  return 'today'
}

export function saveTab(tab: AppTab) {
  try {
    localStorage.setItem(TAB_KEY, tab)
  } catch {
    /* quota */
  }
}
