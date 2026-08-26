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
} from '../types'

const ATHLETES_KEY = 'shape-lab.athletes.v1'
const ATTEMPTS_KEY = 'shape-lab.attempts.v1'
const SETTINGS_KEY = 'shape-lab.settings.v1'
const ACTIVE_ATHLETE_KEY = 'shape-lab.activeAthlete.v1'
const PROGRESS_KEY = 'shape-lab.athleteProgress.v1'
const REFS_KEY = 'shape-lab.referencePhotos.v1'
const HOMEWORK_KEY = 'shape-lab.homework.v1'
const HOMEWORK_LOGS_KEY = 'shape-lab.homeworkLogs.v1'

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
  return all[athleteId] ?? defaultTaskProgress(athleteId)
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
 * switches from hollow_arms_down → hollow when the athlete levels up.
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
      'Lower back pressed to the floor, arms by sides, legs tight. At 60s quality hold, level up to arms up.',
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
  return readJson<HomeworkItem[]>(HOMEWORK_KEY, [])
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
 * hollow (arms up). Same item id → all history is kept.
 */
export function progressHollowHomework(homeworkId: string): HomeworkItem | null {
  const all = loadAllHomework()
  const item = all.find((h) => h.id === homeworkId)
  if (!item || item.shapeId !== 'hollow_arms_down') return null
  item.shapeId = 'hollow'
  item.progressedAt = new Date().toISOString()
  item.notes = 'Leveled up! Arms by ears now — same hollow standards.'
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

/** Default static files under public/references/ (used when present). */
export const DEFAULT_REFERENCE_PATHS: Record<string, string> = {
  feet_together_open_shoulders: '/references/feet_together_open_shoulders.jpg',
  passe: '/references/passe.png',
  lunge_start: '/references/lunge_start.jpg',
  lever: '/references/lever.jpg',
  lunge_land: '/references/lunge_land.jpg',
  c_shape: '/references/c_shape.jpg',
}

/** Files that actually ship in public/references/ (not just hoped-for names). */
export const SHIPPED_REFERENCE_IDS = new Set([
  'c_shape',
  'passe',
  'lunge_land',
  'lunge_start',
  'feet_together_open_shoulders',
])

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

/**
 * Prefer athlete-specific upload → shared coach upload → shipped public file.
 * Default paths that are not in SHIPPED_REFERENCE_IDS are ignored (hoped-for names).
 */
export function pickReferencePhoto(
  photos: ReferencePhoto[],
  shapeId: string,
  athleteId: string | null,
): ReferencePhoto | null {
  if (!shapeId) return null
  if (athleteId) {
    const forAthlete = photos.find(
      (p) => p.shapeId === shapeId && p.athleteId === athleteId,
    )
    if (forAthlete) return forAthlete
  }
  const shared = photos.find((p) => p.shapeId === shapeId && p.athleteId == null)
  if (shared) return shared

  const defaultPath = DEFAULT_REFERENCE_PATHS[shapeId]
  if (defaultPath && SHIPPED_REFERENCE_IDS.has(shapeId)) {
    return {
      id: `default_${shapeId}`,
      shapeId,
      athleteId: null,
      dataUrl: defaultPath,
      label: 'Coach reference',
      createdAt: '',
    }
  }
  return null
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
