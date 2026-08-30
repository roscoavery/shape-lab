/**
 * Coach-authored shapes and stretch / warm-up guides.
 * Gym-wide via /api/coach-content, cached locally.
 */

import type { CoachShape, CoachSkillRef, WarmupGuide, WarmupStar } from '../types'
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
}

const listeners = new Set<() => void>()

function emit() {
  for (const cb of listeners) cb()
}

export function subscribeCoachContent(cb: () => void): () => void {
  listeners.add(cb)
  return () => listeners.delete(cb)
}

function readFile(): CoachContentFile {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return emptyFile()
    const data = JSON.parse(raw) as CoachContentFile
    if (data?.kind !== 'shape-lab-coach-content') return emptyFile()
    return {
      kind: 'shape-lab-coach-content',
      version: 1,
      exportedAt: data.exportedAt ?? '',
      shapes: Array.isArray(data.shapes) ? data.shapes : [],
      references: Array.isArray(data.references) ? data.references : [],
      warmups: Array.isArray(data.warmups) ? data.warmups : [],
      stars: Array.isArray(data.stars) ? data.stars : [],
    }
  } catch {
    return emptyFile()
  }
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
  }
}

function persist(next: CoachContentFile) {
  const file: CoachContentFile = {
    ...next,
    exportedAt: new Date().toISOString(),
    shapes: next.shapes.slice(0, 200),
    references: (next.references ?? []).slice(0, 240),
    warmups: next.warmups.slice(0, 120),
    stars: next.stars.slice(0, 400),
  }
  try {
    localStorage.setItem(KEY, JSON.stringify(file))
  } catch {
    /* quota */
  }
  emit()
  void pushContent(file)
}

async function pushContent(file: CoachContentFile) {
  try {
    await fetch('/api/coach-content', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(file),
    })
  } catch {
    /* offline */
  }
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
  try {
    const res = await fetch('/api/coach-content')
    if (!res.ok) return
    const data = (await res.json()) as CoachContentFile
    if (data?.kind !== 'shape-lab-coach-content') return
    const local = readFile()
    persist({
      kind: 'shape-lab-coach-content',
      version: 1,
      exportedAt: new Date().toISOString(),
      shapes: mergeById(local.shapes, data.shapes ?? []),
      references: mergeById(local.references ?? [], data.references ?? []),
      warmups: mergeById(local.warmups, data.warmups ?? []),
      stars: [...local.stars, ...(data.stars ?? [])].filter(
        (s, i, all) =>
          s.athleteId &&
          s.warmupId &&
          all.findIndex((x) => x.athleteId === s.athleteId && x.warmupId === s.warmupId) === i,
      ),
    })
  } catch {
    /* first load */
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
  })
  return next
}

export function deleteWarmup(id: string) {
  const file = readFile()
  persist({
    ...file,
    warmups: file.warmups.filter((w) => w.id !== id),
    stars: file.stars.filter((s) => s.warmupId !== id),
  })
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
