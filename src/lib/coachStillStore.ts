/**
 * Extra coach stills + which picture is the main one for each shape.
 * Gym-wide so iPad and phone show the same library.
 */

import { loadMainCoachStills, setMainCoachStill } from './coachStillPrefs'
import { capReferencePhotos, loadReferencePhotos, saveReferencePhotos } from './storage'
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

export type PersistStillResult = {
  ok: boolean
  error?: string
  photo?: ReferencePhoto
}

const MAX_EXTRAS = 2000

const EMPTY: CoachStillsFile = {
  kind: 'shape-lab-coach-stills',
  version: 1,
  updatedAt: '',
  main: {},
  extras: [],
}

const listeners = new Set<(extras: CoachStillExtra[]) => void>()

export function subscribeCoachStills(fn: (extras: CoachStillExtra[]) => void): () => void {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

function emitCoachStills(extras: CoachStillExtra[]) {
  for (const fn of listeners) fn(extras)
}

function extrasAsPhotos(extras: CoachStillExtra[]): ReferencePhoto[] {
  return extras
    .filter((row) => row.id && row.shapeId && typeof row.dataUrl === 'string' && row.dataUrl)
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

function rememberCoachExtrasLocally(extras: CoachStillExtra[]) {
  const incoming = extrasAsPhotos(extras)
  if (incoming.length === 0) return
  try {
    const all = loadReferencePhotos()
    const ids = new Set(incoming.map((p) => p.id))
    saveReferencePhotos(capReferencePhotos([...incoming, ...all.filter((p) => !ids.has(p.id))]))
  } catch {
    /* quota — in-memory merge still works this session */
  }
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
      extras: Array.isArray(data.extras) ? data.extras.slice(0, MAX_EXTRAS) : [],
    }
  } catch {
    return { ...EMPTY }
  }
}

export async function pushCoachStills(file: CoachStillsFile): Promise<CoachStillsFile | null> {
  try {
    const slim: CoachStillsFile = {
      ...file,
      extras: file.extras.map((row) => ({
        ...row,
        dataUrl: row.dataUrl.startsWith('data:image') ? '' : row.dataUrl,
      })),
    }
    const res = await fetch('/api/coach-stills', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(slim),
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
  rememberCoachExtrasLocally(file.extras)
  emitCoachStills(file.extras)
  return mergeCoachExtras(photos, file.extras)
}

export async function persistCoachStillExtra(photo: ReferencePhoto): Promise<PersistStillResult> {
  if (photo.library === 'ig') return { ok: true, photo }
  try {
    const res = await fetch('/api/coach-stills', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: photo.id,
        shapeId: photo.shapeId,
        dataUrl: photo.dataUrl,
        label: photo.label,
        createdAt: photo.createdAt,
      }),
    })
    if (!res.ok) {
      let detail = ''
      try {
        const body = (await res.json()) as { error?: string }
        detail = body.error ?? ''
      } catch {
        /* ignore */
      }
      return {
        ok: false,
        error:
          detail ||
          'This device kept the still, but the gym file did not. Leave gym:mac running, then try again.',
      }
    }
    const saved = (await res.json()) as CoachStillsFile
    rememberCoachExtrasLocally(saved.extras)
    emitCoachStills(saved.extras)
    const row = saved.extras.find((extra) => extra.id === photo.id)
    return {
      ok: true,
      photo: row
        ? {
            ...photo,
            dataUrl: row.dataUrl,
            persistedToApp: true,
          }
        : { ...photo, persistedToApp: true },
    }
  } catch {
    return {
      ok: false,
      error: 'Could not reach the gym file. Leave gym:mac running, then try again.',
    }
  }
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
