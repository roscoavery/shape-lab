/**
 * Ryan-editable key-helper overrides for the skill map "shine light" highlight.
 *
 * The hardcoded SKILL_KEY_HELPERS in src/config/skillKeyHelpers.ts are the
 * fallback defaults. Overrides live in data/skill-key-helpers.json on the
 * server and are hydrated here (boot + the 4-second revision poll, like
 * lessons). An override replaces the defaults for that target outright.
 * A target mapped to an explicit empty array means "no key helpers".
 *
 * keyHelperCombosForTarget() is the merged read. It is what
 * buildPathHighlight uses, so the map, the Direct path toggle, and the
 * combo picker all follow Ryan's edits with no other changes.
 */
import { SKILL_KEY_HELPERS } from '../config/skillKeyHelpers'
import { getRegistrySkill } from './skillRegistry'

export type KeyHelperOverrides = Record<string, string[][]>

let overrides: KeyHelperOverrides = {}

const subs = new Set<() => void>()

export function subscribeKeyHelpers(fn: () => void): () => void {
  subs.add(fn)
  return () => {
    subs.delete(fn)
  }
}

function emit() {
  for (const fn of subs) fn()
}

function canonical(id: string): string {
  return id.trim().toLowerCase()
}

function sanitize(raw: unknown): KeyHelperOverrides {
  const out: KeyHelperOverrides = {}
  if (!raw || typeof raw !== 'object') return out
  for (const [target, combos] of Object.entries(raw as Record<string, unknown>)) {
    const t = canonical(target)
    if (!t || !Array.isArray(combos)) continue
    const clean: string[][] = []
    for (const combo of combos) {
      if (!Array.isArray(combo)) continue
      const ids: string[] = []
      for (const id of combo) {
        const canon = typeof id === 'string' ? canonical(id) : ''
        if (canon && !ids.includes(canon)) ids.push(canon)
      }
      clean.push(ids)
    }
    out[t] = clean
  }
  return out
}

/** Pull the latest overrides from the server (also runs on the revision poll). */
export async function hydrateKeyHelpers(): Promise<void> {
  try {
    const res = await fetch('/api/key-helpers')
    if (!res.ok) return
    const data = (await res.json()) as { helpers?: unknown }
    overrides = sanitize(data.helpers)
    emit()
  } catch {
    /* offline or pre-endpoint server: keep defaults */
  }
}

/** Raw overrides, for the editor (target -> combos as stored). */
export function getKeyHelperOverrides(): KeyHelperOverrides {
  return overrides
}

/** The shipped defaults for one target, before any override. */
export function defaultKeyHelperCombos(targetSkillId: string): string[][] {
  return SKILL_KEY_HELPERS[canonical(targetSkillId)] ?? []
}

/** True when Ryan has stored an override for this target (even an empty one). */
export function hasKeyHelperOverride(targetSkillId: string): boolean {
  return Object.prototype.hasOwnProperty.call(overrides, canonical(targetSkillId))
}

/**
 * Merged read: Ryan's override wins when present, otherwise the shipped
 * defaults. Combos are canonicalized and filtered to skills that exist.
 */
export function keyHelperCombosForTarget(
  targetSkillId: string,
  exists: (id: string) => boolean,
): string[][] {
  const canon = canonical(targetSkillId)
  const raw = hasKeyHelperOverride(canon) ? overrides[canon] : SKILL_KEY_HELPERS[canon]
  if (!raw) return []
  const out: string[][] = []
  for (const combo of raw) {
    const ids = combo.map(canonical).filter((id) => id && exists(id))
    if (ids.length > 0) out.push(ids)
  }
  return out
}

/** Save Ryan's combos for one target. Empty combos = explicitly no helpers. */
export async function saveKeyHelperCombos(
  targetSkillId: string,
  combos: string[][],
): Promise<boolean> {
  try {
    const res = await fetch('/api/key-helpers', {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ target: canonical(targetSkillId), combos }),
    })
    if (!res.ok) return false
    const data = (await res.json()) as { helpers?: unknown }
    overrides = sanitize(data.helpers)
    emit()
    return true
  } catch {
    return false
  }
}

/** Drop Ryan's override for one target, restoring the shipped defaults. */
export async function resetKeyHelperCombos(targetSkillId: string): Promise<boolean> {
  try {
    const res = await fetch('/api/key-helpers', {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ target: canonical(targetSkillId), reset: true }),
    })
    if (!res.ok) return false
    const data = (await res.json()) as { helpers?: unknown }
    overrides = sanitize(data.helpers)
    emit()
    return true
  } catch {
    return false
  }
}

/**
 * Toggle one skill's wiggle for a target. Reads the current merged combos,
 * flattens them into a single group, adds or removes the skill, and saves
 * as the coach's explicit override. Multi-combo shipped defaults collapse
 * into the single edited group.
 */
export async function toggleKeyHelperWiggle(
  targetSkillId: string,
  skillId: string,
  on: boolean,
): Promise<boolean> {
  const canon = canonical(targetSkillId)
  const skill = canonical(skillId)
  if (!canon || !skill || !getRegistrySkill(skill)) return false
  const current = keyHelperCombosForTarget(canon, (id) => !!getRegistrySkill(id))
  const set = new Set(current.flat())
  if (on) set.add(skill)
  else set.delete(skill)
  return saveKeyHelperCombos(canon, [[...set]])
}

/** Skill-name lookup for the editor and combo labels. */
export function skillNameFor(id: string): string {
  return getRegistrySkill(canonical(id))?.name ?? id
}
