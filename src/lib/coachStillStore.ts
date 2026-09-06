/**
 * Extra coach stills + which picture is the main one for each shape.
 * Gym-wide so iPad and phone show the same library.
 */

import { loadMainCoachStills, setMainCoachStill } from './coachStillPrefs'
import type { ReferencePhoto } from '../types'

export type CoachStillExtra = {
  id: string
  shapeId: string
  dataUrl: string
  label?: string
  createdAt: string
}

export type CoachStillsFile = {
  kind: 'shape-lab-coach-stills'
  version: 1
  updatedAt: string
  main: Record<string, string>
  extras: CoachStillExtra[]
}

const EMPTY: CoachStillsFile = {
  kind: 'shape-lab-coach-stills',
  version: 1,
  updatedAt: '',
  main: {},
  extras: [],
}

function extrasAsPhotos(extras: CoachStillExtra[]): ReferencePhoto[] {
  return extras
    .filter((row) => row.id && row.shapeId && row.dataUrl.startsWith('data:image'))
    .map((row) => ({
      id: row.id,
      shapeId: row.shapeId,
      athleteId: null,
      dataUrl: row.dataUrl,
      label: row.label,
      createdAt: row.createdAt,
      library: 'coach' as const,
      persistedToApp: true,
    }))
}

export async function pullCoachStills(): Promise<CoachStillsFile> {
  try {
    const res = await fetch('/api/coach-stills')
    if (!res.ok) return { ...EMPTY }
    const data = (await res.json()) as CoachStillsFile
    if (!data || data.kind !== 'shape-lab-coach-stills') return { ...EMPTY }
    return {
      ...EMPTY,
      ...data,
      main: data.main && typeof data.main === 'object' ? data.main : {},
      extras: Array.isArray(data.extras) ? data.extras : [],
    }
  } catch {
    return { ...EMPTY }
  }
}

export async function pushCoachStills(file: CoachStillsFile): Promise<CoachStillsFile | null> {
  try {
    const res = await fetch('/api/coach-stills', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(file),
    })
    if (!res.ok) return null
    return (await res.json()) as CoachStillsFile
  } catch {
    return null
  }
}

export function mergeCoachExtras(
  photos: ReferencePhoto[],
  extras: CoachStillExtra[],
): ReferencePhoto[] {
  const incoming = extrasAsPhotos(extras)
  if (incoming.length === 0) return photos
  const ids = new Set(incoming.map((p) => p.id))
  return [...incoming, ...photos.filter((p) => !ids.has(p.id))]
}

export async function hydrateCoachStills(
  photos: ReferencePhoto[],
): Promise<ReferencePhoto[]> {
  const file = await pullCoachStills()
  for (const [shapeId, stillId] of Object.entries(file.main)) {
    if (shapeId && stillId) setMainCoachStill(shapeId, stillId)
  }
  return mergeCoachExtras(photos, file.extras)
}

export async function persistCoachStillExtra(photo: ReferencePhoto): Promise<void> {
  if (photo.library === 'ig' || !photo.dataUrl.startsWith('data:image')) return
  const file = await pullCoachStills()
  const extra: CoachStillExtra = {
    id: photo.id,
    shapeId: photo.shapeId,
    dataUrl: photo.dataUrl,
    label: photo.label,
    createdAt: photo.createdAt,
  }
  const extras = [extra, ...file.extras.filter((row) => row.id !== photo.id)].slice(0, 80)
  await pushCoachStills({
    kind: 'shape-lab-coach-stills',
    version: 1,
    updatedAt: new Date().toISOString(),
    main: { ...loadMainCoachStills(), ...file.main },
    extras,
  })
}

export async function persistMainCoachStill(shapeId: string, stillId: string): Promise<void> {
  const next = setMainCoachStill(shapeId, stillId)
  const file = await pullCoachStills()
  await pushCoachStills({
    kind: 'shape-lab-coach-stills',
    version: 1,
    updatedAt: new Date().toISOString(),
    main: { ...file.main, ...next },
    extras: file.extras,
  })
}
