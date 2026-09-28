/**
 * Coach-built map of skills, prerequisites, and conditioning.
 * Shipped seeds stay unless a coach deletes them. Gym file + local cache.
 */

import { createId } from './storage'
import { gymWriteFetch } from './gymWritePace'
import {
  clearRegistryOverrides,
  getRegistrySkill,
  matchRegistrySkill,
  normalizeSkillText,
  setRegistryOverride,
  type RegistryOverride,
  type UnifiedSkill,
  type UnifiedSkillTrack,
} from './skillRegistry'
import { SHIPPED_CONDITIONING, SHIPPED_NEEDS, SHIPPED_SKILLS, SHIPPED_VERSIONS } from '../config/skillPathSeed'
import type { Athlete, AthleteSkillGoal, TrainingSurface } from '../types'
import { givenName } from './classStation'

export type SkillNeedKind = 'required' | 'helpful' | 'alt'

/**
 * Skills consolidated into a canonical tile. Goals and shipped needs may
 * still reference the old id — canonicalize before every needsForSkill /
 * conditioningForSkill call so the path lands on the tile.
 */
export const CANONICAL_SKILL_ID: Record<string, string> = {
  skl_ro_bhs_full: 'skl_back_full',
}

/** Map an old/consolidated skill id to the canonical tile id. */
export function canonicalSkillId(id: string | null | undefined): string {
  if (!id) return ''
  return CANONICAL_SKILL_ID[id] ?? id
}

export type PowerDownStep = {
  id: string
  label: string
  note?: string
}

export type SkillDef = {
  id: string
  name: string
  aliases?: string[]
  coachId?: string
  note?: string
  surfaces?: TrainingSurface[]
  powerDown?: PowerDownStep[]
  /** Coach suggestions for where to work this hope (spot, dead mat, tramp…). */
  workWhere?: string[]
  createdAt: string
  updatedAt: string
  shipped?: boolean
  /**
   * Phase 3: device-edited guide prose, merged over the unified registry seed
   * at read time via syncRegistryOverrides(). Ryan edits these in the skill
   * editor; the repo seed stays the canonical source until edited here.
   */
  guideNeeds?: string[]
  canBend?: string[]
  ask?: string
  ryanNote?: string
  /** Phase 3: device-edited track override for a registry skill. */
  track?: UnifiedSkillTrack
}

export type SkillNeed = {
  id: string
  skillId: string
  needSkillId?: string
  label?: string
  kind: SkillNeedKind
  note?: string
  surfaces?: TrainingSurface[]
  order: number
  shipped?: boolean
}

export type ConditioningNeed = {
  id: string
  skillId: string
  label: string
  kind: SkillNeedKind
  shapeId?: string
  note?: string
  shipped?: boolean
}

/**
 * A drill attached to one skill's card. videoUrl is optional on purpose —
 * Ryan adds videos later, when uploading is less of a burden.
 */
export type SkillDrill = {
  id: string
  skillId: string
  label: string
  videoUrl?: string
  note?: string
  order: number
  shipped?: boolean
}

/** A harder version of a skill, named by the coach (e.g. Switch kick full). */
export type SkillVersion = {
  id: string
  skillId: string
  label: string
  note?: string
  order: number
  shipped?: boolean
}

export type SkillPathFile = {
  kind: 'shape-lab-skill-paths'
  version: 1
  exportedAt: string
  skills: SkillDef[]
  needs: SkillNeed[]
  conditioning: ConditioningNeed[]
  drills: SkillDrill[]
  versions: SkillVersion[]
  removedSkillIds?: string[]
  /** Tombstones so deleted rows stay deleted when the server file merges back. */
  removedNeedIds?: string[]
  removedConditioningIds?: string[]
  removedDrillIds?: string[]
  removedVersionIds?: string[]
}

export const TRAINING_SURFACES: { id: TrainingSurface; label: string; short: string }[] = [
  { id: 'tramp', label: 'Trampoline', short: 'Tramp' },
  { id: 'tumble_trak', label: 'Tumble trak', short: 'Trak' },
  { id: 'rod_airfloor', label: 'Rod / air floor', short: 'Rod' },
  { id: 'spring_floor', label: 'Spring floor', short: 'Spring' },
  { id: 'dead_mat', label: 'Dead mat', short: 'Dead mat' },
]

export const NEED_KIND_LABEL: Record<SkillNeedKind, string> = {
  required: 'Usually needed',
  helpful: 'Helps — not required',
  alt: 'Another path',
}

export const SKILL_GOAL_DISCLAIMER =
  'This is a hope, not a booking. Naming a skill does not mean the coach will work that skill with you today. Most people need the smaller pieces first.'

export const SKILL_GOAL_COACH_NOTE =
  'Athletes often name a skill harder than they are ready for. Use this to group people by the pieces they need — not as a promise to throw that skill today.'

const KEY = 'shape-lab.skillPaths.v1'
const listeners = new Set<() => void>()

function emptyFile(): SkillPathFile {
  return {
    kind: 'shape-lab-skill-paths',
    version: 1,
    exportedAt: '',
    skills: [],
    needs: [],
    conditioning: [],
    drills: [],
    versions: [],
    removedSkillIds: [],
    removedNeedIds: [],
    removedConditioningIds: [],
    removedDrillIds: [],
    removedVersionIds: [],
  }
}

function readRaw(): SkillPathFile {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return emptyFile()
    const data = JSON.parse(raw) as SkillPathFile
    if (data?.kind !== 'shape-lab-skill-paths') return emptyFile()
    return {
      ...emptyFile(),
      exportedAt: data.exportedAt ?? '',
      skills: Array.isArray(data.skills) ? data.skills : [],
      needs: Array.isArray(data.needs) ? data.needs : [],
      conditioning: Array.isArray(data.conditioning) ? data.conditioning : [],
      drills: Array.isArray(data.drills) ? data.drills : [],
      versions: Array.isArray(data.versions) ? data.versions : [],
      removedSkillIds: Array.isArray(data.removedSkillIds) ? data.removedSkillIds : [],
      removedNeedIds: Array.isArray(data.removedNeedIds) ? data.removedNeedIds : [],
      removedConditioningIds: Array.isArray(data.removedConditioningIds)
        ? data.removedConditioningIds
        : [],
      removedDrillIds: Array.isArray(data.removedDrillIds) ? data.removedDrillIds : [],
      removedVersionIds: Array.isArray(data.removedVersionIds) ? data.removedVersionIds : [],
    }
  } catch {
    return emptyFile()
  }
}

function mergeShipped(file: SkillPathFile): SkillPathFile {
  const removed = new Set(file.removedSkillIds ?? [])
  const removedNeeds = new Set(file.removedNeedIds ?? [])
  const removedCond = new Set(file.removedConditioningIds ?? [])
  const removedDrills = new Set(file.removedDrillIds ?? [])
  const removedVersions = new Set(file.removedVersionIds ?? [])
  const skills = new Map(file.skills.filter((s) => s?.id).map((s) => [s.id, s]))
  for (const row of SHIPPED_SKILLS) {
    if (removed.has(row.id) || skills.has(row.id)) continue
    skills.set(row.id, row)
  }
  const needs = new Map(
    file.needs.filter((n) => n?.id && !removedNeeds.has(n.id)).map((n) => [n.id, n]),
  )
  for (const row of SHIPPED_NEEDS) {
    if (removed.has(row.skillId) || removedNeeds.has(row.id) || needs.has(row.id)) continue
    needs.set(row.id, row)
  }
  const conditioning = new Map(
    file.conditioning.filter((c) => c?.id && !removedCond.has(c.id)).map((c) => [c.id, c]),
  )
  for (const row of SHIPPED_CONDITIONING) {
    if (removed.has(row.skillId) || removedCond.has(row.id) || conditioning.has(row.id)) continue
    conditioning.set(row.id, row)
  }
  const drills = new Map(
    file.drills.filter((d) => d?.id && !removedDrills.has(d.id)).map((d) => [d.id, d]),
  )
  const versions = new Map(
    file.versions.filter((v) => v?.id && !removedVersions.has(v.id)).map((v) => [v.id, v]),
  )
  for (const row of SHIPPED_VERSIONS) {
    if (removed.has(row.skillId) || removedVersions.has(row.id) || versions.has(row.id)) continue
    versions.set(row.id, row)
  }
  return {
    ...file,
    skills: [...skills.values()].sort((a, b) => a.name.localeCompare(b.name)),
    needs: [...needs.values()],
    conditioning: [...conditioning.values()],
    drills: [...drills.values()],
    versions: [...versions.values()],
  }
}

function read(): SkillPathFile {
  return mergeShipped(readRaw())
}

function write(file: SkillPathFile) {
  const next = { ...file, exportedAt: new Date().toISOString() }
  localStorage.setItem(KEY, JSON.stringify(next))
  syncRegistryOverrides()
  for (const cb of listeners) cb()
  void gymWriteFetch('/api/skill-paths', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(next),
  }).catch(() => {})
}

/**
 * Phase 3: push device-edited fields (aliases, track, guide prose) for
 * registry skills into the unified registry, so the guide cards, picker,
 * and search see Ryan's edits without any caller changing. Reads the raw
 * device file only — shipped seed rows must never override the registry,
 * since the registry supersedes them.
 */
export function syncRegistryOverrides(): void {
  try {
    clearRegistryOverrides()
    for (const s of readRaw().skills) {
      if (!s?.id || !getRegistrySkill(s.id)) continue
      const o: RegistryOverride = {}
      if (s.aliases !== undefined) o.aliases = s.aliases
      if (s.track !== undefined) o.track = s.track
      if (s.guideNeeds !== undefined) o.guideNeeds = s.guideNeeds
      if (s.canBend !== undefined) o.canBend = s.canBend
      if (s.ask !== undefined) o.ask = s.ask
      if (s.ryanNote !== undefined) o.ryanNote = s.ryanNote
      if (Object.keys(o).length > 0) setRegistryOverride(s.id, o)
    }
  } catch {
    /* storage unavailable */
  }
}

// Prime the registry with any device edits saved by earlier sessions.
syncRegistryOverrides()

export function subscribeSkillPaths(cb: () => void): () => void {
  listeners.add(cb)
  return () => listeners.delete(cb)
}

export function loadSkillPathFile(): SkillPathFile {
  return read()
}

export function listSkills(): SkillDef[] {
  return read().skills
}

export function getSkill(id: string | null | undefined): SkillDef | null {
  if (!id) return null
  return read().skills.find((s) => s.id === id) ?? null
}

/**
 * Phase 3: the editor's view of one skill. `registry` is the unified
 * record (with device overrides merged); `local` is the device SkillDef
 * row carrying workWhere/surfaces/powerDown/coach note, if any.
 */
export type EditableSkill = {
  registry: UnifiedSkill
  local: SkillDef | null
  needs: SkillNeed[]
  conditioning: ConditioningNeed[]
}

export function getEditableSkill(id: string | null | undefined): EditableSkill | null {
  const registry = getRegistrySkill(id)
  if (!registry) return null
  return {
    registry,
    local: getSkill(registry.id),
    needs: needsForSkill(registry.id),
    conditioning: conditioningForSkill(registry.id),
  }
}

/**
 * Phase 3: drop the device's local edits for a registry skill (aliases,
 * track, guide prose, workWhere…) without touching its needs or
 * conditioning, and without tombstoning the registry id. The skill falls
 * back to the repo seed.
 */
export function clearSkillEdits(id: string): void {
  const file = readRaw()
  if (!file.skills.some((s) => s.id === id)) return
  write({ ...file, skills: file.skills.filter((s) => s.id !== id) })
}

/**
 * Phase 3: link an unmatched athlete-typed hope to a registry skill by
 * stamping the matching goals' skillId. Additive only — goals that
 * already resolve are untouched. Returns a new athlete array; the caller
 * persists it (saveAthletes).
 */
export function linkHopeToSkill(
  hopeKey: string,
  skillId: string,
  athletes: Athlete[],
): Athlete[] {
  if (!hopeKey || !getRegistrySkill(skillId)) return athletes
  return athletes.map((a) => {
    if (!a || !Array.isArray(a.skillGoals) || a.skillGoals.length === 0) return a
    let changed = false
    const skillGoals = a.skillGoals.map((g) => {
      if (!g || g.skillId || normalizeSkillText(g.label ?? '') !== hopeKey) return g
      changed = true
      return { ...g, skillId }
    })
    return changed ? { ...a, skillGoals } : a
  })
}

export function surfaceLabel(id: TrainingSurface | null | undefined): string {
  return TRAINING_SURFACES.find((s) => s.id === id)?.label ?? ''
}

export function searchSkills(query: string): SkillDef[] {
  const q = query.trim().toLowerCase()
  const all = listSkills()
  if (!q) return all
  return all.filter((s) => {
    const hay = `${s.name} ${(s.aliases ?? []).join(' ')}`.toLowerCase()
    return hay.includes(q)
  })
}

function skillKeys(skill: Pick<SkillDef, 'name' | 'aliases'>): string[] {
  return [normalizeSkillText(skill.name), ...(skill.aliases ?? []).map(normalizeSkillText)].filter(Boolean)
}

/** Exact name or alias, ignoring punctuation. Does not substring-match drills. */
export function matchSkillExact(label: string, extraNames: string[] = []): SkillDef | null {
  const wanted = [label, ...extraNames].map(normalizeSkillText).filter(Boolean)
  if (wanted.length === 0) return null
  const want = new Set(wanted)
  return (
    listSkills().find((s) => skillKeys(s).some((key) => want.has(key))) ?? null
  )
}

/**
 * Link an athlete-typed hope to a pathway skill only when the name already
 * exists. Substring matches are skipped so “tuck” does not swallow every
 * tuck drill in the map.
 */
export function matchSkill(label: string): SkillDef | null {
  return matchSkillExact(label)
}

export function needsForSkill(skillId: string, surface?: TrainingSurface | null): SkillNeed[] {
  return read()
    .needs.filter((n) => n.skillId === skillId)
    .filter((n) => !surface || !n.surfaces?.length || n.surfaces.includes(surface))
    .sort((a, b) => a.order - b.order)
}

export function conditioningForSkill(skillId: string): ConditioningNeed[] {
  return read().conditioning.filter((c) => c.skillId === skillId)
}

export function needLabel(need: SkillNeed): string {
  if (need.label?.trim()) return need.label.trim()
  if (need.needSkillId) {
    return (
      getRegistrySkill(need.needSkillId)?.name ??
      getSkill(need.needSkillId)?.name ??
      'Untitled piece'
    )
  }
  return 'Untitled piece'
}

export function saveSkill(input: {
  id?: string
  name: string
  aliases?: string[]
  coachId?: string
  note?: string
  surfaces?: TrainingSurface[]
  powerDown?: PowerDownStep[]
  workWhere?: string[]
  guideNeeds?: string[]
  canBend?: string[]
  ask?: string
  ryanNote?: string
  track?: UnifiedSkillTrack
}): SkillDef {
  const file = readRaw()
  const now = new Date().toISOString()
  const existing = input.id ? file.skills.find((s) => s.id === input.id) : null
  const cleanList = (xs: string[] | undefined) =>
    xs?.map((a) => a.trim()).filter(Boolean)
  const row: SkillDef = {
    id: existing?.id ?? input.id ?? createId('skl'),
    name: input.name.trim(),
    aliases: input.aliases !== undefined ? cleanList(input.aliases) : existing?.aliases,
    coachId: input.coachId ?? existing?.coachId,
    note: input.note !== undefined ? input.note.trim() || undefined : existing?.note,
    surfaces: input.surfaces ?? existing?.surfaces,
    powerDown: input.powerDown ?? existing?.powerDown,
    workWhere: input.workWhere ?? existing?.workWhere,
    guideNeeds: input.guideNeeds !== undefined ? cleanList(input.guideNeeds) : existing?.guideNeeds,
    canBend: input.canBend !== undefined ? cleanList(input.canBend) : existing?.canBend,
    ask: input.ask !== undefined ? input.ask.trim() || undefined : existing?.ask,
    ryanNote: input.ryanNote !== undefined ? input.ryanNote.trim() || undefined : existing?.ryanNote,
    track: input.track ?? existing?.track,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
    shipped: existing?.shipped,
  }
  write({
    ...file,
    skills: [row, ...file.skills.filter((s) => s.id !== row.id)],
  })
  return row
}

export function deleteSkill(id: string) {
  const file = readRaw()
  const needIds = file.needs.filter((n) => n.skillId === id || n.needSkillId === id).map((n) => n.id)
  const condIds = file.conditioning.filter((c) => c.skillId === id).map((c) => c.id)
  const drillIds = file.drills.filter((d) => d.skillId === id).map((d) => d.id)
  const versionIds = file.versions.filter((v) => v.skillId === id).map((v) => v.id)
  write({
    ...file,
    skills: file.skills.filter((s) => s.id !== id),
    needs: file.needs.filter((n) => n.skillId !== id && n.needSkillId !== id),
    conditioning: file.conditioning.filter((c) => c.skillId !== id),
    drills: file.drills.filter((d) => d.skillId !== id),
    versions: file.versions.filter((v) => v.skillId !== id),
    removedSkillIds: [...new Set([...(file.removedSkillIds ?? []), id])],
    removedNeedIds: [...new Set([...(file.removedNeedIds ?? []), ...needIds])],
    removedConditioningIds: [...new Set([...(file.removedConditioningIds ?? []), ...condIds])],
    removedDrillIds: [...new Set([...(file.removedDrillIds ?? []), ...drillIds])],
    removedVersionIds: [...new Set([...(file.removedVersionIds ?? []), ...versionIds])],
  })
}

export function saveNeed(input: Omit<SkillNeed, 'id'> & { id?: string }): SkillNeed {
  const file = readRaw()
  const row: SkillNeed = {
    ...input,
    id: input.id ?? createId('need'),
  }
  write({
    ...file,
    needs: [row, ...file.needs.filter((n) => n.id !== row.id)],
  })
  return row
}

export function deleteNeed(id: string) {
  const file = readRaw()
  write({
    ...file,
    needs: file.needs.filter((n) => n.id !== id),
    removedNeedIds: [...new Set([...(file.removedNeedIds ?? []), id])],
  })
}

export function saveConditioning(input: Omit<ConditioningNeed, 'id'> & { id?: string }): ConditioningNeed {
  const file = readRaw()
  const row: ConditioningNeed = {
    ...input,
    id: input.id ?? createId('cnd'),
  }
  write({
    ...file,
    conditioning: [row, ...file.conditioning.filter((c) => c.id !== row.id)],
  })
  return row
}

export function deleteConditioning(id: string) {
  const file = readRaw()
  write({
    ...file,
    conditioning: file.conditioning.filter((c) => c.id !== id),
    removedConditioningIds: [...new Set([...(file.removedConditioningIds ?? []), id])],
  })
}

/** Drills attached to one skill's card, shallowest first. */
export function drillsForSkill(skillId: string): SkillDrill[] {
  const canon = canonicalSkillId(skillId) || skillId
  return read()
    .drills.filter((d) => canonicalSkillId(d.skillId) === canon)
    .sort((a, b) => a.order - b.order)
}

export function saveDrill(input: Omit<SkillDrill, 'id'> & { id?: string }): SkillDrill {
  const file = readRaw()
  const row: SkillDrill = {
    ...input,
    skillId: canonicalSkillId(input.skillId) || input.skillId,
    id: input.id ?? createId('drl'),
  }
  write({
    ...file,
    drills: [row, ...file.drills.filter((d) => d.id !== row.id)],
  })
  return row
}

export function deleteDrill(id: string) {
  const file = readRaw()
  write({
    ...file,
    drills: file.drills.filter((d) => d.id !== id),
    removedDrillIds: [...new Set([...(file.removedDrillIds ?? []), id])],
  })
}

/** Harder versions of one skill, shallowest first. */
export function versionsForSkill(skillId: string): SkillVersion[] {
  const canon = canonicalSkillId(skillId) || skillId
  return read()
    .versions.filter((v) => canonicalSkillId(v.skillId) === canon)
    .sort((a, b) => a.order - b.order)
}

export function saveVersion(input: Omit<SkillVersion, 'id'> & { id?: string }): SkillVersion {
  const file = readRaw()
  const row: SkillVersion = {
    ...input,
    skillId: canonicalSkillId(input.skillId) || input.skillId,
    id: input.id ?? createId('ver'),
  }
  write({
    ...file,
    versions: [row, ...file.versions.filter((v) => v.id !== row.id)],
  })
  return row
}

export function deleteVersion(id: string) {
  const file = readRaw()
  write({
    ...file,
    versions: file.versions.filter((v) => v.id !== id),
    removedVersionIds: [...new Set([...(file.removedVersionIds ?? []), id])],
  })
}

/**
 * Awaited re-push of the local skill-path file to the gym server.
 * Local data is already written before this is called; this gives card
 * editors a real saved / failed signal instead of the fire-and-forget PUT.
 */
export async function pushSkillPathsNow(): Promise<{ ok: boolean; message: string }> {
  const next = { ...readRaw(), exportedAt: new Date().toISOString() }
  try {
    const res = await gymWriteFetch('/api/skill-paths', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(next),
    })
    if (res.ok) return { ok: true, message: 'Saved' }
    let detail = ''
    try {
      const data = (await res.json()) as { error?: string }
      if (data?.error) detail = data.error
    } catch {
      /* ignore */
    }
    return { ok: false, message: detail || `Sync failed (status ${res.status})` }
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : 'Network error' }
  }
}

export function goalLine(goal: AthleteSkillGoal): string {
  const surface = surfaceLabel(goal.surface)
  return surface ? `${goal.label} · ${surface}` : goal.label
}

/**
 * Phase 3: what a goal resolves to for display. Prefers the unified
 * registry (so Phase-1-stamped skillIds resolve even with no local
 * SkillDef row), falls back to the legacy pathway store, then to an
 * exact label match. Callers only need id/name plus the coach-facing
 * SkillDef fields.
 */
export type ResolvedGoalSkill = {
  id: string
  name: string
  note?: string
  workWhere?: string[]
  powerDown?: PowerDownStep[]
  surfaces?: TrainingSurface[]
}

export function resolveGoalSkill(goal: AthleteSkillGoal): ResolvedGoalSkill | null {
  const id = goal.skillId?.trim()
  if (id) {
    const reg = getRegistrySkill(id)
    const def = getSkill(id)
    if (reg || def) {
      return {
        id,
        name: reg?.name ?? def?.name ?? goal.label,
        note: def?.note,
        workWhere: def?.workWhere,
        powerDown: def?.powerDown,
        surfaces: def?.surfaces,
      }
    }
  }
  const def = matchSkillExact(goal.label)
  if (def) {
    return {
      id: def.id,
      name: def.name,
      note: def.note,
      workWhere: def.workWhere,
      powerDown: def.powerDown,
      surfaces: def.surfaces,
    }
  }
  const reg = matchRegistrySkill(goal.label)
  if (reg) return { id: reg.id, name: reg.name }
  return null
}

export type ListedAthleteGoal = {
  key: string
  label: string
  surfaces: TrainingSurface[]
  athletes: { id: string; name: string; surface?: TrainingSurface }[]
}

/**
 * Hopes athletes named that are not already a skill in the pathway.
 * Surfaces (dead mat, tramp…) are specs of the same hope, not a second skill.
 */
export function unmatchedAthleteGoals(athletes: Athlete[]): ListedAthleteGoal[] {
  const map = new Map<string, ListedAthleteGoal>()
  for (const a of athletes) {
    const name = (a.name || givenName(a)).trim() || 'Athlete'
    for (const goal of a.skillGoals ?? []) {
      const label = goal.label.trim()
      if (!label) continue
      if (resolveGoalSkill(goal)) continue
      const key = normalizeSkillText(label)
      const have = map.get(key)
      const row = { id: a.id, name, surface: goal.surface }
      if (have) {
        if (!have.athletes.some((x) => x.id === a.id && x.surface === goal.surface)) have.athletes.push(row)
        if (goal.surface && !have.surfaces.includes(goal.surface)) have.surfaces.push(goal.surface)
      } else {
        map.set(key, {
          key,
          label,
          surfaces: goal.surface ? [goal.surface] : [],
          athletes: [row],
        })
      }
    }
  }
  return [...map.values()].sort((a, b) => a.label.localeCompare(b.label))
}

export type GoalAthlete = {
  athlete: Athlete
  surface?: TrainingSurface
}

export type GoalGroup = {
  key: string
  label: string
  skillId?: string
  surfaces: TrainingSurface[]
  athletes: GoalAthlete[]
}

export function groupAthletesByGoal(athletes: Athlete[]): GoalGroup[] {
  const map = new Map<string, GoalGroup>()
  const none: GoalAthlete[] = []
  for (const a of athletes) {
    const goals = a.skillGoals?.filter((g) => g.label.trim()) ?? []
    if (goals.length === 0) {
      none.push({ athlete: a })
      continue
    }
    for (const goal of goals) {
      const skill = resolveGoalSkill(goal)
      const key = skill?.id ?? normalizeSkillText(goal.label)
      const have = map.get(key)
      const row: GoalAthlete = { athlete: a, surface: goal.surface }
      if (have) {
        if (!have.athletes.some((x) => x.athlete.id === a.id && x.surface === goal.surface)) {
          have.athletes.push(row)
        }
        if (goal.surface && !have.surfaces.includes(goal.surface)) have.surfaces.push(goal.surface)
      } else {
        map.set(key, {
          key,
          label: skill?.name ?? goal.label,
          skillId: skill?.id,
          surfaces: goal.surface ? [goal.surface] : [],
          athletes: [row],
        })
      }
    }
  }
  const groups = [...map.values()].sort((a, b) => a.label.localeCompare(b.label))
  if (none.length) {
    groups.push({ key: 'none', label: 'Not said yet', surfaces: [], athletes: none })
  }
  return groups
}

export async function hydrateSkillPaths(): Promise<void> {
  try {
    const res = await fetch('/api/skill-paths')
    if (!res.ok) return
    const data = (await res.json()) as SkillPathFile
    if (data?.kind !== 'shape-lab-skill-paths') return
    const local = readRaw()
    const skills = new Map(local.skills.map((s) => [s.id, s]))
    for (const row of data.skills ?? []) {
      if (!row?.id || !row.name) continue
      const keep = skills.get(row.id)
      if (!keep || (row.updatedAt || row.createdAt || '') >= (keep.updatedAt || keep.createdAt || '')) {
        skills.set(row.id, row)
      }
    }
    const needs = new Map(local.needs.map((n) => [n.id, n]))
    const removedNeedIds = new Set([...(local.removedNeedIds ?? []), ...(data.removedNeedIds ?? [])])
    for (const row of data.needs ?? []) {
      if (!row?.id || removedNeedIds.has(row.id)) continue
      needs.set(row.id, row)
    }
    const conditioning = new Map(local.conditioning.map((c) => [c.id, c]))
    const removedCondIds = new Set([
      ...(local.removedConditioningIds ?? []),
      ...(data.removedConditioningIds ?? []),
    ])
    for (const row of data.conditioning ?? []) {
      if (!row?.id || removedCondIds.has(row.id)) continue
      conditioning.set(row.id, row)
    }
    const drills = new Map(local.drills.map((d) => [d.id, d]))
    const removedDrillIds = new Set([
      ...(local.removedDrillIds ?? []),
      ...(data.removedDrillIds ?? []),
    ])
    for (const row of data.drills ?? []) {
      if (!row?.id || removedDrillIds.has(row.id)) continue
      drills.set(row.id, row)
    }
    const versions = new Map(local.versions.map((v) => [v.id, v]))
    const removedVersionIds = new Set([
      ...(local.removedVersionIds ?? []),
      ...(data.removedVersionIds ?? []),
    ])
    for (const row of data.versions ?? []) {
      if (!row?.id || removedVersionIds.has(row.id)) continue
      versions.set(row.id, row)
    }
    write({
      kind: 'shape-lab-skill-paths',
      version: 1,
      exportedAt: new Date().toISOString(),
      skills: [...skills.values()],
      needs: [...needs.values()],
      conditioning: [...conditioning.values()],
      drills: [...drills.values()],
      versions: [...versions.values()],
      removedSkillIds: [...new Set([...(local.removedSkillIds ?? []), ...(data.removedSkillIds ?? [])])],
      removedNeedIds: [...removedNeedIds],
      removedConditioningIds: [...removedCondIds],
      removedDrillIds: [...removedDrillIds],
      removedVersionIds: [...removedVersionIds],
    })
  } catch {
    /* offline */
  }
}
