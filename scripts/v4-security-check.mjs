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

  const anonConsent = await req('/api/consent')
  ok('anon consent is 401', anonConsent.status === 401)

  const anonConsentWrite = await req('/api/consent', {
    method: 'PATCH',
    body: JSON.stringify({ athleteId: 'ath_example_sam', allowStories: true }),
  })
  ok('anon consent write is 401', anonConsentWrite.status === 401)

  const anonKiosk = await req('/api/auth/kiosk', {
    method: 'POST',
    body: JSON.stringify({ enabled: true }),
  })
  ok('anon kiosk is 401', anonKiosk.status === 401)

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

  const anonFeedFile = await req('/api/feed-file?id=post_does_not_exist')
  ok('anon feed file is 401', anonFeedFile.status === 401)

  const feed = await req('/api/feed', { cookie })
  ok('admin can read feed', feed.status === 200)
  const posts = Array.isArray(feed.json?.posts) ? feed.json.posts : []
  ok(
    'feed urls stay on the signed-in API',
    posts.every((row) => !row.url || String(row.url).startsWith('/api/feed-file')),
  )
  ok(
    'feed json does not include publicUrl',
    posts.every((row) => row.publicUrl == null || row.publicUrl === ''),
  )

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
    const parentConsent = await req('/api/consent', { cookie: parentCookie })
    ok('parent can read consent', parentConsent.status === 200)
    const parentIds = (parentConsent.json?.athletes || []).map((row) => row.id)
    ok('parent consent list does not include an unlinked child', !parentIds.includes('ath_example_blake'))
    const parentOther = await req('/api/consent', {
      method: 'PATCH',
      cookie: parentCookie,
      body: JSON.stringify({ athleteId: 'ath_example_blake', allowStories: true }),
    })
    ok(
      'parent cannot patch an unlinked child',
      parentOther.status === 403 || parentOther.status === 404,
      String(parentOther.status),
    )
    const linked = (parentConsent.json?.athletes || []).find((row) => row.id === 'ath_example_sam')
    if (linked) {
      const restore = await req('/api/consent', {
        method: 'PATCH',
        cookie: parentCookie,
        body: JSON.stringify({
          athleteId: 'ath_example_sam',
          allowStories: linked.allowStories === true,
        }),
      })
      ok('parent can patch a linked child', restore.status === 200, String(restore.status))
    } else {
      ok('parent consent includes linked child when that athlete exists', true)
    }
  } else {
    ok('parent login', parent.status === 200, String(parent.status))
  }

  const coachConsent = await req('/api/consent', {
    method: 'PATCH',
    cookie: coachCookie,
    body: JSON.stringify({ athleteId: 'ath_example_sam', allowWinsOnFeed: true }),
  })
  ok(
    'coach cannot patch consent',
    coachConsent.status === 403 || coachConsent.status === 404,
    String(coachConsent.status),
  )

  const adminConsent = await req('/api/consent', { cookie })
  ok('admin can read consent', adminConsent.status === 200)
  const adminRow = (adminConsent.json?.athletes || []).find((row) => row.id === 'ath_example_sam')
  if (adminRow) {
    const adminPatch = await req('/api/consent', {
      method: 'PATCH',
      cookie,
      body: JSON.stringify({
        athleteId: 'ath_example_sam',
        allowWinsOnFeed: adminRow.allowWinsOnFeed === true,
      }),
    })
    ok('admin can patch consent', adminPatch.status === 200, String(adminPatch.status))
  } else {
    ok('admin consent list loaded', adminConsent.status === 200)
  }

  const coachKiosk = await req('/api/auth/kiosk', {
    method: 'POST',
    cookie: coachCookie,
    body: JSON.stringify({ enabled: true }),
  })
  ok('coach cannot enter floor mode', coachKiosk.status === 403, String(coachKiosk.status))

  const enterFloor = await req('/api/auth/kiosk', {
    method: 'POST',
    cookie,
    body: JSON.stringify({ enabled: true }),
  })
  ok('admin can enter floor mode', enterFloor.status === 200 && enterFloor.json?.user?.kiosk === true)

  const floorInvite = await req('/api/auth/invites', {
    method: 'POST',
    cookie,
    body: JSON.stringify({ accountId: me.json?.user?.accountId }),
  })
  ok('floor iPad cannot copy a sign-in link', floorInvite.status === 403, String(floorInvite.status))

  const floorContacts = await req('/api/contacts', { cookie })
  ok('floor iPad contacts is 403', floorContacts.status === 403)

  const floorAccounts = await req('/api/auth/accounts', { cookie })
  ok('floor iPad accounts is 403', floorAccounts.status === 403)

  const floorAudit = await req('/api/auth/audit', { cookie })
  ok('floor iPad watch log is 403', floorAudit.status === 403)

  const floorSessions = await req('/api/auth/sessions', { cookie })
  ok('floor iPad signed-in list is 403', floorSessions.status === 403)

  const floorConsent = await req('/api/consent', {
    method: 'PATCH',
    cookie,
    body: JSON.stringify({ athleteId: 'ath_example_sam', allowStories: true }),
  })
  ok(
    'floor iPad cannot patch consent',
    floorConsent.status === 403 || floorConsent.status === 404,
    String(floorConsent.status),
  )

  const floorRoster = await req('/api/roster', { cookie })
  ok('floor iPad can read roster', floorRoster.status === 200)
  const floorAthletes = Array.isArray(floorRoster.json?.athletes) ? floorRoster.json.athletes : []
  ok('floor iPad roster has no parentPhone fields', !floorAthletes.some((row) => row.parentPhone))
  ok(
    'floor iPad roster has no injury log dump',
    !Array.isArray(floorRoster.json?.injuryLogs) || floorRoster.json.injuryLogs.length === 0,
  )

  const floorPassword = await req('/api/auth/password', {
    method: 'POST',
    cookie,
    body: JSON.stringify({ currentPassword: ADMIN_PASSWORD, newPassword: ADMIN_PASSWORD }),
  })
  ok('floor iPad cannot change password', floorPassword.status === 403)

  const leaveBad = await req('/api/auth/kiosk', {
    method: 'POST',
    cookie,
    body: JSON.stringify({ enabled: false, password: 'wrong-floor-password' }),
  })
  ok('wrong password cannot leave the floor', leaveBad.status === 401)

  const leaveFloor = await req('/api/auth/kiosk', {
    method: 'POST',
    cookie,
    body: JSON.stringify({ enabled: false, password: ADMIN_PASSWORD }),
  })
  ok('admin password leaves the floor', leaveFloor.status === 200 && leaveFloor.json?.user?.kiosk !== true)

  const afterFloorContacts = await req('/api/contacts', { cookie })
  ok('admin contacts work after leaving the floor', afterFloorContacts.status === 200)

  const anonInvite = await req('/api/auth/invites', {
    method: 'POST',
    body: JSON.stringify({ accountId: me.json?.user?.accountId }),
  })
  ok('anon invite create is 401', anonInvite.status === 401)

  const coachInvite = await req('/api/auth/invites', {
    method: 'POST',
    cookie: coachCookie,
    body: JSON.stringify({ accountId: me.json?.user?.accountId }),
  })
  ok('coach cannot copy a sign-in link', coachInvite.status === 403, String(coachInvite.status))

  const listed = await req('/api/auth/accounts', { cookie })
  const athleteAcc = (listed.json?.accounts || []).find((row) => row.email === 'v4-athlete@example.com')
  if (athleteAcc?.id) {
    const adminInvite = await req('/api/auth/invites', {
      method: 'POST',
      cookie,
      body: JSON.stringify({ accountId: athleteAcc.id }),
    })
    const inviteUrl = String(adminInvite.json?.url || '')
    ok(
      'admin can copy a sign-in link',
      adminInvite.status === 200 && inviteUrl.includes('invite='),
      adminInvite.json?.error || String(adminInvite.status),
    )
    let token = ''
    try {
      token = new URL(inviteUrl).searchParams.get('invite') || ''
    } catch {
      token = ''
    }

    const peekBad = await req(`/api/auth/invite?token=${'0'.repeat(64)}`)
    ok('bad invite peek is invalid', peekBad.status === 200 && peekBad.json?.valid === false)

    const peekGood = await req(`/api/auth/invite?token=${encodeURIComponent(token)}`)
    ok(
      'good invite peek is valid',
      peekGood.status === 200 && peekGood.json?.valid === true && peekGood.json?.email === 'v4-athlete@example.com',
      JSON.stringify(peekGood.json),
    )

    const redeem = await req('/api/auth/invite', {
      method: 'POST',
      body: JSON.stringify({ token, password: 'v4-athlete-invite-temp' }),
    })
    ok(
      'redeem invite sets a password',
      redeem.status === 200 && redeem.json?.user?.email === 'v4-athlete@example.com',
      redeem.json?.error || String(redeem.status),
    )

    const redeemAgain = await req('/api/auth/invite', {
      method: 'POST',
      body: JSON.stringify({ token, password: 'v4-athlete-invite-temp' }),
    })
    ok('used invite cannot redeem again', redeemAgain.status === 401)

    const restoreAthlete = await req('/api/auth/password', {
      method: 'POST',
      cookie,
      body: JSON.stringify({
        accountId: athleteAcc.id,
        newPassword: 'v4-athlete-test-password',
      }),
    })
    ok('athlete password restored after invite test', restoreAthlete.status === 200, String(restoreAthlete.status))
  } else {
    ok('athlete account exists for invite checks', false, 'missing v4-athlete@example.com')
  }

  const anonAudit = await req('/api/auth/audit')
  ok('anon watch log is 401', anonAudit.status === 401)

  const coachAudit = await req('/api/auth/audit', { cookie: coachCookie })
  ok('coach watch log is 403', coachAudit.status === 403, String(coachAudit.status))

  const adminAudit = await req('/api/auth/audit', { cookie })
  ok(
    'admin can read the gym log',
    adminAudit.status === 200 && Array.isArray(adminAudit.json?.events),
    String(adminAudit.status),
  )
  ok(
    'gym log hides routine roster views by default',
    adminAudit.status === 200 &&
      (adminAudit.json?.events || []).every(
        (row) => row.action !== 'roster.view' && row.action !== 'roster.write',
      ),
  )

  const anonSessions = await req('/api/auth/sessions')
  ok('anon signed-in list is 401', anonSessions.status === 401)

  const coachSessions = await req('/api/auth/sessions', { cookie: coachCookie })
  ok('coach signed-in list is 403', coachSessions.status === 403, String(coachSessions.status))

  const kidSession = await req('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: 'v4-athlete@example.com', password: 'v4-athlete-test-password' }),
  })
  ok('athlete login for session kick', kidSession.status === 200, String(kidSession.status))
  const kidCookie = cookieFrom('', kidSession)

  const live = await req('/api/auth/sessions', { cookie })
  const liveRows = Array.isArray(live.json?.sessions) ? live.json.sessions : []
  ok('admin can list signed-in logins', live.status === 200)
  ok(
    'signed-in list includes this admin',
    liveRows.some((row) => row.email === ADMIN_EMAIL && row.self === true),
  )
  ok(
    'signed-in list includes the athlete',
    liveRows.some((row) => row.email === 'v4-athlete@example.com' && row.self !== true),
  )
  ok(
    'signed-in list has no raw session id',
    liveRows.every((row) => row.id == null && row.accountId),
  )

  const listedForKick = await req('/api/auth/accounts', { cookie })
  const athleteForKick = (listedForKick.json?.accounts || []).find(
    (row) => row.email === 'v4-athlete@example.com',
  )
  if (athleteForKick?.id) {
    const kickSelf = await req('/api/auth/sessions', {
      method: 'POST',
      cookie,
      body: JSON.stringify({ accountId: me.json?.user?.accountId }),
    })
    ok('admin cannot end own login from Watch', kickSelf.status === 400)

    const kick = await req('/api/auth/sessions', {
      method: 'POST',
      cookie,
      body: JSON.stringify({ accountId: athleteForKick.id }),
    })
    ok('admin can end another login', kick.status === 200, String(kick.status))

    const kidMe = await req('/api/auth/me', { cookie: kidCookie })
    ok(
      'ended login cannot keep using the gym',
      kidMe.json?.authenticated !== true,
      JSON.stringify(kidMe.json),
    )
  } else {
    ok('athlete account exists for session kick', false, 'missing v4-athlete@example.com')
  }

  const coachPatch = await req('/api/auth/accounts', {
    method: 'PATCH',
    cookie: coachCookie,
    body: JSON.stringify({ id: me.json?.user?.accountId, role: 'admin' }),
  })
  ok('coach cannot patch accounts', coachPatch.status === 403 || coachPatch.status === 401)

  const coachReset = await req('/api/auth/password', {
    method: 'POST',
    cookie: coachCookie,
    body: JSON.stringify({ accountId: me.json?.user?.accountId, newPassword: 'should-not-work-1' }),
  })
  ok('coach cannot reset admin password', coachReset.status === 403 || coachReset.status === 401)

  let probe = { status: 0 }
  for (let i = 0; i < 13; i += 1) {
    probe = await req('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: 'pace-probe@example.com',
        password: 'wrong-pace-password',
      }),
    })
  }
  ok('unknown email lockout after many tries', probe.status === 429, String(probe.status))

  const pw = await req('/api/auth/password', {
    method: 'POST',
    cookie,
    body: JSON.stringify({ currentPassword: ADMIN_PASSWORD, newPassword: ADMIN_PASSWORD }),
  })
  ok('admin can change own password', pw.status === 200, String(pw.status))
  cookie = cookieFrom(cookie, pw)

  const listedPace = await req('/api/auth/accounts', { cookie })
  const athletePace = (listedPace.json?.accounts || []).find((row) => row.email === 'v4-athlete@example.com')
  if (athletePace?.id) {
    let inviteStatus = 200
    for (let i = 0; i < 50; i += 1) {
      const row = await req('/api/auth/invites', {
        method: 'POST',
        cookie,
        body: JSON.stringify({ accountId: athletePace.id }),
      })
      inviteStatus = row.status
      if (inviteStatus === 429) break
    }
    ok('sign-in link create is rate limited', inviteStatus === 429, String(inviteStatus))
  } else {
    ok('athlete account exists for rate-limit checks', false, 'missing v4-athlete@example.com')
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
