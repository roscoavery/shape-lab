/**
 * Verify the Phase 0 unified skill mapping.
 *
 * Loads the three source configs plus src/config/unifiedSkillSeed.ts and checks:
 *  - every non-"Other" catalog choice is claimed by exactly one unified record
 *  - every seed skill id has exactly one unified record
 *  - every guide step id is claimed by exactly one unified record
 *  - no duplicate ids / guideIds / catalogIds / normalized names / normalized aliases
 *  - guide prose (guideNeeds, canBend, ask, ryanNote) is verbatim vs ryanSkillPath.ts
 *  - records without a guide card carry no prose fields
 *  - cue-swap ids are not present (they are separate content)
 *
 * Exit 0 when clean, 1 on any conflict.
 *
 * Usage: node scripts/verify-skill-map.mjs
 */
import { execFileSync } from 'node:child_process'
import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const ROOT = '/home/hatch/workspace/shape-lab'
const ESBUILD = join(ROOT, 'node_modules/@esbuild/linux-x64/bin/esbuild')

const dir = mkdtempSync(join(tmpdir(), 'skillmap-verify-'))
const entry = join(dir, 'entry.ts')
writeFileSync(
  entry,
  [
    `export { SKILL_GOAL_CHOICES } from '${ROOT}/src/config/skillGoalCatalog'`,
    `export { SHIPPED_SKILLS } from '${ROOT}/src/config/skillPathSeed'`,
    `export { RYAN_SKILL_PATH, RYAN_CUE_SWAPS } from '${ROOT}/src/config/ryanSkillPath'`,
    `export { UNIFIED_SKILL_SEED } from '${ROOT}/src/config/unifiedSkillSeed'`,
  ].join('\n'),
)
const bundle = join(dir, 'bundle.mjs')
execFileSync(ESBUILD, [entry, '--bundle', '--format=esm', '--platform=node', `--outfile=${bundle}`, '--log-level=error'])

const { SKILL_GOAL_CHOICES, SHIPPED_SKILLS, RYAN_SKILL_PATH, RYAN_CUE_SWAPS, UNIFIED_SKILL_SEED } =
  await import(bundle)

const failures = []
const warnings = []
const fail = (msg) => failures.push(msg)
const norm = (s) => s.toLowerCase().replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, ' ').replace(/\s+/g, ' ').trim()

// ---- 1. catalog coverage ----
for (const c of SKILL_GOAL_CHOICES) {
  if (c.other) continue
  const claimants = UNIFIED_SKILL_SEED.filter((r) => r.catalogId === c.id)
  if (claimants.length === 0) fail(`catalog choice unmapped: ${c.id} ("${c.label}")`)
  if (claimants.length > 1) fail(`catalog choice claimed twice: ${c.id} by ${claimants.map((r) => r.id).join(', ')}`)
}
// every catalogId on a record must exist
for (const r of UNIFIED_SKILL_SEED) {
  if (r.catalogId && !SKILL_GOAL_CHOICES.some((c) => c.id === r.catalogId)) {
    fail(`record ${r.id} references unknown catalogId ${r.catalogId}`)
  }
}

// ---- 2. seed coverage ----
for (const s of SHIPPED_SKILLS) {
  const claimants = UNIFIED_SKILL_SEED.filter((r) => r.id === s.id)
  if (claimants.length === 0) fail(`seed skill unmapped: ${s.id} ("${s.name}")`)
  if (claimants.length > 1) fail(`seed id claimed twice: ${s.id}`)
}

// ---- 3. guide coverage ----
for (const g of RYAN_SKILL_PATH) {
  const claimants = UNIFIED_SKILL_SEED.filter((r) => r.guideId === g.id)
  if (claimants.length === 0) fail(`guide step unmapped: ${g.id} ("${g.skill}")`)
  if (claimants.length > 1) fail(`guide id claimed twice: ${g.id} by ${claimants.map((r) => r.id).join(', ')}`)
}

// ---- 4. duplicates / collisions ----
const seen = new Map()
const checkDup = (kind, key, owner) => {
  if (!key) return
  if (seen.has(kind + ':' + key)) fail(`duplicate ${kind} "${key}": ${seen.get(kind + ':' + key)} and ${owner}`)
  else seen.set(kind + ':' + key, owner)
}
const aliasOwners = new Map()
for (const r of UNIFIED_SKILL_SEED) {
  checkDup('id', r.id, r.id)
  checkDup('guideId', r.guideId, r.id)
  checkDup('catalogId', r.catalogId, r.id)
  checkDup('name', norm(r.name), r.id)
  for (const a of r.aliases ?? []) {
    const k = norm(a)
    if (aliasOwners.has(k)) fail(`alias collision: "${a}" on ${r.id} already claimed by ${aliasOwners.get(k)}`)
    else aliasOwners.set(k, r.id)
    // an alias must not equal another record's normalized name
    const nameOwner = UNIFIED_SKILL_SEED.find((o) => o.id !== r.id && norm(o.name) === k)
    if (nameOwner) fail(`alias "${a}" on ${r.id} collides with name of ${nameOwner.id}`)
  }
}

// ---- 5. prose verbatim ----
const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b)
for (const r of UNIFIED_SKILL_SEED) {
  const g = RYAN_SKILL_PATH.find((s) => s.id === r.guideId)
  if (g) {
    if (!eq(r.guideNeeds, g.needs)) fail(`prose mismatch guideNeeds on ${r.id}`)
    if (!eq(r.canBend, g.canBend)) fail(`prose mismatch canBend on ${r.id}`)
    if (!eq(r.ask, g.ask)) fail(`prose mismatch ask on ${r.id}`)
    if ((r.ryanNote ?? undefined) !== (g.ryanNote ?? undefined)) fail(`prose mismatch ryanNote on ${r.id}`)
  } else {
    for (const f of ['guideNeeds', 'canBend', 'ask', 'ryanNote']) {
      if (r[f] !== undefined) fail(`record ${r.id} has no guide card but carries ${f}`)
    }
  }
}

// ---- 6. cue swaps excluded ----
const cueIds = new Set(RYAN_CUE_SWAPS.map((c) => c.id))
for (const r of UNIFIED_SKILL_SEED) {
  if (cueIds.has(r.guideId) || cueIds.has(r.id)) fail(`cue swap leaked into registry: ${r.id}`)
}

// ---- report ----
console.log(`records: ${UNIFIED_SKILL_SEED.length}`)
console.log(`catalog choices mapped: ${SKILL_GOAL_CHOICES.filter((c) => !c.other).length}/${SKILL_GOAL_CHOICES.filter((c) => !c.other).length}`)
console.log(`seed skills mapped: ${SHIPPED_SKILLS.length}/${SHIPPED_SKILLS.length}`)
console.log(`guide steps mapped: ${RYAN_SKILL_PATH.length}/${RYAN_SKILL_PATH.length}`)
if (warnings.length) console.log('warnings:\n' + warnings.map((w) => '  - ' + w).join('\n'))
if (failures.length) {
  console.log('FAILURES:')
  for (const f of failures) console.log('  - ' + f)
  process.exit(1)
}
console.log('OK: mapping is clean')
