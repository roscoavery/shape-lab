/**
 * Coach-entered athlete hold times. Does not require the athlete to be signed in.
 */

import { readRosterFile, writeRosterFile } from './rosterStore.ts'

const CATALOG: Record<string, { shapeId: string; catalogId: string; label: string }> = {
  hollow: { shapeId: 'hollow', catalogId: 'hollow', label: 'Hollow hold' },
  superman: { shapeId: 'superman', catalogId: 'superman', label: 'Arch / Superman hold' },
  side_plank: { shapeId: 'side_plank', catalogId: 'side_plank', label: 'Side plank' },
  wall_handstand: { shapeId: 'wall_handstand', catalogId: 'wall_handstand', label: 'Handstand hold' },
}

function roundHoldSecondsUp(s: number): number {
  if (!Number.isFinite(s) || s <= 0) return 0
  return Math.ceil(s * 100) / 100
}

function performedIso(raw: unknown): string {
  if (typeof raw === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(raw)) return `${raw}T12:00:00.000Z`
  if (typeof raw === 'string') {
    const parsed = Date.parse(raw)
    if (!Number.isNaN(parsed)) return new Date(parsed).toISOString()
  }
  return new Date().toISOString()
}

function customShapeId(name: string): string {
  return `custom:${name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 40)}`
}

export type HoldLogInput = {
  athleteId: string
  shapeId?: string
  shapeName?: string
  seconds: number
  performedAt?: string
  source?: 'coach' | 'athlete' | 'parent'
  coachId?: string
  coachName?: string
  lessonId?: string
  classMeetingId?: string
  className?: string
  side?: 'left' | 'right'
  logId?: string
  loggedFrom?: 'lesson' | 'class' | 'profile' | 'today'
}

export async function appendHoldLog(input: HoldLogInput): Promise<Record<string, unknown> | null> {
  if (!input.athleteId || !Number.isFinite(input.seconds) || input.seconds < 0.2) return null
  const catalog = input.shapeId ? CATALOG[input.shapeId] : undefined
  const shapeName = (input.shapeName || catalog?.label || 'Hold').trim().slice(0, 80)
  const shapeId = catalog?.shapeId || (input.shapeId?.startsWith('custom:') ? input.shapeId : customShapeId(shapeName))
  const roster = await readRosterFile()
  const homework = Array.isArray(roster.homework) ? [...roster.homework] : []
  let item = homework.find((row) => {
    if (!row || typeof row !== 'object') return false
    const h = row as Record<string, unknown>
    return h.athleteId === input.athleteId && (
      (catalog && h.catalogId === catalog.catalogId) ||
      h.shapeId === shapeId
    )
  }) as Record<string, unknown> | undefined
  if (!item) {
    item = {
      id: input.logId ? `hw_${input.logId}` : `hw_${Date.now().toString(36)}`,
      athleteId: input.athleteId,
      shapeId,
      ...(catalog ? { catalogId: catalog.catalogId } : { customLabel: shapeName }),
      source: 'coach',
      createdAt: new Date().toISOString(),
    }
    homework.push(item)
  }
  const now = new Date().toISOString()
  const log: Record<string, unknown> = {
    id: typeof input.logId === 'string' && input.logId ? input.logId.slice(0, 80) : `hwlog_${Date.now().toString(36)}`,
    athleteId: input.athleteId,
    homeworkId: item.id,
    shapeId: item.shapeId,
    date: performedIso(input.performedAt),
    loggedAt: now,
    method: 'manual',
    kind: 'hold',
    totalHoldSeconds: Number(input.seconds.toFixed(2)),
    score: 0,
    loggedByRole: input.source ?? 'coach',
    ...(input.lessonId ? { loggedFrom: 'lesson', lessonId: input.lessonId } : {}),
    ...(input.classMeetingId ? { loggedFrom: 'class', classMeetingId: input.classMeetingId } : {}),
    ...(input.loggedFrom && !input.lessonId && !input.classMeetingId ? { loggedFrom: input.loggedFrom } : {}),
    ...(input.coachId ? { coachId: input.coachId } : {}),
    ...(input.coachName ? { coachName: input.coachName } : {}),
    ...(input.className ? { className: input.className } : {}),
    ...(input.side ? { side: input.side } : {}),
    sourceLabel: input.lessonId
      ? `Lesson · ${shapeName}`
      : input.classMeetingId
        ? `In class · ${shapeName}`
        : `Coach log · ${shapeName}`,
  }
  const logs = [...(Array.isArray(roster.homeworkLogs) ? roster.homeworkLogs : []), log].slice(-1000)
  await writeRosterFile({ ...roster, homework, homeworkLogs: logs })
  return log
}
