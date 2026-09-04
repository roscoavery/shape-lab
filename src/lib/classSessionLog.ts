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
  homeworkDedupeKey,
  loadAllHomework,
  loadHomeworkLogs,
  saveHomeworkLogs,
} from './storage'
import type { ClassExtraExercise, HomeworkItem, HomeworkLog } from '../types'

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
  sets?: number
  label: string
  className?: string
  meetingId?: string
}): number {
  let n = 0
  const sets = opts.sets && opts.sets > 1 ? opts.sets : undefined
  const sourceLabel = classLabel(
    sets ? `${opts.label} · ${sets}×${opts.reps}` : opts.label,
    opts.className,
  )
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
      ...(sets ? { sets } : {}),
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

function ensureExtraHomework(athleteId: string, extra: ClassExtraExercise): HomeworkItem | null {
  if (extra.kind === 'catalog' && extra.refId) {
    return ensureCatalogHomework(athleteId, extra.refId)
  }
  const existing = loadAllHomework()
  if (extra.kind === 'shape' && extra.refId) {
    const shapeId = extra.refId
    const found = existing.find(
      (h) =>
        h.athleteId === athleteId &&
        h.shapeId === shapeId &&
        h.source !== 'auto' &&
        !h.autoKey,
    )
    if (found) return found
    const item: HomeworkItem = {
      id: createId('hw'),
      athleteId,
      shapeId,
      customLabel: extra.label,
      source: 'coach',
      trackMode: extra.trackMode,
      createdAt: new Date().toISOString(),
      notes: `Pinned on class · ${extra.label}.`,
    }
    addHomeworkItem(item)
    return item
  }
  const label = extra.label.trim()
  if (!label) return null
  const shapeId = customHomeworkShapeId(label)
  const probe: Pick<HomeworkItem, 'athleteId' | 'shapeId'> & { customLabel?: string } = {
    athleteId,
    shapeId,
    customLabel: label,
  }
  const key = homeworkDedupeKey(probe)
  const found = existing.find((h) => h.athleteId === athleteId && homeworkDedupeKey(h) === key)
  if (found) return found
  const item: HomeworkItem = {
    id: createId('hw'),
    athleteId,
    shapeId,
    customLabel: label,
    source: 'coach',
    trackMode: extra.trackMode,
    createdAt: new Date().toISOString(),
    notes: `Pinned on class · ${label}.`,
  }
  addHomeworkItem(item)
  return item
}

export function logClassExtraForAthletes(opts: {
  athleteIds: string[]
  extra: ClassExtraExercise
  seconds?: number
  reps?: number
  sets?: number
  className?: string
  meetingId?: string
}): number {
  let n = 0
  const hold = opts.extra.trackMode === 'hold'
  const amount = hold ? opts.seconds : opts.reps
  if (!Number.isFinite(amount) || (amount ?? 0) <= 0) return 0
  const sets = opts.sets && opts.sets > 1 ? opts.sets : undefined
  const detail = hold
    ? opts.extra.label
    : sets
      ? `${opts.extra.label} · ${sets}×${opts.reps}`
      : `${opts.extra.label} · ${opts.reps} reps`
  const sourceLabel = classLabel(detail, opts.className)
  for (const athleteId of opts.athleteIds) {
    const hw = ensureExtraHomework(athleteId, opts.extra)
    if (!hw) continue
    const log: HomeworkLog = {
      id: createId('hwlog'),
      athleteId,
      homeworkId: hw.id,
      shapeId: hw.shapeId,
      date: new Date().toISOString(),
      method: 'manual',
      kind: hold ? 'hold' : 'reps',
      totalHoldSeconds: hold ? Number((opts.seconds ?? 0).toFixed(2)) : 0,
      ...(hold ? {} : { reps: opts.reps, ...(sets ? { sets } : {}) }),
      score: 0,
      loggedFrom: 'class',
      sourceLabel,
      trackMode: opts.extra.trackMode,
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

function classWorkKey(log: HomeworkLog): string {
  return [
    log.kind ?? '',
    log.shapeId,
    String(log.totalHoldSeconds ?? 0),
    String(log.reps ?? ''),
    String(log.sets ?? ''),
    log.side ?? '',
    (log.journal ?? '').trim(),
    log.sourceLabel ?? '',
  ].join('|')
}

function homeworkForCopiedLog(athleteId: string, src: HomeworkLog): HomeworkItem | null {
  const all = loadAllHomework()
  const srcHw = all.find((h) => h.id === src.homeworkId)
  if (srcHw?.autoKey) {
    return ensureAutoHomework(athleteId).find((h) => h.autoKey === srcHw.autoKey) ?? null
  }
  if (srcHw?.catalogId) return ensureCatalogHomework(athleteId, srcHw.catalogId)
  if (src.kind === 'journal' || srcHw?.customLabel === CLASS_SKILLS_TITLE) {
    return ensureClassSkillsHomework(athleteId)
  }
  if (srcHw) {
    return ensureExtraHomework(athleteId, {
      id: srcHw.id,
      kind: srcHw.catalogId ? 'catalog' : srcHw.shapeId.startsWith('custom:') ? 'custom' : 'shape',
      refId: srcHw.catalogId || srcHw.shapeId,
      label: srcHw.customLabel || src.sourceLabel || srcHw.shapeId,
      trackMode: srcHw.trackMode === 'hold' || src.kind === 'hold' ? 'hold' : 'reps',
    })
  }
  return ensureClassSkillsHomework(athleteId)
}

/** Give a late add the holds / reps / skills already logged on this class. */
export function copyClassWorkToAthlete(opts: {
  meetingId: string
  athleteId: string
  className?: string
  at?: string
}): number {
  const logs = loadHomeworkLogs().filter((l) => l.classMeetingId === opts.meetingId)
  const mine = new Set(logs.filter((l) => l.athleteId === opts.athleteId).map(classWorkKey))
  const templates = new Map<string, HomeworkLog>()
  for (const log of logs) {
    if (log.athleteId === opts.athleteId) continue
    const key = classWorkKey(log)
    if (!templates.has(key)) templates.set(key, log)
  }
  let n = 0
  const at = opts.at || new Date().toISOString()
  for (const src of templates.values()) {
    const key = classWorkKey(src)
    if (mine.has(key)) continue
    const hw = homeworkForCopiedLog(opts.athleteId, src)
    if (!hw) continue
    addHomeworkLog({
      ...src,
      id: createId('hwlog'),
      athleteId: opts.athleteId,
      homeworkId: hw.id,
      shapeId: hw.shapeId,
      date: at,
      loggedFrom: 'class',
      classMeetingId: opts.meetingId,
      ...(opts.className ? { className: opts.className } : {}),
    })
    n += 1
  }
  return n
}

export function relabelClassMeetingLogs(meetingId: string, className: string): number {
  const all = loadHomeworkLogs()
  let n = 0
  const next = all.map((log) => {
    if (log.classMeetingId !== meetingId) return log
    n += 1
    const base = (log.sourceLabel || '').replace(/\s*\([^)]*\)\s*$/, '')
    return {
      ...log,
      className,
      sourceLabel: base ? `${base} (${className})` : classLabel(log.kind || 'class', className),
    }
  })
  if (n > 0) saveHomeworkLogs(next)
  return n
}
