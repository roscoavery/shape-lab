/**
 * Sequence homework uses Class Flow — same spoken guidance, same scores.
 * Older hold-sequence ids still map onto the matching flow.
 */

import {
  FLOW_SEQUENCES,
  getFlowSequence,
  type FlowRunConfig,
  type FlowSequence,
} from '../config/tasks2'
import type { FlowRunReport, HomeworkItem, HomeworkLog } from '../types'
import {
  flowIdForHomeworkItem,
  isSequenceHomework,
  sequenceHomeworkShapeId,
} from './homeworkLabel'
import { addHomeworkItem, addHomeworkLog, createId, loadAllHomework } from './storage'

export { flowIdForHomeworkItem } from './homeworkLabel'

export function getHomeworkFlow(
  item: Pick<HomeworkItem, 'shapeId'>,
): FlowSequence | undefined {
  const id = flowIdForHomeworkItem(item)
  return id ? getFlowSequence(id) : undefined
}

export function assignableFlowSequences(): FlowSequence[] {
  return FLOW_SEQUENCES
}

export function overallFlowScore(report: FlowRunReport): number {
  const scores = report.steps
    .map((s) => s.overall)
    .filter((n): n is number => typeof n === 'number' && Number.isFinite(n))
  if (scores.length === 0) return 0
  return Math.round(scores.reduce((sum, n) => sum + n, 0) / scores.length)
}

export function chosenFlowCounts(
  sequenceId: string,
  config?: FlowRunConfig,
): { reps?: number; sets?: number } {
  if (sequenceId === 'flow_pike_hollow_arch') {
    if (config?.pikeHollowArchMode === 'learn') return { reps: 5, sets: 1 }
    return { reps: config?.pikeHollowArchReps ?? 5, sets: 1 }
  }
  if (sequenceId === 'flow_lemon_squeezes') {
    if (config?.lemonPlan === 'default') return { sets: 3, reps: 10 }
    return { sets: config?.lemonSets ?? 3, reps: config?.lemonReps ?? 10 }
  }
  return { reps: 1 }
}

export function ensureSequenceHomework(
  athleteId: string,
  sequenceId: string,
  name: string,
): HomeworkItem {
  const existing = loadAllHomework().find(
    (h) => h.athleteId === athleteId && flowIdForHomeworkItem(h) === sequenceId,
  )
  if (existing) return existing
  const seq = getFlowSequence(sequenceId)
  const item: HomeworkItem = {
    id: createId('hw'),
    athleteId,
    shapeId: sequenceHomeworkShapeId(sequenceId),
    customLabel: seq?.name ?? name,
    source: 'athlete',
    trackMode: 'reps',
    notes: seq?.description,
    createdAt: new Date().toISOString(),
  }
  addHomeworkItem(item)
  return item
}

/** Write a homework log when any class-flow run finishes. */
export function logHomeworkSequenceRun(report: FlowRunReport): HomeworkLog | null {
  if (!report.athleteId || report.athleteId === 'none') return null
  const items = loadAllHomework().filter(
    (h) => h.athleteId === report.athleteId && isSequenceHomework(h),
  )
  const item =
    items.find((h) => flowIdForHomeworkItem(h) === report.sequenceId) ??
    ensureSequenceHomework(report.athleteId, report.sequenceId, report.sequenceName)
  const reps = report.chosenReps && report.chosenReps > 0 ? report.chosenReps : 1
  const sets = report.chosenSets && report.chosenSets > 1 ? report.chosenSets : undefined
  const log: HomeworkLog = {
    id: createId('hwlog'),
    athleteId: report.athleteId,
    homeworkId: item.id,
    shapeId: item.shapeId,
    date: report.createdAt,
    method: 'camera',
    kind: 'sequence',
    reps,
    ...(sets ? { sets } : {}),
    totalHoldSeconds: report.bestHoldSeconds ?? 0,
    score: overallFlowScore(report),
    sourceLabel: sets ? `${report.nickname} · ${sets}×${reps}` : `${report.nickname} · ${reps} run${reps === 1 ? '' : 's'}`,
  }
  addHomeworkLog(log)
  return log
}
