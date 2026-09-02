import { readJson, writeJson } from './persist.ts'

const FILE = 'data/chalkboards.json'

export type DiskChalkboards = {
  kind: 'shape-lab-chalkboards'
  version: 1
  exportedAt: string
  boards: unknown[]
}

const EMPTY: DiskChalkboards = {
  kind: 'shape-lab-chalkboards',
  version: 1,
  exportedAt: '',
  boards: [],
}

export async function readChalkboardsFile(): Promise<DiskChalkboards> {
  const data = await readJson<DiskChalkboards>(FILE, { ...EMPTY })
  if (!data || data.kind !== 'shape-lab-chalkboards') return { ...EMPTY }
  return {
    kind: 'shape-lab-chalkboards',
    version: 1,
    exportedAt: typeof data.exportedAt === 'string' ? data.exportedAt : '',
    boards: Array.isArray(data.boards) ? data.boards : [],
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

export async function writeChalkboardsFile(raw: unknown): Promise<DiskChalkboards> {
  const body = raw && typeof raw === 'object' ? (raw as DiskChalkboards) : EMPTY
  const current = await readChalkboardsFile()
  const next: DiskChalkboards = {
    kind: 'shape-lab-chalkboards',
    version: 1,
    exportedAt: new Date().toISOString(),
    boards: union(current.boards, Array.isArray(body.boards) ? body.boards : []),
  }
  await writeJson(FILE, next)
  return next
}
