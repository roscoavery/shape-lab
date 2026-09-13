import { readJson, writeJson } from './persist.ts'

const FILE = 'data/skill-paths.json'

export type DiskSkillPaths = {
  kind: 'shape-lab-skill-paths'
  version: 1
  exportedAt: string
  skills: unknown[]
  needs: unknown[]
  conditioning: unknown[]
  removedSkillIds?: string[]
}

const EMPTY: DiskSkillPaths = {
  kind: 'shape-lab-skill-paths',
  version: 1,
  exportedAt: '',
  skills: [],
  needs: [],
  conditioning: [],
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
    removedSkillIds: Array.isArray(data.removedSkillIds) ? data.removedSkillIds : [],
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

export async function writeSkillPathsFile(raw: unknown): Promise<DiskSkillPaths> {
  const body = raw && typeof raw === 'object' ? (raw as DiskSkillPaths) : EMPTY
  const current = await readSkillPathsFile()
  const skills = byId(current.skills)
  for (const rawRow of Array.isArray(body.skills) ? body.skills : []) {
    if (!rawRow || typeof rawRow !== 'object') continue
    const row = rawRow as Record<string, unknown>
    if (typeof row.id !== 'string' || !row.id) continue
    const keep = skills.get(row.id)
    if (!keep || stamp(row).localeCompare(stamp(keep)) >= 0) skills.set(row.id, row)
  }
  const needs = byId(current.needs)
  for (const rawRow of Array.isArray(body.needs) ? body.needs : []) {
    if (!rawRow || typeof rawRow !== 'object') continue
    const row = rawRow as Record<string, unknown>
    if (typeof row.id !== 'string' || !row.id) continue
    needs.set(row.id, row)
  }
  const conditioning = byId(current.conditioning)
  for (const rawRow of Array.isArray(body.conditioning) ? body.conditioning : []) {
    if (!rawRow || typeof rawRow !== 'object') continue
    const row = rawRow as Record<string, unknown>
    if (typeof row.id !== 'string' || !row.id) continue
    conditioning.set(row.id, row)
  }
  const next: DiskSkillPaths = {
    kind: 'shape-lab-skill-paths',
    version: 1,
    exportedAt: new Date().toISOString(),
    skills: [...skills.values()],
    needs: [...needs.values()],
    conditioning: [...conditioning.values()],
    removedSkillIds: [
      ...new Set([...(current.removedSkillIds ?? []), ...(body.removedSkillIds ?? [])]),
    ],
  }
  await writeJson(FILE, next)
  return next
}
