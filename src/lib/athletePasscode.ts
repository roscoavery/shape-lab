/**
 * 4-digit passcode for profiles. Hash is stored on the roster
 * (any browser / link); the plaintext never leaves the device.
 *
 * Only one profile is unlocked per tab. Switching to Ryan (or any other
 * passcode profile) always asks for that code — a shared link cannot open
 * gym admin by tapping the name.
 */

import type { Athlete } from '../types'
import { findRyan, isRyanAthlete } from './ryanProfile'

const UNLOCKED_KEY = 'shape-lab.unlockedProfile.v2'
const UNLOCKED_LS = 'shape-lab.unlockedProfile.v3'
const UNLOCK_MS = 18 * 60 * 60 * 1000

type UnlockRec = { id: string; at: number }

/** Coach / gym-admin PIN — same on every link once the hash is on the roster. */
export const RYAN_PASSCODE = '2223'

function bytesToHex(buf: ArrayBuffer): string {
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

export async function hashPasscode(athleteId: string, passcode: string): Promise<string> {
  const trimmed = passcode.trim()
  const data = new TextEncoder().encode(`shape-lab:${athleteId}:${trimmed}`)
  const buf = await crypto.subtle.digest('SHA-256', data)
  return bytesToHex(buf)
}

export function digitsOnlyPin(raw: string): string {
  return raw.replace(/\D/g, '').slice(0, 4)
}

/** New profiles: exactly four digits. */
export function passcodeLooksOk(passcode: string): boolean {
  return /^\d{4}$/.test(passcode.trim())
}

export function profileNeedsPasscode(athlete: Athlete | null | undefined): boolean {
  if (!athlete) return false
  if (isRyanAthlete(athlete)) return true
  return Boolean(athlete.passcodeHash)
}

export async function expectedPasscodeHash(athlete: Athlete): Promise<string | null> {
  if (athlete.passcodeHash) return athlete.passcodeHash
  if (isRyanAthlete(athlete)) return hashPasscode(athlete.id, RYAN_PASSCODE)
  return null
}

export async function withRyanPasscode(athletes: Athlete[]): Promise<Athlete[]> {
  const ryan = findRyan(athletes)
  if (!ryan) return athletes
  const hash = await hashPasscode(ryan.id, RYAN_PASSCODE)
  if (ryan.passcodeHash === hash) return athletes
  return athletes.map((a) => (a.id === ryan.id ? { ...a, passcodeHash: hash } : a))
}

function readUnlockedId(): string | null {
  try {
    const raw = sessionStorage.getItem(UNLOCKED_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as unknown
      if (typeof parsed === 'string' && parsed) return parsed
    }
  } catch {
    /* keep going */
  }
  try {
    const raw = localStorage.getItem(UNLOCKED_LS)
    if (!raw) return null
    const rec = JSON.parse(raw) as UnlockRec
    if (!rec?.id || typeof rec.at !== 'number') return null
    if (Date.now() - rec.at > UNLOCK_MS) {
      localStorage.removeItem(UNLOCKED_LS)
      return null
    }
    return rec.id
  } catch {
    return null
  }
}

export function unlockedProfileId(): string | null {
  return readUnlockedId()
}

export function isProfileUnlocked(athleteId: string): boolean {
  return readUnlockedId() === athleteId
}

/** Unlock this profile and lock every other one in this tab. */
export function markProfileUnlocked(athleteId: string): void {
  sessionStorage.setItem(UNLOCKED_KEY, JSON.stringify(athleteId))
  try {
    localStorage.setItem(UNLOCKED_LS, JSON.stringify({ id: athleteId, at: Date.now() } satisfies UnlockRec))
  } catch {
    /* quota */
  }
}

export function lockProfile(athleteId: string): void {
  if (readUnlockedId() === athleteId) {
    sessionStorage.removeItem(UNLOCKED_KEY)
    try {
      localStorage.removeItem(UNLOCKED_LS)
    } catch {
      /* private */
    }
  }
}

export function lockAllProfiles(): void {
  sessionStorage.removeItem(UNLOCKED_KEY)
  try {
    localStorage.removeItem(UNLOCKED_LS)
  } catch {
    /* private */
  }
}
