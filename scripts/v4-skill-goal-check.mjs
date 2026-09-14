#!/usr/bin/env node
/**
 * Skill-goal catalog, pathway merge, and lemon-squeeze logging helpers.
 */
let failed = 0

function ok(name, cond, extra = '') {
  if (cond) {
    console.log(`  pass  ${name}`)
    return
  }
  failed += 1
  console.log(`  FAIL  ${name}${extra ? ` — ${extra}` : ''}`)
}

const catalog = await import('../src/config/skillGoalCatalog.ts')
const homework = await import('../src/lib/lemonHomework.ts')
const seed = await import('../src/config/skillPathSeed.ts')

const standing = catalog.skillGoalChoicesIn('standing').map((r) => r.label)
const running = catalog.skillGoalChoicesIn('running').map((r) => r.label)

ok('standing list is the short hope list', standing.join('|') === [
  'Back bend',
  'Back walkover',
  'Front walkover',
  'Back Handspring',
  'Back handspring series',
  'Tuck',
  'Full',
  'Other',
].join('|'))

ok('running list is the short hope list', running.join('|') === [
  'Strong Round off',
  'Round off back handspring',
  'Front handspring',
  'Round off series (3 back handsprings)',
  'Ro hs tuck',
  'Ro hs layout',
  'Ro hs full',
  'Ro hs double full',
  'Arabian',
  'Punch front',
  'Other',
].join('|'))

ok(
  'picker is not the whole pathway',
  catalog.SKILL_GOAL_CHOICES.length < seed.SHIPPED_SKILLS.length + 20 &&
    catalog.SKILL_GOAL_CHOICES.length <= 20,
)

ok('round-off punctuation matches', catalog.labelsMatch('Round-off', 'round off'))
ok('ro hs full does not equal standing full', !catalog.labelsMatch('Ro hs full', 'Full'))

const shippedKeys = new Map()
for (const skill of seed.SHIPPED_SKILLS) {
  for (const key of [catalog.skillKey(skill.name), ...(skill.aliases ?? []).map(catalog.skillKey)]) {
    if (!shippedKeys.has(key)) shippedKeys.set(key, skill)
  }
}

function pathwayHit(choice) {
  const names = [choice.label, ...(choice.matchNames ?? [])]
  for (const name of names) {
    const hit = shippedKeys.get(catalog.skillKey(name))
    if (hit) return hit
  }
  return null
}

const tuck = catalog.SKILL_GOAL_CHOICES.find((c) => c.id === 'stand_tuck')
const roTuck = catalog.SKILL_GOAL_CHOICES.find((c) => c.id === 'run_ro_hs_tuck')
const arabian = catalog.SKILL_GOAL_CHOICES.find((c) => c.id === 'run_arabian')
ok('standing tuck merges to standing back tuck', pathwayHit(tuck)?.id === 'skl_standing_tuck')
ok('ro hs tuck merges to round-off handspring tuck', pathwayHit(roTuck)?.id === 'skl_ro_bhs_tuck')
ok('arabian is not auto-added to the pathway', pathwayHit(arabian) == null)
ok(
  'typing a pathway name would merge',
  shippedKeys.get(catalog.skillKey('Ro hs tuck'))?.id === 'skl_ro_bhs_tuck',
)
ok('a hope that is not in the pathway stays custom', !shippedKeys.get(catalog.skillKey('Laser flip')))

const finished = homework.lemonHomeworkFromCheck({
  finished: true,
  plannedSets: 3,
  plannedReps: 10,
})
ok('finished lemons log selected volume', finished.chosenReps === 10 && finished.chosenSets === 3 && !finished.incomplete)

const attempt = homework.lemonHomeworkFromCheck({
  finished: false,
  plannedSets: 3,
  plannedReps: 10,
  actualReps: 7,
})
ok('missed lemons log attempt count', attempt.incomplete && attempt.chosenReps === 7 && attempt.chosenSets == null)
ok('attempt label names the miss', String(attempt.sourceLabel).includes('attempt') && String(attempt.sourceLabel).includes('7 of 3×10'))

if (failed) {
  console.error(`\n${failed} skill-goal check(s) failed`)
  process.exit(1)
}
console.log('\nskill-goal checks passed')
