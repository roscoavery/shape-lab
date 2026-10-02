import type { HomeworkLog } from '../types'
import { logsChrono, localDateKey } from './homeworkLogView'
import { logProperHoldSeconds } from './storage'
import { getShape } from '../config/shapes'
import { getCatalogItem } from '../config/homeworkCatalog'

/**
 * Hold analytics: turn raw homework logs into clear per-shape stats,
 * time-window comparisons, and monthly history ("electric bill" style).
 *
 * Replaces the old holdGains() "last two holds" compare, which never said
 * what the two numbers actually were (same day? months apart?).
 */

export type ShapeHoldStats = {
  shapeId: string
  name: string
  /** Number of hold sessions logged */
  count: number
  /** Total seconds across all sessions */
  totalSeconds: number
  /** Longest single hold + when it happened */
  longest: number
  longestDate: string
  /** Mean hold time */
  average: number
  /** First logged hold + when — the baseline */
  firstSeconds: number
  firstDate: string
  /** Most recent hold + when */
  latestSeconds: number
  latestDate: string
}

export type WindowTotals = {
  today: number
  yesterday: number
  thisWeek: number
  lastWeek: number
  thisMonth: number
  lastMonth: number
}

export type MonthBucket = { key: string; label: string; seconds: number }

export type RepTotal = { name: string; totalReps: number; sessions: number }

function holdSeconds(log: HomeworkLog): number {
  return Math.round(logProperHoldSeconds(log) || log.totalHoldSeconds || 0)
}

function isHoldLog(log: HomeworkLog): boolean {
  return (log.kind ?? 'hold') === 'hold' && holdSeconds(log) > 0
}

function shapeKey(log: HomeworkLog): string {
  return log.shapeId?.trim() || (log.sourceLabel ?? '').split(' (')[0]?.trim() || 'hold'
}

function prettifyId(id: string): string {
  return id
    .replace(/^catalog:/, '')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

/** Resolve a log to the display name an athlete should see — never a raw id. */
function shapeName(log: HomeworkLog): string {
  const label = (log.sourceLabel || '').replace(/^In class · /i, '').split(' (')[0]?.trim() ?? ''
  // A clean label with no id-isms is already display-ready.
  if (label && !label.includes(':') && !label.includes('_')) return label
  const rawId = (label || log.shapeId || '').replace(/^catalog:/, '')
  if (!rawId) return 'Hold'
  const catalog = getCatalogItem(rawId)
  if (catalog?.name) return catalog.name
  const shape = getShape(rawId)
  if (shape?.name) return shape.name
  return prettifyId(rawId) || 'Hold'
}

function shortDate(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

/** Per-shape hold stats, sorted by total time (most-trained first). */
export function perShapeHoldStats(logs: HomeworkLog[]): ShapeHoldStats[] {
  const byKey = new Map<string, HomeworkLog[]>()
  for (const log of logsChrono(logs)) {
    if (!isHoldLog(log)) continue
    const k = shapeKey(log)
    const list = byKey.get(k) ?? []
    list.push(log)
    byKey.set(k, list)
  }
  const out: ShapeHoldStats[] = []
  for (const [key, rows] of byKey) {
    const secs = rows.map(holdSeconds)
    const total = secs.reduce((a, b) => a + b, 0)
    let longest = 0
    let longestDate = rows[0]?.date ?? ''
    for (const r of rows) {
      const s = holdSeconds(r)
      if (s > longest) {
        longest = s
        longestDate = r.date
      }
    }
    const first = rows[0]!
    const latest = rows[rows.length - 1]!
    out.push({
      shapeId: key,
      name: shapeName(first),
      count: rows.length,
      totalSeconds: total,
      longest,
      longestDate,
      average: Math.round(total / rows.length),
      firstSeconds: holdSeconds(first),
      firstDate: first.date,
      latestSeconds: holdSeconds(latest),
      latestDate: latest.date,
    })
  }
  return out.sort((a, b) => b.totalSeconds - a.totalSeconds)
}

function startOfDay(d: Date): Date {
  const c = new Date(d)
  c.setHours(0, 0, 0, 0)
  return c
}

function startOfWeek(d: Date): Date {
  const c = startOfDay(d)
  c.setDate(c.getDate() - c.getDay()) // Sunday start
  return c
}

function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1)
}

/** Total hold seconds in each time window (today vs yesterday, week vs week, month vs month). */
export function windowHoldTotals(logs: HomeworkLog[], now = new Date()): WindowTotals {
  const t = (from: Date, to: Date) =>
    logsChrono(logs)
      .filter(isHoldLog)
      .filter((l) => {
        const d = new Date(l.date)
        return d >= from && d < to
      })
      .reduce((a, l) => a + holdSeconds(l), 0)

  const todayStart = startOfDay(now)
  const yesterdayStart = new Date(todayStart)
  yesterdayStart.setDate(yesterdayStart.getDate() - 1)
  const weekStart = startOfWeek(now)
  const lastWeekStart = new Date(weekStart)
  lastWeekStart.setDate(lastWeekStart.getDate() - 7)
  const monthStart = startOfMonth(now)
  const lastMonthStart = new Date(monthStart.getFullYear(), monthStart.getMonth() - 1, 1)

  return {
    today: t(todayStart, now),
    yesterday: t(yesterdayStart, todayStart),
    thisWeek: t(weekStart, now),
    lastWeek: t(lastWeekStart, weekStart),
    thisMonth: t(monthStart, now),
    lastMonth: t(lastMonthStart, monthStart),
  }
}

/** Total hold seconds per month, oldest → newest (default last 12 months). */
export function monthlyHoldHistory(logs: HomeworkLog[], months = 12, now = new Date()): MonthBucket[] {
  const buckets: MonthBucket[] = []
  const cursor = new Date(now.getFullYear(), now.getMonth() - (months - 1), 1)
  for (let i = 0; i < months; i++) {
    const key = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}`
    const label = cursor.toLocaleDateString(undefined, { month: 'short' })
    const next = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1)
    const seconds = logsChrono(logs)
      .filter(isHoldLog)
      .filter((l) => {
        const d = new Date(l.date)
        return d >= cursor && d < next
      })
      .reduce((a, l) => a + holdSeconds(l), 0)
    buckets.push({ key, label, seconds })
    cursor.setMonth(cursor.getMonth() + 1)
  }
  return buckets
}

/** Total reps logged per exercise (push-ups, v-ups, …), most-reps first. */
export function repTotals(logs: HomeworkLog[]): RepTotal[] {
  const byKey = new Map<string, { name: string; totalReps: number; sessions: number }>()
  for (const log of logsChrono(logs)) {
    if (log.kind !== 'reps' && log.kind !== 'set') continue
    const reps = Math.round((log.reps ?? 0) * (log.sets ?? 1))
    if (reps <= 0) continue
    const k = shapeKey(log)
    const row = byKey.get(k) ?? { name: shapeName(log), totalReps: 0, sessions: 0 }
    row.totalReps += reps
    row.sessions += 1
    byKey.set(k, row)
  }
  return [...byKey.values()].sort((a, b) => b.totalReps - a.totalReps)
}

export function formatSecondsShort(totalSecs: number): string {
  const s = Math.round(totalSecs)
  if (s < 60) return `${s}s`
  const m = Math.floor(s / 60)
  const r = s % 60
  if (m < 60) return r ? `${m}m ${r}s` : `${m}m`
  const h = Math.floor(m / 60)
  return `${h}h ${m % 60}m`
}

export { shortDate, localDateKey }
