#!/usr/bin/env node
/**
 * Access-model checks for the audit §8 groups the older suites miss:
 * public-registration rejection, account-creation invitations, and
 * independent (adult) athlete tightening (build 1159).
 *
 * Sibling to v4-security-check.mjs rather than an extension of it: that
 * suite is one long stateful sequence (floor mode, session kicks, and it
 * ends by burning the sign-in-invite rate limit), so groups that create
 * accounts and invitations get their own fixtures here (v4-access-*) and
 * can run standalone. Like the other suites it needs a disposable test
 * gym at SHAPE_LAB_TEST_URL whose roster carries the example athletes
 * (ath_example_sam / ath_example_blake). It borrows those two profiles
 * (birthdays, the parent-access grant, one consent flag) and restores
 * every borrowed field before it finishes. One labeled test injury entry
 * (id inj_access_<run>) stays on ath_example_sam: roster sync merges
 * injury logs union-by-id with no tombstone list, so it cannot be
 * removed through the API.
 */
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const BASE = process.env.SHAPE_LAB_TEST_URL || 'http://127.0.0.1:43127'
const ADMIN_EMAIL = process.env.SHAPE_LAB_BOOTSTRAP_ADMIN_EMAIL || 'v4-admin@example.com'
const ADMIN_PASSWORD = process.env.SHAPE_LAB_BOOTSTRAP_ADMIN_PASSWORD || 'v4-admin-test-password'
const COACH_EMAIL = 'v4-access-coach@example.com'
const COACH_PASSWORD = 'v4-access-coach-password'
const ATHLETE_EMAIL = 'v4-access-athlete@example.com'
const ATHLETE_PASSWORD = 'v4-access-athlete-password'
const SAM = 'ath_example_sam'
const BLAKE = 'ath_example_blake'
const RUN = Date.now().toString(36)
const TEST_INJURY_ID = `inj_access_${RUN}`

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

function authPath(path) {
  return String(path || '').split('?')[0]
}

let csrfMod = null

async function req(path, opts = {}) {
  if (!csrfMod) csrfMod = await import('../server/auth/csrf.ts')
  const headers = { ...(opts.headers || {}) }
  if (opts.cookie) headers.Cookie = opts.cookie
  if (opts.body && !headers['Content-Type']) headers['Content-Type'] = 'application/json'
  const p = authPath(path)
  const m = opts.method || 'GET'
  if (
    !opts.noCsrf &&
    opts.cookie &&
    !headers['X-Shape-Lab-Csrf'] &&
    !headers['x-shape-lab-csrf'] &&
    csrfMod.writeNeedsCsrf(m, p)
  ) {
    const token = csrfByCookie.get(opts.cookie)
    if (token) headers['X-Shape-Lab-Csrf'] = token
  }
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
  const jar = cookie || opts.cookie || ''
  if (jar && json && typeof json.csrf === 'string' && json.csrf.length >= 32) {
    csrfByCookie.set(jar, json.csrf)
  }
  return { status: res.status, json, text, cookie, headers: res.headers }
}

function cookieFrom(prev, next) {
  return next.cookie || prev
}

function sortedIds(ids) {
  return [...(Array.isArray(ids) ? ids : [])].sort()
}

function sameIds(a, b) {
  const x = sortedIds(a)
  const y = sortedIds(b)
  return x.length === y.length && x.every((id, i) => id === y[i])
}

function isoYearsAgo(years) {
  const d = new Date()
  d.setFullYear(d.getFullYear() - years)
  return d.toISOString().slice(0, 10)
}

async function login(email, password) {
  return req('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  })
}

async function rosterAs(cookie) {
  const res = await req('/api/roster', { cookie })
  return res.json || {}
}

async function putRoster(cookie, payload) {
  return req('/api/roster', {
    method: 'PUT',
    cookie,
    body: JSON.stringify(payload),
  })
}

function athleteRow(rosterJson, id) {
  return (Array.isArray(rosterJson?.athletes) ? rosterJson.athletes : []).find((row) => row.id === id)
}

async function consentRow(cookie, id) {
  const res = await req('/api/consent', { cookie })
  return (Array.isArray(res.json?.athletes) ? res.json.athletes : []).find((row) => row.id === id)
}

async function patchConsent(cookie, athleteId, patch) {
  return req('/api/consent', {
    method: 'PATCH',
    cookie,
    body: JSON.stringify({ athleteId, ...patch }),
  })
}

/** Run the invite-unit probe in a scratch cwd; returns its printed JSON. */
function inviteUnit(scratch, args) {
  const env = { ...process.env }
  delete env.BLOB_READ_WRITE_TOKEN
  delete env.BLOB_STORE_ID
  const helper = path.join(path.dirname(fileURLToPath(import.meta.url)), 'v4-access-invite-unit.mjs')
  const out = execFileSync(process.execPath, ['--experimental-strip-types', helper, ...args], {
    cwd: scratch,
    env,
    encoding: 'utf8',
  })
  return JSON.parse(out.trim().split('\n').pop() || '{}')
}

async function main() {
  console.log(`V4 access check → ${BASE}`)

  // ---- Bootstrap / admin -------------------------------------------------
  let cookie = ''
  const loginRes = await login(ADMIN_EMAIL, ADMIN_PASSWORD)
  if (loginRes.status !== 200) {
    const boot = await req('/api/auth/bootstrap', {
      method: 'POST',
      body: JSON.stringify({
        email: ADMIN_EMAIL,
        password: ADMIN_PASSWORD,
        displayName: 'V4 access admin',
      }),
    })
    ok('bootstrap or login works', boot.status === 200, `login ${loginRes.status} bootstrap ${boot.status}`)
    cookie = cookieFrom(cookie, boot)
  } else {
    ok('admin login works', true)
    cookie = cookieFrom(cookie, loginRes)
  }
  const me = await req('/api/auth/me', { cookie })
  ok('admin session is admin', me.json?.user?.role === 'admin' || me
.json?.user?.role === 'gymOwner')

  const adminRoster = await rosterAs(cookie)
  const samRow = athleteRow(adminRoster, SAM)
  const blakeRow = athleteRow(adminRoster, BLAKE)
  ok('example athletes exist on this gym', Boolean(samRow && blakeRow), 'needs ath_example_sam and ath_example_blake')

  // Fixture coach account (create or reuse).
  const createCoach = await req('/api/auth/accounts', {
    method: 'POST',
    cookie,
    body: JSON.stringify({
      email: COACH_EMAIL,
      password: COACH_PASSWORD,
      role: 'coach',
      displayName: 'V4 access coach',
      rosterProfileId: 'ath_example_coach',
    }),
  })
  ok(
    'admin can create access coach or it already exists',
    createCoach.status === 200 ||
      (createCoach.status === 400 && /already/i.test(createCoach.json?.error || '')),
    createCoach.json?.error || String(createCoach.status),
  )
  const coachLogin = await login(COACH_EMAIL, COACH_PASSWORD)
  ok('access coach login works', coachLogin.status === 200, String(coachLogin.status))
  const coachCookie = cookieFrom('', coachLogin)

  // Fixture athlete account bound to Sam's profile (used by group C).
  const createAthlete = await req('/api/auth/accounts', {
    method: 'POST',
    cookie,
    body: JSON.stringify({
      email: ATHLETE_EMAIL,
      password: ATHLETE_PASSWORD,
      role: 'athlete',
      displayName: 'V4 access athlete',
      rosterProfileId: SAM,
    }),
  })
  ok(
    'admin can create access athlete or it already exists',
    createAthlete.status === 200 ||
      (createAthlete.status === 400 && /already/i.test(createAthlete.json?.error || '')),
    createAthlete.json?.error || String(createAthlete.status),
  )

  // ---- Group A: public registration is closed once an admin exists ------
  console.log('\nPublic registration')
  for (const role of ['coach', 'parent', 'athlete', 'admin']) {
    const email = `v4-access-reg-${role}-${RUN}@example.com`
    const reg = await req('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        email,
        password: 'v4-access-reg-password',
        displayName: `V4 reg ${role}`,
        role,
      }),
    })
    ok(
      `anonymous ${role} signup is 403`,
      reg.status === 403,
      reg.json?.error || String(reg.status),
    )
    const attempt = await login(email, 'v4-access-reg-password')
    ok(`rejected ${role} signup created no account`, attempt.status === 401, String(attempt.status))
  }

  // ---- Group B: account-creation invitations ----------------------------
  console.log('\nAccount invitations')
  const anonInvite = await req('/api/auth/account-invites', {
    method: 'POST',
    body: JSON.stringify({ role: 'coach', athleteIds: [] }),
  })
  ok('anon account-invite create is 401', anonInvite.status === 401, String(anonInvite.status))

  const coachInviteTry = await req('/api/auth/account-invites', {
    method: 'POST',
    cookie: coachCookie,
    body: JSON.stringify({ role: 'coach', athleteIds: [] }),
  })
  ok('coach cannot create account invites', coachInviteTry.status === 403, String(coachInviteTry.status))

  const badRole = await req('/api/auth/account-invites', {
    method: 'POST',
    cookie,
    body: JSON.stringify({ role: 'admin', athleteIds: [] }),
  })
  ok('account invite with role admin is 400', badRole.status === 400, String(badRole.status))

  const unlinkedParent = await req('/api/auth/account-invites', {
    method: 'POST',
    cookie,
    body: JSON.stringify({ role: 'parent', athleteIds: [] }),
  })
  ok(
    'parent invite without an athlete is 400',
    unlinkedParent.status === 400,
    unlinkedParent.json?.error || String(unlinkedParent.status),
  )

  async function createInvite(role, athleteIds) {
    return req('/api/auth/account-invites', {
      method: 'POST',
      cookie,
      body: JSON.stringify({ role, athleteIds }),
    })
  }
  function tokenOf(url) {
    try {
      return new URL(String(url || '')).searchParams.get('invite') || ''
    } catch {
      return ''
    }
  }

  // Coach invite: route responds (the build-1157 regression), role locked.
  const coachInvite = await createInvite('coach', [])
  const coachUrl = String(coachInvite.json?.url || '')
  ok(
    'admin can create a coach invitation',
    coachInvite.status === 200 && coachUrl.includes('invite=') && coachUrl.includes('new=1'),
    coachInvite.json?.error || String(coachInvite.status),
  )
  ok(
    'coach invitation carries an id and future expiry',
    String(coachInvite.json?.id || '').startsWith('ainv_') &&
      Date.parse(coachInvite.json?.expiresAt || '') > Date.now(),
  )
  const coachToken = tokenOf(coachUrl)
  ok('coach invitation token parses from the url', coachToken.length >= 32)

  const peekBadShort = await req('/api/auth/account-invite?token=abc')
  ok(
    'short invite token peeks invalid',
    peekBadShort.status === 200 && peekBadShort.json?.valid === false,
    JSON.stringify(peekBadShort.json),
  )
  const peekBadHex = await req(`/api/auth/account-invite?token=${'0'.repeat(64)}`)
  ok(
    'unknown invite token peeks invalid',
    peekBadHex.status === 200 && peekBadHex.json?.valid === false,
  )
  const peekCoach = await req(`/api/auth/account-invite?token=${encodeURIComponent(coachToken)}`)
  ok(
    'coach invite peeks as a coach invite',
    peekCoach.status === 200 &&
      peekCoach.json?.valid === true &&
      peekCoach.json?.role === 'coach' &&
      (peekCoach.json?.athleteIds || []).length === 0,
    JSON.stringify(peekCoach.json),
  )

  const invitedCoachEmail = `v4-access-invited-coach-${RUN}@example.com`
  const redeemCoach = await req('/api/auth/account-invite', {
    method: 'POST',
    body: JSON.stringify({
      token: coachToken,
      email: invitedCoachEmail,
      password: 'v4-access-invited-password',
      displayName: 'V4 invited coach',
      // Tampering attempts: none of these may influence the new account.
      role: 'admin',
      linkedAthleteIds: [BLAKE],
      rosterProfileId: BLAKE,
    }),
  })
  ok(
    'coach invite redeems',
    redeemCoach.status === 200 && redeemCoach.json?.authenticated === true,
    redeemCoach.json?.error || String(redeemCoach.status),
  )
  ok(
    'redeemed account is a coach, not the tampered role',
    redeemCoach.json?.user?.role === 'coach',
    String(redeemCoach.json?.user?.role),
  )
  ok(
    'tampered athlete links are ignored at redemption',
    (redeemCoach.json?.user?.linkedAthleteIds || []).length === 0 &&
      redeemCoach.json?.user?.rosterProfileId !== BLAKE,
  )
  const invitedCoachCookie = cookieFrom('', redeemCoach)
  const invitedCoachMe = await req('/api/auth/me', { cookie: invitedCoachCookie })
  ok(
    'redeemed coach session works and stays a coach',
    invitedCoachMe.json?.user?.role === 'coach' && invitedCoachMe.json?.user?.email === invitedCoachEmail,
  )

  const peekUsed = await req(`/api/auth/account-invite?token=${encodeURIComponent(coachToken)}`)
  ok('used invite peeks invalid', peekUsed.status === 200 && peekUsed.json?.valid === false)
  const redeemAgain = await req('/api/auth/account-invite', {
    method: 'POST',
    body: JSON.stringify({
      token: coachToken,
      email: `v4-access-invited-again-${RUN}@example.com`,
      password: 'v4-access-invited-password',
      displayName: 'V4 invited again',
    }),
  })
  ok('used invite cannot redeem twice', redeemAgain.status === 401, String(redeemAgain.status))

  // Parent invite for both example athletes — this account drives group C.
  const parentInvite = await createInvite('parent', [SAM, BLAKE])
  const parentToken = tokenOf(parentInvite.json?.url)
  ok('admin can create a parent invitation', parentInvite.status === 200 && parentToken.length >= 32)
  const peekParent = await req(`/api/auth/account-invite?token=${encodeURIComponent(parentToken)}`)
  ok(
    'parent invite peeks with exactly the authorized athletes',
    peekParent.status === 200 &&
      peekParent.json?.valid === true &&
      peekParent.json?.role === 'parent' &&
      sameIds(peekParent.json?.athleteIds, [SAM, BLAKE]),
    JSON.stringify(peekParent.json),
  )
  const parentEmail = `v4-access-parent-${RUN}@example.com`
  const parentPassword = 'v4-access-parent-password'
  const redeemParent = await req('/api/auth/account-invite', {
    method: 'POST',
    body: JSON.stringify({
      token: parentToken,
      email: parentEmail,
      password: parentPassword,
      displayName: 'V4 access parent',
      // Tampering attempts: role swap and a narrowed link list both ignored.
      role: 'athlete',
      linkedAthleteIds: [SAM],
    }),
  })
  ok(
    'parent invite redeems as a parent',
    redeemParent.status === 200 && redeemParent.json?.user?.role === 'parent',
    redeemParent.json?.error || String(redeemParent.status),
  )
  ok(
    'redemption links exactly the authorized athletes',
    sameIds(redeemParent.json?.user?.linkedAthleteIds, [SAM, BLAKE]),
    JSON.stringify(redeemParent.json?.user?.linkedAthleteIds),
  )
  const parentLogin = await login(parentEmail, parentPassword)
  ok('invited parent can sign in', parentLogin.status === 200, String(parentLogin.status))
  const parentCookie = cookieFrom('', parentLogin)
  const parentRows = (await rosterAs(parentCookie)).athletes || []
  const parentRowIds = parentRows.map((row) => row.id)
  const parentMe = await req('/api/auth/me', { cookie: parentCookie })
  const parentRowId = parentMe.json?.user?.rosterProfileId || ''
  const parentAccountId = parentMe.json?.user?.accountId || ''
  ok(
    'invited parent account is bound to a parent roster row',
    typeof parentRowId === 'string' && parentRowId.length > 0,
    JSON.stringify(parentMe.json?.user),
  )
  ok(
    'invited parent roster is exactly the linked athletes plus their own parent row',
    parentRowIds.includes(SAM) &&
      parentRowIds.includes(BLAKE) &&
      parentRowIds.every((id) => id === SAM || id === BLAKE || id === parentRowId),
    parentRowIds.join(','),
  )
  const rosterAfterParent = await rosterAs(cookie)
  const parentRowAdmin = athleteRow(rosterAfterParent, parentRowId)
  ok(
    'parent bootstrap created a parent row linked to exactly the invited athletes',
    parentRowAdmin?.role === 'parent' && sameIds(parentRowAdmin?.linkedAthleteIds, [SAM, BLAKE]),
    JSON.stringify(parentRowAdmin),
  )
  ok(
    'guardian links are stamped on both linked athletes',
    [SAM, BLAKE].every((id) =>
      (athleteRow(rosterAfterParent, id)?.guardianRelationships || []).some(
        (rel) => rel.accountId === parentAccountId || rel.rosterProfileId === parentRowId,
      ),
    ),
  )

  // Athlete invite: binds the existing profile as "self", creates no duplicate.
  const rosterBeforeAthlete = await rosterAs(cookie)
  const countBefore = (rosterBeforeAthlete.athletes || []).length
  const multiAthleteInvite = await createInvite('athlete', [SAM, BLAKE])
  ok(
    'athlete invite with two athletes is 400',
    multiAthleteInvite.status === 400,
    multiAthleteInvite.json?.error || String(multiAthleteInvite.status),
  )
  const ghostAthleteInvite = await createInvite('athlete', ['ath_example_ghost'])
  ok(
    'athlete invite for a missing profile is 400',
    ghostAthleteInvite.status === 400,
    ghostAthleteInvite.json?.error || String(ghostAthleteInvite.status),
  )
  const coachLinksInvite = await createInvite('coach', [SAM])
  const coachLinksPeek = await req(`/api/auth/account-invite?token=${tokenOf(coachLinksInvite.json?.url)}`)
  ok(
    'coach invite carries no athlete links even when passed',
    coachLinksInvite.status === 200 && (coachLinksPeek.json?.athleteIds || []).length === 0,
    JSON.stringify(coachLinksPeek.json),
  )
  const athleteInvite = await createInvite('athlete', [SAM])
  const athleteToken = tokenOf(athleteInvite.json?.url)
  ok('admin can create an athlete invitation', athleteInvite.status === 200 && athleteToken.length >= 32)
  const peekAthlete = await req(`/api/auth/account-invite?token=${athleteToken}`)
  ok(
    'athlete invite peeks bound to the existing profile',
    peekAthlete.status === 200 &&
      peekAthlete.json?.valid === true &&
      peekAthlete.json?.role === 'athlete' &&
      sameIds(peekAthlete.json?.athleteIds, [SAM]),
  )
  const redeemAthlete = await req('/api/auth/account-invite', {
    method: 'POST',
    body: JSON.stringify({
      token: athleteToken,
      email: `v4-access-invited-athlete-${RUN}@example.com`,
      password: 'v4-access-athlete-password',
      displayName: 'V4 invited athlete',
    }),
  })
  ok(
    'athlete invite redeems bound to the existing profile as self',
    redeemAthlete.status === 200 &&
      redeemAthlete.json?.user?.role === 'athlete' &&
      redeemAthlete.json?.user?.rosterProfileId === SAM &&
      (redeemAthlete.json?.user?.linkedAthleteIds || []).length === 0,
    redeemAthlete.json?.error || JSON.stringify(redeemAthlete.json?.user),
  )
  const invitedAthleteLogin = await login(`v4-access-invited-athlete-${RUN}@example.com`, 'v4-access-athlete-password')
  ok('invited athlete can sign in', invitedAthleteLogin.status === 200, String(invitedAthleteLogin.status))
  const invitedAthleteCookie = cookieFrom('', invitedAthleteLogin)
  const invitedAthleteRows = ((await rosterAs(invitedAthleteCookie)).athletes || []).map((row) => row.id)
  ok(
    'invited athlete roster is exactly their own profile',
    invitedAthleteRows.length === 1 && invitedAthleteRows[0] === SAM,
    invitedAthleteRows.join(','),
  )
  const athleteInvite2 = await createInvite('athlete', [SAM])
  const athleteToken2 = tokenOf(athleteInvite2.json?.url)
  const redeemAthleteTampered = await req('/api/auth/account-invite', {
    method: 'POST',
    body: JSON.stringify({
      token: athleteToken2,
      email: `v4-access-invited-athlete2-${RUN}@example.com`,
      password: 'v4-access-athlete-password',
      displayName: 'V4 invited athlete 2',
      // Tampering attempts: binding must come from the invite, not the body.
      rosterProfileId: BLAKE,
      linkedAthleteIds: [BLAKE],
    }),
  })
  ok(
    'tampered athlete binding is ignored at redemption',
    redeemAthleteTampered.status === 200 &&
      redeemAthleteTampered.json?.user?.rosterProfileId === SAM &&
      (redeemAthleteTampered.json?.user?.linkedAthleteIds || []).length === 0,
    redeemAthleteTampered.json?.error || JSON.stringify(redeemAthleteTampered.json?.user),
  )
  const rosterAfterAthleteInvite = await rosterAs(cookie)
  ok(
    'athlete redemption created no duplicate profile',
    (rosterAfterAthleteInvite.athletes || []).length === countBefore &&
      (rosterAfterAthleteInvite.athletes || []).filter((row) => row.id === SAM).length === 1,
    `before ${countBefore} after ${(rosterAfterAthleteInvite.athletes || []).length}`,
  )

  // Failed redemption must not consume the invite.
  console.log('\nFailed redemption keeps the invite')
  const failInvite = await createInvite('parent', [BLAKE])
  const failToken = tokenOf(failInvite.json?.url)
  const failDup = await req('/api/auth/account-invite', {
    method: 'POST',
    body: JSON.stringify({
      token: failToken,
      email: parentEmail,
      password: 'v4-access-parent-password',
      displayName: 'V4 duplicate attempt',
    }),
  })
  ok('redemption with a duplicate email is 400', failDup.status === 400, failDup.json?.error || String(failDup.status))
  const failShort = await req('/api/auth/account-invite', {
    method: 'POST',
    body: JSON.stringify({
      token: failToken,
      email: `v4-access-fail-then-ok-${RUN}@example.com`,
      password: 'short',
      displayName: 'V4 short password attempt',
    }),
  })
  ok('redemption with a short password is 400', failShort.status === 400, failShort.json?.error || String(failShort.status))
  const peekAfterFail = await req(`/api/auth/account-invite?token=${failToken}`)
  ok(
    'invite is still valid after failed redemptions',
    peekAfterFail.status === 200 && peekAfterFail.json?.valid === true,
    JSON.stringify(peekAfterFail.json),
  )
  const failThenOk = await req('/api/auth/account-invite', {
    method: 'POST',
    body: JSON.stringify({
      token: failToken,
      email: `v4-access-fail-then-ok-${RUN}@example.com`,
      password: 'v4-access-parent-password',
      displayName: 'V4 fail then ok',
    }),
  })
  ok(
    'correct redemption after failures succeeds',
    failThenOk.status === 200 && failThenOk.json?.authenticated === true,
    failThenOk.json?.error || String(failThenOk.status),
  )
  const peekAfterOk = await req(`/api/auth/account-invite?token=${failToken}`)
  ok('invite is single-use after the successful redemption', peekAfterOk.json?.valid === false)

  // Concurrent double-use: exactly one redemption may succeed.
  console.log('\nConcurrent redemption')
  const raceInvite = await createInvite('coach', [])
  const raceToken = tokenOf(raceInvite.json?.url)
  const [raceA, raceB] = await Promise.all([
    req('/api/auth/account-invite', {
      method: 'POST',
      body: JSON.stringify({
        token: raceToken,
        email: `v4-access-race-a-${RUN}@example.com`,
        password: 'v4-access-race-password',
        displayName: 'V4 race A',
      }),
    }),
    req('/api/auth/account-invite', {
      method: 'POST',
      body: JSON.stringify({
        token: raceToken,
        email: `v4-access-race-b-${RUN}@example.com`,
        password: 'v4-access-race-password',
        displayName: 'V4 race B',
      }),
    }),
  ])
  const raceStatuses = [raceA.status, raceB.status].sort()
  ok(
    'concurrent redemptions yield exactly one success and one rejection',
    raceStatuses[0] === 200 && raceStatuses[1] === 401,
    `A ${raceA.status} B ${raceB.status}`,
  )
  const raceWinnerEmail =
    raceA.status === 200 ? `v4-access-race-a-${RUN}@example.com` : `v4-access-race-b-${RUN}@example.com`
  const raceWinnerLogin = await login(raceWinnerEmail, 'v4-access-race-password')
  ok('the concurrent winner can sign in', raceWinnerLogin.status === 200, String(raceWinnerLogin.status))
  const raceLoserEmail =
    raceA.status === 200 ? `v4-access-race-b-${RUN}@example.com` : `v4-access-race-a-${RUN}@example.com`
  const raceLoserLogin = await login(raceLoserEmail, 'v4-access-race-password')
  ok('the concurrent loser has no account', raceLoserLogin.status === 401, String(raceLoserLogin.status))

  // Expired invite: module-level, in a scratch data dir (see helper header).
  const scratch = fs.mkdtempSync(path.join(os.tmpdir(), 'shapelab-invite-unit-'))
  try {
    const created = inviteUnit(scratch, ['create'])
    ok(
      'fresh invite peeks valid at module level',
      created.peekValid === true && typeof created.token === 'string' && created.token.length >= 32,
    )
    const invitesPath = path.join(scratch, 'data', 'invites.json')
    const stored = JSON.parse(fs.readFileSync(invitesPath, 'utf8'))
    for (const row of stored.accountInvites || []) {
      if (row.id === created.id) row.expiresAt = '2000-01-01T00:00:00.000Z'
    }
    fs.writeFileSync(invitesPath, JSON.stringify(stored, null, 2))
    const expired = inviteUnit(scratch, ['check', created.token])
    ok('expired invite peeks invalid', expired.peekValid === false, JSON.stringify(expired))
    ok('expired invite cannot redeem', expired.redeemed === null, JSON.stringify(expired))
  } finally {
    fs.rmSync(scratch, { recursive: true, force: true })
  }


  // ---- Group C: independent adult athlete (build 1159) ------------------
  console.log('\nAdult independence')
  if (!samRow || !blakeRow || !parentCookie) {
    ok('adult independence group ran', false, 'needs example athletes and the invited parent from group B')
  } else {
    const samConsent0 = await consentRow(cookie, SAM)
    const blakeConsent0 = await consentRow(cookie, BLAKE)
    const samStories0 = samConsent0?.allowStories === true
    const blakeStories0 = blakeConsent0?.allowStories === true
    const origSamDob = typeof samRow.dateOfBirth === 'string' ? samRow.dateOfBirth : ''
    const origBlakeDob = typeof blakeRow.dateOfBirth === 'string' ? blakeRow.dateOfBirth : ''
    const origGrant = samRow.parentAccessGranted === true
    const adultDob = isoYearsAgo(25)
    const childDob = isoYearsAgo(10)
    const testInjury = {
      id: TEST_INJURY_ID,
      athleteId: SAM,
      date: new Date().toISOString().slice(0, 10),
      bodyPart: 'wrist',
      painLevel: 3,
      whatHurts: 'Access check entry',
      where: 'gym',
    }

    try {
      // Setup: Sam becomes an independent adult, Blake stays a child, and
      // Sam's row starts with the parent-access grant off.
      const setup = await rosterAs(cookie)
      athleteRow(setup, SAM).dateOfBirth = adultDob
      athleteRow(setup, SAM).parentAccessGranted = false
      athleteRow(setup, BLAKE).dateOfBirth = childDob
      const setupPut = await putRoster(cookie, setup)
      ok('admin setup write for independence group', setupPut.status === 200, String(setupPut.status))
      const verifySetup = await rosterAs(cookie)
      ok(
        'setup landed (adult + child birthdays, grant off)',
        athleteRow(verifySetup, SAM)?.dateOfBirth === adultDob &&
          athleteRow(verifySetup, BLAKE)?.dateOfBirth === childDob &&
          athleteRow(verifySetup, SAM)?.parentAccessGranted !== true,
      )

      // The link itself survives: the parent still SEES the adult athlete.
      const parentView = await rosterAs(parentCookie)
      ok(
        'parent still sees the independent athlete (link kept)',
        (parentView.athletes || []).some((row) => row.id === SAM),
      )

      // 1. Consent is closed to the parent without the grant, and stays put.
      const denied = await patchConsent(parentCookie, SAM, { allowStories: !samStories0 })
      ok('parent consent patch on independent athlete is 403', denied.status === 403, String(denied.status))
      const samConsentAfterDeny = await consentRow(cookie, SAM)
      ok(
        'denied consent patch changed nothing',
        (samConsentAfterDeny?.allowStories === true) === samStories0,
      )

      // 2. Control: the same parent manages the child athlete throughout.
      const childFlip = await patchConsent(parentCookie, BLAKE, { allowStories: !blakeStories0 })
      ok('parent consent patch on child athlete works', childFlip.status === 200, String(childFlip.status))
      const childBack = await patchConsent(parentCookie, BLAKE, { allowStories: blakeStories0 })
      ok('parent consent restore on child athlete works', childBack.status === 200, String(childBack.status))

      // 3. An injury-log write for the adult is dropped by the roster merge.
      const parentPayload = await rosterAs(parentCookie)
      parentPayload.injuryLogs = [...(parentPayload.injuryLogs || []), testInjury]
      const injuryPut = await putRoster(parentCookie, parentPayload)
      ok('parent roster write itself is accepted', injuryPut.status === 200, String(injuryPut.status))
      const afterInjuryDeny = await rosterAs(cookie)
      ok(
        'injury entry for independent athlete was dropped',
        !(afterInjuryDeny.injuryLogs || []).some((row) => row.id === TEST_INJURY_ID),
      )

      // 4. The parent cannot hand themself the grant.
      const grantAttempt = await rosterAs(parentCookie)
      athleteRow(grantAttempt, SAM).parentAccessGranted = true
      await putRoster(parentCookie, grantAttempt)
      const afterGrantAttempt = await rosterAs(cookie)
      ok(
        'parent cannot set parentAccessGranted themself',
        athleteRow(afterGrantAttempt, SAM)?.parentAccessGranted !== true,
      )

      // 5. The athlete grants access from their own account.
      const athleteLogin = await login(ATHLETE_EMAIL, ATHLETE_PASSWORD)
      ok('adult athlete can sign in', athleteLogin.status === 200, String(athleteLogin.status))
      const athleteCookie = cookieFrom('', athleteLogin)
      const athletePayload = await rosterAs(athleteCookie)
      ok(
        'athlete roster includes their own profile',
        (athletePayload.athletes || []).some((row) => row.id === SAM),
      )
      athleteRow(athletePayload, SAM).parentAccessGranted = true
      const grantPut = await putRoster(athleteCookie, athletePayload)
      ok('athlete roster write is accepted', grantPut.status === 200, String(grantPut.status))
      const afterGrant = await rosterAs(cookie)
      ok(
        'athlete-set grant landed on the roster row',
        athleteRow(afterGrant, SAM)?.parentAccessGranted === true,
      )

      // 6. With the grant, the parent manages consent again.
      const grantedPatch = await patchConsent(parentCookie, SAM, { allowStories: !samStories0 })
      ok('parent consent patch works with the grant', grantedPatch.status === 200, String(grantedPatch.status))
      const samConsentGranted = await consentRow(cookie, SAM)
      ok(
        'granted consent patch changed the field',
        (samConsentGranted?.allowStories === true) === !samStories0,
      )
      const grantedBack = await patchConsent(parentCookie, SAM, { allowStories: samStories0 })
      ok('parent consent restore works with the grant', grantedBack.status === 200, String(grantedBack.status))

      // 7. With the grant, the parent's injury entry lands; then clean it.
      const parentPayload2 = await rosterAs(parentCookie)
      parentPayload2.injuryLogs = [...(parentPayload2.injuryLogs || []), testInjury]
      await putRoster(parentCookie, parentPayload2)
      const afterInjuryGrant = await rosterAs(cookie)
      ok(
        'injury entry lands once the grant is on',
        (afterInjuryGrant.injuryLogs || []).some((row) => row.id === TEST_INJURY_ID),
      )
      // Roster sync merges injury logs union-by-id ("absence never
      // deletes", rosterMerge.ts) and injury logs have no tombstone list,
      // so omitting the entry cannot remove it. The entry therefore stays
      // on the example athlete as labeled residue (id inj_access_<run>,
      // "Access check entry") — same class of residue as the security
      // suite's test wellness journal entry.
      const parentPayload3 = await rosterAs(parentCookie)
      parentPayload3.injuryLogs = (parentPayload3.injuryLogs || []).filter((row) => row.id !== TEST_INJURY_ID)
      await putRoster(parentCookie, parentPayload3)
      const afterInjuryClean = await rosterAs(cookie)
      ok(
        'injury entry survives omission (union merge, absence never deletes)',
        (afterInjuryClean.injuryLogs || []).some((row) => row.id === TEST_INJURY_ID),
      )

      // 8. The athlete's own consent rights never depended on the grant.
      const selfPatch = await patchConsent(athleteCookie, SAM, { allowStories: samStories0 })
      ok('athlete can patch their own consent', selfPatch.status === 200, String(selfPatch.status))

      // 9. Revoking the grant closes the parent out again.
      const athletePayload2 = await rosterAs(athleteCookie)
      athleteRow(athletePayload2, SAM).parentAccessGranted = false
      await putRoster(athleteCookie, athletePayload2)
      const deniedAgain = await patchConsent(parentCookie, SAM, { allowStories: !samStories0 })
      ok('consent closes again after the athlete revokes', deniedAgain.status === 403, String(deniedAgain.status))

      // 10. Control still holds at the end.
      const childFlip2 = await patchConsent(parentCookie, BLAKE, { allowStories: !blakeStories0 })
      ok('child control still works at the end', childFlip2.status === 200, String(childFlip2.status))
      await patchConsent(parentCookie, BLAKE, { allowStories: blakeStories0 })
    } finally {
      // Restore every borrowed field exactly as found.
      const restore = await rosterAs(cookie)
      const samRestore = athleteRow(restore, SAM)
      const blakeRestore = athleteRow(restore, BLAKE)
      if (samRestore) {
        samRestore.dateOfBirth = origSamDob
        samRestore.parentAccessGranted = origGrant
      }
      if (blakeRestore) blakeRestore.dateOfBirth = origBlakeDob
      restore.injuryLogs = (restore.injuryLogs || []).filter((row) => row.id !== TEST_INJURY_ID)
      await putRoster(cookie, restore)
      await patchConsent(cookie, SAM, { allowStories: samStories0 })
      await patchConsent(cookie, BLAKE, { allowStories: blakeStories0 })
      const restored = await rosterAs(cookie)
      ok(
        'borrowed roster fields restored',
        (athleteRow(restored, SAM)?.dateOfBirth || '') === origSamDob &&
          (athleteRow(restored, BLAKE)?.dateOfBirth || '') === origBlakeDob &&
          (athleteRow(restored, SAM)?.parentAccessGranted === true) === origGrant,
      )
    }
  }

  if (failed) {
    console.log(`\n${failed} check(s) failed`)
    process.exit(1)
  }
  console.log('\nAll V4 access checks passed')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
