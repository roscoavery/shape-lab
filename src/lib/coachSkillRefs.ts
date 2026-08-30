import type { CoachSkillRef } from '../types'
import type { RefCollection, RefItem } from './clipStore'
import { listCoachSkillRefs } from './coachContentStore'

export const COACH_REFS_COLLECTION_PREFIX = 'virtual:coach-refs:'

export function isVirtualCoachRefCollection(col: { id?: string; athleteId?: string }): boolean {
  return (
    (typeof col.id === 'string' && col.id.startsWith(COACH_REFS_COLLECTION_PREFIX)) ||
    col.athleteId === '__virtual__'
  )
}

export function skillRefToItem(ref: CoachSkillRef): RefItem {
  return {
    id: ref.id,
    kind: 'url',
    name: ref.athleteName ? `${ref.name} · ${ref.athleteName}` : ref.name,
    url: ref.src,
    keywords: [ref.coachName, ref.notes ?? '', 'skill', ref.athleteName ?? ''].filter(Boolean),
    createdAt: ref.createdAt,
    trimStart: ref.trimStart,
    trimEnd: ref.trimEnd,
  }
}

export function collectionsFromSkillRefs(refs = listCoachSkillRefs()): RefCollection[] {
  const byCoach = new Map<string, CoachSkillRef[]>()
  for (const ref of refs) {
    if (!ref.src) continue
    const list = byCoach.get(ref.coachId) ?? []
    list.push(ref)
    byCoach.set(ref.coachId, list)
  }
  return [...byCoach.entries()]
    .map(([coachId, list]) => ({
      id: `${COACH_REFS_COLLECTION_PREFIX}${coachId}`,
      name: `${list[0]!.coachName} skill refs`,
      athleteId: '__virtual__',
      createdAt: list[0]!.createdAt,
      items: list.map(skillRefToItem),
    }))
    .sort((a, b) => a.name.localeCompare(b.name))
}
