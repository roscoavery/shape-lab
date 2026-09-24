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
