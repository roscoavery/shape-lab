/**
 * 4-digit passcode for athlete profiles. Hash is stored on the roster
 * (any browser / link); the plaintext never leaves the device.
 */

import type { Athlete } from '../types'
import { findRyan } from './ryanProfile'

const UNLOCKED_KEY = 'shape-lab.unlockedProfiles.v1'

/** Coach profile PIN — same on every link once the hash is on the roster. */
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

export async function withRyanPasscode(athletes: Athlete[]): Promise<Athlete[]> {
  const ryan = findRyan(athletes)
  if (!ryan) return athletes
  const hash = await hashPasscode(ryan.id, RYAN_PASSCODE)
  if (ryan.passcodeHash === hash) return athletes
  return athletes.map((a) => (a.id === ryan.id ? { ...a, passcodeHash: hash } : a))
}

function readUnlocked(): string[] {
  try {
    const raw = sessionStorage.getItem(UNLOCKED_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    return Array.isArray(parsed) ? parsed.filter((id) => typeof id === 'string') : []
  } catch {
    return []
  }
}

export function isProfileUnlocked(athleteId: string): boolean {
  return readUnlocked().includes(athleteId)
}

export function markProfileUnlocked(athleteId: string): void {
  const next = [...new Set([...readUnlocked(), athleteId])]
  sessionStorage.setItem(UNLOCKED_KEY, JSON.stringify(next))
}

export function lockProfile(athleteId: string): void {
  sessionStorage.setItem(
    UNLOCKED_KEY,
    JSON.stringify(readUnlocked().filter((id) => id !== athleteId)),
  )
}
