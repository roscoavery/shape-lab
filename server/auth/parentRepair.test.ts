import { describe, it } from 'node:test'
import assert from 'node:assert/strict'

/**
 * Parent-account data repair (build 1270): computeParentRepair in
 * server/auth/parentRepair.ts. The function is pure, so it runs here with
 * no mocks. The Lauren case is the shape of the real bug: two parent
 * rows ("Lauren" and "Lauren Lukeman") sharing one athlete, two accounts,
 * guardian links and ath_ryan all pointing at the wrong rows.
 */

import { computeParentRepair, type ParentRepairAccount } from './parentRepair.ts'

type Row = Record<string, unknown>

const REESE = 'ath_reese'
const WINNER = 'par_acc_lauren_full'
const LOSER = 'par_acc_lauren_short'

function laurenInput() {
  const accounts: ParentRepairAccount[] = [
    {
      id: 'acc_lauren_full',
      email: 'lauren@example.com',
      role: 'parent',
      displayName: 'Lauren Lukeman',
      rosterProfileId: WINNER,
      linkedAthleteIds: [REESE],
    },
    {
      id: 'acc_lauren_short',
      email: 'lauren2@example.com',
      role: 'parent',
      displayName: 'Lauren',
      rosterProfileId: LOSER,
      linkedAthleteIds: [REESE],
    },
  ]
  const athletes: Row[] = [
    { id: 'ath_ryan', name: 'Ryan Williams', role: 'coach', linkedAthleteIds: [REESE] },
    {
      id: WINNER,
      name: 'Lauren Lukeman',
      firstName: 'Lauren',
      role: 'parent',
      linkedAthleteIds: [REESE],
      childName: 'Reese Lukeman',
      createdAt: '2026-11-20T10:00:00.000Z',
    },
    {
      id: LOSER,
      name: 'Lauren',
      firstName: 'Lauren',
      role: 'parent',
      linkedAthleteIds: [REESE],
      childName: 'Reese Lukeman',
      createdAt: '2026-11-23T09:00:00.000Z',
    },
    {
      id: REESE,
      name: 'Reese Lukeman',
      role: 'athlete',
      guardianRelationships: [
        { accountId: 'acc_lauren_short', rosterProfileId: LOSER, kind: 'parent' },
        { accountId: 'acc_lauren_full', rosterProfileId: WINNER, kind: 'parent' },
      ],
    },
  ]
  return { accounts, athletes, removedAthleteIds: [] as string[] }
}

describe('computeParentRepair', () => {
  it('merges the duplicate Lauren rows into Lauren Lukeman and re-points everything', () => {
    const { accounts, athletes, removedAthleteIds } = laurenInput()
    const result = computeParentRepair({ accounts, athletes, removedAthleteIds })

    const ids = result.athletes.map((row) => String(row.id))
    assert.ok(ids.includes(WINNER), 'keeps the Lauren Lukeman row')
    assert.ok(!ids.includes(LOSER), 'removes the Lauren row')
    assert.ok(result.removedAthleteIds.includes(LOSER), 'tombstones the removed row id')
    assert.deepEqual(result.accountPatches, [
      { accountId: 'acc_lauren_short', rosterProfileId: WINNER },
    ])

    const reese = result.athletes.find((row) => row.id === REESE) as Row
    const rels = reese.guardianRelationships as Row[]
    assert.equal(rels.length, 2)
    for (const rel of rels) {
      assert.equal(rel.rosterProfileId, WINNER)
    }

    const ryan = result.athletes.find((row) => row.id === 'ath_ryan') as Row
    assert.deepEqual(ryan.linkedAthleteIds, [])
  })

  it('never recreates a tombstoned row on a later run, and re-points an account left behind by a crash', () => {
    const { accounts, athletes, removedAthleteIds } = laurenInput()
    const first = computeParentRepair({ accounts, athletes, removedAthleteIds })
    // The roster write landed but the account update did not: the short
    // account still points at the removed row.
    const second = computeParentRepair({
      accounts,
      athletes: first.athletes,
      removedAthleteIds: first.removedAthleteIds,
    })
    const ids = second.athletes.map((row) => String(row.id))
    assert.ok(!ids.includes(LOSER), 'does not recreate the removed row')
    assert.deepEqual(second.accountPatches, [
      { accountId: 'acc_lauren_short', rosterProfileId: WINNER },
    ])
  })

  it('is idempotent: a second run changes nothing', () => {
    const { accounts, athletes, removedAthleteIds } = laurenInput()
    const first = computeParentRepair({ accounts, athletes, removedAthleteIds })
    const patchedAccounts = accounts.map((account) => {
      const patch = first.accountPatches.find((p) => p.accountId === account.id)
      return patch ? { ...account, rosterProfileId: patch.rosterProfileId ?? undefined } : account
    })
    const second = computeParentRepair({
      accounts: patchedAccounts,
      athletes: first.athletes,
      removedAthleteIds: first.removedAthleteIds,
    })
    assert.deepEqual(second.accountPatches, [])
    assert.deepEqual(second.athletes, first.athletes)
    assert.deepEqual(second.removedAthleteIds, first.removedAthleteIds)
    assert.deepEqual(second.notes, [])
  })

  it('creates a missing par_ row for a parent account with linked athletes', () => {
    const result = computeParentRepair({
      accounts: [
        {
          id: 'acc_mom',
          email: 'mom@example.com',
          role: 'parent',
          displayName: 'Maya Chen',
          linkedAthleteIds: ['ath_kid'],
        },
      ],
      athletes: [
        { id: 'ath_ryan', name: 'Ryan Williams', role: 'coach', linkedAthleteIds: [] },
        { id: 'ath_kid', name: 'Kid Chen', role: 'athlete' },
      ],
      removedAthleteIds: [],
    })
    const row = result.athletes.find((r) => r.id === 'par_acc_mom') as Row
    assert.ok(row, 'creates the par_ row')
    assert.equal(row.name, 'Maya Chen')
    assert.equal(row.role, 'parent')
    assert.deepEqual(row.linkedAthleteIds, ['ath_kid'])
    assert.equal(row.childName, 'Kid Chen')
    assert.deepEqual(result.accountPatches, [
      { accountId: 'acc_mom', rosterProfileId: 'par_acc_mom' },
    ])
  })

  it('creates a par_ row for a parent account pointing at ath_ryan, and re-points it', () => {
    const result = computeParentRepair({
      accounts: [
        {
          id: 'acc_dad',
          email: 'dad@example.com',
          role: 'parent',
          displayName: 'Dan Park',
          rosterProfileId: 'ath_ryan',
          linkedAthleteIds: [],
        },
      ],
      athletes: [{ id: 'ath_ryan', name: 'Ryan Williams', role: 'coach', linkedAthleteIds: [] }],
      removedAthleteIds: [],
    })
    const row = result.athletes.find((r) => r.id === 'par_acc_dad') as Row
    assert.ok(row, 'creates the par_ row even with no linked athletes')
    assert.deepEqual(result.accountPatches, [
      { accountId: 'acc_dad', rosterProfileId: 'par_acc_dad' },
    ])
  })

  it('leaves a clean parent account alone and keeps ath_ryan links that belong to no parent', () => {
    const athletes: Row[] = [
      { id: 'ath_ryan', name: 'Ryan Williams', role: 'coach', linkedAthleteIds: ['ath_b'] },
      {
        id: 'par_acc_ok',
        name: 'Olivia Hart',
        firstName: 'Olivia',
        role: 'parent',
        linkedAthleteIds: ['ath_a'],
        childName: 'Ann Hart',
      },
      { id: 'ath_a', name: 'Ann Hart', role: 'athlete' },
      { id: 'ath_b', name: 'Ben Hart', role: 'athlete' },
    ]
    const result = computeParentRepair({
      accounts: [
        {
          id: 'acc_ok',
          email: 'olivia@example.com',
          role: 'parent',
          displayName: 'Olivia Hart',
          rosterProfileId: 'par_acc_ok',
          linkedAthleteIds: ['ath_a'],
        },
      ],
      athletes,
      removedAthleteIds: [],
    })
    assert.deepEqual(result.accountPatches, [])
    assert.deepEqual(result.notes, [])
    assert.deepEqual(result.athletes, athletes)
    const ryan = result.athletes.find((row) => row.id === 'ath_ryan') as Row
    assert.deepEqual(ryan.linkedAthleteIds, ['ath_b'])
  })

  it('does not merge two parent rows with the same first name but different athletes', () => {
    const result = computeParentRepair({
      accounts: [
        {
          id: 'acc_a',
          email: 'a@example.com',
          role: 'parent',
          displayName: 'Lauren',
          rosterProfileId: 'par_acc_a',
          linkedAthleteIds: ['ath_one'],
        },
        {
          id: 'acc_b',
          email: 'b@example.com',
          role: 'parent',
          displayName: 'Lauren',
          rosterProfileId: 'par_acc_b',
          linkedAthleteIds: ['ath_two'],
        },
      ],
      athletes: [
        { id: 'par_acc_a', name: 'Lauren', firstName: 'Lauren', role: 'parent', linkedAthleteIds: ['ath_one'] },
        { id: 'par_acc_b', name: 'Lauren', firstName: 'Lauren', role: 'parent', linkedAthleteIds: ['ath_two'] },
        { id: 'ath_one', name: 'One', role: 'athlete' },
        { id: 'ath_two', name: 'Two', role: 'athlete' },
      ],
      removedAthleteIds: [],
    })
    const ids = result.athletes.map((row) => String(row.id))
    assert.ok(ids.includes('par_acc_a') && ids.includes('par_acc_b'))
    assert.deepEqual(result.accountPatches, [])
    assert.deepEqual(result.removedAthleteIds, [])
  })
})
