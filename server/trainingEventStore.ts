import { readJson, writeJson } from './persist.ts'

const FILE = 'data/training-events.json'

export type DiskTrainingEvents = {
  kind: 'shape-lab-training-events'
  version: 1
  exportedAt: string
  events: unknown[]
}

const EMPTY: DiskTrainingEvents = {
  kind: 'shape-lab-training-events',
  version: 1,
  exportedAt: '',
  events: [],
}

export async function readTrainingEventsFile(): Promise<DiskTrainingEvents> {
  const data = await readJson<DiskTrainingEvents>(FILE, { ...EMPTY })
  if (!data || data.kind !== 'shape-lab-training-events') return { ...EMPTY }
  return {
    kind: 'shape-lab-training-events',
    version: 1,
    exportedAt: typeof data.exportedAt === 'string' ? data.exportedAt : '',
    events: Array.isArray(data.events) ? data.events : [],
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

export async function writeTrainingEventsFile(raw: unknown): Promise<DiskTrainingEvents> {
  const body = raw && typeof raw === 'object' ? (raw as DiskTrainingEvents) : EMPTY
  const current = await readTrainingEventsFile()
  const map = byId(current.events)
  for (const rawRow of Array.isArray(body.events) ? body.events : []) {
    if (!rawRow || typeof rawRow !== 'object') continue
    const row = rawRow as Record<string, unknown>
    if (typeof row.id !== 'string' || !row.id) continue
    const keep = map.get(row.id)
    if (!keep || stamp(row).localeCompare(stamp(keep)) >= 0) map.set(row.id, row)
  }
  const next: DiskTrainingEvents = {
    kind: 'shape-lab-training-events',
    version: 1,
    exportedAt: new Date().toISOString(),
    events: [...map.values()],
  }
  await writeJson(FILE, next)
  return next
}
