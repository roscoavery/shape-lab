import { ANATOMY_LESSONS } from '../../config/coachAnatomy'
import { adaptLegacyLesson } from './adapters'
import { CONDITION_INDEX, type ConditionIndexRow } from './conditions/index.generated'
import { CONDITION_LOADERS } from './conditions/files'
import type { Condition, Lesson, ModuleId, Region, ReviewStatus, Urgency } from './types'

const LESSON_LOADERS: Record<Exclude<ModuleId, 'testing'>, () => Promise<Lesson[]>> = {
  fundamentals: () => import('./lessons/fundamentals').then((m) => m.FUNDAMENTALS),
  library: () => import('./lessons/library').then((m) => m.LIBRARY),
  response: () => import('./lessons/response').then((m) => m.RESPONSE),
  recovery: () => import('./lessons/recovery').then((m) => m.RECOVERY),
  movement: () => import('./lessons/movement').then((m) => m.MOVEMENT),
  stretching: () => import('./lessons/stretching').then((m) => m.STRETCHING),
  training: () => import('./lessons/training').then((m) => m.TRAINING),
}

/** Existing Learn lessons that are not already wrapped by a new lesson. */
const LEGACY_PLACEMENT: Record<string, ModuleId> = {
  'struggle-hypermobile': 'stretching',
  'injury-prevention': 'fundamentals',
}

const cache = new Map<ModuleId, Promise<Lesson[]>>()

export function loadLessons(moduleId: ModuleId): Promise<Lesson[]> {
  if (moduleId === 'testing') return Promise.resolve([])
  let hit = cache.get(moduleId)
  if (!hit) {
    hit = LESSON_LOADERS[moduleId]().then((list) => {
      const wrapped = new Set(list.map((l) => l.legacyId).filter(Boolean))
      const extra = ANATOMY_LESSONS.filter(
        (l) => LEGACY_PLACEMENT[l.id] === moduleId && !wrapped.has(l.id),
      ).map((l) => adaptLegacyLesson(l, moduleId))
      return [...list, ...extra]
    })
    cache.set(moduleId, hit)
  }
  return hit
}

export async function loadAllLessons(): Promise<Lesson[]> {
  const ids = Object.keys(LESSON_LOADERS) as Exclude<ModuleId, 'testing'>[]
  return (await Promise.all(ids.map(loadLessons))).flat()
}

export function conditionIndex(): ConditionIndexRow[] {
  return CONDITION_INDEX
}

export function conditionRow(id: string): ConditionIndexRow | undefined {
  return CONDITION_INDEX.find((c) => c.id === id)
}

export async function loadCondition(id: string): Promise<Condition | undefined> {
  const row = conditionRow(id)
  if (!row) return undefined
  const list = await CONDITION_LOADERS[row.file]()
  return list.find((c) => c.id === id)
}

export type ConditionFilter = {
  query?: string
  region?: Region | 'all'
  urgency?: Urgency | 'all'
  completeness?: 'complete' | 'in_preparation' | 'all'
}

function norm(s: string): string {
  return s.toLowerCase().normalize('NFKD').replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim()
}

/** Matches name, aliases, tags, and plain-word tokens. All query words must match. */
export function searchConditions(filter: ConditionFilter): ConditionIndexRow[] {
  const words = norm(filter.query ?? '').split(' ').filter(Boolean)
  return CONDITION_INDEX.filter((c) => {
    if (filter.region && filter.region !== 'all' && !c.regions.includes(filter.region)) return false
    if (filter.urgency && filter.urgency !== 'all' && c.urgency !== filter.urgency) return false
    if (filter.completeness && filter.completeness !== 'all' && c.completeness !== filter.completeness) return false
    if (!words.length) return true
    const hay = norm([c.name, ...c.aliases, ...c.tags, ...c.regions, ...c.tissues].join(' '))
    return words.every((w) => hay.includes(w))
  }).sort((a, b) => {
    if (a.completeness !== b.completeness) return a.completeness === 'complete' ? -1 : 1
    return a.name.localeCompare(b.name)
  })
}

/** Review state the reader sees. Server overlay wins over the authored state. */
export function effectiveReview(authored: ReviewStatus, overlay?: ReviewStatus): ReviewStatus {
  return overlay ?? authored
}
