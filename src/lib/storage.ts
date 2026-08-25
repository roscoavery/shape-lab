/**
 * ============================================================================
 * Local browser storage (localStorage)
 * ============================================================================
 * Saves athletes and attempts on this device only — no server, no account.
 */

import type { AppSettings, Athlete, AttemptRecord } from '../types'

const ATHLETES_KEY = 'shape-lab.athletes.v1'
const ATTEMPTS_KEY = 'shape-lab.attempts.v1'
const SETTINGS_KEY = 'shape-lab.settings.v1'
const ACTIVE_ATHLETE_KEY = 'shape-lab.activeAthlete.v1'

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
  // Keep last 500 attempts to avoid bloating localStorage
  writeJson(ATTEMPTS_KEY, all.slice(0, 500))
}

export function loadSettings(): AppSettings {
  return readJson<AppSettings>(SETTINGS_KEY, {
    qualityThresholdOverride: null,
    mirrorVideo: true,
    showAngles: true,
  })
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
