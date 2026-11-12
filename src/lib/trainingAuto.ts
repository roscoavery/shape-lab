/**
 * School / camp / clinic auto-start, run from the app's every-minute clock
 * so it works no matter which tab is open (the old check lived in the Today
 * view and never ran while he was on the calendar — the same move the
 * lesson auto-start made).
 *
 * - Auto-start: a school, camp, or clinic calendar event starts its
 *   training session at its calendar time, exactly like lessons. The
 *   session opens through the open-training-session store, so the Today
 *   view picks it up whether it is mounted or not.
 * - School still skips athlete matching, auto-create-athlete, and the plan
 *   banner (build 1227): this only starts the session, it never links
 *   athletes and never starts a 1-on-1 lesson.
 */

import {
  authorizeCalendarFromSession,
  fetchTodayEvents,
  hasCalendarApiToken,
  type TodayCalendarEvent,
} from './calendarClient'
import { getSessionGlow } from './sessionGlow'
import { getActiveMeeting } from './coachClasses'
import { findLiveLesson } from './lessonStore'
import {
  createTrainingEvent,
  hydrateTrainingEvents,
  listTrainingEvents,
} from './trainingEvents'
import {
  getRestorableOpenTrainingSession,
  setOpenTrainingSession,
} from './openTrainingSession'

export type TrainingAutoStart = {
  kind: 'start'
  eventId: string
  trainingKind: 'school' | 'camp' | 'clinic'
}

const TRAINING_KINDS: ('school' | 'camp' | 'clinic')[] = ['school', 'camp', 'clinic']

/**
 * Pure decision: which training session, if any, should start right now.
 * `hasLive` is true when a class, lesson, or training session is already
 * live for this coach. Kept pure so the clock's choice is unit-testable.
 */
export function pickTrainingAutoStart(
  events: TodayCalendarEvent[],
  now: Date,
  hasLive: boolean,
): { trainingKind: 'school' | 'camp' | 'clinic'; calEvent: TodayCalendarEvent } | null {
  if (hasLive) return null
  const glow = getSessionGlow(events, now)
  for (const kind of TRAINING_KINDS) {
    if (!glow.glowing.has(kind)) continue
    const calEvent = glow.closest[kind]
    if (!calEvent) continue
    const startMs = Date.parse(calEvent.startAt)
    // Start at the scheduled time, not 5 minutes early: the glow leads by 5
    // minutes so he sees it coming, but the clock starts the session on time.
    if (!Number.isFinite(startMs) || now.getTime() < startMs) continue
    return { trainingKind: kind, calEvent }
  }
  return null
}

/** A school / camp / clinic session that should start right now, or null. */
export async function checkTrainingAutoStart(
  coachId: string,
  now: Date = new Date(),
): Promise<TrainingAutoStart | null> {
  let events: TodayCalendarEvent[]
  try {
    if (!hasCalendarApiToken()) await authorizeCalendarFromSession()
    events = (await fetchTodayEvents()).events
  } catch {
    return null
  }
  // Hydrate first: a client with a stale local copy (e.g. a phone that was
  // backgrounded through the scheduled start) must see the server's
  // training events before deciding to create one, or it spawns duplicates.
  await hydrateTrainingEvents()
  const hasLive =
    getActiveMeeting(coachId) != null ||
    findLiveLesson(coachId) != null ||
    getRestorableOpenTrainingSession(coachId) != null
  const pick = pickTrainingAutoStart(events, now, hasLive)
  if (!pick) return null
  const { trainingKind: kind, calEvent } = pick
  const title = (calEvent.title || kind).trim() || kind
  // Find or create the training event for this kind, so the session starts
  // and athletes can be added as they arrive.
  const matches = listTrainingEvents().filter(
    (e) => e.kind === kind && e.coachIds.includes(coachId),
  )
  const event =
    matches[0] ??
    createTrainingEvent({
      name: title,
      kind,
      coachId,
      hostGym: title,
      athleteIds: [],
    })
  setOpenTrainingSession(event.id, coachId)
  return { kind: 'start', eventId: event.id, trainingKind: kind }
}
