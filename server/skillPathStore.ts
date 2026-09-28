import { readJson, writeJson } from './persist.ts'

const FILE = 'data/skill-paths.json'

export type DiskSkillPaths = {
  kind: 'shape-lab-skill-paths'
  version: 1
  exportedAt: string
  skills: unknown[]
  needs: unknown[]
  conditioning: unknown[]
  drills: unknown[]
  versions: unknown[]
  removedSkillIds?: string[]
  removedNeedIds?: string[]
  removedConditioningIds?: string[]
  removedDrillIds?: string[]
  removedVersionIds?: string[]
}

const EMPTY: DiskSkillPaths = {
  kind: 'shape-lab-skill-paths',
  version: 1,
  exportedAt: '',
  skills: [],
  needs: [],
  conditioning: [],
  drills: [],
  versions: [],
  removedSkillIds: [],
}

export async function readSkillPathsFile(): Promise<DiskSkillPaths> {
  const data = await readJson<DiskSkillPaths>(FILE, { ...EMPTY })
  if (!data || data.kind !== 'shape-lab-skill-paths') return { ...EMPTY }
  return {
    kind: 'shape-lab-skill-paths',
    version: 1,
    exportedAt: typeof data.exportedAt === 'string' ? data.exportedAt : '',
    skills: Array.isArray(data.skills) ? data.skills : [],
    needs: Array.isArray(data.needs) ? data.needs : [],
    conditioning: Array.isArray(data.conditioning) ? data.conditioning : [],
    drills: Array.isArray(data.drills) ? data.drills : [],
    versions: Array.isArray(data.versions) ? data.versions : [],
    removedSkillIds: Array.isArray(data.removedSkillIds) ? data.removedSkillIds : [],
    removedNeedIds: Array.isArray(data.removedNeedIds) ? data.removedNeedIds : [],
    removedConditioningIds: Array.isArray(data.removedConditioningIds)
      ? data.removedConditioningIds
      : [],
    removedDrillIds: Array.isArray(data.removedDrillIds) ? data.removedDrillIds : [],
    removedVersionIds: Array.isArray(data.removedVersionIds) ? data.removedVersionIds : [],
  }
}

function byId(list: unknown[]): Map<string, Record<string, unknown>> {
  const map = new Map<string, Record<string, unknown>>()
  for (const raw of list) {
    if (!raw || typeof raw !== 'object') continue
    const row = raw as Record<string, unknown>
    if (typeof row.id !== 'string' || !row.id) continue
    map.set(row.id, row)
  }
  return map
}

function stamp(row: Record<string, unknown>): string {
  for (const key of ['updatedAt', 'createdAt', 'exportedAt']) {
    const v = row[key]
    if (typeof v === 'string' && v) return v
  }
  return ''
}

/**
 * Merge a body row-list into the current one, by id. Rows whose ids are
 * tombstoned (deleted on a device) are dropped from the current list and
 * never re-added — without this, a deleted need would resurrect on the
 * next boot hydrate.
 */
function mergeRows(
  current: unknown[],
  body: unknown,
  removedIds: Set<string>,
): Record<string, unknown>[] {
  const map = new Map<string, Record<string, unknown>>()
  for (const [id, row] of byId(current)) {
    if (!removedIds.has(id)) map.set(id, row)
  }
  for (const rawRow of Array.isArray(body) ? body : []) {
    if (!rawRow || typeof rawRow !== 'object') continue
    const row = rawRow as Record<string, unknown>
    if (typeof row.id !== 'string' || !row.id || removedIds.has(row.id)) continue
    map.set(row.id, row)
  }
  return [...map.values()]
}

export async function writeSkillPathsFile(raw: unknown): Promise<DiskSkillPaths> {
  const body = raw && typeof raw === 'object' ? (raw as DiskSkillPaths) : EMPTY
  const current = await readSkillPathsFile()
  const removedNeedIds = new Set([
    ...(current.removedNeedIds ?? []),
    ...(body.removedNeedIds ?? []),
  ])
  const removedCondIds = new Set([
    ...(current.removedConditioningIds ?? []),
    ...(body.removedConditioningIds ?? []),
  ])
  const removedDrillIds = new Set([
    ...(current.removedDrillIds ?? []),
    ...(body.removedDrillIds ?? []),
  ])
  const removedVersionIds = new Set([
    ...(current.removedVersionIds ?? []),
    ...(body.removedVersionIds ?? []),
  ])
  const skills = byId(current.skills)
  for (const rawRow of Array.isArray(body.skills) ? body.skills : []) {
    if (!rawRow || typeof rawRow !== 'object') continue
    const row = rawRow as Record<string, unknown>
    if (typeof row.id !== 'string' || !row.id) continue
    const keep = skills.get(row.id)
    if (!keep || stamp(row).localeCompare(stamp(keep)) >= 0) skills.set(row.id, row)
  }
  const needs = mergeRows(current.needs, body.needs, removedNeedIds)
  const conditioning = mergeRows(current.conditioning, body.conditioning, removedCondIds)
  const drills = mergeRows(current.drills, body.drills, removedDrillIds)
  const versions = mergeRows(current.versions, body.versions, removedVersionIds)
  const next: DiskSkillPaths = {
    kind: 'shape-lab-skill-paths',
    version: 1,
    exportedAt: new Date().toISOString(),
    skills: [...skills.values()],
    needs,
    conditioning,
    drills,
    versions,
    removedSkillIds: [
      ...new Set([...(current.removedSkillIds ?? []), ...(body.removedSkillIds ?? [])]),
    ],
    removedNeedIds: [...removedNeedIds],
    removedConditioningIds: [...removedCondIds],
    removedDrillIds: [...removedDrillIds],
    removedVersionIds: [...removedVersionIds],
  }
  await writeJson(FILE, next)
  return next
}
