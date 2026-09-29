/**
 * Key helpers for the skill map "shine light" highlight.
 *
 * For some skills, a small set of the most adjacent / most important helper
 * skills matters more than the whole prerequisite chain. Those tiles get a
 * subtle wiggle on top of their glow so they draw the eye, and the
 * "Direct path" toggle shows ONLY the target plus these helpers (assuming
 * everything below them is already had).
 *
 * Ryan edits this list directly. Keys and values are canonical skill ids
 * (the `skl_*` ids in `src/config/unifiedSkillSeed.ts`). Each target maps to
 * one or more combos; each combo is a list of skill ids that together are
 * enough. When a target has several combos the map shows a picker.
 */
export const SKILL_KEY_HELPERS: Record<string, string[][]> = {
  /** Back full: layout + half + front half are the big three. */
  skl_back_full: [['skl_layout', 'skl_back_half', 'skl_barani']],
  /** Back double full: a back full alone, or arabian + front rudi. */
  skl_double_full: [['skl_back_full'], ['skl_arabian', 'skl_front_15']],
  /** Back tuck: series + front tuck + backward roll. */
  skl_ro_bhs_tuck: [['skl_ro_bhs_series', 'skl_front_tuck', 'skl_backward_roll']],
}

function canonical(id: string): string {
  return id.trim().toLowerCase()
}

/**
 * The key-helper combos for a target skill, canonicalized and filtered to
 * skills that actually exist in the registry. Empty combos are dropped.
 */
export function keyHelperCombosFor(
  targetSkillId: string,
  exists: (id: string) => boolean,
): string[][] {
  const raw = SKILL_KEY_HELPERS[canonical(targetSkillId)]
  if (!raw) return []
  const out: string[][] = []
  for (const combo of raw) {
    const ids = combo.map(canonical).filter((id) => id && exists(id))
    if (ids.length > 0) out.push(ids)
  }
  return out
}
