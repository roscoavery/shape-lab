import { readDiskJson, readJson, writeJson } from './persist.ts'

const FILE = 'data/coach-systems.json'

export type DiskCoachSystem = {
  kind: 'shape-lab-coach-systems'
  version: 1
  exportedAt: string
  systems: unknown[]
  removedSystemIds?: string[]
}

const EMPTY: DiskCoachSystem = {
  kind: 'shape-lab-coach-systems',
  version: 1,
  exportedAt: '',
  systems: [],
  removedSystemIds: [],
}

function asIdList(raw: unknown): string[] {
  if (!Array.isArray(raw)) return []
  return [...new Set(raw.filter((id): id is string => typeof id === 'string' && Boolean(id)))]
}

function normalize(data: DiskCoachSystem | null | undefined): DiskCoachSystem {
  if (!data || data.kind !== 'shape-lab-coach-systems') return { ...EMPTY }
  const removed = new Set(asIdList(data.removedSystemIds))
  const systems = (Array.isArray(data.systems) ? data.systems : []).filter((raw) => {
    if (!raw || typeof raw !== 'object') return false
    const id = (raw as { id?: unknown }).id
    return typeof id === 'string' && id && !removed.has(id)
  })
  return {
    kind: 'shape-lab-coach-systems',
    version: 1,
    exportedAt: typeof data.exportedAt === 'string' ? data.exportedAt : '',
    systems,
    removedSystemIds: [...removed],
  }
}

function stamp(row: Record<string, unknown>): string {
  for (const key of ['updatedAt', 'createdAt', 'exportedAt']) {
    const v = row[key]
    if (typeof v === 'string' && v) return v
  }
  return ''
}

function unionSystems(existing: unknown[], incoming: unknown[]): unknown[] {
  const map = new Map<string, Record<string, unknown>>()
  for (const raw of existing) {
    if (!raw || typeof raw !== 'object') continue
    const row = raw as Record<string, unknown>
    if (typeof row.id !== 'string' || !row.id) continue
    map.set(row.id, row)
  }
  for (const raw of incoming) {
    if (!raw || typeof raw !== 'object') continue
    const row = raw as Record<string, unknown>
    if (typeof row.id !== 'string' || !row.id) continue
    const keep = map.get(row.id)
    if (!keep || stamp(row).localeCompare(stamp(keep)) >= 0) map.set(row.id, row)
  }
  return [...map.values()]
}

export async function readCoachSystemsFile(): Promise<DiskCoachSystem> {
  const stored = normalize(await readJson<DiskCoachSystem>(FILE, { ...EMPTY }))
  const bundled = normalize(readDiskJson<DiskCoachSystem>(FILE, { ...EMPTY }))
  const removed = new Set([...asIdList(stored.removedSystemIds), ...asIdList(bundled.removedSystemIds)])
  return {
    kind: 'shape-lab-coach-systems',
    version: 1,
    exportedAt: stored.exportedAt || bundled.exportedAt || '',
    systems: unionSystems(bundled.systems, stored.systems).filter((raw) => {
      const id = (raw as { id?: unknown }).id
      return typeof id !== 'string' || !removed.has(id)
    }),
    removedSystemIds: [...removed],
  }
}

export async function writeCoachSystemsFile(raw: unknown): Promise<DiskCoachSystem> {
  const current = await readCoachSystemsFile()
  const incoming = normalize(raw as DiskCoachSystem)
  const next = normalize({
    kind: 'shape-lab-coach-systems',
    version: 1,
    exportedAt: incoming.exportedAt || new Date().toISOString(),
    systems: unionSystems(current.systems, incoming.systems),
    removedSystemIds: [...new Set([...asIdList(current.removedSystemIds), ...asIdList(incoming.removedSystemIds)])],
  })
  await writeJson(FILE, next)
  return next
}
