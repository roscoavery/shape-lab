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

function isRecord(raw: unknown): raw is Record<string, unknown> {
  return !!raw && typeof raw === 'object'
}

export type ChalkboardMergeOutcome = {
  boards: Record<string, unknown>[]
  removedBoardIds: string[]
  moved: { id: string; title: string }[]
  skipped: { id: string; title: string }[]
}

/**
 * Fold one chalkboard into another. Every moved item keeps exactly what
 * it had (same id, url, pins, loops, creator, createdAt) with only
 * boardId re-pointed, so relative video links survive — the item-add
 * endpoint would drop those. The folded board is tombstoned, never
 * hard-deleted, so a stale client snapshot cannot resurrect it. The
 * caller must have verified both boards exist and differ.
 */
export function mergeChalkboardBoards(
  boards: unknown[],
  removedBoardIds: string[],
  targetId: string,
  sourceId: string,
  now: string,
): ChalkboardMergeOutcome {
  const rows = boards.filter(isRecord).filter((b) => typeof b.id === 'string')
  const target = rows.find((b) => b.id === targetId)
  const source = rows.find((b) => b.id === sourceId)
  if (!target || !source) {
    return { boards: rows, removedBoardIds: [...removedBoardIds], moved: [], skipped: [] }
  }
  const targetItems = (Array.isArray(target.items) ? target.items : []).filter(isRecord)
  const sourceItems = (Array.isArray(source.items) ? source.items : []).filter(isRecord)
  const seen = new Set<string>()
  for (const item of targetItems) {
    if (typeof item.url === 'string' && item.url) seen.add(`url:${item.url}`)
    if (typeof item.title === 'string') seen.add(`title:${item.title}`)
  }
  const moved: { id: string; title: string }[] = []
  const skipped: { id: string; title: string }[] = []
  const movedItems: Record<string, unknown>[] = []
  for (const item of sourceItems) {
    const id = typeof item.id === 'string' ? item.id : ''
    const title = typeof item.title === 'string' ? item.title : ''
    const urlDup =
      typeof item.url === 'string' && item.url !== '' && seen.has(`url:${item.url}`)
    if (urlDup || seen.has(`title:${title}`)) {
      skipped.push({ id, title })
      continue
    }
    movedItems.push({ ...item, boardId: targetId })
    moved.push({ id, title })
    if (typeof item.url === 'string' && item.url) seen.add(`url:${item.url}`)
    seen.add(`title:${title}`)
  }
  const nextBoards = rows
    .filter((b) => b.id !== sourceId)
    .map((b) =>
      b.id === targetId ? { ...b, items: [...targetItems, ...movedItems], updatedAt: now } : b,
    )
  const nextRemoved = [...removedBoardIds]
  if (!nextRemoved.includes(sourceId)) nextRemoved.push(sourceId)
  return { boards: nextBoards, removedBoardIds: nextRemoved, moved, skipped }
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
