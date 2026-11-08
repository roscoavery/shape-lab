import { describe, it, mock } from 'node:test'
import assert from 'node:assert/strict'

/**
 * Group-intake submit (server/shareLinks.ts): the proof Ryan asked for that
 * a group sign-up link puts everyone who uses it in the right group, and
 * that the coach and gym land on the profile.
 *
 * The handler reads tokens, roster, training events, gyms, and coach
 * accounts through the store modules, so those are mocked in memory here;
 * nothing touches disk. Run with --experimental-test-module-mocks (same
 * as the main suite).
 */

const GROUP_TOKEN = 'a'.repeat(32)
const OPEN_TOKEN = 'b'.repeat(32)
const ATHLETE_TOKEN = 'c'.repeat(32)
const COACH_ID = 'coach_ryan'
const COACH_NO_GYM_ID = 'coach_nogym'
const GROUP_ID = 'grp_camp'
const OTHER_GROUP_ID = 'grp_other'

const gymsById: Record<string, { id: string; name: string }> = {
  gym_tumble: { id: 'gym_tumble', name: 'Tumble Smart Athletics' },
  gym_tevis: { id: 'gym_tevis', name: 'Tevis Gym' },
  gym_old: { id: 'gym_old', name: 'Old Gym' },
}

const accountsByProfile: Record<string, { gymId?: string }> = {
  [COACH_ID]: { gymId: 'gym_tumble' },
}

let tokenRows: any[] = []
let athletes: any[] = []
let events: any[] = []

function reset() {
  tokenRows = [
    {
      token: GROUP_TOKEN,
      type: 'intake-group',
      coachId: COACH_ID,
      groupId: GROUP_ID,
      createdAt: '2026-11-08T00:00:00Z',
    },
    { token: OPEN_TOKEN, type: 'intake-open', coachId: COACH_ID, createdAt: '2026-11-08T00:00:00Z' },
    {
      token: ATHLETE_TOKEN,
      type: 'intake',
      coachId: COACH_ID,
      athleteId: 'ath_existing',
      createdAt: '2026-11-08T00:00:00Z',
    },
  ]
  athletes = [
    {
      id: 'ath_coach',
      name: 'Coach Ryan',
      firstName: 'Coach',
      lastName: 'Ryan',
      role: 'coach',
      gymName: 'Tumble Smart Athletics',
    },
  ]
  events = [
    { id: GROUP_ID, name: 'Camp TumbleSmart', athleteIds: [] },
    { id: OTHER_GROUP_ID, name: 'Other camp', athleteIds: [] },
  ]
}

const files = new Map<string, unknown>()
mock.module('./persist.ts', {
  cache: false,
  exports: {
    readJson: async (rel: string, fallback: unknown) => files.get(rel) ?? fallback,
    writeJson: async (rel: string, data: unknown) => {
      files.set(rel, data)
    },
    persistMode: () => 'disk',
    sendPublicRedirect: () => {},
  },
} as Parameters<typeof mock.module>[1])

mock.module('./instagramResolve.ts', {
  cache: false,
  exports: {
    sendJson: (res: any, status: number, body: unknown) => {
      res.statusCode = status
      res.end(JSON.stringify(body))
    },
  },
} as Parameters<typeof mock.module>[1])

mock.module('./skillPathStore.ts', {
  cache: false,
  exports: {
    readSkillPathsFile: async () => ({
      kind: 'shape-lab-skill-paths',
      version: 1,
      exportedAt: '',
      skills: [],
      needs: [],
      conditioning: [],
      drills: [],
    }),
  },
} as Parameters<typeof mock.module>[1])

mock.module('./rosterStore.ts', {
  cache: false,
  exports: {
    readRosterFile: async () => ({ athletes }),
    writeRosterFile: async (next: any) => {
      athletes = next.athletes
    },
  },
} as Parameters<typeof mock.module>[1])

mock.module('./trainingEventStore.ts', {
  cache: false,
  exports: {
    readTrainingEventsFile: async () => ({ events }),
    writeTrainingEventsFile: async (next: any) => {
      events = next.events
    },
  },
} as Parameters<typeof mock.module>[1])

mock.module('./gymStore.ts', {
  cache: false,
  exports: {
    getGym: async (id: string) => gymsById[id] ?? null,
    listGyms: async () => Object.values(gymsById),
    findGymByName: async (name: string) =>
      Object.values(gymsById).find((g) => g.name.toLowerCase() === name.trim().toLowerCase()) ??
      null,
  },
} as Parameters<typeof mock.module>[1])

mock.module('./auth/accounts.ts', {
  cache: false,
  exports: {
    findAccountByRosterProfileId: async (rosterProfileId: string) =>
      accountsByProfile[rosterProfileId] ?? null,
  },
} as Parameters<typeof mock.module>[1])

const { handleShareIntakeSubmit } = await import('./shareLinks.ts')

function fakeReq(body: unknown): any {
  const text = JSON.stringify(body)
  return {
    [Symbol.asyncIterator]: async function* () {
      yield Buffer.from(text)
    },
  }
}

function fakeRes(): { res: any; status: () => number; body: () => any } {
  let status = 0
  let raw = ''
  const res: any = {
    set statusCode(v: number) {
      status = v
    },
    get statusCode() {
      return status
    },
    setHeader() {},
    end(chunk: string) {
      raw = chunk
    },
  }
  return { res, status: () => status, body: () => JSON.parse(raw || '{}') }
}

async function submit(token: string, body: unknown) {
  const { res, status, body: readBody } = fakeRes()
  await handleShareIntakeSubmit(
    fakeReq(body),
    res,
    new URL(`http://127.0.0.1/api/share/intake-submit?token=${token}`),
  )
  return { status: status(), data: readBody() }
}

function group(groupId: string) {
  return events.find((e) => e.id === groupId)
}

function intakeAnswers() {
  return [
    { questionId: 'birthday', prompt: 'Birthday', answer: '2016-05-04' },
    { questionId: 'parentPhone', prompt: 'Parent phone', answer: '(918) 555-0100' },
  ]
}

describe('group-intake submit stamps coach and gym, and joins the group', () => {
  it('new athlete: coach and selected gym land on the profile, and the group roster gains them', async () => {
    reset()
    files.set('data/share-tokens.json', { kind: 'shape-lab-share-tokens', tokens: tokenRows })
    const { status, data } = await submit(GROUP_TOKEN, {
      firstName: 'Camp',
      lastName: 'Kid',
      answers: intakeAnswers(),
      gymId: 'gym_tevis',
    })
    assert.equal(status, 200)
    assert.equal(data.ok, true)
    const created = athletes.find((a) => a.id === data.athleteId)
    assert.ok(created, 'new profile exists')
    assert.deepEqual(created.worksWithCoachIds, [COACH_ID])
    assert.equal(created.createdByCoachId, COACH_ID)
    assert.equal(created.gymId, 'gym_tevis')
    assert.equal(created.gymName, 'Tevis Gym')
    assert.ok(group(GROUP_ID)!.athleteIds.includes(created.id), 'group roster gains the athlete')
    assert.deepEqual(group(OTHER_GROUP_ID)!.athleteIds, [], 'other groups untouched')
  })

  it('matched existing athlete: no duplicate, coach and gym fill only what is missing, joins the group', async () => {
    reset()
    files.set('data/share-tokens.json', { kind: 'shape-lab-share-tokens', tokens: tokenRows })
    athletes.push({
      id: 'ath_existing',
      name: 'Camp Kid',
      firstName: 'Camp',
      lastName: 'Kid',
      role: 'athlete',
      dateOfBirth: '2016-05-04',
      parentPhone: '(918) 555-0100',
      intakeAnswers: [],
    })
    const before = athletes.length
    const { status, data } = await submit(GROUP_TOKEN, {
      firstName: 'Camp',
      lastName: 'Kid',
      answers: intakeAnswers(),
      gymId: 'gym_tevis',
    })
    assert.equal(status, 200)
    assert.equal(data.matchedExisting, true)
    assert.equal(athletes.length, before, 'no duplicate profile')
    const kept = athletes.find((a) => a.id === 'ath_existing')!
    assert.deepEqual(kept.worksWithCoachIds, [COACH_ID])
    assert.equal(kept.createdByCoachId, COACH_ID)
    assert.equal(kept.gymId, 'gym_tevis')
    assert.equal(kept.gymName, 'Tevis Gym')
    assert.ok(group(GROUP_ID)!.athleteIds.includes('ath_existing'))
  })

  it('matched existing athlete with a gym keeps its gym', async () => {
    reset()
    files.set('data/share-tokens.json', { kind: 'shape-lab-share-tokens', tokens: tokenRows })
    athletes.push({
      id: 'ath_existing',
      name: 'Camp Kid',
      firstName: 'Camp',
      lastName: 'Kid',
      role: 'athlete',
      dateOfBirth: '2016-05-04',
      parentPhone: '(918) 555-0100',
      gymId: 'gym_old',
      gymName: 'Old Gym',
      intakeAnswers: [],
    })
    const { status } = await submit(GROUP_TOKEN, {
      firstName: 'Camp',
      lastName: 'Kid',
      answers: intakeAnswers(),
      gymId: 'gym_tevis',
    })
    assert.equal(status, 200)
    const kept = athletes.find((a) => a.id === 'ath_existing')!
    assert.equal(kept.gymId, 'gym_old')
    assert.equal(kept.gymName, 'Old Gym')
    assert.ok(group(GROUP_ID)!.athleteIds.includes('ath_existing'))
  })

  it('group link with a typed gym name stamps the name only', async () => {
    reset()
    files.set('data/share-tokens.json', { kind: 'shape-lab-share-tokens', tokens: tokenRows })
    const { status, data } = await submit(GROUP_TOKEN, {
      firstName: 'Camp',
      lastName: 'Kid',
      answers: intakeAnswers(),
      gymName: 'Garage Gym',
    })
    assert.equal(status, 200)
    const created = athletes.find((a) => a.id === data.athleteId)!
    assert.equal(created.gymName, 'Garage Gym')
    assert.equal(created.gymId, undefined)
    assert.ok(group(GROUP_ID)!.athleteIds.includes(created.id))
  })

  it('open link, new athlete: the coach main gym is stamped', async () => {
    reset()
    files.set('data/share-tokens.json', { kind: 'shape-lab-share-tokens', tokens: tokenRows })
    const { status, data } = await submit(OPEN_TOKEN, {
      firstName: 'Open',
      lastName: 'Kid',
      answers: intakeAnswers(),
    })
    assert.equal(status, 200)
    const created = athletes.find((a) => a.id === data.athleteId)!
    assert.deepEqual(created.worksWithCoachIds, [COACH_ID])
    assert.equal(created.createdByCoachId, COACH_ID)
    assert.equal(created.gymId, 'gym_tumble')
    assert.equal(created.gymName, 'Tumble Smart Athletics')
  })

  it('open link, coach with no gym on file: submit still works, coach stamped, gym blank', async () => {
    reset()
    files.set('data/share-tokens.json', {
      kind: 'shape-lab-share-tokens',
      tokens: [
        {
          token: OPEN_TOKEN,
          type: 'intake-open',
          coachId: COACH_NO_GYM_ID,
          createdAt: '2026-11-08T00:00:00Z',
        },
      ],
    })
    const { status, data } = await submit(OPEN_TOKEN, {
      firstName: 'Open',
      lastName: 'Kid',
      answers: intakeAnswers(),
    })
    assert.equal(status, 200)
    const created = athletes.find((a) => a.id === data.athleteId)!
    assert.deepEqual(created.worksWithCoachIds, [COACH_NO_GYM_ID])
    assert.equal(created.gymId, undefined)
    assert.equal(created.gymName, undefined)
  })

  it('per-athlete link: the coach is added when missing, nothing else changes', async () => {
    reset()
    files.set('data/share-tokens.json', { kind: 'shape-lab-share-tokens', tokens: tokenRows })
    athletes.push({
      id: 'ath_existing',
      name: 'Camp Kid',
      firstName: 'Camp',
      lastName: 'Kid',
      role: 'athlete',
      intakeAnswers: [],
    })
    const { status } = await submit(ATHLETE_TOKEN, { answers: intakeAnswers() })
    assert.equal(status, 200)
    const kept = athletes.find((a) => a.id === 'ath_existing')!
    assert.deepEqual(kept.worksWithCoachIds, [COACH_ID])
    assert.equal(kept.gymName, undefined)
  })
})
