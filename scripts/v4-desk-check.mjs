#!/usr/bin/env node
/**
 * Birthday ISO helpers and gym aliases.
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

const age = await import('../src/lib/age.ts')
const gyms = await import('../src/config/gyms.ts')

ok('tumble is Tumble Smart Athletics', gyms.normalizeGymName('tumble') === gyms.TUMBLE_SMART)
ok('Tumble Smart stays the home gym', gyms.normalizeGymName('Tumble Smart') === gyms.TUMBLE_SMART)
ok('TSA alias still maps', gyms.normalizeGymName('tsa') === gyms.TUMBLE_SMART)
ok('other gyms stay free text', gyms.normalizeGymName('Westside') === 'Westside')

ok('Feb 2024 has 29 days', age.daysInMonth(2024, 2) === 29)
ok('Feb 2025 has 28 days', age.daysInMonth(2025, 2) === 28)
ok('unknown year still allows Feb 29', age.daysInMonth(0, 2) === 29)
ok('iso birthday is valid', age.isoDateOfBirth(2014, 3, 14) === '2014-03-14')
ok('future birthday rejected', age.isoDateOfBirth(2099, 1, 1) == null)
ok('Feb 31 rejected', age.isoDateOfBirth(2015, 2, 31) == null)
ok('split round-trips', age.splitDateOfBirth('2014-03-14')?.day === 14)
ok('age from iso', age.getAgeFromDateOfBirth('2014-03-14', new Date(2026, 8, 14)) === 12)

if (failed) {
  console.log(`\n${failed} failed`)
  process.exit(1)
}
console.log('\nall passed')
