import { readDiskJson, readJson, writeJson } from './persist.ts'

const FILE = 'data/coach-content.json'

export type DiskCoachContent = {
  kind: 'shape-lab-coach-content'
  version: 1
  exportedAt: string
  shapes: unknown[]
  references: unknown[]
  warmups: unknown[]
  stars: unknown[]
  gymLibrary?: unknown[]
  drills?: unknown[]
  removedWarmupIds?: string[]
  removedGymShapeIds?: string[]
  /** Drill ids dropped on any device — do not resurrect on merge. */
  removedDrillIds?: string[]
  /** Coach-shape ids dropped on any device — do not resurrect on merge. */
  removedShapeIds?: string[]
  /** Coach skill-ref ids dropped on any device — do not resurrect on merge. */
  removedReferenceIds?: string[]
}

const EMPTY: DiskCoachContent = {
  kind: 'shape-lab-coach-content',
  version: 1,
  exportedAt: '',
  shapes: [],
  references: [],
  warmups: [],
  stars: [],
  gymLibrary: [],
  drills: [],
  removedWarmupIds: [],
  removedGymShapeIds: [],
  removedDrillIds: [],
  removedShapeIds: [],
  removedReferenceIds: [],
}

function asIdList(raw: unknown): string[] {
  if (!Array.isArray(raw)) return []
  return [...new Set(raw.filter((id): id is string => typeof id === 'string' && Boolean(id)))]
}

function normalize(data: DiskCoachContent | null | undefined): DiskCoachContent {
  if (!data || data.kind !== 'shape-lab-coach-content') return { ...EMPTY }
  return applyRemoved({
    kind: 'shape-lab-coach-content',
    version: 1,
    exportedAt: typeof data.exportedAt === 'string' ? data.exportedAt : '',
    shapes: Array.isArray(data.shapes) ? data.shapes : [],
    references: Array.isArray(data.references) ? data.references : [],
    warmups: Array.isArray(data.warmups) ? data.warmups : [],
    stars: Array.isArray(data.stars) ? data.stars : [],
    gymLibrary: Array.isArray(data.gymLibrary) ? data.gymLibrary : [],
    drills: Array.isArray(data.drills) ? data.drills : [],
    removedWarmupIds: asIdList(data.removedWarmupIds),
    removedGymShapeIds: asIdList(data.removedGymShapeIds),
    removedDrillIds: asIdList(data.removedDrillIds),
    removedShapeIds: asIdList(data.removedShapeIds),
    removedReferenceIds: asIdList(data.removedReferenceIds),
  })
}

function applyRemoved(file: DiskCoachContent): DiskCoachContent {
  const removedWarmupIds = asIdList(file.removedWarmupIds)
  const removedGymShapeIds = asIdList(file.removedGymShapeIds)
  const removedDrillIds = asIdList(file.removedDrillIds)
  const removedShapeIds = asIdList(file.removedShapeIds)
  const removedReferenceIds = asIdList(file.removedReferenceIds)
  const removed = new Set(removedWarmupIds)
  const goneShapes = new Set(removedGymShapeIds)
  const goneDrills = new Set(removedDrillIds)
  const goneCoachShapes = new Set(removedShapeIds)
  const goneRefs = new Set(removedReferenceIds)
  const idOf = (raw: unknown): string | null => {
    if (!raw || typeof raw !== 'object') return null
    const id = (raw as { id?: unknown }).id
    return typeof id === 'string' && id ? id : null
  }
  return {
    ...file,
    shapes: file.shapes.filter((raw) => {
      const id = idOf(raw)
      return id !== null && !goneCoachShapes.has(id)
    }),
    references: file.references.filter((raw) => {
      const id = idOf(raw)
      return id !== null && !goneRefs.has(id)
    }),
    drills: (file.drills ?? []).filter((raw) => {
      const id = idOf(raw)
      return id !== null && !goneDrills.has(id)
    }),
    warmups: file.warmups.filter((raw) => {
      if (!raw || typeof raw !== 'object') return false
      const id = (raw as { id?: unknown }).id
      return typeof id === 'string' && id && !removed.has(id)
    }),
    stars: file.stars.filter((raw) => {
      if (!raw || typeof raw !== 'object') return false
      const id = (raw as { warmupId?: unknown }).warmupId
      return typeof id === 'string' && id && !removed.has(id)
    }),
    gymLibrary: (file.gymLibrary ?? []).filter((raw) => {
      if (!raw || typeof raw !== 'object') return false
      const id = (raw as { id?: unknown }).id
      return typeof id === 'string' && id && !goneShapes.has(id)
    }),
    removedWarmupIds,
    removedGymShapeIds,
    removedDrillIds,
    removedShapeIds,
    removedReferenceIds,
  }
}

function unionFiles(a: DiskCoachContent, b: DiskCoachContent): DiskCoachContent {
  return applyRemoved({
    kind: 'shape-lab-coach-content',
    version: 1,
    exportedAt: a.exportedAt || b.exportedAt || '',
    shapes: union(a.shapes, b.shapes),
    references: union(a.references, b.references),
    warmups: union(a.warmups, b.warmups),
    stars: unionStars(a.stars, b.stars),
    gymLibrary: union(a.gymLibrary ?? [], b.gymLibrary ?? []),
    drills: union(a.drills ?? [], b.drills ?? []),
    removedWarmupIds: [...new Set([...asIdList(a.removedWarmupIds), ...asIdList(b.removedWarmupIds)])],
    removedGymShapeIds: [...new Set([...asIdList(a.removedGymShapeIds), ...asIdList(b.removedGymShapeIds)])],
    removedDrillIds: [...new Set([...asIdList(a.removedDrillIds), ...asIdList(b.removedDrillIds)])],
    removedShapeIds: [...new Set([...asIdList(a.removedShapeIds), ...asIdList(b.removedShapeIds)])],
    removedReferenceIds: [
      ...new Set([...asIdList(a.removedReferenceIds), ...asIdList(b.removedReferenceIds)]),
    ],
  })
}

export async function readCoachContentFile(): Promise<DiskCoachContent> {
  const stored = normalize(await readJson<DiskCoachContent>(FILE, { ...EMPTY }))
  const bundled = normalize(readDiskJson<DiskCoachContent>(FILE, { ...EMPTY }))
  return unionFiles(bundled, stored)
}

function byId(list: unknown[]): Map<string, Record<string, unknown>> {
  const map = new Map<string, Record<string, unknown>>()
  for (const raw of list) {
    if (!raw || typeof raw !== 'object') continue
    const row = raw as Record<string, unknown>
    if (typeof row.id !== 'string' || !row.id) continue
    map.set(row.id, row)
  }
  return map
}

function stamp(row: Record<string, unknown>): string {
  for (const key of ['updatedAt', 'createdAt', 'exportedAt']) {
    const v = row[key]
    if (typeof v === 'string' && v) return v
  }
  return ''
}

function union(existing: unknown[], incoming: unknown[]): unknown[] {
  const map = byId(existing)
  for (const raw of incoming) {
    if (!raw || typeof raw !== 'object') continue
    const row = raw as Record<string, unknown>
    if (typeof row.id !== 'string' || !row.id) continue
    const keep = map.get(row.id)
    if (!keep || stamp(row).localeCompare(stamp(keep)) >= 0) map.set(row.id, row)
  }
  return [...map.values()]
}

function starKey(row: Record<string, unknown>): string | null {
  const a = typeof row.athleteId === 'string' ? row.athleteId : ''
  const w = typeof row.warmupId === 'string' ? row.warmupId : ''
  if (!a || !w) return null
  return `${a}::${w}`
}

function unionStars(existing: unknown[], incoming: unknown[]): unknown[] {
  const map = new Map<string, Record<string, unknown>>()
  for (const raw of [...existing, ...incoming]) {
    if (!raw || typeof raw !== 'object') continue
    const row = raw as Record<string, unknown>
    const key = starKey(row)
    if (!key) continue
    map.set(key, row)
  }
  return [...map.values()]
}

export async function writeCoachContentFile(raw: unknown): Promise<DiskCoachContent> {
  const body = raw && typeof raw === 'object' ? normalize(raw as DiskCoachContent) : { ...EMPTY }
  const current = await readCoachContentFile()
  const next: DiskCoachContent = {
    ...unionFiles(current, body),
    exportedAt: new Date().toISOString(),
  }
  await writeJson(FILE, next)
  return next
}
