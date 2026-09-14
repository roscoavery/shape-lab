/**
 * Private athlete tags on teaching stills.
 * Tags are not returned from GET /api/coach-stills.
 */

import {
  readCoachStillsFile,
  setStillAthleteTags,
  stillAthleteTagsOf,
} from './coachStillStore.ts'
import {
  athleteRole,
  canWriteCoachTools,
  isAdmin,
  parentLinkedFromRoster,
  type RosterAthlete,
} from './auth/permissions.ts'
import { applyPrivacyDefaults } from './auth/privacy.ts'
import type { AuthUser } from './auth/types.ts'

export type StillTagPerson = {
  athleteId: string
  name: string
  instructionalMediaConsent?: string
}

export type StillTagRow = {
  stillId: string
  shapeId: string
  label?: string
  dataUrl?: string
  taggedAthleteIds: string[]
  tagged: StillTagPerson[]
  needsInstructionalConsent: boolean
}

function displayName(row: RosterAthlete): string {
  return typeof row.name === 'string' && row.name.trim() ? row.name.trim() : 'Athlete'
}

function instructionalOf(row: RosterAthlete): string {
  const privacy = applyPrivacyDefaults(row)
  return typeof privacy.instructionalMediaConsent === 'string'
    ? privacy.instructionalMediaConsent
    : 'unknown'
}

export async function stillTagsForViewer(
  user: AuthUser,
  athletes: RosterAthlete[],
): Promise<StillTagRow[]> {
  const file = await readCoachStillsFile()
  const tags = stillAthleteTagsOf(file)
  const extraById = new Map(file.extras.map((row) => [row.id, row]))
  const admin = isAdmin(user)
  const coach = canWriteCoachTools(user)
  const parentIds = user.role === 'parent' ? new Set(parentLinkedFromRoster(user, athletes)) : null
  const selfId = user.rosterProfileId
  const byId = new Map(athletes.map((row) => [row.id, row]))

  const allowAthlete = (id: string): boolean => {
    if (admin || coach) return true
    if (parentIds) return parentIds.has(id)
    if (user.role === 'athlete') return id === selfId
    return false
  }

  const includeConsent = admin || user.role === 'parent'
  const rows: StillTagRow[] = []
  for (const [stillId, athleteIds] of Object.entries(tags)) {
    const visibleIds = athleteIds.filter(allowAthlete)
    if (visibleIds.length === 0) continue
    const extra = extraById.get(stillId)
    let shapeId = extra?.shapeId || ''
    if (!shapeId) {
      for (const [sid, mid] of Object.entries(file.main)) {
        if (mid === stillId) {
          shapeId = sid
          break
        }
      }
    }
    const tagged: StillTagPerson[] = visibleIds.map((id) => {
      const person = byId.get(id)
      const row: StillTagPerson = {
        athleteId: id,
        name: person ? displayName(person) : 'Athlete',
      }
      if (includeConsent && person) {
        row.instructionalMediaConsent = instructionalOf(person)
      }
      return row
    })
    const needsInstructionalConsent = admin
      ? tagged.some((person) => person.instructionalMediaConsent !== 'granted')
      : false
    rows.push({
      stillId,
      shapeId,
      label: extra?.label,
      dataUrl: extra?.file
        ? `/api/coach-still-file?id=${encodeURIComponent(stillId)}`
        : extra?.dataUrl,
      taggedAthleteIds: visibleIds,
      tagged,
      needsInstructionalConsent,
    })
  }
  return rows.sort((a, b) => Number(b.needsInstructionalConsent) - Number(a.needsInstructionalConsent))
}

export async function patchStillTags(
  user: AuthUser,
  body: unknown,
  athletes: RosterAthlete[],
): Promise<StillTagRow[]> {
  if (!canWriteCoachTools(user) || user.kiosk) {
    const err = new Error('Tagging stills is limited to coaches and gym admin.') as Error & { status: number }
    err.status = 403
    throw err
  }
  if (!body || typeof body !== 'object') {
    const err = new Error('Still tag is missing.') as Error & { status: number }
    err.status = 400
    throw err
  }
  const stillId = typeof (body as { stillId?: unknown }).stillId === 'string'
    ? (body as { stillId: string }).stillId.trim()
    : ''
  const raw = (body as { taggedAthleteIds?: unknown }).taggedAthleteIds
  if (!stillId) {
    const err = new Error('Still is missing.') as Error & { status: number }
    err.status = 400
    throw err
  }
  const ids = Array.isArray(raw)
    ? [...new Set(raw.filter((id): id is string => typeof id === 'string' && Boolean(id)))]
    : []
  const allowed = ids.filter((id) => {
    const row = athletes.find((a) => a.id === id)
    return row && athleteRole(row) === 'athlete'
  })
  await setStillAthleteTags(stillId, allowed)
  return stillTagsForViewer(user, athletes)
}
