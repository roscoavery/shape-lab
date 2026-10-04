import type { HomeworkItem, HomeworkLog } from '../types'
import { loadAllHomework, loadHomeworkLogs } from './storage'

/**
 * Hold "battery" charge: how close an athlete is to a hold/rep standard,
 * with use-it-or-lose-it decay when they stop training it.
 *
 * Decay model (Ryan's 3x/week expectation):
 * - Days 0-3 since the last logged session: no decay. Training 3x/week
 *   keeps the battery exactly where the best performance put it.
 * - Day 4 onward: 5% charge lost per day.
 *   A week off ≈ 20% drop. Two weeks ≈ 55% drop. Three weeks ≈ reset.
 */

export type BatteryStage = {
  /** Stable id for this stage within the chain. */
  id: string
  /** Athlete-facing label, e.g. "Arms down hold". */
  label: string
  /** Goal description, e.g. "1:00". */
  goalLabel: string
  goalSeconds?: number
  goalReps?: number
}

export type BatteryChain = {
  /** Matches HomeworkItem.autoKey or catalogId. */
  key: string
  name: string
  stages: BatteryStage[]
}

export const BATTERY_CHAINS: BatteryChain[] = [
  {
    key: 'back_extension',
    name: 'Back extensions',
    stages: [
      { id: 'hold', label: 'Hold', goalLabel: '2:00', goalSeconds: 120 },
      { id: 'reps', label: 'Reps', goalLabel: '30 reps', goalReps: 30 },
      { id: 'weighted', label: 'Loaded', goalLabel: 'Add weight' },
    ],
  },
  {
    key: 'hollow',
    name: 'Hollow',
    stages: [
      { id: 'arms_down', label: 'Arms down', goalLabel: '1:00', goalSeconds: 60 },
      { id: 'arms_up', label: 'Arms up', goalLabel: '1:00', goalSeconds: 60 },
      {
        id: 'foam_roller',
        label: 'Hands pinned, hips up',
        goalLabel: 'Foam roller',
      },
      { id: 'layouts', label: 'Layouts and fulls', goalLabel: 'Skills' },
    ],
  },
]

export type BatteryStatus = {
  /** 0-100 after decay. */
  charge: number
  /** 0-100 before decay (pure performance). */
  rawCharge: number
  bestSeconds: number
  bestReps: number
  goalSeconds?: number
  goalReps?: number
  daysSince: number
  /** True when decay is actively reducing the charge. */
  decaying: boolean
  /** True when the stage goal is met and maintained. */
  full: boolean
  /** The chain stage this battery tracks, if any. */
  stage?: BatteryStage
  /** Next stage to work toward, once full. */
  nextStage?: BatteryStage
}

const DAY_MS = 24 * 3600 * 1000

function daysBetween(a: Date, b: Date): number {
  return Math.floor((b.getTime() - a.getTime()) / DAY_MS)
}

/** Best hold seconds and best reps for an athlete + homework item, plus the most recent session date. */
function bestMarks(
  athleteId: string,
  homeworkId: string,
  logs: HomeworkLog[],
): { bestSeconds: number; bestReps: number; lastDate: string | null } {
  let bestSeconds = 0
  let bestReps = 0
  let lastDate: string | null = null
  for (const log of logs) {
    if (log.athleteId !== athleteId || log.homeworkId !== homeworkId) continue
    const secs = log.totalHoldSeconds ?? 0
    if (secs > bestSeconds) bestSeconds = secs
    const reps = log.reps ?? log.qualityReps ?? 0
    if (reps > bestReps) bestReps = reps
    if (log.date && (!lastDate || log.date > lastDate)) lastDate = log.date
  }
  return { bestSeconds, bestReps, lastDate }
}

function chainForItem(item: HomeworkItem): BatteryChain | null {
  const key = item.autoKey ?? item.catalogId ?? null
  if (!key) return null
  return BATTERY_CHAINS.find((c) => c.key === key) ?? null
}

/** Which stage of the chain is the athlete currently working on. */
function currentStage(item: HomeworkItem, chain: BatteryChain): BatteryStage {
  // Hollow auto item: shapeId tells us arms down vs arms up.
  if (chain.key === 'hollow') {
    if (item.shapeId === 'hollow_arms_up') return chain.stages[1]
    return chain.stages[0]
  }
  // Back extension: hold first, then reps, then weighted (allowWeight set by coach).
  if (chain.key === 'back_extension') {
    return chain.stages[0]
  }
  return chain.stages[0]
}

export function getHoldBattery(
  athleteId: string,
  item: HomeworkItem,
  logs: HomeworkLog[] = loadHomeworkLogs(),
  now: Date = new Date(),
): BatteryStatus {
  const chain = chainForItem(item)
  const stage = chain ? currentStage(item, chain) : undefined
  const stageIdx = chain && stage ? chain.stages.indexOf(stage) : -1
  const nextStage =
    chain && stageIdx >= 0 && stageIdx < chain.stages.length - 1
      ? chain.stages[stageIdx + 1]
      : undefined

  const goalSeconds = stage?.goalSeconds ?? item.targetSeconds
  const goalReps = stage?.goalReps ?? item.targetReps

  const { bestSeconds, bestReps, lastDate } = bestMarks(athleteId, item.id, logs)

  let rawCharge = 0
  if (goalSeconds && goalSeconds > 0) {
    rawCharge = Math.min(100, (bestSeconds / goalSeconds) * 100)
  } else if (goalReps && goalReps > 0) {
    rawCharge = Math.min(100, (bestReps / goalReps) * 100)
  }

  let daysSince = 0
  let everTrained = false
  if (lastDate) {
    const last = new Date(lastDate)
    if (Number.isFinite(last.getTime())) {
      daysSince = Math.max(0, daysBetween(last, now))
      everTrained = true
    }
  }

  const graceDays = 3
  const decayPerDay = 5
  const decayDays = everTrained ? Math.max(0, daysSince - graceDays) : 0
  const decay = decayDays * decayPerDay
  const charge = Math.max(0, Math.round(rawCharge - decay))
  const decaying = decayDays > 0 && rawCharge > 0 && charge < Math.round(rawCharge)
  const full = charge >= 100

  return {
    charge,
    rawCharge: Math.round(rawCharge),
    bestSeconds,
    bestReps,
    goalSeconds,
    goalReps,
    daysSince,
    decaying,
    full,
    stage,
    nextStage: full ? nextStage : undefined,
  }
}

/** All batteries for an athlete's hold/rep homework items, sorted with lowest charge first. */
export function getAthleteBatteries(
  athleteId: string,
  logs: HomeworkLog[] = loadHomeworkLogs(),
): Array<{ item: HomeworkItem; status: BatteryStatus }> {
  const items = loadAllHomework().filter((h) => h.athleteId === athleteId)
  const out = items
    .filter((item) => {
      const mode = item.trackMode
      return mode === 'hold' || mode === 'reps' || mode === 'hold_or_reps' || !mode
    })
    .map((item) => ({ item, status: getHoldBattery(athleteId, item, logs) }))
  out.sort((a, b) => a.status.charge - b.status.charge)
  return out
}

export function formatHoldGoal(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = Math.round(seconds % 60)
  if (m > 0) return `${m}:${String(s).padStart(2, '0')}`
  return `${s}s`
}
