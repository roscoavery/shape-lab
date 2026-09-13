/**
 * Coach-built map of skills, prerequisites, and conditioning.
 * Shipped seeds stay unless a coach deletes them. Gym file + local cache.
 */

import { createId } from './storage'
import { SHIPPED_CONDITIONING, SHIPPED_NEEDS, SHIPPED_SKILLS } from '../config/skillPathSeed'
import type { Athlete, AthleteSkillGoal, TrainingSurface } from '../types'

export type SkillNeedKind = 'required' | 'helpful' | 'alt'

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
  createdAt: string
  updatedAt: string
  shipped?: boolean
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

export type SkillPathFile = {
  kind: 'shape-lab-skill-paths'
  version: 1
  exportedAt: string
  skills: SkillDef[]
  needs: SkillNeed[]
  conditioning: ConditioningNeed[]
  removedSkillIds?: string[]
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
    removedSkillIds: [],
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
      removedSkillIds: Array.isArray(data.removedSkillIds) ? data.removedSkillIds : [],
    }
  } catch {
    return emptyFile()
  }
}

function mergeShipped(file: SkillPathFile): SkillPathFile {
  const removed = new Set(file.removedSkillIds ?? [])
  const skills = new Map(file.skills.filter((s) => s?.id).map((s) => [s.id, s]))
  for (const row of SHIPPED_SKILLS) {
    if (removed.has(row.id) || skills.has(row.id)) continue
    skills.set(row.id, row)
  }
  const needs = new Map(file.needs.filter((n) => n?.id).map((n) => [n.id, n]))
  for (const row of SHIPPED_NEEDS) {
    if (removed.has(row.skillId) || needs.has(row.id)) continue
    needs.set(row.id, row)
  }
  const conditioning = new Map(file.conditioning.filter((c) => c?.id).map((c) => [c.id, c]))
  for (const row of SHIPPED_CONDITIONING) {
    if (removed.has(row.skillId) || conditioning.has(row.id)) continue
    conditioning.set(row.id, row)
  }
  return {
    ...file,
    skills: [...skills.values()].sort((a, b) => a.name.localeCompare(b.name)),
    needs: [...needs.values()],
    conditioning: [...conditioning.values()],
  }
}

function read(): SkillPathFile {
  return mergeShipped(readRaw())
}

function write(file: SkillPathFile) {
  const next = { ...file, exportedAt: new Date().toISOString() }
  localStorage.setItem(KEY, JSON.stringify(next))
  for (const cb of listeners) cb()
  void fetch('/api/skill-paths', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(next),
  }).catch(() => {})
}

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

export function matchSkill(label: string): SkillDef | null {
  const q = label.trim().toLowerCase()
  if (!q) return null
  return (
    listSkills().find((s) => {
      if (s.name.toLowerCase() === q) return true
      return (s.aliases ?? []).some((a) => a.toLowerCase() === q)
    }) ??
    listSkills().find((s) => {
      const hay = `${s.name} ${(s.aliases ?? []).join(' ')}`.toLowerCase()
      return hay.includes(q) || q.includes(s.name.toLowerCase())
    }) ??
    null
  )
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
  return getSkill(need.needSkillId)?.name ?? 'Untitled piece'
}

export function saveSkill(input: {
  id?: string
  name: string
  aliases?: string[]
  coachId?: string
  note?: string
  surfaces?: TrainingSurface[]
  powerDown?: PowerDownStep[]
}): SkillDef {
  const file = readRaw()
  const now = new Date().toISOString()
  const existing = input.id ? file.skills.find((s) => s.id === input.id) : null
  const row: SkillDef = {
    id: existing?.id ?? input.id ?? createId('skl'),
    name: input.name.trim(),
    aliases: input.aliases?.map((a) => a.trim()).filter(Boolean),
    coachId: input.coachId,
    note: input.note?.trim() || undefined,
    surfaces: input.surfaces,
    powerDown: input.powerDown,
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
  write({
    ...file,
    skills: file.skills.filter((s) => s.id !== id),
    needs: file.needs.filter((n) => n.skillId !== id && n.needSkillId !== id),
    conditioning: file.conditioning.filter((c) => c.skillId !== id),
    removedSkillIds: [...new Set([...(file.removedSkillIds ?? []), id])],
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
  write({ ...file, needs: file.needs.filter((n) => n.id !== id) })
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
  write({ ...file, conditioning: file.conditioning.filter((c) => c.id !== id) })
}

export function makeSkillGoal(input: {
  skillId?: string
  label?: string
  surface?: TrainingSurface
  source?: AthleteSkillGoal['source']
}): AthleteSkillGoal | null {
  const skill = input.skillId ? getSkill(input.skillId) : matchSkill(input.label ?? '')
  const label = (input.label || skill?.name || '').trim()
  if (!label) return null
  return {
    id: createId('goal'),
    skillId: skill?.id ?? input.skillId,
    label,
    surface: input.surface,
    setAt: new Date().toISOString(),
    source: input.source ?? 'intake',
  }
}

export function goalLine(goal: AthleteSkillGoal): string {
  const surface = surfaceLabel(goal.surface)
  return surface ? `${goal.label} · ${surface}` : goal.label
}

export function resolveGoalSkill(goal: AthleteSkillGoal): SkillDef | null {
  return getSkill(goal.skillId) ?? matchSkill(goal.label)
}

export type GoalGroup = {
  key: string
  label: string
  surface?: TrainingSurface
  skillId?: string
  athletes: Athlete[]
}

export function groupAthletesByGoal(athletes: Athlete[]): GoalGroup[] {
  const map = new Map<string, GoalGroup>()
  const none: Athlete[] = []
  for (const a of athletes) {
    const goals = a.skillGoals?.filter((g) => g.label.trim()) ?? []
    if (goals.length === 0) {
      none.push(a)
      continue
    }
    for (const goal of goals) {
      const skill = resolveGoalSkill(goal)
      const key = `${skill?.id ?? goal.label.toLowerCase()}|${goal.surface ?? ''}`
      const have = map.get(key)
      if (have) {
        if (!have.athletes.some((row) => row.id === a.id)) have.athletes.push(a)
      } else {
        map.set(key, {
          key,
          label: skill?.name ?? goal.label,
          surface: goal.surface,
          skillId: skill?.id,
          athletes: [a],
        })
      }
    }
  }
  const groups = [...map.values()].sort((a, b) => a.label.localeCompare(b.label))
  if (none.length) {
    groups.push({ key: 'none', label: 'Not said yet', athletes: none })
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
    for (const row of data.needs ?? []) {
      if (!row?.id) continue
      needs.set(row.id, row)
    }
    const conditioning = new Map(local.conditioning.map((c) => [c.id, c]))
    for (const row of data.conditioning ?? []) {
      if (!row?.id) continue
      conditioning.set(row.id, row)
    }
    write({
      kind: 'shape-lab-skill-paths',
      version: 1,
      exportedAt: new Date().toISOString(),
      skills: [...skills.values()],
      needs: [...needs.values()],
      conditioning: [...conditioning.values()],
      removedSkillIds: [...new Set([...(local.removedSkillIds ?? []), ...(data.removedSkillIds ?? [])])],
    })
  } catch {
    /* offline */
  }
}
