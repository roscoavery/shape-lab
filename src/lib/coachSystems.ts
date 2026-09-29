/**
 * Coach systems — every coach gets their own namespace: their own skill
 * cards, library items, maps/paths, and visibility. Ryan's system is the
 * default and is locked unless he grants edit. Coach content never mixes
 * into Ryan's flows; viewing another coach's map is explicit.
 *
 * Persistence: localStorage + the gym file (/api/coach-systems), same
 * pattern as the skill paths. Deletes are tombstoned so a removed system
 * stays gone across restarts and blob syncs.
 */

import { createId } from './storage'
import { gymWriteFetch } from './gymWritePace'
import {
  drillsForSkill,
  getSkill,
  listSkills,
  saveConditioning,
  saveDrill,
  saveNeed,
  saveSkill,
  needsForSkill,
  conditioningForSkill,
  type SkillDef,
} from './skillPaths'
import type { Athlete } from '../types'
import { profileRole } from './profileRole'

const KEY = 'shape-lab.coachSystems.v1'
const ACTIVE_KEY = 'shape-lab.activeCoachSystem.v1'

/** Ryan's default system. Always present, always locked. */
export const RYAN_SYSTEM_ID = 'system_ryan'

export type SystemVisibility = 'private' | 'athletes' | 'followers' | 'public'

export const VISIBILITY_LABELS: Record<SystemVisibility, string> = {
  private: 'Private',
  athletes: 'My athletes',
  followers: 'Followers',
  public: 'Public',
}

export const VISIBILITY_BLURBS: Record<SystemVisibility, string> = {
  private: 'Only you can see it.',
  athletes: 'Athletes at the gym can see it.',
  followers: 'Only coaches and athletes who follow your system can see it.',
  public: 'Anyone using the app can see it.',
}

export type CoachSystem = {
  id: string
  name: string
  handle: string
  tagline?: string
  /** Profile id of the owning coach. Null = Ryan's default system. */
  ownerCoachId: string | null
  ownerName: string
  createdAt: string
  updatedAt: string
  mapVisibility: SystemVisibility
  /** Ryan's system is locked; other coaches adopt instead of editing. */
  locked: boolean
  /** Profile ids Ryan granted edit access to this system. */
  editGrants: string[]
  /** Per-card visibility overrides, keyed by skill id. Falls back to mapVisibility. */
  cardVisibility: Record<string, SystemVisibility>
  /** Profile ids following this system (needed for the Followers visibility). */
  followers: string[]
}

export type CoachSystemsFile = {
  kind: 'shape-lab-coach-systems'
  version: 1
  exportedAt: string
  systems: CoachSystem[]
  /** System ids dropped on any device — do not resurrect on merge. */
  removedSystemIds?: string[]
}

const listeners = new Set<() => void>()
let hydrated = false

function emit() {
  for (const cb of listeners) cb()
}

export function subscribeCoachSystems(cb: () => void): () => void {
  listeners.add(cb)
  return () => listeners.delete(cb)
}

function asIdList(raw: unknown): string[] {
  if (!Array.isArray(raw)) return []
  return [...new Set(raw.filter((id): id is string => typeof id === 'string' && Boolean(id)))]
}

function ryanSystem(): CoachSystem {
  const now = new Date().toISOString()
  return {
    id: RYAN_SYSTEM_ID,
    name: "Ryan's system",
    handle: 'ryan',
    tagline: 'The default coaching system.',
    ownerCoachId: null,
    ownerName: 'Ryan',
    createdAt: now,
    updatedAt: now,
    mapVisibility: 'public',
    locked: true,
    editGrants: [],
    cardVisibility: {},
    followers: [],
  }
}

function cleanSystem(raw: Partial<CoachSystem> | null | undefined): CoachSystem | null {
  if (!raw || typeof raw.id !== 'string' || !raw.id || typeof raw.name !== 'string' || !raw.name) return null
  const vis = (v: unknown): SystemVisibility =>
    v === 'private' || v === 'athletes' || v === 'followers' || v === 'public' ? v : 'private'
  return {
    id: raw.id,
    name: raw.name,
    handle: typeof raw.handle === 'string' && raw.handle ? raw.handle : raw.id,
    tagline: typeof raw.tagline === 'string' ? raw.tagline : undefined,
    ownerCoachId: typeof raw.ownerCoachId === 'string' ? raw.ownerCoachId : null,
    ownerName: typeof raw.ownerName === 'string' && raw.ownerName ? raw.ownerName : 'Coach',
    createdAt: typeof raw.createdAt === 'string' ? raw.createdAt : new Date().toISOString(),
    updatedAt: typeof raw.updatedAt === 'string' ? raw.updatedAt : new Date().toISOString(),
    mapVisibility: vis(raw.mapVisibility),
    locked: raw.id === RYAN_SYSTEM_ID ? true : raw.locked === true,
    editGrants: asIdList(raw.editGrants),
    cardVisibility:
      raw.cardVisibility && typeof raw.cardVisibility === 'object'
        ? Object.fromEntries(
            Object.entries(raw.cardVisibility).filter(([, v]) => typeof v === 'string'),
          ) as Record<string, SystemVisibility>
        : {},
    followers: asIdList(raw.followers),
  }
}

function emptyFile(): CoachSystemsFile {
  return { kind: 'shape-lab-coach-systems', version: 1, exportedAt: '', systems: [], removedSystemIds: [] }
}

function parseFile(raw: string | null): CoachSystemsFile {
  if (!raw) return emptyFile()
  try {
    const data = JSON.parse(raw) as CoachSystemsFile
    if (data?.kind !== 'shape-lab-coach-systems') return emptyFile()
    const removed = new Set(asIdList(data.removedSystemIds))
    const systems = (Array.isArray(data.systems) ? data.systems : [])
      .map(cleanSystem)
      .filter((s): s is CoachSystem => s != null && !removed.has(s.id))
    if (!systems.some((s) => s.id === RYAN_SYSTEM_ID)) systems.unshift(ryanSystem())
    return {
      kind: 'shape-lab-coach-systems',
      version: 1,
      exportedAt: typeof data.exportedAt === 'string' ? data.exportedAt : '',
      systems,
      removedSystemIds: [...removed],
    }
  } catch {
    return emptyFile()
  }
}

function readStored(): CoachSystemsFile {
  try {
    return parseFile(localStorage.getItem(KEY))
  } catch {
    return emptyFile()
  }
}

function persist(file: CoachSystemsFile) {
  const removed = new Set(asIdList(file.removedSystemIds))
  const systems = file.systems
    .map(cleanSystem)
    .filter((s): s is CoachSystem => s != null && !removed.has(s.id))
  if (!systems.some((s) => s.id === RYAN_SYSTEM_ID)) systems.unshift(ryanSystem())
  const next: CoachSystemsFile = {
    kind: 'shape-lab-coach-systems',
    version: 1,
    exportedAt: new Date().toISOString(),
    systems: systems.slice(0, 60),
    removedSystemIds: [...removed],
  }
  try {
    localStorage.setItem(KEY, JSON.stringify(next))
  } catch {
    /* quota */
  }
  emit()
  void gymWriteFetch('/api/coach-systems', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(next),
  }).catch(() => {})
}

/** Pull the gym file and merge (newer rows win, tombstones merge monotonically). */
export async function hydrateCoachSystems(): Promise<void> {
  if (hydrated) return
  hydrated = true
  try {
    const res = await fetch('/api/coach-systems')
    if (!res.ok) return
    const data = (await res.json()) as CoachSystemsFile
    if (data?.kind !== 'shape-lab-coach-systems') return
    const local = readStored()
    const removed = new Set([...asIdList(local.removedSystemIds), ...asIdList(data.removedSystemIds)])
    const byId = new Map(local.systems.map((s) => [s.id, s]))
    for (const raw of data.systems ?? []) {
      const row = cleanSystem(raw)
      if (!row || removed.has(row.id)) continue
      const keep = byId.get(row.id)
      if (!keep || (row.updatedAt || '') >= (keep.updatedAt || '')) byId.set(row.id, row)
    }
    persist({ kind: 'shape-lab-coach-systems', version: 1, exportedAt: '', systems: [...byId.values()], removedSystemIds: [...removed] })
  } catch {
    /* offline — local copy stands */
  }
}

export function listSystems(): CoachSystem[] {
  return readStored().systems
}

export function getSystem(id: string | null | undefined): CoachSystem | null {
  if (!id) return null
  return listSystems().find((s) => s.id === id) ?? null
}

export function mySystemForCoach(coachId: string | null | undefined): CoachSystem | null {
  if (!coachId) return null
  return listSystems().find((s) => s.ownerCoachId === coachId) ?? null
}

export function handleTaken(handle: string, exceptId?: string): boolean {
  const h = handle.trim().toLowerCase()
  return listSystems().some((s) => s.id !== exceptId && s.handle.toLowerCase() === h)
}

export function createSystem(input: {
  name: string
  handle: string
  tagline?: string
  ownerCoachId: string
  ownerName: string
  mapVisibility?: SystemVisibility
}): CoachSystem {
  const now = new Date().toISOString()
  const row: CoachSystem = {
    id: createId('system'),
    name: input.name.trim(),
    handle: input.handle.trim().toLowerCase() || createId('coach'),
    tagline: input.tagline?.trim() || undefined,
    ownerCoachId: input.ownerCoachId,
    ownerName: input.ownerName.trim() || 'Coach',
    createdAt: now,
    updatedAt: now,
    mapVisibility: input.mapVisibility ?? 'private',
    locked: false,
    editGrants: [],
    cardVisibility: {},
    followers: [],
  }
  const file = readStored()
  persist({ ...file, systems: [...file.systems, row] })
  return row
}

export function updateSystem(id: string, patch: Partial<CoachSystem>): CoachSystem | null {
  const file = readStored()
  const row = file.systems.find((s) => s.id === id)
  if (!row) return null
  const next: CoachSystem = {
    ...row,
    ...patch,
    id: row.id,
    ownerCoachId: row.ownerCoachId,
    locked: row.locked,
    updatedAt: new Date().toISOString(),
  }
  persist({ ...file, systems: file.systems.map((s) => (s.id === id ? next : s)) })
  return next
}

/** Delete means delete: tombstoned so it stays gone across syncs. */
export function deleteSystem(id: string): void {
  if (id === RYAN_SYSTEM_ID) return
  const file = readStored()
  persist({
    ...file,
    systems: file.systems.filter((s) => s.id !== id),
    removedSystemIds: [...new Set([...asIdList(file.removedSystemIds), id])],
  })
  if (getActiveSystemId() === id) setActiveSystemId(RYAN_SYSTEM_ID)
}

export function setMapVisibility(id: string, visibility: SystemVisibility): void {
  updateSystem(id, { mapVisibility: visibility })
}

export function setCardVisibility(systemId: string, skillId: string, visibility: SystemVisibility | null): void {
  const row = getSystem(systemId)
  if (!row) return
  const cardVisibility = { ...row.cardVisibility }
  if (visibility === null) delete cardVisibility[skillId]
  else cardVisibility[skillId] = visibility
  updateSystem(systemId, { cardVisibility })
}

export function cardVisibility(system: CoachSystem, skillId: string): SystemVisibility {
  return system.cardVisibility[skillId] ?? system.mapVisibility
}

export function grantEdit(systemId: string, profileId: string): void {
  const row = getSystem(systemId)
  if (!row || row.editGrants.includes(profileId)) return
  updateSystem(systemId, { editGrants: [...row.editGrants, profileId] })
}

export function revokeEdit(systemId: string, profileId: string): void {
  const row = getSystem(systemId)
  if (!row) return
  updateSystem(systemId, { editGrants: row.editGrants.filter((id) => id !== profileId) })
}

export function followSystem(systemId: string, profileId: string): void {
  const row = getSystem(systemId)
  if (!row || row.followers.includes(profileId)) return
  updateSystem(systemId, { followers: [...row.followers, profileId] })
}

export function unfollowSystem(systemId: string, profileId: string): void {
  const row = getSystem(systemId)
  if (!row) return
  updateSystem(systemId, { followers: row.followers.filter((id) => id !== profileId) })
}

export type SystemViewer = { id: string; kind: string; isAdmin?: boolean }

/** Can this viewer open the system at all? */
export function canViewSystem(system: CoachSystem, viewer: SystemViewer | null): boolean {
  if (!viewer) return system.mapVisibility === 'public'
  if (viewer.isAdmin) return true
  if (system.ownerCoachId && viewer.id === system.ownerCoachId) return true
  switch (system.mapVisibility) {
    case 'public':
      return true
    case 'athletes':
      return viewer.kind === 'athlete' || viewer.kind === 'coach' || viewer.kind === 'gym_owner'
    case 'followers':
      return system.followers.includes(viewer.id)
    case 'private':
    default:
      return false
  }
}

export function canEditSystem(system: CoachSystem, viewer: SystemViewer | null): boolean {
  if (!viewer) return false
  if (viewer.isAdmin) return true
  if (system.locked) return system.editGrants.includes(viewer.id)
  return Boolean(system.ownerCoachId && viewer.id === system.ownerCoachId)
}

export function visibleSystemsFor(viewer: SystemViewer | null): CoachSystem[] {
  return listSystems().filter((s) => canViewSystem(s, viewer))
}

/* Active system — whose map you're viewing. Explicit everywhere. */

const activeListeners = new Set<() => void>()

export function subscribeActiveSystem(cb: () => void): () => void {
  activeListeners.add(cb)
  return () => activeListeners.delete(cb)
}

export function getActiveSystemId(): string {
  try {
    const v = localStorage.getItem(ACTIVE_KEY)
    if (v && getSystem(v)) return v
  } catch {
    /* private mode */
  }
  return RYAN_SYSTEM_ID
}

export function setActiveSystemId(id: string): void {
  if (!getSystem(id)) return
  try {
    localStorage.setItem(ACTIVE_KEY, id)
  } catch {
    /* private mode */
  }
  for (const cb of activeListeners) cb()
}

/**
 * Adopt a card into a coach's namespace: a deliberate deep copy. The copy
 * gets new ids for the skill, its drills, needs, and conditioning, so later
 * edits on either side never ripple to the other. Ryan's own note stays
 * with Ryan — the adopting coach writes their words on their card.
 */
export function adoptSkill(sourceId: string, ownerCoachId: string): SkillDef | null {
  const src = getSkill(sourceId)
  if (!src) return null
  const row = saveSkill({
    name: src.name,
    aliases: src.aliases,
    coachId: ownerCoachId,
    note: src.note,
    surfaces: src.surfaces,
    powerDown: src.powerDown,
    workWhere: src.workWhere,
    guideNeeds: src.guideNeeds,
    canBend: src.canBend,
    ask: src.ask,
    track: src.track,
  })
  for (const d of drillsForSkill(sourceId)) {
    saveDrill({ skillId: row.id, label: d.label, videoUrl: d.videoUrl, note: d.note, order: d.order })
  }
  for (const n of needsForSkill(sourceId)) {
    saveNeed({ skillId: row.id, needSkillId: n.needSkillId, label: n.label, kind: n.kind, note: n.note, surfaces: n.surfaces, order: n.order })
  }
  for (const c of conditioningForSkill(sourceId)) {
    saveConditioning({ skillId: row.id, label: c.label, kind: c.kind, shapeId: c.shapeId, note: c.note })
  }
  return row
}

/** Skill cards living in a coach's namespace (their system's cards). */
export function systemSkillCards(ownerCoachId: string): SkillDef[] {
  if (!ownerCoachId) return []
  return listSkills().filter((s) => s.coachId === ownerCoachId)
}

export function viewerFromAthlete(a: Athlete | null | undefined): SystemViewer | null {
  if (!a) return null
  const kind = profileRole(a)
  return { id: a.id, kind, isAdmin: kind === 'gym_owner' }
}
