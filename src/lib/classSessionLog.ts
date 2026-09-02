/**
 * Log class holds, V-ups, and typed skills onto each athlete's homework.
 */

import { getCatalogItem } from '../config/homeworkCatalog'
import { buildHomeworkItem } from './homeworkAssign'
import { customHomeworkShapeId } from './homeworkLabel'
import {
  addHomeworkItem,
  addHomeworkLog,
  createId,
  ensureAutoHomework,
  loadAllHomework,
} from './storage'
import type { HomeworkItem, HomeworkLog } from '../types'

export const CLASS_SKILLS_TITLE = 'Class skills & wins'

export const CLASS_HOLD_DRILLS: {
  id: string
  autoKey: 'hollow' | 'superman' | 'side_plank' | 'wall_handstand'
  label: string
}[] = [
  { id: 'hollow', autoKey: 'hollow', label: 'Hollow' },
  { id: 'superman', autoKey: 'superman', label: 'Superman' },
  { id: 'side_plank', autoKey: 'side_plank', label: 'Side plank' },
  { id: 'wall_handstand', autoKey: 'wall_handstand', label: 'Wall handstand' },
]

function classLabel(label: string, className?: string): string {
  return className ? `In class · ${label} (${className})` : `In class · ${label}`
}

export function ensureCatalogHomework(
  athleteId: string,
  catalogId: string,
): HomeworkItem | null {
  const existing = loadAllHomework().find(
    (h) => h.athleteId === athleteId && h.catalogId === catalogId,
  )
  if (existing) return existing
  const cat = getCatalogItem(catalogId)
  if (!cat) return null
  const item = buildHomeworkItem(athleteId, {
    pick: { kind: 'catalog', id: catalogId, name: cat.name },
    source: 'coach',
  })
  if (!item) return null
  addHomeworkItem(item)
  return item
}

export function ensureClassSkillsHomework(athleteId: string): HomeworkItem {
  const existing = loadAllHomework().find(
    (h) =>
      h.athleteId === athleteId &&
      (h.customLabel === CLASS_SKILLS_TITLE || h.id.startsWith('class-skills-')),
  )
  if (existing) return existing
  const item: HomeworkItem = {
    id: createId('hw'),
    athleteId,
    shapeId: customHomeworkShapeId(CLASS_SKILLS_TITLE),
    customLabel: CLASS_SKILLS_TITLE,
    source: 'coach',
    trackMode: 'journal',
    notes: 'Skills and wins logged during class. The homework card keeps the list.',
    createdAt: new Date().toISOString(),
  }
  addHomeworkItem(item)
  return item
}

export function logClassHoldForAthletes(opts: {
  athleteIds: string[]
  autoKey: 'hollow' | 'superman' | 'side_plank' | 'wall_handstand'
  seconds: number
  label: string
  className?: string
  meetingId?: string
  side?: 'left' | 'right'
}): number {
  let n = 0
  const sourceLabel = classLabel(opts.label, opts.className)
  for (const athleteId of opts.athleteIds) {
    const items = ensureAutoHomework(athleteId)
    const hw = items.find((h) => h.autoKey === opts.autoKey)
    if (!hw) continue
    const log: HomeworkLog = {
      id: createId('hwlog'),
      athleteId,
      homeworkId: hw.id,
      shapeId: hw.shapeId,
      date: new Date().toISOString(),
      method: 'manual',
      kind: 'hold',
      totalHoldSeconds: Number(opts.seconds.toFixed(2)),
      score: 0,
      loggedFrom: 'class',
      sourceLabel,
      ...(opts.meetingId ? { classMeetingId: opts.meetingId } : {}),
      ...(opts.className ? { className: opts.className } : {}),
      ...(opts.side ? { side: opts.side } : {}),
    }
    addHomeworkLog(log)
    n += 1
  }
  return n
}

export function logClassRepsForAthletes(opts: {
  athleteIds: string[]
  catalogId: string
  reps: number
  label: string
  className?: string
  meetingId?: string
}): number {
  let n = 0
  const sourceLabel = classLabel(opts.label, opts.className)
  for (const athleteId of opts.athleteIds) {
    const hw = ensureCatalogHomework(athleteId, opts.catalogId)
    if (!hw) continue
    const log: HomeworkLog = {
      id: createId('hwlog'),
      athleteId,
      homeworkId: hw.id,
      shapeId: hw.shapeId,
      date: new Date().toISOString(),
      method: 'manual',
      kind: 'reps',
      totalHoldSeconds: 0,
      reps: opts.reps,
      score: 0,
      loggedFrom: 'class',
      sourceLabel,
      ...(opts.meetingId ? { classMeetingId: opts.meetingId } : {}),
      ...(opts.className ? { className: opts.className } : {}),
    }
    addHomeworkLog(log)
    n += 1
  }
  return n
}

export function logClassSkillForAthlete(opts: {
  athleteId: string
  text: string
  className?: string
  meetingId?: string
}): HomeworkLog | null {
  const text = opts.text.trim()
  if (!text) return null
  const hw = ensureClassSkillsHomework(opts.athleteId)
  const sourceLabel = classLabel('New skill', opts.className)
  const log: HomeworkLog = {
    id: createId('hwlog'),
    athleteId: opts.athleteId,
    homeworkId: hw.id,
    shapeId: hw.shapeId,
    date: new Date().toISOString(),
    method: 'manual',
    kind: 'journal',
    totalHoldSeconds: 0,
    score: 0,
    journal: text,
    trackMode: 'journal',
    loggedFrom: 'class',
    sourceLabel,
    ...(opts.meetingId ? { classMeetingId: opts.meetingId } : {}),
    ...(opts.className ? { className: opts.className } : {}),
  }
  addHomeworkLog(log)
  return log
}
