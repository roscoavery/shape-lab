import type { Athlete, HomeworkLog } from '../types'
import { canSeePrivateCoaching } from './coachLink'
import { isCoachProfile, profileRole } from './profileRole'

export function localDateKey(iso: string): string {
  if (/^\d{4}-\d{2}-\d{2}$/.test(iso.trim())) return iso.trim()
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso.slice(0, 10)
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${mm}-${dd}`
}

export function todayDateKey(now = new Date()): string {
  const mm = String(now.getMonth() + 1).padStart(2, '0')
  const dd = String(now.getDate()).padStart(2, '0')
  return `${now.getFullYear()}-${mm}-${dd}`
}

export function isLogToday(log: Pick<HomeworkLog, 'date'>, now = new Date()): boolean {
  return localDateKey(log.date) === todayDateKey(now)
}

/** Oldest first. */
export function logsChrono(logs: HomeworkLog[]): HomeworkLog[] {
  return logs.slice().sort((a, b) => {
    const byDay = localDateKey(a.date).localeCompare(localDateKey(b.date))
    if (byDay !== 0) return byDay
    return new Date(a.date).getTime() - new Date(b.date).getTime()
  })
}

/** The person doing the homework never sees likes. Coach or parent can. */
export function canReactToHomeworkLog(
  viewer: Athlete | null | undefined,
  athlete: Athlete | null | undefined,
  log?: Pick<HomeworkLog, 'athleteId'> | null,
): boolean {
  if (!viewer || !athlete) return false
  if (viewer.id === athlete.id) return false
  if (log && viewer.id === log.athleteId) return false
  if (!isCoachProfile(viewer) && profileRole(viewer) !== 'parent') return false
  return canSeePrivateCoaching(viewer, athlete)
}

export function viewerOwnsHomeworkLog(
  viewer: Athlete | null | undefined,
  log: Pick<HomeworkLog, 'athleteId'>,
): boolean {
  return Boolean(viewer && viewer.id === log.athleteId)
}
