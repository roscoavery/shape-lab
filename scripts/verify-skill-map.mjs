/**
 * Verify the unified skill registry's internal consistency.
 *
 * (Rewritten for Phase 5 of the skill-path merge: the old source configs
 *  skillGoalCatalog.ts and ryanSkillPath.ts are gone. This script now checks
 *  the unified seed against itself and the live progression seed.)
 *
 * Loads src/config/unifiedSkillSeed.ts, src/config/skillPathSeed.ts,
 * src/config/skillCues.ts and checks:
 *  - no duplicate ids / guideIds / normalized names / normalized aliases
 *  - every GUIDE_ORDER id resolves to a record with a guide card
 *  - records without a guide card carry no prose fields
 *  - cue-swap ids are not present in the registry
 *  - shipped needs/conditioning reference valid registry skill ids
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
    `export { UNIFIED_SKILL_SEED } from '${ROOT}/src/config/unifiedSkillSeed'`,
    `export { SHIPPED_SKILLS, SHIPPED_NEEDS, SHIPPED_CONDITIONING } from '${ROOT}/src/config/skillPathSeed'`,
    `export { RYAN_CUE_SWAPS } from '${ROOT}/src/config/skillCues'`,
    `export { GUIDE_ORDER } from '${ROOT}/src/lib/skillRegistry'`,
  ].join('\n'),
)
const bundle = join(dir, 'bundle.mjs')
execFileSync(ESBUILD, [entry, '--bundle', '--format=esm', '--platform=node', `--outfile=${bundle}`, '--log-level=error'])

const { UNIFIED_SKILL_SEED, SHIPPED_SKILLS, SHIPPED_NEEDS, SHIPPED_CONDITIONING, RYAN_CUE_SWAPS, GUIDE_ORDER } =
  await import(bundle)

const failures = []
const fail = (msg) => failures.push(msg)
const norm = (s) => s.toLowerCase().replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, ' ').replace(/\s+/g, ' ').trim()

const byId = new Map(UNIFIED_SKILL_SEED.map((r) => [r.id, r]))

// ---- 1. duplicates / collisions ----
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
  checkDup('name', norm(r.name), r.id)
  for (const a of r.aliases ?? []) {
    const k = norm(a)
    if (aliasOwners.has(k)) fail(`alias collision: "${a}" on ${r.id} already claimed by ${aliasOwners.get(k)}`)
    else aliasOwners.set(k, r.id)
    const nameOwner = UNIFIED_SKILL_SEED.find((o) => o.id !== r.id && norm(o.name) === k)
    if (nameOwner) fail(`alias "${a}" on ${r.id} collides with name of ${nameOwner.id}`)
  }
}

// ---- 2. guide order resolves ----
const byGuideId = new Map()
for (const r of UNIFIED_SKILL_SEED) if (r.guideId) byGuideId.set(r.guideId, r)
for (const gid of GUIDE_ORDER) {
  if (!byGuideId.has(gid)) fail(`GUIDE_ORDER id "${gid}" has no registry record`)
}

// ---- 3. records without a guide card carry no prose ----
for (const r of UNIFIED_SKILL_SEED) {
  if (!r.guideId) {
    for (const f of ['guideNeeds', 'canBend', 'ask', 'ryanNote']) {
      if (r[f] !== undefined) fail(`record ${r.id} has no guide card but carries ${f}`)
    }
  }
}

// ---- 4. cue swaps excluded ----
const cueIds = new Set(RYAN_CUE_SWAPS.map((c) => c.id))
for (const r of UNIFIED_SKILL_SEED) {
  if (cueIds.has(r.guideId) || cueIds.has(r.id)) fail(`cue swap leaked into registry: ${r.id}`)
}

// ---- 5. shipped progression data references valid skills ----
for (const s of SHIPPED_SKILLS) {
  if (!byId.has(s.id)) fail(`shipped seed skill ${s.id} has no registry record`)
}
for (const n of SHIPPED_NEEDS) {
  if (!byId.has(n.skillId)) fail(`shipped need ${n.id} references unknown skill ${n.skillId}`)
  if (n.needSkillId && !byId.has(n.needSkillId)) fail(`shipped need ${n.id} references unknown needSkill ${n.needSkillId}`)
}
for (const c of SHIPPED_CONDITIONING) {
  if (!byId.has(c.skillId)) fail(`shipped conditioning ${c.id} references unknown skill ${c.skillId}`)
}

// ---- report ----
console.log(`records: ${UNIFIED_SKILL_SEED.length}`)
console.log(`guide cards: ${byGuideId.size}`)
console.log(`guide order entries: ${GUIDE_ORDER.length}`)
console.log(`shipped needs: ${SHIPPED_NEEDS.length}, shipped conditioning: ${SHIPPED_CONDITIONING.length}`)
if (failures.length) {
  console.log('FAILURES:')
  for (const f of failures) console.log('  - ' + f)
  process.exit(1)
}
console.log('OK: registry is clean')
