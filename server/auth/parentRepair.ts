/**
 * Parent-account data repair (build 1270).
 *
 * Lauren Lukeman's parent account was greeted as Ryan because her account
 * pointed at ath_ryan, and the Accounts desk showed two parent rows for
 * her, "Lauren" and "Lauren Lukeman", neither of which could be deleted
 * for good (the client tombstone filter dropped par_ ids, fixed in
 * src/lib/storage.ts). Two rows almost certainly mean two accounts, so
 * this repair reconciles rows AND accounts:
 *
 * - Duplicate parent rows for the same person (same name, or one name a
 *   first-word prefix of the other, sharing a linked athlete) are merged
 *   into the fuller name. The loser row is removed and tombstoned so a
 *   stale client push cannot resurrect it. The duplicate ACCOUNT is never
 *   deleted: it is re-pointed at the surviving row, so either email still
 *   signs in and lands on the same "Lauren Lukeman" profile.
 * - Every parent account is pointed at its own par_ row, creating the row
 *   first when the account has linked athletes. A parent account with no
 *   row and no linked athletes has a stray link cleared instead of
 *   pointing at someone else's row.
 * - Guardian relationships on athletes are re-pointed at the surviving
 *   row, and athletes wrongly linked from ath_ryan are unlinked.
 *
 * The pure part, computeParentRepair, is unit-testable. The wrapper runs
 * once per server process, lazily, at the start of the roster GET/PUT and
 * the accounts POST/PATCH handlers. It only writes when something is
 * actually wrong, and it never throws: a failed repair just means the
 * next request tries again.
 */

import { accountsWithoutSecrets, updateAccount } from './accounts.ts'
import { readRosterFile, writeRosterFile } from '../rosterStore.ts'

export type ParentRepairAccount = {
  id: string
  email: string
  role: string
  displayName: string
  rosterProfileId?: string
  linkedAthleteIds?: string[]
}

export type ParentRepairInput = {
  accounts: ParentRepairAccount[]
  athletes: Record<string, unknown>[]
  removedAthleteIds: string[]
}

export type ParentRepairResult = {
  athletes: Record<string, unknown>[]
  removedAthleteIds: string[]
  accountPatches: { accountId: string; rosterProfileId?: string | null }[]
  notes: string[]
}

type Row = Record<string, unknown>

function normName(name: unknown): string {
  return typeof name === 'string' ? name.trim().toLowerCase().replace(/\s+/g, ' ') : ''
}

function asIds(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((id): id is string => typeof id === 'string') : []
}

function linkedIds(row: Row): string[] {
  return asIds(row.linkedAthleteIds)
}

function rels(row: Row): Row[] {
  return Array.isArray(row.guardianRelationships)
    ? (row.guardianRelationships as Row[])
    : []
}

function firstNameOf(displayName: string): string {
  return displayName.trim().split(/\s+/)[0] || displayName
}

export function computeParentRepair(input: ParentRepairInput): ParentRepairResult {
  const notes: string[] = []
  const accountPatches: ParentRepairResult['accountPatches'] = []
  const removed = new Set(input.removedAthleteIds)
  // Shallow-copy rows so the caller data is never mutated.
  let athletes: Row[] = input.athletes.map((row) => ({ ...row }))
  const byId = new Map<string, Row>()
  for (const row of athletes) {
    if (typeof row.id === 'string') byId.set(row.id, row)
  }
  const accountsById = new Map(input.accounts.map((a) => [a.id, a]))
  const parentAccounts = input.accounts.filter((a) => a.role === 'parent')
  const accountByProfileId = new Map<string, ParentRepairAccount>()
  for (const account of input.accounts) {
    if (account.rosterProfileId) accountByProfileId.set(account.rosterProfileId, account)
  }

  const childNameFor = (ids: string[]): string =>
    ids
      .map((id) => {
        const row = byId.get(id)
        return row && typeof row.name === 'string' ? row.name : ''
      })
      .filter(Boolean)
      .join(', ')

  // --- 1. Merge duplicate parent rows for the same person. ---
  const parentRows = athletes.filter((row) => row.role === 'parent')
  const parent = new Map<number, number>()
  const find = (i: number): number => {
    const p = parent.get(i)
    if (p === undefined || p === i) return i
    const root = find(p)
    parent.set(i, root)
    return root
  }
  for (let i = 0; i < parentRows.length; i += 1) {
    for (let j = i + 1; j < parentRows.length; j += 1) {
      const a = parentRows[i]
      const b = parentRows[j]
      if (!a || !b) continue
      const nameA = normName(a.name)
      const nameB = normName(b.name)
      if (!nameA || !nameB) continue
      const firstA = nameA.split(' ')[0] ?? ''
      const firstB = nameB.split(' ')[0] ?? ''
      const samePerson =
        nameA === nameB || nameA === firstB || nameB === firstA
      const shared = linkedIds(a).filter((id) => linkedIds(b).includes(id))
      if (samePerson && shared.length > 0) {
        parent.set(find(i), find(j))
      }
    }
  }
  const groups = new Map<number, Row[]>()
  parentRows.forEach((row, i) => {
    const root = find(i)
    const group = groups.get(root) ?? []
    group.push(row)
    groups.set(root, group)
  })
  const repoint: Record<string, string> = {}
  for (const group of groups.values()) {
    if (group.length < 2) continue
    const sorted = [...group].sort((a, b) => {
      const byName = normName(b.name).length - normName(a.name).length
      if (byName !== 0) return byName
      const aRef = a.id && accountByProfileId.has(String(a.id)) ? 0 : 1
      const bRef = b.id && accountByProfileId.has(String(b.id)) ? 0 : 1
      if (aRef !== bRef) return aRef - bRef
      const aAt = typeof a.createdAt === 'string' ? a.createdAt : ''
      const bAt = typeof b.createdAt === 'string' ? b.createdAt : ''
      if (aAt !== bAt) return aAt < bAt ? -1 : 1
      return String(a.id).localeCompare(String(b.id))
    })
    const winner = sorted[0]
    if (!winner) continue
    const winnerId = String(winner.id)
    const mergedLinks = [
      ...new Set(sorted.flatMap((row) => linkedIds(row))),
    ]
    const loserIds = sorted.slice(1).map((row) => String(row.id))
    for (const loserId of loserIds) {
      repoint[loserId] = winnerId
      removed.add(loserId)
      notes.push(`Removed duplicate parent profile ${loserId}, kept ${winnerId}.`)
    }
    winner.linkedAthleteIds = mergedLinks
    const childName = childNameFor(mergedLinks)
    if (childName) winner.childName = childName
    athletes = athletes.filter((row) => !loserIds.includes(String(row.id)))
  }

  // --- 2. Every parent account points at its own par_ row. ---
  // accountProfileId tracks the row each parent account ends up on, so
  // step 3 can point guardian relationships at the same row.
  const accountProfileId = new Map<string, string>()
  for (const account of parentAccounts) {
    const ownId = `par_${account.id}`
    // This account's own row was merged into a duplicate winner above:
    // land on the winner instead of recreating the loser row.
    const mergedInto = repoint[ownId]
    if (mergedInto) {
      accountProfileId.set(account.id, mergedInto)
      if (account.rosterProfileId !== mergedInto) {
        accountPatches.push({ accountId: account.id, rosterProfileId: mergedInto })
        notes.push(`Pointed ${account.email} at the surviving parent profile ${mergedInto}.`)
      }
      continue
    }
    if (removed.has(ownId)) {
      // This row was merged away in an earlier run. Never recreate it.
      // The account already points at the surviving row in the normal
      // case; if it still points at the removed row (a crash between the
      // roster write and the account update), find the survivor by shared
      // linked athletes and name.
      const current = account.rosterProfileId
      const currentRow = current ? athletes.find((row) => row.id === current) : undefined
      if (currentRow && currentRow.role === 'parent') {
        accountProfileId.set(account.id, String(currentRow.id))
        continue
      }
      const linked = asIds(account.linkedAthleteIds)
      const name = normName(account.displayName)
      const first = name.split(' ')[0] ?? ''
      const candidates = athletes.filter((row) => {
        if (row.role !== 'parent' || String(row.id) === ownId) return false
        const rowName = normName(row.name)
        const nameMatch = rowName === name || rowName === first || name === rowName.split(' ')[0]
        const shared = linkedIds(row).filter((id) => linked.includes(id))
        return nameMatch && shared.length > 0
      })
      if (candidates.length === 1) {
        const target = String(candidates[0].id)
        accountProfileId.set(account.id, target)
        accountPatches.push({ accountId: account.id, rosterProfileId: target })
        notes.push(`Pointed ${account.email} at the surviving parent profile ${target}.`)
      }
      continue
    }
    const ownRow = athletes.find((row) => row.id === ownId)
    if (ownRow) {
      accountProfileId.set(account.id, ownId)
      if (account.rosterProfileId !== ownId) {
        accountPatches.push({ accountId: account.id, rosterProfileId: ownId })
        notes.push(`Pointed ${account.email} at its own parent profile ${ownId}.`)
      }
      continue
    }
    // No row yet: create it, with linked athletes when the account has
    // any, empty otherwise. Every parent account gets exactly one par_
    // row, so the account always has a profile to land on.
    const linked = asIds(account.linkedAthleteIds)
    const row: Row = {
      id: ownId,
      name: account.displayName,
      firstName: firstNameOf(account.displayName),
      role: 'parent',
      linkedAthleteIds: linked,
      childName: childNameFor(linked),
      createdAt: new Date().toISOString(),
    }
    athletes = [...athletes, row]
    byId.set(ownId, row)
    accountProfileId.set(account.id, ownId)
    if (account.rosterProfileId !== ownId) {
      accountPatches.push({ accountId: account.id, rosterProfileId: ownId })
    }
    notes.push(`Created missing parent profile ${ownId} for ${account.email}.`)
  }

  // Accounts that pointed at a removed duplicate row land on the winner.
  for (const account of input.accounts) {
    if (account.role !== 'parent' || !account.rosterProfileId) continue
    const winnerId = repoint[account.rosterProfileId]
    if (!winnerId) continue
    if (accountPatches.some((p) => p.accountId === account.id)) continue
    accountPatches.push({ accountId: account.id, rosterProfileId: winnerId })
    notes.push(`Pointed ${account.email} at the surviving parent profile ${winnerId}.`)
  }

  // --- 3. Guardian relationships point at the surviving parent row. ---
  // A parent account lands on its own par_ row, or on the duplicate
  // winner when its own row was merged away (tracked in step 2).
  const parentRowIds = new Set(
    athletes.filter((row) => row.role === 'parent').map((row) => String(row.id)),
  )
  for (const row of athletes) {
    const nextRels = rels(row).map((rel) => {
      const relAccount = typeof rel.accountId === 'string' ? accountsById.get(rel.accountId) : undefined
      if (!relAccount || relAccount.role !== 'parent') return rel
      const targetId = accountProfileId.get(relAccount.id)
      if (targetId && parentRowIds.has(targetId)) {
        if (rel.rosterProfileId !== targetId) {
          notes.push(`Fixed a guardian link on ${String(row.name ?? row.id)} to point at ${targetId}.`)
          return { ...rel, rosterProfileId: targetId }
        }
        return rel
      }
      if (rel.rosterProfileId) {
        const { rosterProfileId: _dropped, ...rest } = rel
        notes.push(`Dropped a guardian link on ${String(row.name ?? row.id)} with no parent profile.`)
        return rest
      }
      return rel
    })
    if (JSON.stringify(nextRels) !== JSON.stringify(rels(row))) {
      row.guardianRelationships = nextRels
    }
  }

  // --- 4. ath_ryan must not carry athletes that belong to a parent. ---
  const ryan = athletes.find((row) => row.id === 'ath_ryan')
  if (ryan) {
    const parentLinked = new Set(
      athletes.filter((row) => row.role === 'parent').flatMap((row) => linkedIds(row)),
    )
    const ryanLinks = linkedIds(ryan)
    const kept = ryanLinks.filter((id) => !parentLinked.has(id))
    if (kept.length !== ryanLinks.length) {
      ryan.linkedAthleteIds = kept
      notes.push('Removed athletes from the ath_ryan profile that belong to a parent.')
    }
  }

  return {
    athletes,
    removedAthleteIds: [...removed],
    accountPatches,
    notes,
  }
}

let repairRan = false

/**
 * One-time, idempotent repair. Reads accounts + roster, applies
 * computeParentRepair, writes only when something changed. Never throws:
 * a failure just leaves the flag unset so the next request retries.
 */
export async function ensureParentDataRepair(): Promise<{ ran: boolean; notes: string[] }> {
  if (repairRan) return { ran: false, notes: [] }
  try {
    const accounts = await accountsWithoutSecrets()
    const roster = await readRosterFile()
    const inputAthletes = (Array.isArray(roster.athletes) ? roster.athletes : []) as Row[]
    const inputRemoved = Array.isArray(roster.removedAthleteIds) ? roster.removedAthleteIds : []
    const result = computeParentRepair({
      accounts: accounts.map((a) => ({
        id: a.id,
        email: a.email,
        role: a.role,
        displayName: a.displayName,
        rosterProfileId: a.rosterProfileId,
        linkedAthleteIds: a.linkedAthleteIds,
      })),
      athletes: inputAthletes,
      removedAthleteIds: inputRemoved,
    })
    const rosterChanged =
      JSON.stringify(result.athletes) !== JSON.stringify(inputAthletes) ||
      JSON.stringify(result.removedAthleteIds) !== JSON.stringify(inputRemoved)
    if (rosterChanged) {
      await writeRosterFile({
        ...roster,
        athletes: result.athletes,
        removedAthleteIds: result.removedAthleteIds,
      })
    }
    for (const patch of result.accountPatches) {
      await updateAccount(patch.accountId, { rosterProfileId: patch.rosterProfileId ?? null })
    }
    repairRan = true
    if (result.notes.length > 0) {
      console.info(`[parent-repair] ${result.notes.join(' ')}`)
    }
    return { ran: true, notes: result.notes }
  } catch (err) {
    console.info(`[parent-repair] skipped: ${err instanceof Error ? err.message : 'unknown error'}`)
    return { ran: false, notes: [] }
  }
}
