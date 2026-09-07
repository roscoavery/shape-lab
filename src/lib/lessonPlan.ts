import type { LessonBlockKind, LessonSession } from '../types'

export function lessonBlockLabel(kind: LessonBlockKind): string {
  if (kind === 'hold') return 'Hold'
  if (kind === 'compare') return 'Compare'
  if (kind === 'talk') return 'Talk'
  if (kind === 'drill') return 'Drill / exercise'
  return 'Skill to work'
}

export function lessonDisplayStart(session: Pick<LessonSession, 'startedAt' | 'coachStartedAt'>): string {
  return session.coachStartedAt || session.startedAt
}

export function lessonDisplayEnd(
  session: Pick<LessonSession, 'endedAt' | 'coachEndedAt'>,
): string | undefined {
  return session.coachEndedAt || session.endedAt
}

export function toDatetimeLocal(iso?: string): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (!Number.isFinite(d.getTime())) return ''
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export function fromDatetimeLocal(value: string): string | undefined {
  const trimmed = value.trim()
  if (!trimmed) return undefined
  const d = new Date(trimmed)
  return Number.isFinite(d.getTime()) ? d.toISOString() : undefined
}
