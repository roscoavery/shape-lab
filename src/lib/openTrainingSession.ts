/**
 * The training session (school / camp / clinic) currently open on this
 * device. The training event itself lives in the trainingEvents store;
 * this is only the "which event is open right now" marker, so a started
 * school session survives leaving the Today view and coming back.
 *
 * Stored per device (localStorage), like the auto-start toggle. A session
 * only restores while its event still exists, it belongs to the signed-in
 * coach, and it was opened today — a school opened yesterday never
 * re-opens tomorrow.
 */

import { getTrainingEvent } from './trainingEvents'

const KEY = 'shapelab:open-training-session.v1'
const listeners = new Set<() => void>()

export type OpenTrainingSession = {
  eventId: string
  coachId: string
  openedAt: string
}

function notify() {
  for (const cb of listeners) cb()
}

export function getOpenTrainingSession(): OpenTrainingSession | null {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return null
    const data = JSON.parse(raw) as Partial<OpenTrainingSession>
    if (typeof data.eventId !== 'string' || typeof data.coachId !== 'string') return null
    return {
      eventId: data.eventId,
      coachId: data.coachId,
      openedAt: typeof data.openedAt === 'string' ? data.openedAt : '',
    }
  } catch {
    return null
  }
}

/** The stored session, only when it is safe to re-open it. */
export function getRestorableOpenTrainingSession(
  coachId: string | null | undefined,
): OpenTrainingSession | null {
  if (!coachId) return null
  const stored = getOpenTrainingSession()
  if (!stored || stored.coachId !== coachId) return null
  if (!getTrainingEvent(stored.eventId)) return null
  const opened = new Date(stored.openedAt)
  if (Number.isNaN(opened.getTime())) return null
  if (opened.toDateString() !== new Date().toDateString()) return null
  return stored
}

export function setOpenTrainingSession(eventId: string, coachId: string): void {
  try {
    const prev = getOpenTrainingSession()
    if (prev && prev.eventId === eventId && prev.coachId === coachId) return
    localStorage.setItem(
      KEY,
      JSON.stringify({ eventId, coachId, openedAt: new Date().toISOString() }),
    )
  } catch {
    /* ignore */
  }
  notify()
}

export function clearOpenTrainingSession(): void {
  try {
    if (localStorage.getItem(KEY) == null) return
    localStorage.removeItem(KEY)
  } catch {
    /* ignore */
  }
  notify()
}

export function subscribeOpenTrainingSession(cb: () => void): () => void {
  listeners.add(cb)
  return () => listeners.delete(cb)
}
