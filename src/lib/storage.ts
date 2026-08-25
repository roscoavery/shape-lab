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
  ReferencePhoto,
} from '../types'

const ATHLETES_KEY = 'shape-lab.athletes.v1'
const ATTEMPTS_KEY = 'shape-lab.attempts.v1'
const SETTINGS_KEY = 'shape-lab.settings.v1'
const ACTIVE_ATHLETE_KEY = 'shape-lab.activeAthlete.v1'
const PROGRESS_KEY = 'shape-lab.athleteProgress.v1'
const REFS_KEY = 'shape-lab.referencePhotos.v1'

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
// Reference photos (base64 data URLs in localStorage)
// ---------------------------------------------------------------------------

/** Default static files under public/references/ (used when present). */
export const DEFAULT_REFERENCE_PATHS: Record<string, string> = {
  feet_together_open_shoulders: '/references/feet_together_open_shoulders.jpg',
  passe: '/references/passe.png',
  lunge_start: '/references/lunge_start.jpg',
  lever: '/references/lever.jpg',
  lunge_land: '/references/lunge_land.jpg',
}

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
  saveReferencePhotos(filtered.slice(0, 80))
}

export async function deleteReferencePhoto(id: string): Promise<void> {
  saveReferencePhotos(loadReferencePhotos().filter((p) => p.id !== id))
}

/**
 * Prefer athlete-specific upload → shared coach upload → default public path.
 * Returns a ReferencePhoto-like object (synthetic id for defaults).
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
  if (defaultPath) {
    return {
      id: `default_${shapeId}`,
      shapeId,
      athleteId: null,
      dataUrl: defaultPath,
      label: 'Default reference',
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
