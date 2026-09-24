/**
 * Coach-entered hold times on an athlete's homework.
 * Does not require the athlete to be signed in.
 */

import { roundHoldSecondsUp } from '../hooks/useHoldTimer'
import type { HomeworkLog } from '../types'
import { markedFetch } from './authSession'
import { CLASS_HOLD_DRILLS, ensureCatalogHomework } from './classSessionLog'
import { customHomeworkShapeId } from './homeworkLabel'
import {
  addHomeworkItem,
  addHomeworkLog,
  createId,
  ensureAutoHomework,
  homeworkDedupeKey,
} from './storage'

export const COACH_HOLD_CHOICES: { id: string; label: string; catalogId?: string }[] = [
  { id: 'hollow', label: 'Hollow hold', catalogId: 'hollow' },
  { id: 'superman', label: 'Arch / Superman hold', catalogId: 'superman' },
  { id: 'side_plank', label: 'Side plank', catalogId: 'side_plank' },
  { id: 'wall_handstand', label: 'Handstand hold', catalogId: 'wall_handstand' },
]

export type HoldLogSource = 'coach' | 'athlete' | 'parent'

export type CoachHoldDraft = {
  athleteId: string
  shapeId: string
  shapeName: string
  seconds: number
  performedAt?: string
  source?: HoldLogSource
  coachId?: string
  coachName?: string
  lessonId?: string
  classMeetingId?: string
  className?: string
  side?: 'left' | 'right'
}

function performedIso(raw?: string): string {
  if (raw && /^\d{4}-\d{2}-\d{2}$/.test(raw)) return `${raw}T12:00:00.000Z`
  if (raw) {
    const parsed = Date.parse(raw)
    if (!Number.isNaN(parsed)) return new Date(parsed).toISOString()
  }
  return new Date().toISOString()
}

export function logCoachHoldLocal(draft: CoachHoldDraft): HomeworkLog | null {
  if (!draft.athleteId || draft.seconds < 0.2) return null
  const catalog = COACH_HOLD_CHOICES.find((row) => row.id === draft.shapeId)
  if (catalog?.catalogId) ensureCatalogHomework(draft.athleteId, catalog.catalogId)
  const auto = CLASS_HOLD_DRILLS.find((row) => row.id === draft.shapeId)
  if (auto) ensureAutoHomework(draft.athleteId)

  const custom = draft.shapeId.startsWith('custom:') || !catalog
  const shapeId = catalog ? draft.shapeId : customHomeworkShapeId(draft.shapeName)
  const items = ensureAutoHomework(draft.athleteId)
  const probe = {
    athleteId: draft.athleteId,
    shapeId: catalog ? items.find((row) => row.catalogId === catalog.catalogId)?.shapeId ?? shapeId : shapeId,
    ...(custom && !catalog ? { customLabel: draft.shapeName.trim() } : {}),
  }
  let item = catalog
    ? items.find((row) => row.catalogId === catalog.catalogId)
    : items.find((row) => homeworkDedupeKey(row) === homeworkDedupeKey(probe))
  if (!item) {
    const next = addHomeworkItem({
      id: createId('hw'),
      athleteId: draft.athleteId,
      shapeId,
      ...(custom && !catalog ? { customLabel: draft.shapeName.trim() } : {}),
      ...(catalog?.catalogId ? { catalogId: catalog.catalogId } : {}),
      source: 'coach',
      createdAt: new Date().toISOString(),
      notes: draft.coachName ? `Logged by ${draft.coachName}.` : undefined,
    })
    item = next.find((row) => row.athleteId === draft.athleteId && row.shapeId === shapeId)
  }
  if (!item) return null

  const now = new Date().toISOString()
  const log: HomeworkLog = {
    id: createId('hwlog'),
    athleteId: draft.athleteId,
    homeworkId: item.id,
    shapeId: item.shapeId,
    date: performedIso(draft.performedAt),
    loggedAt: now,
    method: 'manual',
    totalHoldSeconds: roundHoldSecondsUp(draft.seconds),
    score: 0,
    loggedByRole: draft.source ?? 'coach',
    ...(draft.lessonId ? { loggedFrom: 'lesson' as const, lessonId: draft.lessonId } : {}),
    ...(draft.classMeetingId
      ? { loggedFrom: 'class' as const, classMeetingId: draft.classMeetingId }
      : {}),
    ...(draft.coachId ? { coachId: draft.coachId } : {}),
    ...(draft.coachName ? { coachName: draft.coachName } : {}),
    ...(draft.className ? { className: draft.className } : {}),
    ...(draft.side ? { side: draft.side } : {}),
    sourceLabel: draft.lessonId
      ? `Lesson · ${draft.shapeName}`
      : draft.classMeetingId
        ? `In class · ${draft.shapeName}`
        : `Coach log · ${draft.shapeName}`,
  }
  addHomeworkLog(log)
  return log
}

export async function saveCoachHold(draft: CoachHoldDraft): Promise<HomeworkLog | null> {
  const local = logCoachHoldLocal(draft)
  try {
    await markedFetch('/api/hold-logs', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        athleteId: draft.athleteId,
        shapeId: draft.shapeId,
        shapeName: draft.shapeName,
        seconds: draft.seconds,
        performedAt: draft.performedAt,
        source: draft.source ?? 'coach',
        lessonId: draft.lessonId,
        classMeetingId: draft.classMeetingId,
        className: draft.className,
        side: draft.side,
        logId: local?.id,
      }),
    })
  } catch {
    /* roster sync still carries the local log */
  }
  return local
}
