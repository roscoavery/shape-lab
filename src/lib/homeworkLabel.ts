import { getShape } from '../config/shapes'
import type { HomeworkItem } from '../types'

export const CUSTOM_HOMEWORK_PREFIX = 'custom:'

export function customHomeworkShapeId(label: string): string {
  const slug = label
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '')
  return `${CUSTOM_HOMEWORK_PREFIX}${slug || 'skill'}`
}

export function isCustomHomework(
  item: Pick<HomeworkItem, 'shapeId'> & { customLabel?: string },
): boolean {
  return Boolean(item.customLabel?.trim()) || item.shapeId.startsWith(CUSTOM_HOMEWORK_PREFIX)
}

export function homeworkTitle(
  item: Pick<HomeworkItem, 'shapeId'> & { customLabel?: string },
): string {
  if (item.customLabel?.trim()) return item.customLabel.trim()
  if (item.shapeId.startsWith(CUSTOM_HOMEWORK_PREFIX)) {
    return item.shapeId.slice(CUSTOM_HOMEWORK_PREFIX.length).replace(/_/g, ' ')
  }
  return getShape(item.shapeId)?.name ?? item.shapeId
}
