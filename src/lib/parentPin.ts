/**
 * Parent Gate: a 4-digit PIN that protects the return from Athlete View
 * to the Parent experience. This is a device/family UX boundary, NOT a
 * replacement for real account authentication.
 *
 * Stored per-device in localStorage. The PIN is a convenience/privacy gate.
 */

const PIN_KEY = 'shapelab:parent-pin'

/** Whether a Parent PIN has been set on this device. */
export function hasParentPin(): boolean {
  try {
    return window.localStorage.getItem(PIN_KEY) !== null
  } catch {
    return false
  }
}

/** Set the Parent PIN. Must be 4 digits. */
export function setParentPin(pin: string): boolean {
  if (!/^\d{4}$/.test(pin)) return false
  try {
    window.localStorage.setItem(PIN_KEY, pin)
    return true
  } catch {
    return false
  }
}

/** Check a PIN against the stored one. */
export function checkParentPin(pin: string): boolean {
  try {
    const stored = window.localStorage.getItem(PIN_KEY)
    return stored !== null && stored === pin
  } catch {
    return false
  }
}

/** Clear the Parent PIN (e.g. on sign out). */
export function clearParentPin(): void {
  try {
    window.localStorage.removeItem(PIN_KEY)
  } catch {
    /* ignore */
  }
}
