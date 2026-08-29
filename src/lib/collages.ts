import { createId } from './storage'

export type CollageSlot = {
  clipId: string
  url: string
  caption: string
  loopA: number | null
  loopB: number | null
}

export type Collage = {
  id: string
  name: string
  createdAt: string
  updatedAt: string
  createdById: string
  /** Personal library owner. Missing on gym-wide boards. */
  ownerId?: string
  copiedFromId?: string
  slots: CollageSlot[]
}

export type CollageShare = {
  sourceId: string
  name: string
  createdById: string
  slots: CollageSlot[]
}

type CollagesFile = {
  kind: 'shape-lab-collages'
  version: 1
  exportedAt: string
  collages: Collage[]
}

export const MAX_COLLAGE_SLOTS = 6

export async function listCollages(ownerId?: string | null): Promise<Collage[]> {
  try {
    const qs = ownerId ? `?ownerId=${encodeURIComponent(ownerId)}` : ''
    const res = await fetch(`/api/collages${qs}`)
    if (!res.ok) return []
    const data = (await res.json()) as CollagesFile
    return Array.isArray(data.collages) ? data.collages : []
  } catch {
    return []
  }
}

export async function saveCollage(collage: Collage): Promise<Collage | null> {
  try {
    const res = await fetch('/api/collages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(collage),
    })
    if (!res.ok) return null
    return (await res.json()) as Collage
  } catch {
    return null
  }
}

export async function removeCollage(id: string): Promise<boolean> {
  try {
    const res = await fetch(`/api/collages?id=${encodeURIComponent(id)}`, { method: 'DELETE' })
    return res.ok
  } catch {
    return false
  }
}

export function newCollage(createdById: string, name = 'New drill collage'): Collage {
  return {
    id: createId('colg'),
    name,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    createdById,
    ownerId: createdById,
    slots: [],
  }
}

export function unusedCopyName(base: string, existing: string[]): string {
  const root = base.trim() || 'Collage'
  const taken = new Set(existing.map((n) => n.trim().toLowerCase()))
  let name = `${root} copy`
  let n = 2
  while (taken.has(name.toLowerCase())) {
    name = `${root} copy ${n}`
    n += 1
  }
  return name
}

/** Personal copy with a new id. Captions and A/B loops come along. */
export function duplicateCollage(
  collage: Collage,
  ownerId: string,
  existingNames: string[],
): Collage {
  const now = new Date().toISOString()
  return {
    id: createId('colg'),
    name: unusedCopyName(collage.name, existingNames),
    createdAt: now,
    updatedAt: now,
    createdById: ownerId,
    ownerId,
    copiedFromId: collage.id,
    slots: collage.slots.map((s) => ({ ...s })),
  }
}

export function collageToShare(collage: Collage): CollageShare {
  return {
    sourceId: collage.id,
    name: collage.name,
    createdById: collage.createdById,
    slots: collage.slots.map((s) => ({ ...s })),
  }
}

export function collageFromShare(share: CollageShare, ownerId: string): Collage {
  return {
    id: createId('colg'),
    name: share.name,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    createdById: share.createdById || ownerId,
    ownerId,
    copiedFromId: share.sourceId || undefined,
    slots: share.slots.map((s) => ({ ...s })),
  }
}

export function isGymCollage(collage: Collage): boolean {
  return !collage.ownerId
}

export function libraryHasShare(collages: Collage[], share: CollageShare, ownerId: string): boolean {
  return collages.some(
    (c) =>
      c.ownerId === ownerId &&
      (c.id === share.sourceId || (share.sourceId && c.copiedFromId === share.sourceId)),
  )
}

export function evenGrid(count: number, landscape: boolean): { cols: number; rows: number } {
  const n = Math.max(1, Math.min(MAX_COLLAGE_SLOTS, count))
  if (n === 1) return { cols: 1, rows: 1 }
  if (n === 2) return landscape ? { cols: 2, rows: 1 } : { cols: 1, rows: 2 }
  if (n === 3) return landscape ? { cols: 3, rows: 1 } : { cols: 1, rows: 3 }
  if (n === 4) return { cols: 2, rows: 2 }
  if (n === 5) return landscape ? { cols: 3, rows: 2 } : { cols: 2, rows: 3 }
  return landscape ? { cols: 3, rows: 2 } : { cols: 2, rows: 3 }
}
