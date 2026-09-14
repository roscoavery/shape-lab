/**
 * Extra coach stills + which picture is the main one for each shape.
 * Gym-wide so iPad and phone show the same library.
 */

import { setMainCoachStill } from './coachStillPrefs'
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
  removedCoachStillIds?: string[]
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
  removedCoachStillIds: [],
}

const REMOVED_KEY = 'shape-lab.removedCoachStills.v1'

function loadRemovedCoachStillIds(): string[] {
  try {
    const raw = localStorage.getItem(REMOVED_KEY)
    if (!raw) return []
    const data = JSON.parse(raw) as unknown
    if (!Array.isArray(data)) return []
    return data.filter((id): id is string => typeof id === 'string' && id.length > 0)
  } catch {
    return []
  }
}

function saveRemovedCoachStillIds(ids: string[]) {
  try {
    localStorage.setItem(REMOVED_KEY, JSON.stringify([...new Set(ids)].slice(-2000)))
  } catch {
    /* quota */
  }
}

function noteRemovedCoachStill(id: string) {
  if (!id) return
  saveRemovedCoachStillIds([...loadRemovedCoachStillIds(), id])
}

function forgetRemovedCoachStill(id: string) {
  if (!id) return
  saveRemovedCoachStillIds(loadRemovedCoachStillIds().filter((row) => row !== id))
}

function asIdList(raw: unknown): string[] {
  if (!Array.isArray(raw)) return []
  return [...new Set(raw.filter((id): id is string => typeof id === 'string' && Boolean(id)))]
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

function keepPixelUrl(local: string | undefined, remote: string | undefined): string {
  if (local?.startsWith('data:image')) return local
  if (remote && remote.length > 0) return remote
  return local ?? ''
}

function rememberCoachExtrasLocally(extras: CoachStillExtra[]) {
  const gone = new Set(loadRemovedCoachStillIds())
  const all = loadReferencePhotos()
  const localById = new Map(all.map((p) => [p.id, p]))
  const incoming = extrasAsPhotos(extras)
    .filter((p) => !gone.has(p.id))
    .map((p) => ({
      ...p,
      dataUrl: keepPixelUrl(localById.get(p.id)?.dataUrl, p.dataUrl),
    }))
  try {
    const ids = new Set(incoming.map((p) => p.id))
    saveReferencePhotos(
      capReferencePhotos([
        ...incoming,
        ...all.filter((p) => !ids.has(p.id) && !gone.has(p.id)),
      ]),
    )
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
    const removed = [
      ...new Set([...loadRemovedCoachStillIds(), ...asIdList(data.removedCoachStillIds)]),
    ]
    saveRemovedCoachStillIds(removed)
    const gone = new Set(removed)
    return {
      ...EMPTY,
      ...data,
      main: data.main && typeof data.main === 'object' ? data.main : {},
      extras: (Array.isArray(data.extras) ? data.extras : [])
        .filter((row) => row?.id && !gone.has(row.id))
        .slice(0, MAX_EXTRAS),
      removedCoachStillIds: removed,
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
  const gone = new Set(loadRemovedCoachStillIds())
  const localById = new Map(photos.map((p) => [p.id, p]))
  const incoming = extrasAsPhotos(extras)
    .filter((p) => !gone.has(p.id))
    .map((p) => ({
      ...p,
      dataUrl: keepPixelUrl(localById.get(p.id)?.dataUrl, p.dataUrl),
    }))
  const ids = new Set(incoming.map((p) => p.id))
  return [
    ...incoming,
    ...photos.filter((p) => !(p.library === 'coach' && gone.has(p.id)) && !ids.has(p.id)),
  ]
}

export async function flushLocalCoachStills(): Promise<{ sent: number; failed: number }> {
  const local = loadReferencePhotos().filter(
    (p) =>
      p.library === 'coach' &&
      typeof p.dataUrl === 'string' &&
      p.dataUrl.startsWith('data:image'),
  )
  let sent = 0
  let failed = 0
  for (const photo of local) {
    const result = await persistCoachStillExtra(photo)
    if (result.ok) sent += 1
    else failed += 1
  }
  return { sent, failed }
}

export async function hydrateCoachStills(
  photos: ReferencePhoto[],
): Promise<ReferencePhoto[]> {
  const file = await pullCoachStills()
  for (const [shapeId, stillId] of Object.entries(file.main)) {
    if (shapeId && stillId) setMainCoachStill(shapeId, stillId)
  }
  rememberCoachExtrasLocally(file.extras)
  const remoteIds = new Set(file.extras.map((row) => row.id))
  const merged = mergeCoachExtras(photos, file.extras)
  emitCoachStills(file.extras)
  const unsaved = merged.filter(
    (p) =>
      p.library === 'coach' &&
      typeof p.dataUrl === 'string' &&
      p.dataUrl.startsWith('data:image') &&
      !remoteIds.has(p.id),
  )
  for (const photo of unsaved) {
    await persistCoachStillExtra(photo)
  }
  return mergeCoachExtras(merged, file.extras)
}

export async function persistCoachStillExtra(photo: ReferencePhoto): Promise<PersistStillResult> {
  if (photo.library === 'ig') return { ok: true, photo }
  forgetRemovedCoachStill(photo.id)
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
      photo: {
        ...photo,
        ...(row ?? {}),
        dataUrl: keepPixelUrl(photo.dataUrl, row?.dataUrl),
        persistedToApp: true,
      },
    }
  } catch {
    return {
      ok: false,
      error: 'Could not reach the gym file. Leave gym:mac running, then try again.',
    }
  }
}

export async function removeCoachStillExtra(id: string): Promise<PersistStillResult> {
  noteRemovedCoachStill(id)
  try {
    saveReferencePhotos(loadReferencePhotos().filter((p) => p.id !== id))
  } catch {
    /* quota */
  }
  emitCoachStills([])
  try {
    const res = await fetch(`/api/coach-stills?id=${encodeURIComponent(id)}`, { method: 'DELETE' })
    if (!res.ok) {
      return { ok: false, error: 'Could not delete that still from the gym.' }
    }
    const saved = (await res.json()) as CoachStillsFile
    try {
      saveReferencePhotos(loadReferencePhotos().filter((p) => p.id !== id))
    } catch {
      /* quota */
    }
    rememberCoachExtrasLocally(saved.extras)
    emitCoachStills(saved.extras)
    return { ok: true }
  } catch {
    return { ok: false, error: 'Could not reach the gym file to delete that still.' }
  }
}

export async function persistMainCoachStill(shapeId: string, stillId: string): Promise<void> {
  const next = setMainCoachStill(shapeId, stillId)
  const file = await pullCoachStills()
  if (!file.updatedAt && file.extras.length === 0) {
    return
  }
  await pushCoachStills({
    kind: 'shape-lab-coach-stills',
    version: 1,
    updatedAt: new Date().toISOString(),
    main: { ...file.main, ...next },
    extras: file.extras,
    removedCoachStillIds: file.removedCoachStillIds,
  })
}
