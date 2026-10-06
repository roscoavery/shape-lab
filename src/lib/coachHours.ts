/**
 * Coach day-hours logs: at the end of each day with classes, the coach is
 * asked how many hours they worked (a number like 3.25, not a time range).
 * The logs are an easy reference when putting hours into Jackrabbit, and
 * each day tracks whether it has been logged there yet.
 * Gym-wide via /api/coach-hours. One log per coach+date; last write wins.
 */

import { createId } from './storage'
import { gymWriteFetch, isStopWriteStatus } from './gymWritePace'
import { coachPresenceFraction, loadMeetings } from './coachClasses'

export type DayHoursLog = {
  id: string
  coachId: string
  /** YYYY-MM-DD in the gym's local day. */
  date: string
  /** Hours worked, as the coach entered them (3.25, 2.5, ...). */
  hours: number
  /** Whether the coach has logged this day in Jackrabbit yet. */
  jackrabbitLogged: boolean
  createdAt: string
  updatedAt: string
}

type CoachHoursFile = {
  kind: 'shape-lab-coach-hours'
  version: 1
  exportedAt: string
  logs: DayHoursLog[]
  removedLogIds?: string[]
}

const KEY = 'shape-lab.coachHours.v1'
const listeners = new Set<() => void>()
/** Live tab copy — localStorage can miss a write when the phone is full. */
let memoryFile: CoachHoursFile | null = null

export const dateKey = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

function emptyFile(): CoachHoursFile {
  return { kind: 'shape-lab-coach-hours', version: 1, exportedAt: '', logs: [] }
}

function normalizeLog(raw: unknown): DayHoursLog | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Record<string, unknown>
  if (typeof r.coachId !== 'string' || !r.coachId) return null
  if (typeof r.date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(r.date)) return null
  const hours = typeof r.hours === 'number' ? r.hours : Number(r.hours)
  if (!Number.isFinite(hours) || hours < 0) return null
  const now = new Date().toISOString()
  return {
    id: typeof r.id === 'string' && r.id ? r.id : createId('dhr'),
    coachId: r.coachId,
    date: r.date,
    hours: Math.round(hours * 100) / 100,
    jackrabbitLogged: r.jackrabbitLogged === true,
    createdAt: typeof r.createdAt === 'string' ? r.createdAt : now,
    updatedAt: typeof r.updatedAt === 'string' ? r.updatedAt : now,
  }
}

function readStored(): CoachHoursFile {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return emptyFile()
    const data = JSON.parse(raw) as CoachHoursFile
    if (data?.kind !== 'shape-lab-coach-hours') return emptyFile()
    return {
      kind: 'shape-lab-coach-hours',
      version: 1,
      exportedAt: data.exportedAt ?? '',
      logs: (data.logs ?? []).map(normalizeLog).filter((l): l is DayHoursLog => !!l),
      removedLogIds: Array.isArray(data.removedLogIds) ? data.removedLogIds : [],
    }
  } catch {
    return emptyFile()
  }
}

function stampKey(log: DayHoursLog): string {
  return `${log.coachId}|${log.date}`
}

function mergeLogs(a: DayHoursLog[], b: DayHoursLog[]): DayHoursLog[] {
  const map = new Map<string, DayHoursLog>()
  for (const log of [...a, ...b]) {
    const keep = map.get(stampKey(log))
    if (!keep || log.updatedAt.localeCompare(keep.updatedAt) >= 0) map.set(stampKey(log), log)
  }
  return [...map.values()]
}

function read(): CoachHoursFile {
  const stored = readStored()
  if (!memoryFile) return stored
  const dropped = new Set([
    ...(stored.removedLogIds ?? []),
    ...(memoryFile.removedLogIds ?? []),
  ])
  return {
    kind: 'shape-lab-coach-hours',
    version: 1,
    exportedAt: memoryFile.exportedAt || stored.exportedAt,
    logs: mergeLogs(stored.logs, memoryFile.logs).filter((l) => !dropped.has(l.id)),
    removedLogIds: [...dropped],
  }
}

function write(file: CoachHoursFile, sync = true) {
  const dropped = new Set(file.removedLogIds ?? [])
  const next: CoachHoursFile = {
    kind: 'shape-lab-coach-hours',
    version: 1,
    exportedAt: new Date().toISOString(),
    logs: file.logs.map(normalizeLog).filter((l): l is DayHoursLog => !!l && !dropped.has(l.id)),
    removedLogIds: [...dropped],
  }
  memoryFile = next
  try {
    localStorage.setItem(KEY, JSON.stringify(next))
  } catch {
    /* quota — memory still has every log in this tab */
  }
  if (sync) void publishCoachHours()
  for (const fn of listeners) {
    try {
      fn()
    } catch {
      /* ignore */
    }
  }
}

export function subscribeCoachHours(fn: () => void): () => void {
  listeners.add(fn)
  return () => {
    listeners.delete(fn)
  }
}

/** All of a coach's day logs, newest first. */
export function loadDayHours(coachId: string): DayHoursLog[] {
  return read()
    .logs.filter((l) => l.coachId === coachId)
    .sort((a, b) => b.date.localeCompare(a.date))
}

export function getDayLog(coachId: string, date: string): DayHoursLog | null {
  return read().logs.find((l) => l.coachId === coachId && l.date === date) ?? null
}

/** Days with hours entered but not yet marked as logged in Jackrabbit. */
export function pendingJackrabbitDays(coachId: string): DayHoursLog[] {
  return loadDayHours(coachId).filter((l) => l.hours > 0 && !l.jackrabbitLogged)
}

export function saveDayHours(
  coachId: string,
  date: string,
  hours: number,
  opts: { jackrabbitLogged?: boolean } = {},
): DayHoursLog | null {
  if (!Number.isFinite(hours) || hours < 0 || hours > 24) return null
  const file = read()
  const now = new Date().toISOString()
  const existing = file.logs.find((l) => l.coachId === coachId && l.date === date)
  const log: DayHoursLog = {
    id: existing?.id ?? createId('dhr'),
    coachId,
    date,
    hours: Math.round(hours * 100) / 100,
    jackrabbitLogged: opts.jackrabbitLogged ?? existing?.jackrabbitLogged ?? false,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  }
  const rest = file.logs.filter((l) => !(l.coachId === coachId && l.date === date))
  write({ ...file, logs: [...rest, log] })
  return log
}

export function setJackrabbitLogged(logId: string, done: boolean): void {
  const file = read()
  const log = file.logs.find((l) => l.id === logId)
  if (!log || log.jackrabbitLogged === done) return
  log.jackrabbitLogged = done
  log.updatedAt = new Date().toISOString()
  write(file)
}

/**
 * Prefill estimate for the end-of-day prompt: sum over today's ended
 * meetings of (presence fraction x class hours). A coach never marked
 * present counts as a full class they led.
 */
export function estimateHoursForDay(coachId: string, date: string): number {
  const CLASS_HOURS = 1
  let total = 0
  let counted = 0
  for (const m of loadMeetings(coachId)) {
    if (!m.endedAt || m.startedAt.slice(0, 10) !== date) continue
    const marked = m.coachPresence?.some((c) => c.coachId === coachId) ?? false
    const fraction = marked ? coachPresenceFraction(m, coachId) : m.coachId === coachId ? 1 : 0
    if (fraction <= 0) continue
    total += fraction * CLASS_HOURS
    counted += 1
  }
  if (counted === 0) return 0
  return Math.round(total * 100) / 100
}

export async function publishCoachHours(): Promise<boolean> {
  const file = read()
  for (let attempt = 0; attempt < 4; attempt += 1) {
    try {
      const res = await gymWriteFetch('/api/coach-hours', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(file),
      })
      if (res.ok) return true
      if (isStopWriteStatus(res.status)) return false
    } catch {
      /* retry */
    }
    await new Promise((resolve) => setTimeout(resolve, 400 * (attempt + 1)))
  }
  return false
}

export async function hydrateCoachHours(): Promise<void> {
  const local = read()
  try {
    const res = await fetch('/api/coach-hours', { cache: 'no-store' })
    if (!res.ok) {
      if (local.logs.length > 0) await publishCoachHours()
      return
    }
    const data = (await res.json()) as CoachHoursFile
    if (data?.kind !== 'shape-lab-coach-hours') {
      if (local.logs.length > 0) await publishCoachHours()
      return
    }
    const remote = (data.logs ?? []).map(normalizeLog).filter((l): l is DayHoursLog => !!l)
    const removedLogIds = [
      ...new Set([...(local.removedLogIds ?? []), ...(data.removedLogIds ?? [])]),
    ]
    const dropped = new Set(removedLogIds)
    const logs = mergeLogs(local.logs, remote).filter((l) => !dropped.has(l.id))
    write(
      { kind: 'shape-lab-coach-hours', version: 1, exportedAt: '', logs, removedLogIds },
      false,
    )
    if (remote.length === 0 && local.logs.length > 0) await publishCoachHours()
  } catch {
    /* offline — local copy stands */
  }
}
