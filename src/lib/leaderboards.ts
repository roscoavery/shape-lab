import type { HomeworkLog } from '../types'
import { loadHomeworkLogs, loadAthletes } from './storage'
import { logProperHoldSeconds } from './storage'

/**
 * Foundation leaderboards (Phase 4): freestanding handstand, wall
 * handstand, push-ups, v-ups. Athletes appear under custom gamer-tag
 * display names — never their profile names.
 *
 * Values are computed gym-wide from homework logs, so boards work
 * wherever the gym data syncs.
 */

export type BoardId = 'handstand' | 'wall_handstand' | 'pushups' | 'vups'

export type BoardDef = {
  id: BoardId
  name: string
  unit: 'seconds' | 'reps'
  /** Log shapeIds that feed this board. */
  shapeIds: string[]
  kind: 'hold' | 'reps'
}

export const LEADERBOARDS: BoardDef[] = [
  { id: 'handstand', name: 'Freestanding handstand', unit: 'seconds', shapeIds: ['handstand'], kind: 'hold' },
  { id: 'wall_handstand', name: 'Wall handstand', unit: 'seconds', shapeIds: ['wall_handstand'], kind: 'hold' },
  { id: 'pushups', name: 'Push-ups', unit: 'reps', shapeIds: ['catalog:pushup', 'pushup'], kind: 'reps' },
  { id: 'vups', name: 'V-ups', unit: 'reps', shapeIds: ['catalog:v_up', 'v_up'], kind: 'reps' },
]

export type BoardEntry = {
  athleteId: string
  displayName: string
  value: number
  date: string
  isYou: boolean
}

const BOARD_NAMES_KEY = 'shape-lab.boardNames.v1'

function loadBoardNames(): Record<string, string> {
  try {
    return JSON.parse(localStorage.getItem(BOARD_NAMES_KEY) ?? '{}')
  } catch {
    return {}
  }
}

export function getBoardName(athleteId: string, fallback: string): string {
  const names = loadBoardNames()
  return names[athleteId]?.trim() || fallback
}

export function setBoardName(athleteId: string, name: string): void {
  try {
    const names = loadBoardNames()
    const clean = name.trim().slice(0, 24)
    if (clean) names[athleteId] = clean
    else delete names[athleteId]
    localStorage.setItem(BOARD_NAMES_KEY, JSON.stringify(names))
  } catch {
    /* private mode */
  }
}

function athleteFallbackName(athleteId: string): string {
  const a = loadAthletes().find((x) => x.id === athleteId)
  return a?.firstName?.trim() || a?.name?.split(' ')[0] || 'Athlete'
}

/** Best value per athlete for a board, sorted best-first. */
export function boardEntries(board: BoardDef, youId: string, logs?: HomeworkLog[]): BoardEntry[] {
  const all = logs ?? loadHomeworkLogs()
  const best = new Map<string, { value: number; date: string }>()
  for (const log of all) {
    if (!board.shapeIds.includes(log.shapeId)) continue
    let value = 0
    if (board.kind === 'hold') {
      value = Math.round(logProperHoldSeconds(log) || log.totalHoldSeconds || 0)
    } else {
      if (log.kind !== 'reps' && log.kind !== 'set') continue
      value = Math.round((log.reps ?? 0) * (log.sets ?? 1))
    }
    if (value <= 0) continue
    const cur = best.get(log.athleteId)
    if (!cur || value > cur.value) best.set(log.athleteId, { value, date: log.date })
  }
  return [...best.entries()]
    .map(([athleteId, b]) => ({
      athleteId,
      displayName: getBoardName(athleteId, athleteFallbackName(athleteId)),
      value: b.value,
      date: b.date,
      isYou: athleteId === youId,
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 20)
}

export function formatBoardValue(value: number, unit: 'seconds' | 'reps'): string {
  if (unit === 'reps') return `${value}`
  if (value < 60) return `${value}s`
  const m = Math.floor(value / 60)
  const s = value % 60
  return s ? `${m}m ${s}s` : `${m}m`
}
