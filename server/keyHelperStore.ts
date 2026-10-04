import { readJson, writeJson } from './persist.ts'

const FILE = 'data/skill-key-helpers.json'

/**
 * Ryan-editable key-helper overrides for the skill map "shine light"
 * highlight. The hardcoded SKILL_KEY_HELPERS in src/config/skillKeyHelpers.ts
 * remain the fallback defaults; anything stored here replaces the defaults
 * for that target skill outright. A target with an explicit empty combos
 * array means "no key helpers" (not "fall back to defaults"); deleting the
 * target's entry restores the defaults.
 */
export type KeyHelperOverrides = Record<string, string[][]>

type DiskFile = {
  kind: 'shape-lab-key-helpers'
  version: 1
  exportedAt?: string
  helpers: KeyHelperOverrides
}

const EMPTY: DiskFile = { kind: 'shape-lab-key-helpers', version: 1, helpers: {} }

const MAX_TARGETS = 200
const MAX_COMBOS = 8
const MAX_SKILLS_PER_COMBO = 12

function safeSkillId(id: unknown): string | null {
  if (typeof id !== 'string') return null
  const s = id.trim().toLowerCase()
  if (!s || s.length > 80) return null
  if (!/^[a-z0-9_]+$/.test(s)) return null
  return s
}

function safeCombos(raw: unknown): string[][] | null {
  if (!Array.isArray(raw)) return null
  if (raw.length > MAX_COMBOS) return null
  const out: string[][] = []
  for (const combo of raw) {
    if (!Array.isArray(combo)) return null
    if (combo.length > MAX_SKILLS_PER_COMBO) return null
    const ids: string[] = []
    for (const id of combo) {
      const safe = safeSkillId(id)
      if (safe && !ids.includes(safe)) ids.push(safe)
    }
    out.push(ids)
  }
  return out
}

export async function keyHelpersForClient(): Promise<KeyHelperOverrides> {
  const data = await readJson<DiskFile>(FILE, { ...EMPTY })
  const raw = data.helpers
  if (!raw || typeof raw !== 'object') return {}
  const out: KeyHelperOverrides = {}
  for (const [target, combos] of Object.entries(raw)) {
    const t = safeSkillId(target)
    const c = safeCombos(combos)
    if (t && c) out[t] = c
  }
  return out
}

/**
 * Set (or with reset=true, delete) the override for one target skill.
 * Returns the full overrides object for the client.
 */
export async function saveKeyHelperOverride(
  rawTarget: unknown,
  rawCombos: unknown,
  reset = false,
): Promise<KeyHelperOverrides | null> {
  const target = safeSkillId(rawTarget)
  if (!target) return null
  const current = await keyHelpersForClient()
  if (reset) {
    delete current[target]
  } else {
    const combos = safeCombos(rawCombos)
    if (!combos) return null
    current[target] = combos
  }
  const trimmed: KeyHelperOverrides = {}
  for (const [t, c] of Object.entries(current).slice(0, MAX_TARGETS)) {
    trimmed[t] = c
  }
  await writeJson(FILE, {
    kind: 'shape-lab-key-helpers',
    version: 1,
    exportedAt: new Date().toISOString(),
    helpers: trimmed,
  } satisfies DiskFile)
  return trimmed
}
