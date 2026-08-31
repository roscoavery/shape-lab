/**
 * Sequence homework uses Class Flow — same spoken guidance, same scores.
 * Older hold-sequence ids still map onto the matching flow.
 */

import { FLOW_SEQUENCES, getFlowSequence, type FlowSequence } from '../config/tasks2'
import type { FlowRunReport, HomeworkItem, HomeworkLog } from '../types'
import { flowIdForHomeworkItem, isSequenceHomework } from './homeworkLabel'
import { addHomeworkLog, createId, loadAllHomework } from './storage'

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

/** Write a homework log when a class-flow run finishes an assigned sequence. */
export function logHomeworkSequenceRun(report: FlowRunReport): HomeworkLog | null {
  if (!report.athleteId || report.athleteId === 'none') return null
  const items = loadAllHomework().filter(
    (h) => h.athleteId === report.athleteId && isSequenceHomework(h),
  )
  const item = items.find((h) => flowIdForHomeworkItem(h) === report.sequenceId)
  if (!item) return null
  const log: HomeworkLog = {
    id: createId('hwlog'),
    athleteId: report.athleteId,
    homeworkId: item.id,
    shapeId: item.shapeId,
    date: report.createdAt,
    method: 'camera',
    kind: 'sequence',
    reps: 1,
    totalHoldSeconds: report.bestHoldSeconds ?? 0,
    score: overallFlowScore(report),
  }
  addHomeworkLog(log)
  return log
}
