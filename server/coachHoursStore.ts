import { readDiskJson, readJson, writeJson } from './persist.ts'

const FILE = 'data/coach-hours.json'

export type DiskCoachHours = {
  kind: 'shape-lab-coach-hours'
  version: 1
  exportedAt: string
  logs: unknown[]
  removedLogIds?: string[]
}

const EMPTY: DiskCoachHours = {
  kind: 'shape-lab-coach-hours',
  version: 1,
  exportedAt: '',
  logs: [],
  removedLogIds: [],
}

function normalize(data: DiskCoachHours | null | undefined): DiskCoachHours {
  if (!data || data.kind !== 'shape-lab-coach-hours') return { ...EMPTY }
  return {
    kind: 'shape-lab-coach-hours',
    version: 1,
    exportedAt: typeof data.exportedAt === 'string' ? data.exportedAt : '',
    logs: Array.isArray(data.logs) ? data.logs : [],
    removedLogIds: Array.isArray(data.removedLogIds)
      ? data.removedLogIds.filter((id): id is string => typeof id === 'string' && Boolean(id))
      : [],
  }
}

function stamp(row: Record<string, unknown>): string {
  for (const key of ['updatedAt', 'createdAt']) {
    const v = row[key]
    if (typeof v === 'string' && v) return v
  }
  return ''
}

/** One log per coach+date. Last write wins by updatedAt. */
function unionLogs(existing: unknown[], incoming: unknown[]): unknown[] {
  const map = new Map<string, Record<string, unknown>>()
  const keyOf = (row: Record<string, unknown>) =>
    `${typeof row.coachId === 'string' ? row.coachId : ''}|${typeof row.date === 'string' ? row.date : ''}`
  for (const raw of [...existing, ...incoming]) {
    if (!raw || typeof raw !== 'object') continue
    const row = raw as Record<string, unknown>
    const key = keyOf(row)
    if (!key.includes('|') || key.startsWith('|')) continue
    const keep = map.get(key)
    if (!keep || stamp(row).localeCompare(stamp(keep)) >= 0) map.set(key, row)
  }
  return [...map.values()]
}

function unionFiles(a: DiskCoachHours, b: DiskCoachHours): DiskCoachHours {
  const removedLogIds = [...new Set([...(a.removedLogIds ?? []), ...(b.removedLogIds ?? [])])]
  const dropped = new Set(removedLogIds)
  return {
    kind: 'shape-lab-coach-hours',
    version: 1,
    exportedAt: a.exportedAt || b.exportedAt,
    logs: unionLogs(a.logs, b.logs).filter((raw) => {
      const row = raw as Record<string, unknown>
      return typeof row.id === 'string' && row.id && !dropped.has(row.id)
    }),
    removedLogIds,
  }
}

export async function readCoachHoursFile(): Promise<DiskCoachHours> {
  const disk = normalize(readDiskJson<DiskCoachHours>(FILE, { ...EMPTY }))
  const remote = normalize(await readJson<DiskCoachHours>(FILE, { ...EMPTY }))
  return unionFiles(disk, remote)
}

export async function writeCoachHoursFile(incoming: unknown): Promise<DiskCoachHours> {
  const next = normalize(incoming as DiskCoachHours)
  const merged = unionFiles(await readCoachHoursFile(), next)
  merged.exportedAt = new Date().toISOString()
  await writeJson(FILE, merged)
  return merged
}
