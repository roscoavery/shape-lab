/** Coach preferences for session auto-start. Stored per-device. */

const AUTO_START_KEY = 'shapelab:auto-start-sessions'

/** Whether school/camp/clinic sessions auto-start from the calendar. Defaults to true. */
export function getAutoStartSessions(): boolean {
  try {
    const raw = window.localStorage.getItem(AUTO_START_KEY)
    // Default to true (Ryan wants it autostarting); explicit '0' disables.
    return raw !== '0'
  } catch {
    return true
  }
}

export function setAutoStartSessions(on: boolean): void {
  try {
    window.localStorage.setItem(AUTO_START_KEY, on ? '1' : '0')
  } catch {
    /* ignore */
  }
}
