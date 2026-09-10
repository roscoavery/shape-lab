import { readJson, writeJson } from './persist.ts'

const FILE = 'data/chalkboards.json'

export type DiskChalkboards = {
  kind: 'shape-lab-chalkboards'
  version: 1
  exportedAt: string
  boards: unknown[]
  removedItemIds?: string[]
  removedBoardIds?: string[]
}

const EMPTY: DiskChalkboards = {
  kind: 'shape-lab-chalkboards',
  version: 1,
  exportedAt: '',
  boards: [],
  removedItemIds: [],
  removedBoardIds: [],
}

export async function readChalkboardsFile(): Promise<DiskChalkboards> {
  const data = await readJson<DiskChalkboards>(FILE, { ...EMPTY })
  if (!data || data.kind !== 'shape-lab-chalkboards') return { ...EMPTY }
  return {
    kind: 'shape-lab-chalkboards',
    version: 1,
    exportedAt: typeof data.exportedAt === 'string' ? data.exportedAt : '',
    boards: dropRemoved(
      Array.isArray(data.boards) ? data.boards : [],
      asIdList(data.removedBoardIds),
      asIdList(data.removedItemIds),
    ),
    removedItemIds: asIdList(data.removedItemIds),
    removedBoardIds: asIdList(data.removedBoardIds),
  }
}

function asIdList(raw: unknown): string[] {
  if (!Array.isArray(raw)) return []
  return [...new Set(raw.filter((id): id is string => typeof id === 'string' && id.length > 0))].slice(
    -2000,
  )
}

function dropRemoved(boards: unknown[], removedBoardIds: string[], removedItemIds: string[]): unknown[] {
  const goneBoards = new Set(removedBoardIds)
  const goneItems = new Set(removedItemIds)
  return boards
    .filter((raw) => {
      if (!raw || typeof raw !== 'object') return false
      const id = (raw as { id?: unknown }).id
      return typeof id === 'string' && !goneBoards.has(id)
    })
    .map((raw) => {
      const row = raw as Record<string, unknown>
      const items = Array.isArray(row.items)
        ? row.items.filter((item) => {
            if (!item || typeof item !== 'object') return true
            const id = (item as { id?: unknown }).id
            return typeof id !== 'string' || !goneItems.has(id)
          })
        : row.items
      return { ...row, items }
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
  const removedItemIds = asIdList([...(current.removedItemIds ?? []), ...asIdList(body.removedItemIds)])
  const removedBoardIds = asIdList([...(current.removedBoardIds ?? []), ...asIdList(body.removedBoardIds)])
  const next: DiskChalkboards = {
    kind: 'shape-lab-chalkboards',
    version: 1,
    exportedAt: new Date().toISOString(),
    boards: dropRemoved(
      union(current.boards, Array.isArray(body.boards) ? body.boards : []),
      removedBoardIds,
      removedItemIds,
    ),
    removedItemIds,
    removedBoardIds,
  }
  await writeJson(FILE, next)
  return next
}
