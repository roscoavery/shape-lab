/**
 * "Shine light" path highlight — shared by the skill map views and the
 * skill card Path tab. Given a target skill, build the transitive
 * prerequisite closure: required-path skills get distances (for the
 * bottom-to-top traveling glow), helpful-path skills get a softer glow,
 * and everything else fades out of focus.
 *
 * Highlight mode never blocks the card: tapping a skill still opens it.
 */
import { useEffect, useState } from 'react'
import {
  CANONICAL_SKILL_ID,
  canonicalSkillId,
  conditioningForSkill,
  needsForSkill,
  searchSkills,
  subscribeSkillPaths,
  type ConditioningNeed,
} from './skillPaths'
import { getRegistrySkill } from './skillRegistry'
import { keyHelperCombosFor } from '../config/skillKeyHelpers'

/** Prerequisite needs for a skill, including rows keyed to consolidated ids. */
export function needsForSkillConsolidated(skillId: string) {
  const ids = new Set([skillId])
  for (const [oldId, canon] of Object.entries(CANONICAL_SKILL_ID)) {
    if (canon === skillId) ids.add(oldId)
  }
  return [...ids].flatMap((id) => needsForSkill(id))
}

/** Conditioning (shapes/body prep) for a skill, incl. consolidated-id rows. */
export function conditioningForSkillConsolidated(skillId: string): ConditioningNeed[] {
  const ids = new Set([skillId])
  for (const [oldId, canon] of Object.entries(CANONICAL_SKILL_ID)) {
    if (canon === skillId) ids.add(oldId)
  }
  const seen = new Set<string>()
  return [...ids].flatMap((id) => conditioningForSkill(id)).filter((c) => {
    if (seen.has(c.id)) return false
    seen.add(c.id)
    return true
  })
}

export type PathHighlight = {
  /** Canonical target skill id. */
  target: string
  targetName: string
  /** Required-path skills: id -> distance from the target (0 = target). */
  required: Map<string, number>
  /** Helpful-but-not-required skills: id -> distance from the target. */
  helpful: Map<string, number>
  /** Deepest required distance — drives the bottom-to-top travel delay. */
  maxDist: number
  /** Key-helper combos for the target (most adjacent skills). */
  combos: string[][]
  /** Which combo is active (index into combos). */
  comboIdx: number
  /** Canonical ids in the active combo — these wiggle on top of their glow. */
  keyHelpers: Set<string>
  /** Direct-path mode: only the target + key helpers stay lit. */
  direct: boolean
}

/**
 * Transitive prerequisite closure for a target skill.
 *
 * - required: reached from the target following ONLY required edges.
 * - helpful: reached following required+helpful edges, minus the required set.
 * - ids are canonicalized so old goal/need ids land on the tile.
 * - cycle-safe: first visit wins, BFS so distances are shortest.
 * - keyHelpers: the active key-helper combo from SKILL_KEY_HELPERS (if any).
 */
export function buildPathHighlight(
  targetSkillId: string,
  opts?: { comboIdx?: number; direct?: boolean },
): PathHighlight | null {
  const target = canonicalSkillId(targetSkillId)
  const reg = getRegistrySkill(target)
  if (!target || !reg) return null

  const required = new Map<string, number>([[target, 0]])
  const queue: Array<[string, number]> = [[target, 0]]
  while (queue.length > 0) {
    const [id, d] = queue.shift()!
    for (const need of needsForSkillConsolidated(id)) {
      if (need.kind !== 'required' || !need.needSkillId) continue
      const canon = canonicalSkillId(need.needSkillId)
      if (!getRegistrySkill(canon) || required.has(canon)) continue
      required.set(canon, d + 1)
      queue.push([canon, d + 1])
    }
  }

  const helpful = new Map<string, number>()
  const seen = new Set<string>([target])
  const queue2: Array<[string, number]> = [[target, 0]]
  while (queue2.length > 0) {
    const [id, d] = queue2.shift()!
    for (const need of needsForSkillConsolidated(id)) {
      if ((need.kind !== 'required' && need.kind !== 'helpful') || !need.needSkillId) continue
      const canon = canonicalSkillId(need.needSkillId)
      if (!getRegistrySkill(canon) || seen.has(canon)) continue
      seen.add(canon)
      if (!required.has(canon)) helpful.set(canon, d + 1)
      queue2.push([canon, d + 1])
    }
  }

  let maxDist = 0
  for (const d of required.values()) {
    if (d > maxDist) maxDist = d
  }
  const combos = keyHelperCombosFor(target, (id) => !!getRegistrySkill(id))
  const comboIdx =
    combos.length > 0 ? Math.min(Math.max(opts?.comboIdx ?? 0, 0), combos.length - 1) : 0
  return {
    target,
    targetName: reg.name,
    required,
    helpful,
    maxDist,
    combos,
    comboIdx,
    keyHelpers: new Set(combos[comboIdx] ?? []),
    direct: !!opts?.direct && combos.length > 0,
  }
}

/** Re-render whenever the skill-path file changes (e.g. Ryan edits needs). */
export function usePathTick(): number {
  const [tick, setTick] = useState(0)
  useEffect(() => subscribeSkillPaths(() => setTick((t) => t + 1)), [])
  return tick
}

export type MapSearchResult = {
  skillId: string
  /** The tile's label on the map (may differ from the registry name). */
  label: string
  name: string
}

/**
 * Search the skills actually on the map. Uses the skill-path skill search
 * for the query, then falls back to tile-label matching so every visible
 * tile is findable. Results are canonicalized map ids.
 */
export function searchMapSkills(
  query: string,
  mapIds: Set<string>,
  labelOf: (id: string) => string,
): MapSearchResult[] {
  const out = new Map<string, MapSearchResult>()
  const add = (id: string) => {
    const canon = canonicalSkillId(id)
    if (!mapIds.has(canon) || out.has(canon)) return
    const reg = getRegistrySkill(canon)
    if (!reg) return
    out.set(canon, { skillId: canon, label: labelOf(canon), name: reg.name })
  }
  const q = query.trim().toLowerCase()
  if (!q) return []
  for (const s of searchSkills(query)) add(s.id)
  for (const id of mapIds) {
    const reg = getRegistrySkill(id)
    const hay = `${labelOf(id)} ${reg?.name ?? ''} ${(reg?.aliases ?? []).join(' ')}`.toLowerCase()
    if (hay.includes(q)) add(id)
  }
  return [...out.values()].sort((a, b) => a.label.localeCompare(b.label))
}
