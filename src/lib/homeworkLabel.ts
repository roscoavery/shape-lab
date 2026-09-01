import { getShape } from '../config/shapes'
import { SEQUENCES_BY_ID } from '../config/sequences'
import { getFlowSequence } from '../config/tasks2'
import { catalogIdFromShape, getCatalogItem } from '../config/homeworkCatalog'
import { getDrill } from './coachContentStore'
import type { DrillClip, HomeworkItem, HomeworkTrackMode, SequenceDef } from '../types'

export const CUSTOM_HOMEWORK_PREFIX = 'custom:'
export const SEQUENCE_HOMEWORK_PREFIX = 'seq:'
export const DRILL_HOMEWORK_PREFIX = 'drill:'

export function customHomeworkShapeId(label: string): string {
  const slug = label
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '')
  return `${CUSTOM_HOMEWORK_PREFIX}${slug || 'skill'}`
}

export function isSequenceHomework(
  item: Pick<HomeworkItem, 'shapeId'>,
): boolean {
  return item.shapeId.startsWith(SEQUENCE_HOMEWORK_PREFIX)
}

export function homeworkSequenceId(item: Pick<HomeworkItem, 'shapeId'>): string | null {
  if (!isSequenceHomework(item)) return null
  return item.shapeId.slice(SEQUENCE_HOMEWORK_PREFIX.length)
}

/** Older hold-sequence homework ids → Class Flow ids. */
const LEGACY_SEQ_TO_FLOW: Record<string, string> = {
  lunge_lever_hs_lunge: 'flow_hs_right',
  mc_hs_lever_lunge: 'flow_mc_hs',
  pike_hollow_arch: 'flow_pike_hollow_arch',
  pike_tuck_hollow_arch: 'flow_pike_tuck_hollow_arch',
  lemon_squeezes: 'flow_lemon_squeezes',
  core_home: 'flow_core_home',
}

export function flowIdForHomeworkItem(
  item: Pick<HomeworkItem, 'shapeId'>,
): string | null {
  const id = homeworkSequenceId(item)
  if (!id) return null
  if (getFlowSequence(id)) return id
  const mapped = LEGACY_SEQ_TO_FLOW[id]
  return mapped && getFlowSequence(mapped) ? mapped : null
}

export function getHomeworkSequence(
  item: Pick<HomeworkItem, 'shapeId'>,
): SequenceDef | undefined {
  const id = homeworkSequenceId(item)
  return id ? SEQUENCES_BY_ID[id] : undefined
}

export function sequenceHomeworkShapeId(sequenceId: string): string {
  return `${SEQUENCE_HOMEWORK_PREFIX}${sequenceId}`
}

export function isDrillHomework(item: Pick<HomeworkItem, 'shapeId'>): boolean {
  return item.shapeId.startsWith(DRILL_HOMEWORK_PREFIX)
}

export function homeworkDrillId(item: Pick<HomeworkItem, 'shapeId'>): string | null {
  if (!isDrillHomework(item)) return null
  return item.shapeId.slice(DRILL_HOMEWORK_PREFIX.length)
}

export function getHomeworkDrill(
  item: Pick<HomeworkItem, 'shapeId'>,
): DrillClip | undefined {
  const id = homeworkDrillId(item)
  return id ? getDrill(id) : undefined
}

export function drillHomeworkShapeId(drillId: string): string {
  return `${DRILL_HOMEWORK_PREFIX}${drillId}`
}

export function isCatalogHomework(
  item: Pick<HomeworkItem, 'shapeId'> & { catalogId?: string },
): boolean {
  return Boolean(item.catalogId) || item.shapeId.startsWith('catalog:')
}

export function isCustomHomework(
  item: Pick<HomeworkItem, 'shapeId'> & { customLabel?: string; catalogId?: string },
): boolean {
  if (isSequenceHomework(item)) return false
  if (isDrillHomework(item)) return false
  if (isCatalogHomework(item)) return false
  return Boolean(item.customLabel?.trim()) || item.shapeId.startsWith(CUSTOM_HOMEWORK_PREFIX)
}

export function homeworkTrackMode(
  item: Pick<HomeworkItem, 'shapeId' | 'trackMode'> & { catalogId?: string },
): HomeworkTrackMode {
  if (item.trackMode) return item.trackMode
  const cat = getCatalogItem(item.catalogId ?? catalogIdFromShape(item.shapeId))
  if (cat) return cat.trackMode
  if (isCustomHomework(item)) return 'reps'
  if (isSequenceHomework(item) || isDrillHomework(item)) return 'hold'
  return 'hold'
}

export function homeworkTitle(
  item: Pick<HomeworkItem, 'shapeId'> & { customLabel?: string; catalogId?: string },
): string {
  const cat = getCatalogItem(item.catalogId ?? catalogIdFromShape(item.shapeId))
  if (cat) return item.customLabel?.trim() || cat.name
  if (isSequenceHomework(item)) {
    if (item.customLabel?.trim()) return item.customLabel.trim()
    const seq = getHomeworkSequence(item)
    if (seq) return seq.name
    const flow = getFlowSequence(flowIdForHomeworkItem(item) ?? '')
    return flow?.name ?? item.shapeId.slice(SEQUENCE_HOMEWORK_PREFIX.length).replace(/_/g, ' ')
  }
  if (isDrillHomework(item)) {
    if (item.customLabel?.trim()) return item.customLabel.trim()
    const drill = getHomeworkDrill(item)
    return drill?.title ?? item.shapeId.slice(DRILL_HOMEWORK_PREFIX.length).replace(/_/g, ' ')
  }
  if (item.customLabel?.trim()) return item.customLabel.trim()
  if (item.shapeId.startsWith(CUSTOM_HOMEWORK_PREFIX)) {
    return item.shapeId.slice(CUSTOM_HOMEWORK_PREFIX.length).replace(/_/g, ' ')
  }
  return getShape(item.shapeId)?.name ?? item.shapeId
}
