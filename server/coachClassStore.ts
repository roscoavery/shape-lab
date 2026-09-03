import { readDiskJson, readJson, writeJson } from './persist.ts'

const FILE = 'data/coach-classes.json'

export type DiskCoachClasses = {
  kind: 'shape-lab-coach-classes'
  version: 1
  exportedAt: string
  offerings: unknown[]
  meetings: unknown[]
  activeMeetingId?: string | null
}

const EMPTY: DiskCoachClasses = {
  kind: 'shape-lab-coach-classes',
  version: 1,
  exportedAt: '',
  offerings: [],
  meetings: [],
  activeMeetingId: null,
}

function normalize(data: DiskCoachClasses | null | undefined): DiskCoachClasses {
  if (!data || data.kind !== 'shape-lab-coach-classes') return { ...EMPTY }
  return {
    kind: 'shape-lab-coach-classes',
    version: 1,
    exportedAt: typeof data.exportedAt === 'string' ? data.exportedAt : '',
    offerings: Array.isArray(data.offerings) ? data.offerings : [],
    meetings: Array.isArray(data.meetings) ? data.meetings : [],
    activeMeetingId: typeof data.activeMeetingId === 'string' ? data.activeMeetingId : null,
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

function asIds(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return [...new Set(value.filter((id): id is string => typeof id === 'string' && Boolean(id)))]
}

function extrasById(value: unknown): Map<string, Record<string, unknown>> {
  const map = new Map<string, Record<string, unknown>>()
  if (!Array.isArray(value)) return map
  for (const raw of value) {
    if (!raw || typeof raw !== 'object') continue
    const row = raw as Record<string, unknown>
    if (typeof row.id !== 'string' || !row.id) continue
    map.set(row.id, row)
  }
  return map
}

/** Keep every class id. Union who is in it so a thin phone PUT cannot wipe a roster. */
function combineOffering(
  keep: Record<string, unknown>,
  incoming: Record<string, unknown>,
): Record<string, unknown> {
  const incomingNewer = stamp(incoming).localeCompare(stamp(keep)) >= 0
  const newer = incomingNewer ? incoming : keep
  const older = incomingNewer ? keep : incoming
  const extras = extrasById(older.extraExercises)
  for (const [id, row] of extrasById(newer.extraExercises)) extras.set(id, row)
  const coachIds = [...new Set([...asIds(keep.coachIds), ...asIds(incoming.coachIds), ...asIds([keep.coachId, incoming.coachId])])]
  return {
    ...older,
    ...newer,
    id: keep.id,
    coachId: (typeof newer.coachId === 'string' && newer.coachId) || keep.coachId || coachIds[0] || '',
    coachIds,
    rosterIds: [...new Set([...asIds(keep.rosterIds), ...asIds(incoming.rosterIds)])],
    extraExercises: extras.size ? [...extras.values()] : newer.extraExercises ?? older.extraExercises,
    createdAt: older.createdAt || newer.createdAt,
    updatedAt: incomingNewer ? incoming.updatedAt || keep.updatedAt : keep.updatedAt || incoming.updatedAt,
  }
}

function unionOfferings(existing: unknown[], incoming: unknown[]): unknown[] {
  const map = byId(existing)
  for (const raw of incoming) {
    if (!raw || typeof raw !== 'object') continue
    const row = raw as Record<string, unknown>
    if (typeof row.id !== 'string' || !row.id) continue
    const keep = map.get(row.id)
    map.set(row.id, keep ? combineOffering(keep, row) : row)
  }
  return [...map.values()]
}

function unionMeetings(existing: unknown[], incoming: unknown[]): unknown[] {
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

function unionFiles(a: DiskCoachClasses, b: DiskCoachClasses): DiskCoachClasses {
  return {
    kind: 'shape-lab-coach-classes',
    version: 1,
    exportedAt: a.exportedAt || b.exportedAt,
    offerings: unionOfferings(a.offerings, b.offerings),
    meetings: unionMeetings(a.meetings, b.meetings),
    activeMeetingId: a.activeMeetingId ?? b.activeMeetingId ?? null,
  }
}

export async function readCoachClassesFile(): Promise<DiskCoachClasses> {
  const stored = normalize(await readJson<DiskCoachClasses>(FILE, { ...EMPTY }))
  const bundled = normalize(readDiskJson<DiskCoachClasses>(FILE, { ...EMPTY }))
  const merged = unionFiles(bundled, stored)
  if (merged.offerings.length > stored.offerings.length) {
    const next = { ...merged, exportedAt: new Date().toISOString() }
    await writeJson(FILE, next)
    return next
  }
  return merged
}

export async function writeCoachClassesFile(raw: unknown): Promise<DiskCoachClasses> {
  const body = normalize(raw && typeof raw === 'object' ? (raw as DiskCoachClasses) : EMPTY)
  const current = await readCoachClassesFile()
  const next: DiskCoachClasses = {
    ...unionFiles(current, body),
    exportedAt: new Date().toISOString(),
    activeMeetingId: body.activeMeetingId ?? current.activeMeetingId ?? null,
  }
  await writeJson(FILE, next)
  return next
}
