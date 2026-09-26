import type { HomeworkLog } from '../types'
import { homeworkTitle } from './homeworkLabel'
import { loadAllHomework, loadHomeworkLogs } from './storage'

/** Newest previous hold for this athlete + drill label. */
export function previousHoldToBeat(
  athleteId: string,
  label: string,
  logs: HomeworkLog[] = loadHomeworkLogs(),
): { seconds: number; when: string } | null {
  const needle = label.trim().toLowerCase()
  if (!athleteId || !needle) return null
  const items = loadAllHomework()
  const hits = logs
    .filter((log) => {
      if (log.athleteId !== athleteId || (log.totalHoldSeconds ?? 0) <= 0.2) return false
      const item = items.find((h) => h.id === log.homeworkId)
      const title = `${log.sourceLabel ?? ''} ${item ? homeworkTitle(item) : ''}`.toLowerCase()
      return title.includes(needle)
    })
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  const prev = hits[0]
  if (!prev) return null
  return { seconds: prev.totalHoldSeconds ?? 0, when: prev.date }
}

export type HoldMark = { seconds: number; when: string } | null

/**
 * Last-time and all-time-best hold for an athlete + drill. Matches by shapeId
 * first (lesson/class logs store the library shapeId), falls back to the
 * label substring match. Excludes the current session so "last time" is
 * genuinely last time, not ten minutes ago.
 */
export function holdLastAndBest(
  athleteId: string,
  opts: {
    shapeId?: string | null
    label?: string
    side?: string | null
    excludeLessonId?: string
    excludeClassMeetingId?: string
  },
  logs: HomeworkLog[] = loadHomeworkLogs(),
): { last: HoldMark; best: HoldMark } {
  const empty = { last: null, best: null }
  const needle = (opts.label ?? '').trim().toLowerCase()
  const shapeId = opts.shapeId ?? null
  if (!athleteId || (!shapeId && !needle)) return empty
  const items = loadAllHomework()
  const hits = logs.filter((log) => {
    if (log.athleteId !== athleteId || (log.totalHoldSeconds ?? 0) <= 0.2) return false
    if (opts.excludeLessonId && log.lessonId === opts.excludeLessonId) return false
    if (opts.excludeClassMeetingId && log.classMeetingId === opts.excludeClassMeetingId) return false
    if (opts.side && log.side && log.side !== opts.side) return false
    if (shapeId && log.shapeId === shapeId) return true
    const item = items.find((h) => h.id === log.homeworkId)
    const title = `${log.sourceLabel ?? ''} ${item ? homeworkTitle(item) : ''}`.toLowerCase()
    return needle ? title.includes(needle) : false
  })
  if (!hits.length) return empty
  const byDate = [...hits].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  const lastLog = byDate[0]
  let bestLog = byDate[0]
  for (const h of byDate) {
    if ((h.totalHoldSeconds ?? 0) > (bestLog.totalHoldSeconds ?? 0)) bestLog = h
  }
  const mark = (l: HomeworkLog): HoldMark => ({ seconds: l.totalHoldSeconds ?? 0, when: l.date })
  return { last: mark(lastLog), best: mark(bestLog) }
}
