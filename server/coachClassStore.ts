import { readJson, writeJson } from './persist.ts'

const FILE = 'data/coach-classes.json'

export type DiskCoachClasses = {
  kind: 'shape-lab-coach-classes'
  version: 1
  exportedAt: string
  offerings: unknown[]
  meetings: unknown[]
}

const EMPTY: DiskCoachClasses = {
  kind: 'shape-lab-coach-classes',
  version: 1,
  exportedAt: '',
  offerings: [],
  meetings: [],
}

export async function readCoachClassesFile(): Promise<DiskCoachClasses> {
  const data = await readJson<DiskCoachClasses>(FILE, { ...EMPTY })
  if (!data || data.kind !== 'shape-lab-coach-classes') return { ...EMPTY }
  return {
    kind: 'shape-lab-coach-classes',
    version: 1,
    exportedAt: typeof data.exportedAt === 'string' ? data.exportedAt : '',
    offerings: Array.isArray(data.offerings) ? data.offerings : [],
    meetings: Array.isArray(data.meetings) ? data.meetings : [],
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
  for (const key of ['updatedAt', 'endedAt', 'startedAt', 'createdAt', 'exportedAt']) {
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

export async function writeCoachClassesFile(raw: unknown): Promise<DiskCoachClasses> {
  const body = raw && typeof raw === 'object' ? (raw as DiskCoachClasses) : EMPTY
  const current = await readCoachClassesFile()
  const next: DiskCoachClasses = {
    kind: 'shape-lab-coach-classes',
    version: 1,
    exportedAt: new Date().toISOString(),
    offerings: union(current.offerings, Array.isArray(body.offerings) ? body.offerings : []),
    meetings: union(current.meetings, Array.isArray(body.meetings) ? body.meetings : []),
  }
  await writeJson(FILE, next)
  return next
}
