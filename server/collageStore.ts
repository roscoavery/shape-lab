/**
 * Named drill collages (up to 6 gym-library clips) with captions and A/B loops.
 */

import { readJson, writeJson } from './persist.ts'

const FILE = 'data/collages.json'
const MAX_SLOTS = 6
const MAX_COLLAGES = 80

export type DiskCollageSlot = {
  clipId: string
  url: string
  caption: string
  loopA: number | null
  loopB: number | null
}

export type DiskCollage = {
  id: string
  name: string
  createdAt: string
  updatedAt: string
  createdById: string
  /** Set on personal libraries. Missing = gym-wide board. */
  ownerId?: string
  /** Original collage id when this is a copy saved from the feed. */
  copiedFromId?: string
  slots: DiskCollageSlot[]
}

export type DiskCollageShare = {
  sourceId: string
  name: string
  createdById: string
  slots: DiskCollageSlot[]
}

export type DiskCollages = {
  kind: 'shape-lab-collages'
  version: 1
  exportedAt: string
  collages: DiskCollage[]
}

const EMPTY: DiskCollages = {
  kind: 'shape-lab-collages',
  version: 1,
  exportedAt: '',
  collages: [],
}

export function cleanSlot(raw: unknown): DiskCollageSlot | null {
  if (!raw || typeof raw !== 'object') return null
  const s = raw as DiskCollageSlot
  const url = typeof s.url === 'string' ? s.url.trim() : ''
  if (!url) return null
  const a = typeof s.loopA === 'number' && Number.isFinite(s.loopA) ? s.loopA : null
  const b = typeof s.loopB === 'number' && Number.isFinite(s.loopB) ? s.loopB : null
  return {
    clipId: typeof s.clipId === 'string' ? s.clipId : '',
    url,
    caption: typeof s.caption === 'string' ? s.caption.slice(0, 160) : '',
    loopA: a,
    loopB: b !== null && a !== null && b > a ? b : b,
  }
}

function cleanCollage(raw: unknown): DiskCollage | null {
  if (!raw || typeof raw !== 'object') return null
  const c = raw as DiskCollage
  if (typeof c.id !== 'string' || !c.id.trim()) return null
  const name = typeof c.name === 'string' ? c.name.trim() : ''
  if (!name) return null
  const slots = (Array.isArray(c.slots) ? c.slots : [])
    .map(cleanSlot)
    .filter((s): s is DiskCollageSlot => Boolean(s))
    .slice(0, MAX_SLOTS)
  if (slots.length === 0) return null
  const ownerId =
    typeof c.ownerId === 'string' && c.ownerId.trim() ? c.ownerId.trim().slice(0, 80) : undefined
  const copiedFromId =
    typeof c.copiedFromId === 'string' && c.copiedFromId.trim()
      ? c.copiedFromId.trim().slice(0, 80)
      : undefined
  return {
    id: c.id.trim(),
    name: name.slice(0, 80),
    createdAt: typeof c.createdAt === 'string' ? c.createdAt : new Date().toISOString(),
    updatedAt: typeof c.updatedAt === 'string' ? c.updatedAt : new Date().toISOString(),
    createdById: typeof c.createdById === 'string' ? c.createdById : '',
    ...(ownerId ? { ownerId } : {}),
    ...(copiedFromId ? { copiedFromId } : {}),
    slots,
  }
}

export function cleanCollageShare(raw: unknown): DiskCollageShare | null {
  if (!raw || typeof raw !== 'object') return null
  const s = raw as DiskCollageShare
  const name = typeof s.name === 'string' ? s.name.trim() : ''
  if (!name) return null
  const slots = (Array.isArray(s.slots) ? s.slots : [])
    .map(cleanSlot)
    .filter((slot): slot is DiskCollageSlot => Boolean(slot))
    .slice(0, MAX_SLOTS)
  if (slots.length === 0) return null
  const sourceId = typeof s.sourceId === 'string' ? s.sourceId.trim().slice(0, 80) : ''
  return {
    sourceId,
    name: name.slice(0, 80),
    createdById: typeof s.createdById === 'string' ? s.createdById.trim().slice(0, 80) : '',
    slots,
  }
}

export async function collagesForOwner(ownerId?: string | null): Promise<DiskCollage[]> {
  const all = (await readCollagesFile()).collages
  if (!ownerId) return all.filter((c) => !c.ownerId)
  return all.filter((c) => !c.ownerId || c.ownerId === ownerId)
}

export async function readCollagesFile(): Promise<DiskCollages> {
  const data = await readJson<DiskCollages>(FILE, { ...EMPTY })
  if (!data || data.kind !== 'shape-lab-collages' || !Array.isArray(data.collages)) {
    return { ...EMPTY }
  }
  return {
    ...EMPTY,
    ...data,
    collages: data.collages.map(cleanCollage).filter((c): c is DiskCollage => Boolean(c)),
  }
}

export async function writeCollagesFile(data: unknown): Promise<DiskCollages> {
  const parsed = data as DiskCollages
  if (!parsed || parsed.kind !== 'shape-lab-collages' || !Array.isArray(parsed.collages)) {
    throw new Error('Invalid collages payload')
  }
  const collages = parsed.collages
    .map(cleanCollage)
    .filter((c): c is DiskCollage => Boolean(c))
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .slice(0, MAX_COLLAGES)
  const next: DiskCollages = {
    kind: 'shape-lab-collages',
    version: 1,
    exportedAt: new Date().toISOString(),
    collages,
  }
  await writeJson(FILE, next)
  return next
}

export async function upsertCollage(raw: unknown): Promise<DiskCollage> {
  const collage = cleanCollage(raw)
  if (!collage) throw new Error('Invalid collage')
  const current = await readCollagesFile()
  const rest = current.collages.filter((c) => c.id !== collage.id)
  const next = await writeCollagesFile({
    kind: 'shape-lab-collages',
    version: 1,
    exportedAt: '',
    collages: [{ ...collage, updatedAt: new Date().toISOString() }, ...rest],
  })
  const saved = next.collages.find((c) => c.id === collage.id)
  if (!saved) throw new Error('Could not save collage')
  return saved
}

export async function deleteCollage(id: string): Promise<boolean> {
  const current = await readCollagesFile()
  const next = current.collages.filter((c) => c.id !== id)
  if (next.length === current.collages.length) return false
  await writeCollagesFile({ ...current, collages: next })
  return true
}
