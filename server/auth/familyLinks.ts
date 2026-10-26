/**
 * Additive parent ↔ athlete links. Does not remove linkedAthleteIds.
 */

import { readRosterFile, writeRosterFile } from '../rosterStore.ts'

function asIds(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return [...new Set(value.filter((id): id is string => typeof id === 'string' && Boolean(id)))]
}

export async function stampGuardianLinks(opts: {
  accountId: string
  rosterProfileId?: string
  linkedAthleteIds?: string[]
}): Promise<void> {
  const linked = asIds(opts.linkedAthleteIds)
  if (!linked.length && !opts.rosterProfileId) return
  const roster = await readRosterFile()
  const athletes = Array.isArray(roster.athletes) ? roster.athletes : []
  let changed = false
  const next = athletes.map((row) => {
    if (!row || typeof row !== 'object') return row
    const athlete = row as Record<string, unknown>
    if (typeof athlete.id !== 'string') return row
    if (opts.rosterProfileId && athlete.id === opts.rosterProfileId && linked.length) {
      const existing = asIds(athlete.linkedAthleteIds)
      const merged = [...new Set([...existing, ...linked])]
      if (merged.length !== existing.length) {
        changed = true
        return { ...athlete, linkedAthleteIds: merged }
      }
    }
    if (!linked.includes(athlete.id)) return row
    const rels = Array.isArray(athlete.guardianRelationships) ? [...athlete.guardianRelationships] : []
    const already = rels.some((raw) => {
      if (!raw || typeof raw !== 'object') return false
      const rel = raw as Record<string, unknown>
      return (
        rel.accountId === opts.accountId ||
        (opts.rosterProfileId && rel.rosterProfileId === opts.rosterProfileId)
      )
    })
    if (already) return row
    changed = true
    return {
      ...athlete,
      guardianRelationships: [
        ...rels,
        {
          id: `grd_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
          kind: 'parent',
          createdAt: new Date().toISOString(),
          accountId: opts.accountId,
          ...(opts.rosterProfileId ? { rosterProfileId: opts.rosterProfileId } : {}),
        },
      ],
    }
  })
  if (!changed) return
  await writeRosterFile({ ...roster, athletes: next })
}

/**
 * Parent bootstrap for invite redemption (beta-readiness fix). A parent
 * account created from an invite has linkedAthleteIds but no roster row of
 * its own, and the whole client family surface (Parent Home, kids list,
 * Athlete View entry) is keyed off a parent roster row — so without one
 * the parent signs in to nothing. This creates that row exactly once:
 * the id derives from the account id, so re-running finds the same row
 * instead of duplicating it. The caller then points the account's
 * rosterProfileId at the row and stamps guardian links, which makes the
 * existing Parent Home / Athlete View / Parent Gate paths work unchanged.
 * The parent is never treated as one of the athletes: the row's role is
 * 'parent' and its linkedAthleteIds are the invite's athletes only.
 */
export async function ensureParentRosterProfile(opts: {
  accountId: string
  displayName: string
  linkedAthleteIds: string[]
}): Promise<{ id: string } | null> {
  const linked = asIds(opts.linkedAthleteIds)
  if (!linked.length) return null
  const id = `par_${opts.accountId}`
  const roster = await readRosterFile()
  const athletes = Array.isArray(roster.athletes) ? roster.athletes : []
  const byId = new Map(
    athletes.map((row) => {
      const r = row as Record<string, unknown>
      return [typeof r.id === 'string' ? r.id : '', r]
    }),
  )
  const childName = linked
    .map((athleteId) => {
      const row = byId.get(athleteId)
      return typeof row?.name === 'string' ? row.name : ''
    })
    .filter(Boolean)
    .join(', ')
  const existing = byId.get(id)
  if (existing && existing.role === 'parent') {
    const merged = [...new Set([...asIds(existing.linkedAthleteIds), ...linked])]
    const changed =
      merged.length !== asIds(existing.linkedAthleteIds).length ||
      (childName && existing.childName !== childName)
    if (!changed) return { id }
    const next = athletes.map((row) =>
      (row as Record<string, unknown>).id === id
        ? { ...existing, linkedAthleteIds: merged, childName: childName || existing.childName }
        : row,
    )
    await writeRosterFile({ ...roster, athletes: next })
    return { id }
  }
  if (existing) return null
  const firstName = opts.displayName.trim().split(/\s+/)[0] || opts.displayName
  const row = {
    id,
    name: opts.displayName,
    firstName,
    role: 'parent',
    linkedAthleteIds: linked,
    childName,
    createdAt: new Date().toISOString(),
  }
  await writeRosterFile({ ...roster, athletes: [...athletes, row] })
  return { id }
}
