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

/** Look up a unified skill by its stable skl_* id. */
export function getRegistrySkill(id: string | undefined | null): UnifiedSkill | null {
  if (!id) return null
  return BY_ID.get(id) ?? null
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
  for (const skill of ALL_SKILLS) {
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
    skills: ALL_SKILLS.filter((s) => s.track === track).sort((a, b) =>
      a.name.localeCompare(b.name),
    ),
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
