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
