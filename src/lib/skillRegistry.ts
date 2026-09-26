/**
 * Unified skill registry — Phase 1 of the skill-path merge (2026-09-26).
 *
 * Single source of truth for skill identity. Backed by the unified seed
 * (src/config/unifiedSkillSeed.ts), which merges the old athlete goal
 * catalog, the coach progression seed, and the Learn guide cards.
 *
 * This module is deliberately pure: no storage imports, so storage.ts can
 * use it for the one-time goal migration without an import cycle.
 */

import {
  UNIFIED_SKILL_SEED,
  type UnifiedSkill,
  type UnifiedSkillTrack,
} from '../config/unifiedSkillSeed'
import type { Athlete, AthleteSkillGoal, TrainingSurface } from '../types'

export type { UnifiedSkill, UnifiedSkillTrack }

/** Same normalization the old goal catalog used: lowercase, & → and, punctuation → spaces. */
export function normalizeSkillText(label: string): string {
  return label
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export const TRACK_LABELS: Record<UnifiedSkillTrack, string> = {
  running: 'Running',
  standing: 'Standing',
  walking: 'Walking',
  foundation: 'Foundation',
}

export const TRACK_ORDER: UnifiedSkillTrack[] = ['running', 'standing', 'walking', 'foundation']

const ALL_SKILLS: UnifiedSkill[] = UNIFIED_SKILL_SEED

const BY_ID = new Map<string, UnifiedSkill>()
const BY_KEY = new Map<string, UnifiedSkill>()
for (const skill of ALL_SKILLS) {
  BY_ID.set(skill.id, skill)
  const keys = [skill.name, ...(skill.aliases ?? [])]
    .map(normalizeSkillText)
    .filter(Boolean)
  for (const key of keys) {
    if (!BY_KEY.has(key)) BY_KEY.set(key, skill)
  }
}

/** Look up a unified skill by its stable skl_* id. Device overrides applied. */
export function getRegistrySkill(id: string | undefined | null): UnifiedSkill | null {
  if (!id) return null
  const skill = BY_ID.get(id)
  return skill ? applyOverride(skill) : null
}

const BY_GUIDE_ID = new Map<string, UnifiedSkill>()
for (const skill of ALL_SKILLS) {
  if (skill.guideId) BY_GUIDE_ID.set(skill.guideId, skill)
}

/**
 * Look up a unified skill by its guide card id (the kebab-case
 * ryanSkillPath step id). Returns null when no guide card exists yet.
 */
export function getRegistrySkillByGuideId(guideId: string | undefined | null): UnifiedSkill | null {
  if (!guideId) return null
  const skill = BY_GUIDE_ID.get(guideId)
  return skill ? applyOverride(skill) : null
}

/** All registry skills that have a guide card, keyed by guide id. */
export function guideSkills(): UnifiedSkill[] {
  return ALL_SKILLS.filter((s) => s.guideId).map(applyOverride)
}

/** Registry skills with no guide card yet — shown as placeholders in the guide. */
export function guidelessSkills(): UnifiedSkill[] {
  return ALL_SKILLS.filter((s) => !s.guideId).map(applyOverride)
}

/* ------------------------------------------------------------------ */
/* Device overrides (Phase 3).                                         */
/*                                                                      */
/* The skill editor (SkillPathBuilder) lets Ryan maintain aliases,     */
/* track, and guide prose per skill. Those edits persist in the         */
/* skill-paths file (localStorage + data/skill-paths.json) and are     */
/* merged over the repo seed here, so the guide cards, picker, and     */
/* search all see them without any caller changing. The registry       */
/* module stays import-cycle-safe: overrides are pushed in by           */
/* skillPaths.ts, never pulled.                                         */
/* ------------------------------------------------------------------ */

/** Fields the editor is allowed to override per skill. Name stays canonical. */
export type RegistryOverride = Partial<
  Pick<
    UnifiedSkill,
    'aliases' | 'track' | 'guideNeeds' | 'canBend' | 'ask' | 'ryanNote'
  >
>

const OVERRIDES = new Map<string, RegistryOverride>()

function cleanOverride(o: RegistryOverride): RegistryOverride {
  const clean: RegistryOverride = {}
  if (o.aliases !== undefined) clean.aliases = o.aliases
  if (o.track !== undefined) clean.track = o.track
  if (o.guideNeeds !== undefined) clean.guideNeeds = o.guideNeeds
  if (o.canBend !== undefined) clean.canBend = o.canBend
  if (o.ask !== undefined) clean.ask = o.ask
  if (o.ryanNote !== undefined) clean.ryanNote = o.ryanNote
  return clean
}

/** Register (or clear, when empty) a device override for a skill id. */
export function setRegistryOverride(id: string, override: RegistryOverride): void {
  const clean = cleanOverride(override)
  if (Object.keys(clean).length === 0) OVERRIDES.delete(id)
  else OVERRIDES.set(id, clean)
}

/** Drop every registered override. skillPaths re-registers after each write. */
export function clearRegistryOverrides(): void {
  OVERRIDES.clear()
}

function applyOverride(skill: UnifiedSkill): UnifiedSkill {
  const o = OVERRIDES.get(skill.id)
  if (!o) return skill
  return { ...skill, ...o }
}

/**
 * Exact normalized match of a label against skill names + aliases.
 * Used by the one-time goal migration and the picker's custom-text path.
 */
export function matchRegistrySkill(label: string): UnifiedSkill | null {
  const key = normalizeSkillText(label)
  if (!key) return null
  return BY_KEY.get(key) ?? null
}

export type SkillSearchHit = {
  skill: UnifiedSkill
  /** 0 = exact, 1 = starts-with, 2 = word-boundary, 3 = contains */
  rank: number
}

/**
 * Type-ahead search over the registry. Matches against the skill name and
 * all aliases, normalized. Results are ranked (exact first) and sorted
 * alphabetically within a rank.
 */
export function searchSkills(query: string, limit = 30): SkillSearchHit[] {
  const q = normalizeSkillText(query)
  if (!q) return []
  const hits: SkillSearchHit[] = []
  for (const seed of ALL_SKILLS) {
    const skill = applyOverride(seed)
    const names = [skill.name, ...(skill.aliases ?? [])]
    let best = -1
    for (const name of names) {
      const n = normalizeSkillText(name)
      if (!n) continue
      if (n === q) {
        best = 0
        break
      }
      if (n.startsWith(q)) best = best < 0 ? 1 : Math.min(best, 1)
      else if (n.split(' ').some((w) => w.startsWith(q))) best = best < 0 ? 2 : Math.min(best, 2)
      else if (n.includes(q)) best = best < 0 ? 3 : Math.min(best, 3)
    }
    if (best >= 0) hits.push({ skill, rank: best })
  }
  hits.sort(
    (a, b) => a.rank - b.rank || a.skill.name.localeCompare(b.skill.name),
  )
  return hits.slice(0, limit)
}

/** All registry skills grouped by track, in track order. */
export function skillsByTrack(): { track: UnifiedSkillTrack; skills: UnifiedSkill[] }[] {
  return TRACK_ORDER.map((track) => ({
    track,
    skills: ALL_SKILLS.filter((s) => applyOverride(s).track === track)
      .map(applyOverride)
      .sort((a, b) => a.name.localeCompare(b.name)),
  }))
}

/** Total skills in the registry. */
export function registrySkillCount(): number {
  return ALL_SKILLS.length
}

export type GoalMigrationLog = {
  stamped: number
  /** Human-readable lines describing what changed, for review. */
  lines: string[]
}

/**
 * One-time migration helper (pure): for every athlete goal missing a
 * skillId, try to resolve its label against the registry. Returns a new
 * athlete array with newly-resolvable goals stamped.
 *
 * Additive only — unmatched goals are returned untouched, never deleted
 * or relabeled. Idempotent: running it twice stamps nothing new.
 */
export function migrateGoalSkillIds(
  athletes: Athlete[],
): { athletes: Athlete[]; log: GoalMigrationLog } {
  const lines: string[] = []
  let stamped = 0
  const next = athletes.map((athlete) => {
    if (!athlete || !Array.isArray(athlete.skillGoals) || athlete.skillGoals.length === 0) {
      return athlete
    }
    let changed = false
    const goals: AthleteSkillGoal[] = athlete.skillGoals.map((goal) => {
      if (!goal || goal.skillId) return goal
      const label = (goal.label || '').trim()
      if (!label) return goal
      const skill = matchRegistrySkill(label)
      if (!skill) return goal
      changed = true
      stamped += 1
      lines.push(
        `${athlete.name || athlete.id}: "${label}" → ${skill.id} (${skill.name})`,
      )
      return { ...goal, skillId: skill.id }
    })
    return changed ? { ...athlete, skillGoals: goals } : athlete
  })
  return { athletes: next, log: { stamped, lines } }
}

/** Build a goal stamped to a registry skill at creation — no post-hoc text matching. */
export function makeRegistrySkillGoal(
  skill: UnifiedSkill,
  opts: {
    createId: (prefix: string) => string
    surface?: TrainingSurface
    source?: AthleteSkillGoal['source']
  },
): AthleteSkillGoal {
  return {
    id: opts.createId('goal'),
    skillId: skill.id,
    label: skill.name,
    surface: opts.surface,
    setAt: new Date().toISOString(),
    source: opts.source ?? 'intake',
  }
}
