/**
 * SHA-256 passcode for athlete profiles. Hash is stored on the roster
 * (any browser / link); the plaintext never leaves the device.
 */

const UNLOCKED_KEY = 'shape-lab.unlockedProfiles.v1'

function bytesToHex(buf: ArrayBuffer): string {
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

export async function hashPasscode(athleteId: string, passcode: string): Promise<string> {
  const trimmed = passcode.trim()
  const data = new TextEncoder().encode(`shape-lab:${athleteId}:${trimmed}`)
  const buf = await crypto.subtle.digest('SHA-256', data)
  return bytesToHex(buf)
}

export function passcodeLooksOk(passcode: string): boolean {
  return passcode.trim().length >= 4
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
