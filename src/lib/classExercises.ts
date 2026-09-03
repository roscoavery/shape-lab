/**
 * Extra holds and reps a coach pins on a class or lesson.
 * The four core drills stay hardcoded — this list sits beside them.
 */

import { getCatalogItem, HOMEWORK_CATALOG } from '../config/homeworkCatalog'
import { getShape } from '../config/shapes'
import type { ClassExtraExercise, HomeworkTrackMode } from '../types'
import { createId } from './storage'
import { QUICK_HOLD_IDS } from './lessonShapes'

/** Core class/lesson holds — never offer these as extras. */
export const CORE_DRILL_SHAPE_IDS = new Set<string>([
  ...QUICK_HOLD_IDS,
  'hollow',
])

export const SUGGESTED_CLASS_EXTRAS: Omit<ClassExtraExercise, 'id'>[] = [
  { kind: 'shape', refId: 'hollow_arms_up', label: 'Hollow arms up', trackMode: 'hold' },
  { kind: 'catalog', refId: 'pushup', label: 'Push-ups', trackMode: 'reps' },
  { kind: 'catalog', refId: 'pullup', label: 'Pull-ups', trackMode: 'reps' },
  { kind: 'catalog', refId: 'bridge_pushup', label: 'Bridge push-ups', trackMode: 'reps' },
  { kind: 'catalog', refId: 'v_up', label: 'V-ups', trackMode: 'reps' },
  { kind: 'catalog', refId: 'candlestick', label: 'Candlestick drills', trackMode: 'hold' },
]

export function normalizeClassExtra(raw: Partial<ClassExtraExercise> | null | undefined): ClassExtraExercise | null {
  if (!raw?.label?.trim() && !raw?.refId) return null
  const trackMode: 'hold' | 'reps' = raw.trackMode === 'reps' ? 'reps' : 'hold'
  const kind = raw.kind === 'catalog' || raw.kind === 'shape' || raw.kind === 'custom' ? raw.kind : 'custom'
  const label = (raw.label || '').trim() || defaultExtraLabel(kind, raw.refId)
  if (!label) return null
  if (kind === 'shape' && raw.refId && CORE_DRILL_SHAPE_IDS.has(raw.refId)) return null
  return {
    id: raw.id || createId('xex'),
    kind,
    refId: raw.refId?.trim() || undefined,
    label,
    trackMode,
  }
}

export function normalizeClassExtras(list: unknown): ClassExtraExercise[] {
  if (!Array.isArray(list)) return []
  const out: ClassExtraExercise[] = []
  const seen = new Set<string>()
  for (const row of list) {
    const next = normalizeClassExtra(row as Partial<ClassExtraExercise>)
    if (!next) continue
    const key = extraKey(next)
    if (seen.has(key)) continue
    seen.add(key)
    out.push(next)
  }
  return out.slice(0, 24)
}

export function extraKey(ex: Pick<ClassExtraExercise, 'kind' | 'refId' | 'label' | 'trackMode'>): string {
  if (ex.kind === 'catalog' && ex.refId) return `catalog:${ex.refId}:${ex.trackMode}`
  if (ex.kind === 'shape' && ex.refId) return `shape:${ex.refId}:${ex.trackMode}`
  return `custom:${ex.label.trim().toLowerCase()}:${ex.trackMode}`
}

function defaultExtraLabel(kind: ClassExtraExercise['kind'], refId?: string): string {
  if (kind === 'catalog' && refId) return getCatalogItem(refId)?.name ?? ''
  if (kind === 'shape' && refId) return getShape(refId)?.name ?? refId
  return ''
}

export function extraAlreadyPinned(
  list: ClassExtraExercise[],
  candidate: Pick<ClassExtraExercise, 'kind' | 'refId' | 'label' | 'trackMode'>,
): boolean {
  const key = extraKey(candidate)
  return list.some((ex) => extraKey(ex) === key)
}

export function makeClassExtra(input: Omit<ClassExtraExercise, 'id'>): ClassExtraExercise | null {
  return normalizeClassExtra({ ...input, id: createId('xex') })
}

export function mergeExtras(...lists: (ClassExtraExercise[] | undefined)[]): ClassExtraExercise[] {
  return normalizeClassExtras(lists.flatMap((list) => list ?? []))
}

export function extraTrackLabel(mode: HomeworkTrackMode | 'hold' | 'reps'): string {
  return mode === 'reps' ? 'reps' : 'hold'
}

export function catalogChoicesForExtras() {
  return HOMEWORK_CATALOG.map((item) => ({
    id: item.id,
    name: item.name,
    trackMode: item.trackMode === 'reps' ? ('reps' as const) : ('hold' as const),
  }))
}
