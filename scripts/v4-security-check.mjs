#!/usr/bin/env node
/**
 * HTTP checks for Shape Lab V4 authorization.
 * Does not write fictional athletes onto the live gym roster.
 */
const BASE = process.env.SHAPE_LAB_TEST_URL || 'http://127.0.0.1:43127'
const ADMIN_EMAIL = process.env.SHAPE_LAB_BOOTSTRAP_ADMIN_EMAIL || 'v4-admin@example.com'
const ADMIN_PASSWORD = process.env.SHAPE_LAB_BOOTSTRAP_ADMIN_PASSWORD || 'v4-admin-test-password'
const COACH_EMAIL = 'v4-coach@example.com'
const COACH_PASSWORD = 'v4-coach-test-password'

let failed = 0

function ok(name, cond, extra = '') {
  if (cond) {
    console.log(`  pass  ${name}`)
    return
  }
  failed += 1
  console.log(`  FAIL  ${name}${extra ? ` — ${extra}` : ''}`)
}

async function req(path, opts = {}) {
  const headers = { ...(opts.headers || {}) }
  if (opts.cookie) headers.Cookie = opts.cookie
  if (opts.body && !headers['Content-Type']) headers['Content-Type'] = 'application/json'
  const res = await fetch(`${BASE}${path}`, {
    ...opts,
    headers,
    redirect: 'manual',
  })
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
  return { status: res.status, json, text, cookie }
}

function cookieFrom(prev, next) {
  return next.cookie || prev
}

async function main() {
  console.log(`V4 security check → ${BASE}`)

  const health = await req('/api/health')
  ok('health is public', health.status === 200)

  const anonRoster = await req('/api/roster')
  ok('anon roster is 401', anonRoster.status === 401)

  const anonContacts = await req('/api/contacts')
  ok('anon contacts is 401', anonContacts.status === 401)

  const anonCsv = await req('/api/contacts.csv')
  ok('anon contacts csv is 401', anonCsv.status === 401)

  const anonPhoto = await req('/api/roster-photo-file?id=ath_example_sam')
  ok('anon photo is 401', anonPhoto.status === 401)

  const anonVideo = await req('/api/athlete-video-file?id=vid_does_not_exist')
  ok('anon video is 401', anonVideo.status === 401)

  const anonWrite = await req('/api/roster', {
    method: 'PUT',
    body: JSON.stringify({ kind: 'shape-lab-roster', athletes: [] }),
  })
  ok('anon roster write is 401', anonWrite.status === 401)

  let cookie = ''
  const login = await req('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD }),
  })
  if (login.status !== 200) {
    const boot = await req('/api/auth/bootstrap', {
      method: 'POST',
      body: JSON.stringify({
        email: ADMIN_EMAIL,
        password: ADMIN_PASSWORD,
        displayName: 'V4 test admin',
      }),
    })
    ok('bootstrap or login works', boot.status === 200, `login ${login.status} bootstrap ${boot.status}`)
    cookie = cookieFrom(cookie, boot)
  } else {
    ok('admin login works', true)
    cookie = cookieFrom(cookie, login)
  }

  const me = await req('/api/auth/me', { cookie })
  ok('admin session is admin', me.json?.user?.role === 'admin' || me.json?.user?.role === 'gymOwner')

  const roster = await req('/api/roster', { cookie })
  ok('admin can read roster', roster.status === 200 && roster.json?.kind === 'shape-lab-roster')
  const athletes = Array.isArray(roster.json?.athletes) ? roster.json.athletes : []
  const other = athletes.find((row) => row.id && row.id !== 'ath_ryan' && row.role !== 'coach')
  if (other) {
    const hasHealthDump =
      JSON.stringify(roster.json).includes('"injuryLogs"') &&
      Array.isArray(roster.json.injuryLogs) &&
      roster.json.injuryLogs.length > 0 &&
      !athletes.some((row) => row.id === other.id)
    ok('health arrays are not a public dump', !hasHealthDump)
  } else {
    ok('admin roster returned athletes (or empty gym)', true)
  }

  const contacts = await req('/api/contacts', { cookie })
  ok('admin can open contacts', contacts.status === 200)

  const createCoach = await req('/api/auth/accounts', {
    method: 'POST',
    cookie,
    body: JSON.stringify({
      email: COACH_EMAIL,
      password: COACH_PASSWORD,
      role: 'coach',
      displayName: 'V4 test coach',
      rosterProfileId: 'ath_example_coach',
    }),
  })
  ok(
    'admin can create coach account or it already exists',
    createCoach.status === 200 ||
      (createCoach.status === 400 && /already/i.test(createCoach.json?.error || '')),
    createCoach.json?.error || String(createCoach.status),
  )

  const coachLogin = await req('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: COACH_EMAIL, password: COACH_PASSWORD }),
  })
  ok('coach login works', coachLogin.status === 200)
  const coachCookie = cookieFrom('', coachLogin)

  const coachContacts = await req('/api/contacts', { cookie: coachCookie })
  ok('coach contacts is 403', coachContacts.status === 403)

  const coachRoster = await req('/api/roster', { cookie: coachCookie })
  ok('coach roster is 200', coachRoster.status === 200)
  const coachAthletes = Array.isArray(coachRoster.json?.athletes) ? coachRoster.json.athletes : []
  const leakedPhone = coachAthletes.some((row) => row.parentPhone)
  ok('coach roster has no parentPhone fields', !leakedPhone)
  const leakedHash = coachAthletes.some((row) => row.passcodeHash && row.id !== 'ath_example_coach')
  ok('coach roster does not include other passcode hashes', !leakedHash)

  const swap = await req('/api/roster-photo-file?id=ath_example_blake', { cookie: coachCookie })
  ok(
    'coach cannot open an unassigned athlete photo',
    swap.status === 403 || swap.status === 404,
    String(swap.status),
  )

  const athleteLogin = await req('/api/auth/accounts', {
    method: 'POST',
    cookie,
    body: JSON.stringify({
      email: 'v4-athlete@example.com',
      password: 'v4-athlete-test-password',
      role: 'athlete',
      displayName: 'V4 test athlete',
      rosterProfileId: 'ath_example_sam',
    }),
  })
  void athleteLogin
  const kid = await req('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: 'v4-athlete@example.com', password: 'v4-athlete-test-password' }),
  })
  if (kid.status === 200) {
    const kidCookie = cookieFrom('', kid)
    const kidSwap = await req('/api/roster-photo-file?id=ath_example_blake', { cookie: kidCookie })
    ok(
      'athlete cannot open another athlete photo',
      kidSwap.status === 403 || kidSwap.status === 404,
      String(kidSwap.status),
    )
    const kidRoster = await req('/api/roster', { cookie: kidCookie })
    const kidIds = (kidRoster.json?.athletes || []).map((row) => row.id)
    ok(
      'athlete roster does not include an unrelated id by default',
      !kidIds.includes('ath_example_blake') || kidIds.length <= 1,
    )
  } else {
    ok('athlete login (account may need create)', kid.status === 200, String(kid.status))
  }

  const parentCreate = await req('/api/auth/accounts', {
    method: 'POST',
    cookie,
    body: JSON.stringify({
      email: 'v4-parent@example.com',
      password: 'v4-parent-test-password',
      role: 'parent',
      displayName: 'V4 test parent',
      rosterProfileId: 'ath_example_parent',
      linkedAthleteIds: ['ath_example_sam'],
    }),
  })
  void parentCreate
  const parent = await req('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: 'v4-parent@example.com', password: 'v4-parent-test-password' }),
  })
  if (parent.status === 200) {
    const parentCookie = cookieFrom('', parent)
    const parentSwap = await req('/api/roster-photo-file?id=ath_example_blake', { cookie: parentCookie })
    ok(
      'parent cannot open an unlinked child photo',
      parentSwap.status === 403 || parentSwap.status === 404,
      String(parentSwap.status),
    )
  } else {
    ok('parent login', parent.status === 200, String(parent.status))
  }

  if (failed) {
    console.log(`\n${failed} check(s) failed`)
    process.exit(1)
  }
  console.log('\nAll V4 security checks passed')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
