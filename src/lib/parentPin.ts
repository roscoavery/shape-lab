/**
 * Parent Gate: a 4-digit PIN that protects the return from Athlete View
 * to the Parent experience. This is a device/family UX boundary, NOT a
 * replacement for real account authentication.
 *
 * Stored per-device in localStorage as a SHA-256 hash, never the PIN
 * itself. A 4-digit PIN has only 10,000 possibilities, so the hash is
 * about not keeping the readable PIN sitting on the device; the retry
 * lock is what slows down guessing: 5 wrong tries lock the gate for
 * 30 seconds. Forgetting the PIN is recoverable by signing out, which
 * clears it (see logoutSession).
 */

const PIN_KEY = 'shapelab:parent-pin'
const GUARD_KEY = 'shapelab:parent-pin-guard'
const HASH_PREFIX = 'v1$'
const MAX_FAILS = 5
const LOCK_MS = 30 * 1000

async function hashPin(pin: string): Promise<string> {
  const data = new TextEncoder().encode(`shapelab-parent-pin:${pin}`)
  const digest = await crypto.subtle.digest('SHA-256', data)
  const hex = [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('')
  return `${HASH_PREFIX}${hex}`
}

type PinGuard = { fails: number; lockUntil: number }

function readGuard(): PinGuard {
  try {
    const raw = window.localStorage.getItem(GUARD_KEY)
    if (!raw) return { fails: 0, lockUntil: 0 }
    const parsed = JSON.parse(raw) as Partial<PinGuard>
    return {
      fails: typeof parsed.fails === 'number' ? parsed.fails : 0,
      lockUntil: typeof parsed.lockUntil === 'number' ? parsed.lockUntil : 0,
    }
  } catch {
    return { fails: 0, lockUntil: 0 }
  }
}

function writeGuard(guard: PinGuard): void {
  try {
    window.localStorage.setItem(GUARD_KEY, JSON.stringify(guard))
  } catch {
    /* ignore */
  }
}

/** Seconds left on the retry lock, 0 when the gate is open. */
export function parentPinLockSeconds(): number {
  const left = Math.ceil((readGuard().lockUntil - Date.now()) / 1000)
  return left > 0 ? left : 0
}

/** Whether a Parent PIN has been set on this device. */
export function hasParentPin(): boolean {
  try {
    return window.localStorage.getItem(PIN_KEY) !== null
  } catch {
    return false
  }
}

/** Set the Parent PIN (stored hashed). Must be 4 digits. */
export async function setParentPin(pin: string): Promise<boolean> {
  if (!/^\d{4}$/.test(pin)) return false
  try {
    window.localStorage.setItem(PIN_KEY, await hashPin(pin))
    writeGuard({ fails: 0, lockUntil: 0 })
    return true
  } catch {
    return false
  }
}

/**
 * Check a PIN against the stored hash. Wrong tries count toward the
 * retry lock; while locked, even the right PIN waits. A legacy
 * plaintext PIN (stored before hashed storage) still works once and
 * is upgraded to a hash on that successful entry.
 */
export async function checkParentPin(pin: string): Promise<boolean> {
  try {
    const stored = window.localStorage.getItem(PIN_KEY)
    if (stored === null) return false
    if (parentPinLockSeconds() > 0) return false
    let ok = false
    if (stored.startsWith(HASH_PREFIX)) {
      ok = (await hashPin(pin)) === stored
    } else {
      ok = stored === pin
      if (ok) window.localStorage.setItem(PIN_KEY, await hashPin(pin))
    }
    if (ok) {
      writeGuard({ fails: 0, lockUntil: 0 })
      return true
    }
    const guard = readGuard()
    const fails = guard.fails + 1
    writeGuard(
      fails >= MAX_FAILS ? { fails: 0, lockUntil: Date.now() + LOCK_MS } : { fails, lockUntil: 0 },
    )
    return false
  } catch {
    return false
  }
}

/** Clear the Parent PIN and its retry lock (e.g. on sign out). */
export function clearParentPin(): void {
  try {
    window.localStorage.removeItem(PIN_KEY)
    window.localStorage.removeItem(GUARD_KEY)
  } catch {
    /* ignore */
  }
}
