import { getShape } from '../config/shapes'
import { SEQUENCES_BY_ID } from '../config/sequences'
import type { HomeworkItem, SequenceDef } from '../types'

export const CUSTOM_HOMEWORK_PREFIX = 'custom:'
export const SEQUENCE_HOMEWORK_PREFIX = 'seq:'

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

export function getHomeworkSequence(
  item: Pick<HomeworkItem, 'shapeId'>,
): SequenceDef | undefined {
  const id = homeworkSequenceId(item)
  return id ? SEQUENCES_BY_ID[id] : undefined
}

export function sequenceHomeworkShapeId(sequenceId: string): string {
  return `${SEQUENCE_HOMEWORK_PREFIX}${sequenceId}`
}

export function isCustomHomework(
  item: Pick<HomeworkItem, 'shapeId'> & { customLabel?: string },
): boolean {
  if (isSequenceHomework(item)) return false
  return Boolean(item.customLabel?.trim()) || item.shapeId.startsWith(CUSTOM_HOMEWORK_PREFIX)
}

export function homeworkTitle(
  item: Pick<HomeworkItem, 'shapeId'> & { customLabel?: string },
): string {
  if (isSequenceHomework(item)) {
    if (item.customLabel?.trim()) return item.customLabel.trim()
    const seq = getHomeworkSequence(item)
    return seq?.name ?? item.shapeId.slice(SEQUENCE_HOMEWORK_PREFIX.length).replace(/_/g, ' ')
  }
  if (item.customLabel?.trim()) return item.customLabel.trim()
  if (item.shapeId.startsWith(CUSTOM_HOMEWORK_PREFIX)) {
    return item.shapeId.slice(CUSTOM_HOMEWORK_PREFIX.length).replace(/_/g, ' ')
  }
  return getShape(item.shapeId)?.name ?? item.shapeId
}
