import { readJson, writeJson } from './persist.ts'

const FILE = 'data/lessons.json'

export type DiskLessons = {
  kind: 'shape-lab-lessons'
  version: 1
  exportedAt: string
  plans: unknown[]
  sessions: unknown[]
  /** Session ids dropped on any device — do not resurrect on merge. */
  removedSessionIds?: string[]
  /** Plan ids dropped on any device — do not resurrect on merge. */
  removedPlanIds?: string[]
}

const EMPTY: DiskLessons = {
  kind: 'shape-lab-lessons',
  version: 1,
  exportedAt: '',
  plans: [],
  sessions: [],
  removedSessionIds: [],
  removedPlanIds: [],
}

function asIdList(raw: unknown): string[] {
  if (!Array.isArray(raw)) return []
  return [...new Set(raw.filter((id): id is string => typeof id === 'string' && Boolean(id)))]
}

function applyTombstones(file: DiskLessons): DiskLessons {
  const removedSessionIds = asIdList(file.removedSessionIds)
  const removedPlanIds = asIdList(file.removedPlanIds)
  const goneSessions = new Set(removedSessionIds)
  const gonePlans = new Set(removedPlanIds)
  const idOf = (raw: unknown): string | null => {
    if (!raw || typeof raw !== 'object') return null
    const id = (raw as { id?: unknown }).id
    return typeof id === 'string' && id ? id : null
  }
  return {
    ...file,
    plans: file.plans.filter((raw) => {
      const id = idOf(raw)
      return id !== null && !gonePlans.has(id)
    }),
    sessions: file.sessions.filter((raw) => {
      const id = idOf(raw)
      return id !== null && !goneSessions.has(id)
    }),
    removedSessionIds,
    removedPlanIds,
  }
}

export async function readLessonsFile(): Promise<DiskLessons> {
  const data = await readJson<DiskLessons>(FILE, { ...EMPTY })
  if (!data || data.kind !== 'shape-lab-lessons') return { ...EMPTY }
  return applyTombstones({
    kind: 'shape-lab-lessons',
    version: 1,
    exportedAt: typeof data.exportedAt === 'string' ? data.exportedAt : '',
    plans: Array.isArray(data.plans) ? data.plans : [],
    sessions: Array.isArray(data.sessions) ? data.sessions : [],
    removedSessionIds: asIdList(data.removedSessionIds),
    removedPlanIds: asIdList(data.removedPlanIds),
  })
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
  for (const key of ['updatedAt', 'endedAt', 'startedAt', 'exportedAt']) {
    const v = row[key]
    if (typeof v === 'string' && v) return v
  }
  return ''
}

/** Add an athlete id to a stored lesson session row (union, idempotent).
 * The row keeps its own stamp; the file write merges it in. Used by the
 * Muse lessons repair endpoint so a past lesson can gain an athlete
 * who was in it without rewriting anything else about the session. */
export function addAthleteToSessionRow(
  row: Record<string, unknown>,
  athleteId: string,
): { row: Record<string, unknown>; changed: boolean } {
  const ids = [
    ...new Set(
      [row.athleteId, ...(Array.isArray(row.athleteIds) ? row.athleteIds : [])].filter(
        (id): id is string => typeof id === 'string' && Boolean(id),
      ),
    ),
  ]
  if (ids.includes(athleteId)) return { row, changed: false }
  return { row: { ...row, athleteIds: [...ids, athleteId] }, changed: true }
}

/**
 * Newer-stamped row wins, except athleteIds on lesson sessions, which
 * only ever grow (there is no remove-athlete path): the merged row
 * carries the union, so an athlete added mid-lesson on one device
 * survives an end or save made from a stale copy on another device.
 * Plan rows carry no athleteIds array and are untouched.
 */
export function union(existing: unknown[], incoming: unknown[]): unknown[] {
  const map = byId(existing)
  for (const raw of incoming) {
    if (!raw || typeof raw !== 'object') continue
    const row = raw as Record<string, unknown>
    if (typeof row.id !== 'string' || !row.id) continue
    const keep = map.get(row.id)
    if (!keep) {
      map.set(row.id, row)
      continue
    }
    const winner = stamp(row).localeCompare(stamp(keep)) >= 0 ? row : keep
    const loser = winner === row ? keep : row
    const winnerIds = Array.isArray(winner.athleteIds) ? (winner.athleteIds as unknown[]) : []
    const loserIds = Array.isArray(loser.athleteIds) ? (loser.athleteIds as unknown[]) : []
    if (winnerIds.length === 0 && loserIds.length === 0) {
      map.set(row.id, winner)
      continue
    }
    const mergedIds = [
      ...new Set(
        [winner.athleteId, ...winnerIds, ...loserIds].filter(
          (id): id is string => typeof id === 'string' && Boolean(id),
        ),
      ),
    ]
    map.set(row.id, { ...winner, athleteIds: mergedIds })
  }
  return [...map.values()]
}

export async function writeLessonsFile(raw: unknown): Promise<DiskLessons> {
  const body = raw && typeof raw === 'object' ? (raw as DiskLessons) : EMPTY
  const current = await readLessonsFile()
  const next: DiskLessons = applyTombstones({
    kind: 'shape-lab-lessons',
    version: 1,
    exportedAt: new Date().toISOString(),
    plans: union(current.plans, Array.isArray(body.plans) ? body.plans : []),
    sessions: union(current.sessions, Array.isArray(body.sessions) ? body.sessions : []),
    removedSessionIds: asIdList(current.removedSessionIds).concat(asIdList(body.removedSessionIds)),
    removedPlanIds: asIdList(current.removedPlanIds).concat(asIdList(body.removedPlanIds)),
  })
  await writeJson(FILE, next)
  return next
}
