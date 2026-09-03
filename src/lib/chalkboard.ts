/**
 * Class chalkboards — one or more boards per class type.
 * Coaches pin references ahead of time; live class shows the active board.
 * Gym-wide via /api/chalkboards.
 */

import { createId } from './storage'
import { classTypeKey, getActiveMeeting, loadOfferings, type CoachClassOffering } from './coachClasses'

export type ChalkboardScope = 'type' | 'time'

export function typeOfferingId(nameOrKey: string): string {
  const key = nameOrKey.startsWith('type:') ? nameOrKey.slice(5) : classTypeKey(nameOrKey)
  return `type:${key}`
}

export function isTypeOfferingId(id: string | null | undefined): boolean {
  return Boolean(id?.startsWith('type:'))
}

export type ChalkboardItemKind =
  | 'clip'
  | 'loop'
  | 'still'
  | 'ig-still'
  | 'drill'
  | 'drill-list'
  | 'collage'

export type ChalkboardItem = {
  id: string
  offeringId: string
  boardId: string
  meetingId?: string
  lessonId?: string
  kind: ChalkboardItemKind
  title: string
  url?: string
  loopA?: number | null
  loopB?: number | null
  stillId?: string
  shapeId?: string
  photoSrc?: string
  drillId?: string
  drillIds?: string[]
  collageId?: string
  pinned: boolean
  createdById: string
  createdByName: string
  createdAt: string
}

export type ChalkboardBoard = {
  id: string
  offeringId: string
  name: string
  lessonId?: string
  /** Shared across every time of this class name, or only this hour. */
  scope?: ChalkboardScope
  classTypeKey?: string
  /** The board that shows while this class type is in session. */
  active: boolean
  createdById: string
  createdAt: string
  updatedAt: string
  items: ChalkboardItem[]
}

export type ChalkboardFile = {
  kind: 'shape-lab-chalkboards'
  version: 1
  exportedAt: string
  boards: ChalkboardBoard[]
}

export type ChalkboardDraft = {
  kind: ChalkboardItemKind
  title: string
  url?: string
  loopA?: number | null
  loopB?: number | null
  stillId?: string
  shapeId?: string
  photoSrc?: string
  drillId?: string
  drillIds?: string[]
  collageId?: string
}

const KEY = 'shape-lab.chalkboards.v1'
const listeners = new Set<() => void>()

function emptyFile(): ChalkboardFile {
  return {
    kind: 'shape-lab-chalkboards',
    version: 1,
    exportedAt: '',
    boards: [],
  }
}

function normalizeItem(raw: Partial<ChalkboardItem>): ChalkboardItem | null {
  if (!raw?.id || !raw.offeringId || !raw.boardId || !raw.kind || !raw.title) return null
  return {
    id: raw.id,
    offeringId: raw.offeringId,
    boardId: raw.boardId,
    meetingId: raw.meetingId,
    lessonId: raw.lessonId,
    kind: raw.kind,
    title: raw.title,
    url: raw.url,
    loopA: raw.loopA ?? null,
    loopB: raw.loopB ?? null,
    stillId: raw.stillId,
    shapeId: raw.shapeId,
    photoSrc: raw.photoSrc,
    drillId: raw.drillId,
    drillIds: Array.isArray(raw.drillIds) ? raw.drillIds.filter((id) => typeof id === 'string') : undefined,
    collageId: raw.collageId,
    pinned: Boolean(raw.pinned),
    createdById: raw.createdById || '',
    createdByName: raw.createdByName || '',
    createdAt: raw.createdAt || new Date().toISOString(),
  }
}

function normalizeBoard(raw: Partial<ChalkboardBoard>): ChalkboardBoard | null {
  if (!raw?.id || !raw.offeringId) return null
  const scope: ChalkboardScope =
    raw.scope === 'type' || raw.offeringId.startsWith('type:') ? 'type' : 'time'
  const key =
    typeof raw.classTypeKey === 'string' && raw.classTypeKey
      ? classTypeKey(raw.classTypeKey)
      : scope === 'type'
        ? classTypeKey(raw.offeringId.replace(/^type:/, ''))
        : undefined
  return {
    id: raw.id,
    offeringId: raw.offeringId,
    name: (raw.name || 'Chalkboard').trim() || 'Chalkboard',
    lessonId: raw.lessonId,
    scope,
    classTypeKey: key,
    active: Boolean(raw.active),
    createdById: raw.createdById || '',
    createdAt: raw.createdAt || new Date().toISOString(),
    updatedAt: raw.updatedAt || raw.createdAt || new Date().toISOString(),
    items: (raw.items ?? []).map(normalizeItem).filter((i): i is ChalkboardItem => !!i),
  }
}

function read(): ChalkboardFile {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return emptyFile()
    const data = JSON.parse(raw) as ChalkboardFile
    if (data?.kind !== 'shape-lab-chalkboards') return emptyFile()
    return {
      kind: 'shape-lab-chalkboards',
      version: 1,
      exportedAt: data.exportedAt ?? '',
      boards: (data.boards ?? []).map(normalizeBoard).filter((b): b is ChalkboardBoard => !!b),
    }
  } catch {
    return emptyFile()
  }
}

function write(file: ChalkboardFile, sync = true) {
  const next: ChalkboardFile = {
    ...file,
    kind: 'shape-lab-chalkboards',
    version: 1,
    exportedAt: new Date().toISOString(),
  }
  try {
    localStorage.setItem(KEY, JSON.stringify(next))
  } catch {
    /* quota */
  }
  for (const cb of listeners) cb()
  if (sync) void pushChalkboards()
}

export function subscribeChalkboards(cb: () => void): () => void {
  listeners.add(cb)
  return () => listeners.delete(cb)
}

export function loadChalkboardFile(): ChalkboardFile {
  return read()
}

export function boardsForOffering(offeringId: string | null | undefined): ChalkboardBoard[] {
  if (!offeringId || isTypeOfferingId(offeringId)) return []
  return read()
    .boards.filter((b) => b.offeringId === offeringId && b.scope !== 'type')
    .sort((a, b) => a.name.localeCompare(b.name))
}

export function boardsForClassType(name: string | null | undefined): ChalkboardBoard[] {
  if (!name?.trim()) return []
  const key = classTypeKey(name)
  const typeId = typeOfferingId(name)
  return read()
    .boards.filter(
      (b) => b.scope === 'type' && (b.classTypeKey === key || b.offeringId === typeId),
    )
    .sort((a, b) => a.name.localeCompare(b.name))
}

export function activeBoardForClassType(name: string | null | undefined): ChalkboardBoard | null {
  const list = boardsForClassType(name)
  return list.find((b) => b.active) ?? list[0] ?? null
}

export function getBoard(id: string | null | undefined): ChalkboardBoard | null {
  if (!id) return null
  return read().boards.find((b) => b.id === id) ?? null
}

export function activeBoardForOffering(offeringId: string | null | undefined): ChalkboardBoard | null {
  const list = boardsForOffering(offeringId)
  return list.find((b) => b.active) ?? list[0] ?? null
}

export function liveChalkboard(): ChalkboardBoard | null {
  const meeting = getActiveMeeting()
  if (!meeting) return null
  return activeBoardForOffering(meeting.offeringId)
}

export function createBoard(input: {
  offeringId: string
  name: string
  createdById: string
  lessonId?: string
  makeActive?: boolean
  scope?: ChalkboardScope
  classTypeKey?: string
}): ChalkboardBoard {
  const file = read()
  const scope: ChalkboardScope =
    input.scope ?? (isTypeOfferingId(input.offeringId) ? 'type' : 'time')
  const typeKey = input.classTypeKey || (scope === 'type' ? classTypeKey(input.offeringId.replace(/^type:/, '')) : undefined)
  const offeringId = scope === 'type' ? typeOfferingId(typeKey || input.offeringId) : input.offeringId
  const existing = scope === 'type' ? boardsForClassType(typeKey || offeringId) : boardsForOffering(offeringId)
  const board: ChalkboardBoard = {
    id: createId('chb'),
    offeringId,
    name: input.name.trim() || 'Chalkboard',
    lessonId: input.lessonId,
    scope,
    classTypeKey: typeKey,
    active: input.makeActive || existing.length === 0,
    createdById: input.createdById,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    items: [],
  }
  let boards = file.boards
  if (board.active) {
    boards = boards.map((b) => {
      const same =
        scope === 'type'
          ? b.scope === 'type' && (b.classTypeKey === typeKey || b.offeringId === offeringId)
          : b.offeringId === offeringId && b.scope !== 'type'
      return same ? { ...b, active: false, updatedAt: new Date().toISOString() } : b
    })
  }
  write({ ...file, boards: [board, ...boards] })
  return board
}

export function renameBoard(id: string, name: string): ChalkboardBoard | null {
  const file = read()
  const board = file.boards.find((b) => b.id === id)
  if (!board) return null
  const next = { ...board, name: name.trim() || board.name, updatedAt: new Date().toISOString() }
  write({ ...file, boards: file.boards.map((b) => (b.id === id ? next : b)) })
  return next
}

export function setActiveBoard(id: string): ChalkboardBoard | null {
  const file = read()
  const board = file.boards.find((b) => b.id === id)
  if (!board) return null
  const now = new Date().toISOString()
  write({
    ...file,
    boards: file.boards.map((b) => {
      const same =
        board.scope === 'type'
          ? b.scope === 'type' &&
            (b.classTypeKey === board.classTypeKey || b.offeringId === board.offeringId)
          : b.offeringId === board.offeringId && b.scope !== 'type'
      if (!same) return b
      return { ...b, active: b.id === id, updatedAt: now }
    }),
  })
  return { ...board, active: true, updatedAt: now }
}

export function removeBoard(id: string) {
  const file = read()
  const gone = file.boards.find((b) => b.id === id)
  let boards = file.boards.filter((b) => b.id !== id)
  if (gone?.active) {
    const sibling = boards.find((b) =>
      gone.scope === 'type'
        ? b.scope === 'type' && (b.classTypeKey === gone.classTypeKey || b.offeringId === gone.offeringId)
        : b.offeringId === gone.offeringId && b.scope !== 'type',
    )
    if (sibling) {
      boards = boards.map((b) => (b.id === sibling.id ? { ...b, active: true } : b))
    }
  }
  write({ ...file, boards })
}

export function ensureBoardForOffering(offeringId: string, createdById: string): ChalkboardBoard {
  if (isTypeOfferingId(offeringId)) {
    return ensureBoardForClassType(offeringId.replace(/^type:/, ''), createdById)
  }
  const existing = activeBoardForOffering(offeringId)
  if (existing) return existing
  const offering = loadOfferings().find((o) => o.id === offeringId)
  return createBoard({
    offeringId,
    name: offering ? `${offering.name} · ${offering.weekday} ${offering.time}` : 'This hour',
    createdById,
    scope: 'time',
    makeActive: true,
  })
}

export function ensureBoardForClassType(name: string, createdById: string): ChalkboardBoard {
  const existing = activeBoardForClassType(name)
  if (existing) return existing
  const label = name.replace(/^type:/, '').trim() || 'Class'
  return createBoard({
    offeringId: typeOfferingId(label),
    name: `All ${label} classes`,
    createdById,
    scope: 'type',
    classTypeKey: classTypeKey(label),
    makeActive: true,
  })
}

export function itemsForOfferingHour(
  offering: CoachClassOffering | null | undefined,
  live: boolean,
): { item: ChalkboardItem; source: ChalkboardScope }[] {
  if (!offering) return []
  const typeItems = itemsForDisplay(activeBoardForClassType(offering.name), live).map((item) => ({
    item,
    source: 'type' as const,
  }))
  const timeItems = itemsForDisplay(activeBoardForOffering(offering.id), live).map((item) => ({
    item,
    source: 'time' as const,
  }))
  return [...typeItems, ...timeItems]
}

export function postToChalkboard(input: {
  offeringId: string
  boardId?: string
  createdById: string
  createdByName: string
  pinned?: boolean
  meetingId?: string
  draft: ChalkboardDraft
}): ChalkboardItem | null {
  const board = input.boardId
    ? getBoard(input.boardId)
    : isTypeOfferingId(input.offeringId)
      ? ensureBoardForClassType(input.offeringId.replace(/^type:/, ''), input.createdById)
      : ensureBoardForOffering(input.offeringId, input.createdById)
  if (!board) return null
  const item: ChalkboardItem = {
    id: createId('chk'),
    offeringId: board.offeringId,
    boardId: board.id,
    meetingId: input.meetingId,
    kind: input.draft.kind,
    title: input.draft.title.trim() || kindLabel(input.draft.kind),
    url: input.draft.url,
    loopA: input.draft.loopA ?? null,
    loopB: input.draft.loopB ?? null,
    stillId: input.draft.stillId,
    shapeId: input.draft.shapeId,
    photoSrc: input.draft.photoSrc,
    drillId: input.draft.drillId,
    drillIds: input.draft.drillIds,
    collageId: input.draft.collageId,
    pinned: Boolean(input.pinned),
    createdById: input.createdById,
    createdByName: input.createdByName,
    createdAt: new Date().toISOString(),
  }
  const file = read()
  write({
    ...file,
    boards: file.boards.map((b) =>
      b.id === board.id
        ? { ...b, items: [item, ...b.items], updatedAt: new Date().toISOString() }
        : b,
    ),
  })
  return item
}

export function pinChalkboardItem(itemId: string, pinned: boolean): ChalkboardItem | null {
  const file = read()
  let found: ChalkboardItem | null = null
  write({
    ...file,
    boards: file.boards.map((b) => ({
      ...b,
      items: b.items.map((i) => {
        if (i.id !== itemId) return i
        found = { ...i, pinned }
        return found
      }),
      updatedAt: found && b.items.some((i) => i.id === itemId) ? new Date().toISOString() : b.updatedAt,
    })),
  })
  return found
}

export function eraseChalkboardItem(itemId: string) {
  const file = read()
  write({
    ...file,
    boards: file.boards.map((b) =>
      b.items.some((i) => i.id === itemId)
        ? { ...b, items: b.items.filter((i) => i.id !== itemId), updatedAt: new Date().toISOString() }
        : b,
    ),
  })
}

export function postToClassType(input: {
  className: string
  createdById: string
  createdByName: string
  pinned?: boolean
  draft: ChalkboardDraft
}): ChalkboardItem | null {
  const board = ensureBoardForClassType(input.className, input.createdById)
  return postToChalkboard({
    offeringId: board.offeringId,
    boardId: board.id,
    createdById: input.createdById,
    createdByName: input.createdByName,
    pinned: input.pinned,
    draft: input.draft,
  })
}

export function itemsForDisplay(board: ChalkboardBoard | null, live: boolean): ChalkboardItem[] {
  if (!board) return []
  return board.items.filter((i) => live || i.pinned)
}

export function kindLabel(kind: ChalkboardItemKind): string {
  switch (kind) {
    case 'loop':
      return 'Loop'
    case 'still':
      return 'Shape still'
    case 'ig-still':
      return 'IG still'
    case 'drill':
      return 'Drill'
    case 'drill-list':
      return 'Drill list'
    case 'collage':
      return 'Collage'
    default:
      return 'Clip'
  }
}

function mergeById<T extends { id: string }>(a: T[], b: T[], stamp: (row: T) => string): T[] {
  const map = new Map<string, T>()
  for (const row of [...a, ...b]) {
    if (!row?.id) continue
    const keep = map.get(row.id)
    if (!keep || stamp(row).localeCompare(stamp(keep)) >= 0) map.set(row.id, row)
  }
  return [...map.values()]
}

export async function publishChalkboards(): Promise<boolean> {
  const file = read()
  for (let attempt = 0; attempt < 4; attempt += 1) {
    try {
      const res = await fetch('/api/chalkboards', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(file),
      })
      if (res.ok) return true
    } catch {
      /* retry */
    }
    await new Promise((resolve) => setTimeout(resolve, 400 * (attempt + 1)))
  }
  return false
}

async function pushChalkboards() {
  await publishChalkboards()
}

export async function hydrateChalkboards(): Promise<void> {
  try {
    const res = await fetch('/api/chalkboards', { cache: 'no-store' })
    if (!res.ok) {
      if (read().boards.length > 0) await publishChalkboards()
      return
    }
    const data = (await res.json()) as ChalkboardFile
    if (data?.kind !== 'shape-lab-chalkboards') return
    const local = read()
    const remote = (data.boards ?? []).map(normalizeBoard).filter((b): b is ChalkboardBoard => !!b)
    const boards = mergeById(local.boards, remote, (b) => b.updatedAt || b.createdAt)
    write({ ...local, boards }, false)
    const next = read()
    if (
      next.boards.length !== remote.length ||
      next.boards.some((b) => {
        const other = remote.find((r) => r.id === b.id)
        return !other || b.items.length > other.items.length
      })
    ) {
      await publishChalkboards()
    }
  } catch {
    if (read().boards.length > 0) await publishChalkboards()
  }
}
