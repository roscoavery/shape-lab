import { describe, it, mock } from 'node:test'
import assert from 'node:assert/strict'

/**
 * Coach bootstrap (build 1236): ensureCoachRosterProfile in
 * server/auth/familyLinks.ts creates the coach roster row exactly once
 * for an account, stamped needsProfileSetup, and never re-sets the flag
 * once the coach has finished or skipped the first-run profile step.
 *
 * familyLinks only imports ../rosterStore, so that module is stubbed
 * with an in-memory roster; the function under test runs for real. Run
 * with --experimental-test-module-mocks (same as the main suite).
 */

type Row = Record<string, unknown>

let stored: { kind: string; athletes: Row[] } = { kind: 'shape-lab-roster', athletes: [] }

function reset(rows: Row[] = []) {
  stored = { kind: 'shape-lab-roster', athletes: rows.map((row) => ({ ...row })) }
}

mock.module('../rosterStore.ts', {
  cache: false,
  // Node 24's runtime names this option `exports`; the bundled
  // @types/node still calls it `namedExports`, hence the cast.
  exports: {
    readRosterFile: async () => ({ ...stored, athletes: stored.athletes.map((row) => ({ ...row })) }),
    writeRosterFile: async (data: unknown) => {
      const next = data as { kind: string; athletes: Row[] }
      stored = { kind: next.kind, athletes: next.athletes.map((row) => ({ ...row })) }
      return stored
    },
  },
} as Parameters<typeof mock.module>[1])

const { ensureCoachRosterProfile } = await import('./familyLinks.ts')

describe('ensureCoachRosterProfile', () => {
  it('creates a coach row with the gym and the setup flag', async () => {
    reset()
    const out = await ensureCoachRosterProfile({
      accountId: 'acc_coach_1',
      displayName: 'Tevis Smith',
      gymId: 'gym_tumble',
      gymName: 'Tumble Smart Athletics',
    })
    assert.equal(out?.id, 'coa_acc_coach_1')
    assert.equal(stored.athletes.length, 1)
    const row = stored.athletes[0] as Row
    assert.equal(row.role, 'coach')
    assert.equal(row.name, 'Tevis Smith')
    assert.equal(row.firstName, 'Tevis')
    assert.equal(row.gymId, 'gym_tumble')
    assert.equal(row.gymName, 'Tumble Smart Athletics')
    assert.equal(row.needsProfileSetup, true)
  })

  it('re-running finds the same row and never re-sets a cleared flag', async () => {
    reset()
    await ensureCoachRosterProfile({ accountId: 'acc_coach_2', displayName: 'Jamie Lee' })
    assert.equal(stored.athletes.length, 1)
    // The coach finished the profile step: the flag is cleared on the row.
    stored.athletes[0] = { ...stored.athletes[0], needsProfileSetup: false }
    const out = await ensureCoachRosterProfile({ accountId: 'acc_coach_2', displayName: 'Jamie Lee' })
    assert.equal(out?.id, 'coa_acc_coach_2')
    assert.equal(stored.athletes.length, 1)
    assert.equal(stored.athletes[0]?.needsProfileSetup, false)
  })

  it('does not touch a row at that id with another role', async () => {
    reset([{ id: 'coa_acc_coach_3', name: 'Someone Else', role: 'athlete' }])
    const out = await ensureCoachRosterProfile({ accountId: 'acc_coach_3', displayName: 'Coach Three' })
    assert.equal(out, null)
    assert.equal(stored.athletes.length, 1)
    assert.equal(stored.athletes[0]?.role, 'athlete')
  })

  it('creates the row without a gym when none was picked', async () => {
    reset()
    const out = await ensureCoachRosterProfile({ accountId: 'acc_coach_4', displayName: 'Sam Fox' })
    assert.equal(out?.id, 'coa_acc_coach_4')
    const row = stored.athletes[0] as Row
    assert.equal(row.role, 'coach')
    assert.equal(row.needsProfileSetup, true)
    assert.equal('gymId' in row, false)
    assert.equal('gymName' in row, false)
  })
})
