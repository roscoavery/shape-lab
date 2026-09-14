#!/usr/bin/env node
/**
 * Family / role isolation checks. Does not flood account-create or invite routes.
 */
const BASE = process.env.SHAPE_LAB_TEST_URL || 'http://127.0.0.1:43127'
const ADMIN_EMAIL = process.env.SHAPE_LAB_BOOTSTRAP_ADMIN_EMAIL || 'v4-admin@example.com'
const ADMIN_PASSWORD = process.env.SHAPE_LAB_BOOTSTRAP_ADMIN_PASSWORD || 'v4-admin-test-password'
const COACH_EMAIL = 'v4-coach@example.com'
const COACH_PASSWORD = 'v4-coach-test-password'

let failed = 0
const csrfByCookie = new Map()

function ok(name, cond, extra = '') {
  if (cond) {
    console.log(`  pass  ${name}`)
    return
  }
  failed += 1
  console.log(`  FAIL  ${name}${extra ? ` — ${extra}` : ''}`)
}

let csrfMod = null

async function req(path, opts = {}) {
  if (!csrfMod) csrfMod = await import('../server/auth/csrf.ts')
  const headers = { ...(opts.headers || {}) }
  if (opts.cookie) headers.Cookie = opts.cookie
  if (opts.body && !headers['Content-Type']) headers['Content-Type'] = 'application/json'
  const p = String(path || '').split('?')[0]
  const m = opts.method || 'GET'
  if (
    !opts.noCsrf &&
    opts.cookie &&
    !headers['X-Shape-Lab-Csrf'] &&
    csrfMod.writeNeedsCsrf(m, p)
  ) {
    const token = csrfByCookie.get(opts.cookie)
    if (token) headers['X-Shape-Lab-Csrf'] = token
  }
  const res = await fetch(`${BASE}${path}`, { ...opts, headers, redirect: 'manual' })
  const text = await res.text()
  let json = null
  try {
    json = JSON.parse(text)
  } catch {
    json = null
  }
  const setCookie = res.headers.getSetCookie?.() ?? []
  const cookie = setCookie
    .map((row) => row.split(';')[0])
    .filter((row) => row.startsWith('shape_lab_session='))
    .join('; ')
  const jar = cookie || opts.cookie || ''
  if (jar && json && typeof json.csrf === 'string' && json.csrf.length >= 32) {
    csrfByCookie.set(jar, json.csrf)
  }
  return { status: res.status, json, cookie }
}

function cookieFrom(prev, next) {
  return next.cookie || prev
}

async function main() {
  console.log(`V4 family check → ${BASE}`)
  const age = await import('../src/lib/age.ts')
  ok('age from ISO birthday', age.getAgeFromDateOfBirth('2014-09-14', new Date('2026-09-14')) === 12)
  ok('missing birthday is not guessed', age.getAgeFromDateOfBirth('') === null)
  ok('child band is parent-primary', age.getAthleteAccessLevel(10) === 'parentPrimary')
  ok('teen band is shared', age.getAthleteAccessLevel(15) === 'shared')
  ok('adult band is independent', age.getAthleteAccessLevel(18) === 'independent')
  ok('unknown age stays parent-primary', age.getAthleteAccessLevel(null) === 'parentPrimary')

  const admin = await req('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD }),
  })
  ok('admin login works', admin.status === 200, String(admin.status))
  const cookie = cookieFrom('', admin)

  const parentA = await req('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: 'v4-parent@example.com', password: 'v4-parent-test-password' }),
  })
  ok('parent A can sign in', parentA.status === 200, String(parentA.status))
  const parentACookie = cookieFrom('', parentA)
  const parentUser = parentA.json?.user
  const parentLinked = Array.isArray(parentUser?.linkedAthleteIds) ? parentUser.linkedAthleteIds : []
  const parentRoster = await req('/api/roster', { cookie: parentACookie })
  const parentRows = Array.isArray(parentRoster.json?.athletes) ? parentRoster.json.athletes : []
  const parentIds = parentRows.map((row) => row.id)
  ok(
    'parent A roster is only self or linked athletes',
    parentIds.every((id) => id === parentUser?.rosterProfileId || parentLinked.includes(id)),
  )
  ok('parent A cannot see Athlete B', !parentIds.includes('ath_example_blake'))

  const adminFamilyRoster = await req('/api/roster', { cookie })
  const adminRows = Array.isArray(adminFamilyRoster.json?.athletes) ? adminFamilyRoster.json.athletes : []
  const adminIds = adminRows.map((row) => row.id)
  const linkedOnGym = parentLinked.filter((id) => adminIds.includes(id))
  ok(
    'parent A can see linked athletes that exist on this gym',
    linkedOnGym.every((id) => parentIds.includes(id)),
  )

  const parentWellness = await req('/api/parent-wellness', { cookie: parentACookie })
  ok('parent A can read own wellness journal', parentWellness.status === 200)

  const parentWellnessWrite = await req('/api/parent-wellness', {
    method: 'PUT',
    cookie: parentACookie,
    body: JSON.stringify({
      currentGoals: 'Walk more',
      painEntries: [],
      exercises: [],
      journal: [{ id: 'jnl_fam', date: new Date().toISOString(), body: 'Family check' }],
    }),
  })
  ok('parent A can write own wellness journal', parentWellnessWrite.status === 200, String(parentWellnessWrite.status))

  const parentConsentA = await req('/api/consent', { cookie: parentACookie })
  const consentIds = (parentConsentA.json?.athletes || []).map((row) => row.id)
  ok('parent A consent list stays inside linked athletes', consentIds.every((id) => parentLinked.includes(id)))
  ok('parent A cannot manage consent for Athlete B', !consentIds.includes('ath_example_blake'))

  const athleteA = await req('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: 'v4-athlete@example.com', password: 'v4-athlete-test-password' }),
  })
  ok('athlete A can sign in', athleteA.status === 200, String(athleteA.status))
  const athleteACookie = cookieFrom('', athleteA)
  const athleteUser = athleteA.json?.user
  const athleteRoster = await req('/api/roster', { cookie: athleteACookie })
  const athleteIds = (athleteRoster.json?.athletes || []).map((row) => row.id)
  ok(
    'athlete A roster includes self when that profile exists',
    !athleteUser?.rosterProfileId ||
      !adminIds.includes(athleteUser.rosterProfileId) ||
      athleteIds.includes(athleteUser.rosterProfileId),
  )
  ok('athlete A cannot see Athlete B', !athleteIds.includes('ath_example_blake'))
  const athleteWellness = await req('/api/parent-wellness', { cookie: athleteACookie })
  ok('athlete A cannot read parent wellness', athleteWellness.status === 403, String(athleteWellness.status))

  const coachFamily = await req('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: COACH_EMAIL, password: COACH_PASSWORD }),
  })
  const coachFamilyCookie = cookieFrom('', coachFamily)
  const coachUser = coachFamily.json?.user
  const coachWellness = await req('/api/parent-wellness', { cookie: coachFamilyCookie })
  ok('coach A cannot read parent wellness', coachWellness.status === 403, String(coachWellness.status))
  const coachFamilyRoster = await req('/api/roster', { cookie: coachFamilyCookie })
  const coachRows = Array.isArray(coachFamilyRoster.json?.athletes) ? coachFamilyRoster.json.athletes : []
  const coachIds = coachRows.map((row) => row.id)
  ok(
    'assigned coach does not receive full birthday',
    coachRows.every((row) => row.dateOfBirth == null || row.id === coachUser?.rosterProfileId),
  )
  const unrelatedHoldId = adminRows.find(
    (row) =>
      row.id !== coachUser?.rosterProfileId &&
      !coachIds.includes(row.id) &&
      row.role !== 'parent' &&
      row.role !== 'coach',
  )?.id
  const coachBlakeHold = await req('/api/hold-logs', {
    method: 'POST',
    cookie: coachFamilyCookie,
    body: JSON.stringify({
      athleteId: unrelatedHoldId || 'ath_example_blake',
      shapeId: 'hollow',
      seconds: 12,
    }),
  })
  ok(
    'coach A cannot log hold for unrelated Athlete B',
    coachBlakeHold.status === 403 || coachBlakeHold.status === 404,
    String(coachBlakeHold.status),
  )
  const coachBadHold = await req('/api/hold-logs', {
    method: 'POST',
    cookie: coachFamilyCookie,
    body: JSON.stringify({ athleteId: 'ath_example_sam', shapeId: 'hollow', seconds: -3 }),
  })
  ok('coach hold log rejects invalid seconds', coachBadHold.status === 400)

  const publicWellness = await req('/api/parent-wellness')
  ok('public user cannot read parent wellness', publicWellness.status === 401)
  const publicHold = await req('/api/hold-logs', {
    method: 'POST',
    body: JSON.stringify({ athleteId: 'ath_example_sam', seconds: 10 }),
  })
  ok('public user cannot log holds', publicHold.status === 401)
  ok('admin still reads the gym roster', adminFamilyRoster.status === 200)

  const publicName = await import('../src/lib/publicName.ts')
  ok(
    'public feed name is first plus last initial',
    publicName.publicFeedName({ firstName: 'Ellie', lastName: 'Williams', name: 'Ellie Williams' }) === 'Ellie W.',
  )

  const publicTags = await req('/api/still-tags')
  ok('public user cannot read still tags', publicTags.status === 401)

  const stillsFile = await req('/api/coach-stills', { cookie })
  ok('coach stills payload does not include athleteTags', stillsFile.json?.athleteTags == null)

  const linkedKid = linkedOnGym[0]
  const tagTarget =
    linkedKid ||
    adminRows.find((row) => row.role !== 'parent' && row.role !== 'coach' && row.id !== parentUser?.rosterProfileId)?.id
  const unrelatedKid = adminRows.find(
    (row) =>
      row.role !== 'parent' &&
      row.role !== 'coach' &&
      row.id !== tagTarget &&
      row.id !== parentUser?.rosterProfileId,
  )?.id
  if (tagTarget) {
    const tagWrite = await req('/api/still-tags', {
      method: 'PATCH',
      cookie,
      body: JSON.stringify({
        stillId: 'still_family_check',
        taggedAthleteIds: unrelatedKid ? [tagTarget, unrelatedKid] : [tagTarget],
      }),
    })
    ok('admin can privately tag a still', tagWrite.status === 200, String(tagWrite.status))
    const adminTags = await req('/api/still-tags', { cookie })
    const adminTagged = (adminTags.json?.stills || []).find((row) => row.stillId === 'still_family_check')
    ok('admin still-tags include consent flags', Boolean(adminTagged?.tagged?.[0]?.instructionalMediaConsent))
    const parentTags = await req('/api/still-tags', { cookie: parentACookie })
    const parentTagged = (parentTags.json?.stills || []).find((row) => row.stillId === 'still_family_check')
    if (linkedKid && tagTarget === linkedKid) {
      ok('parent sees tagged still for a linked child', Boolean(parentTagged))
      ok(
        'parent still-tags stay inside linked athletes',
        !parentTagged || parentTagged.taggedAthleteIds.every((id) => parentLinked.includes(id)),
      )
    } else {
      ok('parent does not see a still tagged with an unlinked athlete', !parentTagged)
    }
    const parentPatch = await req('/api/still-tags', {
      method: 'PATCH',
      cookie: parentACookie,
      body: JSON.stringify({ stillId: 'still_family_check', taggedAthleteIds: [] }),
    })
    ok('parent cannot write still tags', parentPatch.status === 403, String(parentPatch.status))
    const coachTags = await req('/api/still-tags', { cookie: coachFamilyCookie })
    const coachTagged = (coachTags.json?.stills || []).find((row) => row.stillId === 'still_family_check')
    ok(
      'coach still-tags omit instructional consent',
      !coachTagged || coachTagged.tagged.every((person) => person.instructionalMediaConsent == null),
    )
    await req('/api/still-tags', {
      method: 'PATCH',
      cookie,
      body: JSON.stringify({ stillId: 'still_family_check', taggedAthleteIds: [] }),
    })
  }

  if (failed) {
    console.log(`\n${failed} check(s) failed`)
    process.exit(1)
  }
  console.log('\nAll V4 family checks passed')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
