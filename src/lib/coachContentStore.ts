/**
 * Coach-authored shapes and stretch / warm-up guides.
 * Gym-wide via /api/coach-content, cached locally.
 */

import { SHAPES_BY_ID } from '../config/shapes'
import { SHIPPED_DRILLS } from '../config/drills'
import { setGymShapeCache } from './gymShapeCache'
import type {
  CoachShape,
  CoachSkillRef,
  DrillClip,
  GymLibraryShape,
  ShapeDef,
  WarmupGuide,
  WarmupStar,
} from '../types'
import { createId } from './storage'
import { dispatchLibraryChanged } from './libraryEvents'

const KEY = 'shape-lab.coachContent.v1'

export type CoachContentFile = {
  kind: 'shape-lab-coach-content'
  version: 1
  exportedAt: string
  shapes: CoachShape[]
  references: CoachSkillRef[]
  warmups: WarmupGuide[]
  stars: WarmupStar[]
  gymLibrary?: GymLibraryShape[]
  drills?: DrillClip[]
  /** Stretch / warm-up ids dropped on any device — do not resurrect on merge. */
  removedWarmupIds?: string[]
}

const listeners = new Set<() => void>()
let memoryFile: CoachContentFile | null = null

function emit() {
  for (const cb of listeners) cb()
}

function asIdList(raw: unknown): string[] {
  if (!Array.isArray(raw)) return []
  return [...new Set(raw.filter((id): id is string => typeof id === 'string' && Boolean(id)))]
}

function applyRemovedWarmups(file: CoachContentFile): CoachContentFile {
  const removedWarmupIds = asIdList(file.removedWarmupIds)
  const removed = new Set(removedWarmupIds)
  return {
    ...file,
    warmups: file.warmups.filter((w) => w?.id && !removed.has(w.id)),
    stars: file.stars.filter((s) => s?.warmupId && !removed.has(s.warmupId)),
    removedWarmupIds,
  }
}

export function subscribeCoachContent(cb: () => void): () => void {
  listeners.add(cb)
  return () => listeners.delete(cb)
}

function parseFile(raw: string | null): CoachContentFile {
  if (!raw) return emptyFile()
  try {
    const data = JSON.parse(raw) as CoachContentFile
    if (data?.kind !== 'shape-lab-coach-content') return emptyFile()
    return applyRemovedWarmups({
      kind: 'shape-lab-coach-content',
      version: 1,
      exportedAt: data.exportedAt ?? '',
      shapes: Array.isArray(data.shapes) ? data.shapes : [],
      references: Array.isArray(data.references) ? data.references : [],
      warmups: Array.isArray(data.warmups) ? data.warmups : [],
      stars: Array.isArray(data.stars) ? data.stars : [],
      gymLibrary: cleanGymLibrary(Array.isArray(data.gymLibrary) ? data.gymLibrary : []),
      drills: Array.isArray(data.drills) ? data.drills : [],
      removedWarmupIds: asIdList(data.removedWarmupIds),
    })
  } catch {
    return emptyFile()
  }
}

function readStored(): CoachContentFile {
  try {
    return parseFile(localStorage.getItem(KEY))
  } catch {
    return emptyFile()
  }
}

function readFile(): CoachContentFile {
  const stored = readStored()
  if (memoryFile && memoryFile.warmups.length >= stored.warmups.length) {
    const parsed = applyRemovedWarmups({
      ...memoryFile,
      removedWarmupIds: [
        ...new Set([...(stored.removedWarmupIds ?? []), ...(memoryFile.removedWarmupIds ?? [])]),
      ],
    })
    syncGymCache(parsed)
    return parsed
  }
  if (memoryFile && (memoryFile.warmups.length > 0 || (memoryFile.removedWarmupIds ?? []).length > 0)) {
    const parsed = applyRemovedWarmups({
      kind: 'shape-lab-coach-content',
      version: 1,
      exportedAt: memoryFile.exportedAt || stored.exportedAt,
      shapes: mergeById(stored.shapes, memoryFile.shapes),
      references: mergeById(stored.references ?? [], memoryFile.references ?? []),
      warmups: mergeById(stored.warmups, memoryFile.warmups),
      gymLibrary: cleanGymLibrary(mergeById(stored.gymLibrary ?? [], memoryFile.gymLibrary ?? [])),
      drills: mergeById(stored.drills ?? [], memoryFile.drills ?? []),
      stars: [...stored.stars, ...memoryFile.stars].filter(
        (s, i, all) =>
          s.athleteId &&
          s.warmupId &&
          all.findIndex((x) => x.athleteId === s.athleteId && x.warmupId === s.warmupId) === i,
      ),
      removedWarmupIds: [
        ...new Set([...(stored.removedWarmupIds ?? []), ...(memoryFile.removedWarmupIds ?? [])]),
      ],
    })
    syncGymCache(parsed)
    return parsed
  }
  syncGymCache(stored)
  return stored
}

function emptyFile(): CoachContentFile {
  return {
    kind: 'shape-lab-coach-content',
    version: 1,
    exportedAt: '',
    shapes: [],
    references: [],
    warmups: [],
    stars: [],
    gymLibrary: [],
    drills: [],
    removedWarmupIds: [],
  }
}

function cleanGymLibrary(rows: GymLibraryShape[]): GymLibraryShape[] {
  return rows.filter(
    (s) =>
      s?.id &&
      s.id !== 'gym_gym_candlestick_rock' &&
      !/candlestick\s*rock/i.test(s.name ?? ''),
  )
}

function gymRowToDef(row: GymLibraryShape): ShapeDef {
  const like = row.scoreShapeId ? SHAPES_BY_ID[row.scoreShapeId] : undefined
  return {
    id: row.id,
    name: row.name,
    description: row.description || row.bodyPosition,
    bodyPosition: row.bodyPosition,
    category: row.category ?? 'hold',
    qualityThreshold: like?.qualityThreshold ?? 65,
    cameraView: row.cameraView ?? like?.cameraView ?? 'any',
    criteria: like?.criteria ?? [],
    tips: like?.tips,
    coachNotes: row.description,
  }
}

function syncGymCache(file: CoachContentFile) {
  setGymShapeCache((file.gymLibrary ?? []).map(gymRowToDef))
}

function persist(next: CoachContentFile, sync = true) {
  const file = applyRemovedWarmups({
    ...next,
    kind: 'shape-lab-coach-content',
    version: 1,
    exportedAt: new Date().toISOString(),
    shapes: next.shapes.slice(0, 200),
    references: (next.references ?? []).slice(0, 240),
    warmups: next.warmups.slice(0, 120),
    stars: next.stars.slice(0, 400),
    gymLibrary: cleanGymLibrary(next.gymLibrary ?? []).slice(0, 200),
    drills: (next.drills ?? []).slice(0, 200),
    removedWarmupIds: asIdList(next.removedWarmupIds),
  })
  memoryFile = file
  try {
    localStorage.setItem(KEY, JSON.stringify(file))
  } catch {
    /* quota — keep the in-memory copy so this device still has the edit */
  }
  syncGymCache(file)
  emit()
  if (sync) void pushContent()
}

/** PUT the current stretch / coach-content file to the gym link. */
export async function publishCoachContent(): Promise<boolean> {
  const file = readFile()
  for (let attempt = 0; attempt < 4; attempt += 1) {
    try {
      const res = await fetch('/api/coach-content', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(file),
      })
      if (res.ok) return true
    } catch {
      /* retry */
    }
    await new Promise((resolve) => window.setTimeout(resolve, 400 * (attempt + 1)))
  }
  return false
}

async function pushContent() {
  await publishCoachContent()
}

function mergeById<T extends { id: string; updatedAt?: string; createdAt?: string }>(
  a: T[],
  b: T[],
): T[] {
  const map = new Map<string, T>()
  for (const row of [...a, ...b]) {
    if (!row?.id) continue
    const keep = map.get(row.id)
    const stamp = (r: T) => r.updatedAt ?? r.createdAt ?? ''
    if (!keep || stamp(row).localeCompare(stamp(keep)) >= 0) map.set(row.id, row)
  }
  return [...map.values()]
}

export async function hydrateCoachContent(): Promise<void> {
  const local = readFile()
  try {
    const res = await fetch('/api/coach-content', { cache: 'no-store' })
    if (!res.ok) {
      if (local.warmups.length > 0 || (local.removedWarmupIds ?? []).length > 0) {
        await pushContent()
      }
      return
    }
    const data = (await res.json()) as CoachContentFile
    if (data?.kind !== 'shape-lab-coach-content') {
      if (local.warmups.length > 0 || (local.removedWarmupIds ?? []).length > 0) {
        await pushContent()
      }
      return
    }
    const removedWarmupIds = [
      ...new Set([...asIdList(local.removedWarmupIds), ...asIdList(data.removedWarmupIds)]),
    ]
    persist(
      {
        kind: 'shape-lab-coach-content',
        version: 1,
        exportedAt: new Date().toISOString(),
        shapes: mergeById(local.shapes, data.shapes ?? []),
        references: mergeById(local.references ?? [], data.references ?? []),
        warmups: mergeById(local.warmups, data.warmups ?? []),
        gymLibrary: cleanGymLibrary(mergeById(local.gymLibrary ?? [], data.gymLibrary ?? [])),
        drills: mergeById(local.drills ?? [], data.drills ?? []),
        stars: [...local.stars, ...(data.stars ?? [])].filter(
          (s, i, all) =>
            s.athleteId &&
            s.warmupId &&
            all.findIndex((x) => x.athleteId === s.athleteId && x.warmupId === s.warmupId) === i,
        ),
        removedWarmupIds,
      },
      false,
    )
    const next = readFile()
    const remoteWarmups = Array.isArray(data.warmups) ? data.warmups : []
    const remoteRemoved = asIdList(data.removedWarmupIds)
    const remoteById = new Map(
      remoteWarmups
        .filter((w): w is WarmupGuide => Boolean(w && typeof w === 'object' && w.id))
        .map((w) => [w.id, w]),
    )
    const needPush =
      next.warmups.some((w) => {
        const remote = remoteById.get(w.id)
        if (!remote) return true
        return (w.updatedAt || '') > (remote.updatedAt || '')
      }) ||
      next.warmups.length !== remoteWarmups.filter((w) => w?.id && !removedWarmupIds.includes(w.id)).length ||
      (next.removedWarmupIds ?? []).some((id) => !remoteRemoved.includes(id))
    if (needPush) await pushContent()
  } catch {
    if (local.warmups.length > 0 || (local.removedWarmupIds ?? []).length > 0) {
      await pushContent()
    }
  }
}

export function listCoachShapes(): CoachShape[] {
  return readFile()
    .shapes.slice()
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
}

export function shapesForCoach(coachId: string): CoachShape[] {
  return listCoachShapes().filter((s) => s.coachId === coachId)
}

export function getCoachShape(id: string | undefined): CoachShape | undefined {
  if (!id) return undefined
  return listCoachShapes().find((s) => s.id === id)
}

export function saveCoachShape(shape: CoachShape): CoachShape {
  const next = { ...shape, updatedAt: new Date().toISOString() }
  const file = readFile()
  persist({
    ...file,
    shapes: [next, ...file.shapes.filter((s) => s.id !== next.id)],
  })
  return next
}

export function deleteCoachShape(id: string) {
  const file = readFile()
  persist({ ...file, shapes: file.shapes.filter((s) => s.id !== id) })
}

export function listGymLibraryShapes(): GymLibraryShape[] {
  return (readFile().gymLibrary ?? [])
    .slice()
    .sort((a, b) => a.name.localeCompare(b.name))
}

export function saveGymLibraryShape(row: GymLibraryShape): GymLibraryShape {
  const next = { ...row, updatedAt: new Date().toISOString() }
  const file = readFile()
  persist({
    ...file,
    gymLibrary: [next, ...(file.gymLibrary ?? []).filter((s) => s.id !== next.id)],
  })
  return next
}

export function listDrills(): DrillClip[] {
  const stored = readFile().drills ?? []
  const byId = new Map<string, DrillClip>()
  for (const row of stored) {
    if (row?.id) byId.set(row.id, row)
  }
  for (const ship of SHIPPED_DRILLS) {
    const over = byId.get(ship.id)
    byId.set(
      ship.id,
      over
        ? {
            ...ship,
            ...over,
            title: over.title.trim() || ship.title,
            notes: over.notes.trim() || ship.notes,
            shapeId: over.shapeId || ship.shapeId,
            src: over.src || ship.src,
          }
        : ship,
    )
  }
  return [...byId.values()].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
}

/** Drills linked to a shape — these show on that shape in Learn, not as extra shape cards. */
export function listPublicDrills(): DrillClip[] {
  return listDrills().filter((d) => Boolean(d.shapeId))
}

export function drillsForShape(shapeId: string): DrillClip[] {
  if (!shapeId) return []
  return listDrills().filter((d) => d.shapeId === shapeId)
}

export function getDrill(id: string | undefined): DrillClip | undefined {
  if (!id) return undefined
  return listDrills().find((d) => d.id === id)
}

export function saveDrill(row: DrillClip): DrillClip {
  const next = { ...row, updatedAt: new Date().toISOString() }
  const file = readFile()
  persist({
    ...file,
    drills: [next, ...(file.drills ?? []).filter((d) => d.id !== next.id)],
  })
  return next
}

export function deleteDrill(id: string) {
  const file = readFile()
  persist({
    ...file,
    drills: (file.drills ?? []).filter((d) => d.id !== id),
  })
}

export function emptyDrill(): DrillClip {
  const now = new Date().toISOString()
  return {
    id: createId('drl'),
    title: '',
    notes: '',
    src: '',
    createdAt: now,
    updatedAt: now,
  }
}

export function deleteGymLibraryShape(id: string) {
  const file = readFile()
  persist({
    ...file,
    gymLibrary: (file.gymLibrary ?? []).filter((s) => s.id !== id),
  })
}

export function listCoachSkillRefs(): CoachSkillRef[] {
  return (readFile().references ?? [])
    .slice()
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
}

export function getCoachSkillRef(id: string | undefined): CoachSkillRef | undefined {
  if (!id) return undefined
  return listCoachSkillRefs().find((r) => r.id === id)
}

export function saveCoachSkillRef(ref: CoachSkillRef): CoachSkillRef {
  const next = { ...ref, updatedAt: new Date().toISOString() }
  const file = readFile()
  persist({
    ...file,
    references: [next, ...(file.references ?? []).filter((r) => r.id !== next.id)],
  })
  dispatchLibraryChanged()
  return next
}

export function deleteCoachSkillRef(id: string) {
  const file = readFile()
  persist({
    ...file,
    references: (file.references ?? []).filter((r) => r.id !== id),
  })
  dispatchLibraryChanged()
}

export function emptyCoachSkillRef(coachId: string, coachName: string): CoachSkillRef {
  const now = new Date().toISOString()
  return {
    id: createId('cref'),
    coachId,
    coachName,
    name: '',
    src: '',
    createdAt: now,
    updatedAt: now,
  }
}

export function emptyCoachShape(coachId: string, coachName: string): CoachShape {
  const now = new Date().toISOString()
  return {
    id: createId('csh'),
    coachId,
    coachName,
    name: '',
    description: '',
    bodyPosition: '',
    progressions: [],
    media: [],
    createdAt: now,
    updatedAt: now,
  }
}

export function listWarmups(): WarmupGuide[] {
  return readFile()
    .warmups.slice()
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
}

export function saveWarmup(guide: WarmupGuide): WarmupGuide {
  const next = { ...guide, updatedAt: new Date().toISOString() }
  const file = readFile()
  persist({
    ...file,
    warmups: [next, ...file.warmups.filter((w) => w.id !== next.id)],
    removedWarmupIds: (file.removedWarmupIds ?? []).filter((id) => id !== next.id),
  })
  return next
}

export async function saveWarmupToGym(guide: WarmupGuide): Promise<{
  guide: WarmupGuide
  savedToGym: boolean
}> {
  const saved = saveWarmup(guide)
  return { guide: saved, savedToGym: await publishCoachContent() }
}

export function deleteWarmup(id: string) {
  const file = readFile()
  persist({
    ...file,
    warmups: file.warmups.filter((w) => w.id !== id),
    stars: file.stars.filter((s) => s.warmupId !== id),
    removedWarmupIds: [...new Set([...(file.removedWarmupIds ?? []), id])],
  })
}

export async function deleteWarmupFromGym(id: string): Promise<boolean> {
  deleteWarmup(id)
  return publishCoachContent()
}

export function emptyWarmup(coachId: string, coachName: string): WarmupGuide {
  const now = new Date().toISOString()
  return {
    id: createId('wup'),
    coachId,
    coachName,
    title: '',
    description: '',
    steps: [],
    createdAt: now,
    updatedAt: now,
  }
}

export function warmupStarsFor(athleteId: string): string[] {
  return readFile()
    .stars.filter((s) => s.athleteId === athleteId)
    .map((s) => s.warmupId)
}

export function isWarmupStarred(athleteId: string, warmupId: string): boolean {
  return readFile().stars.some((s) => s.athleteId === athleteId && s.warmupId === warmupId)
}

export function toggleWarmupStar(athleteId: string, warmupId: string): boolean {
  const file = readFile()
  const on = file.stars.some((s) => s.athleteId === athleteId && s.warmupId === warmupId)
  persist({
    ...file,
    stars: on
      ? file.stars.filter((s) => !(s.athleteId === athleteId && s.warmupId === warmupId))
      : [...file.stars, { athleteId, warmupId }],
  })
  return !on
}

export async function uploadCoachMedia(opts: {
  ownerId: string
  file: Blob
  name: string
}): Promise<string> {
  const id = createId('cmed')
  const mime = opts.file.type || 'application/octet-stream'
  const res = await fetch(
    `/api/coach-media?id=${encodeURIComponent(id)}&ownerId=${encodeURIComponent(opts.ownerId)}&name=${encodeURIComponent(opts.name)}&mime=${encodeURIComponent(mime)}`,
    {
      method: 'POST',
      headers: { 'Content-Type': mime },
      body: opts.file,
    },
  )
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { error?: string }
    throw new Error(err.error || 'Could not save that file.')
  }
  const data = (await res.json()) as { url?: string }
  if (!data.url) throw new Error('Could not save that file.')
  return data.url
}

// Warm the gym-shape cache from localStorage so Learn / getShape see
// gym-wide shapes before the first subscribe tick.
void readFile()
