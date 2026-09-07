/**
 * 4-digit passcode for profiles. Hash is stored on the roster
 * (any browser / link); the plaintext never leaves the device.
 *
 * This device stays signed in as the last unlocked profile until they
 * tap Switch profile. Switching to a different passcode profile still
 * asks for that code — a shared link cannot open gym admin by tapping
 * a name.
 */

import type { Athlete } from '../types'
import { findRyan, isRyanAthlete } from './ryanProfile'

const UNLOCKED_KEY = 'shape-lab.unlockedProfile.v2'
const UNLOCKED_LS = 'shape-lab.unlockedProfile.v3'
const DEVICE_SESSION = 'shape-lab.deviceSession.v1'

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

function parseUnlockRec(raw: string | null): string | null {
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as unknown
    if (typeof parsed === 'string' && parsed) return parsed
    const rec = parsed as UnlockRec
    if (rec?.id && typeof rec.id === 'string') return rec.id
  } catch {
    /* ignore */
  }
  return null
}

function readUnlockedId(): string | null {
  try {
    const tab = parseUnlockRec(sessionStorage.getItem(UNLOCKED_KEY))
    if (tab) return tab
  } catch {
    /* keep going */
  }
  try {
    const device = parseUnlockRec(localStorage.getItem(DEVICE_SESSION))
    if (device) return device
  } catch {
    /* keep going */
  }
  try {
    return parseUnlockRec(localStorage.getItem(UNLOCKED_LS))
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

/** Unlock this profile on this device until they switch. */
export function markProfileUnlocked(athleteId: string): void {
  const rec: UnlockRec = { id: athleteId, at: Date.now() }
  const json = JSON.stringify(rec)
  try {
    sessionStorage.setItem(UNLOCKED_KEY, JSON.stringify(athleteId))
  } catch {
    /* private */
  }
  try {
    localStorage.setItem(DEVICE_SESSION, json)
    localStorage.setItem(UNLOCKED_LS, json)
  } catch {
    /* quota */
  }
}

export function lockProfile(athleteId: string): void {
  if (readUnlockedId() === athleteId) lockAllProfiles()
}

export function lockAllProfiles(): void {
  try {
    sessionStorage.removeItem(UNLOCKED_KEY)
  } catch {
    /* private */
  }
  try {
    localStorage.removeItem(DEVICE_SESSION)
    localStorage.removeItem(UNLOCKED_LS)
  } catch {
    /* private */
  }
}
