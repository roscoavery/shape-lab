import { readJson, writeJson } from './persist.ts'

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
}

export async function readCoachContentFile(): Promise<DiskCoachContent> {
  const data = await readJson<DiskCoachContent>(FILE, { ...EMPTY })
  if (!data || data.kind !== 'shape-lab-coach-content') return { ...EMPTY }
  return {
    kind: 'shape-lab-coach-content',
    version: 1,
    exportedAt: typeof data.exportedAt === 'string' ? data.exportedAt : '',
    shapes: Array.isArray(data.shapes) ? data.shapes : [],
    references: Array.isArray(data.references) ? data.references : [],
    warmups: Array.isArray(data.warmups) ? data.warmups : [],
    stars: Array.isArray(data.stars) ? data.stars : [],
    gymLibrary: Array.isArray(data.gymLibrary) ? data.gymLibrary : [],
    drills: Array.isArray(data.drills) ? data.drills : [],
  }
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
  const body = raw && typeof raw === 'object' ? (raw as DiskCoachContent) : EMPTY
  const current = await readCoachContentFile()
  const next: DiskCoachContent = {
    kind: 'shape-lab-coach-content',
    version: 1,
    exportedAt: new Date().toISOString(),
    shapes: union(current.shapes, Array.isArray(body.shapes) ? body.shapes : []),
    references: union(current.references, Array.isArray(body.references) ? body.references : []),
    warmups: union(current.warmups, Array.isArray(body.warmups) ? body.warmups : []),
    stars: unionStars(current.stars, Array.isArray(body.stars) ? body.stars : []),
    gymLibrary: union(
      current.gymLibrary ?? [],
      Array.isArray(body.gymLibrary) ? body.gymLibrary : [],
    ),
    drills: union(current.drills ?? [], Array.isArray(body.drills) ? body.drills : []),
  }
  await writeJson(FILE, next)
  return next
}
