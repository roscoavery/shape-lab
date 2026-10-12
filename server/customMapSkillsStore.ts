import { readJson, writeJson } from './persist.ts'

const FILE = 'data/custom-map-skills.json'

/**
 * Ryan's custom skills added directly on the skill map.
 * Each has a name, a row index (level, 0 = top/hardest), and a family
 * (standing/front/cartwheel/roundoff) which determines its column range.
 */
export type CustomMapSkill = {
  id: string
  name: string
  rowIndex: number
  family: 'standing' | 'front' | 'cartwheel' | 'roundoff'
  createdAt: string
}

type DiskFile = {
  kind: 'shape-lab-custom-map-skills'
  version: 1
  exportedAt?: string
  skills: CustomMapSkill[]
}

const EMPTY: DiskFile = { kind: 'shape-lab-custom-map-skills', version: 1, skills: [] }

const VALID_FAMILIES = new Set(['standing', 'front', 'cartwheel', 'roundoff'])

function safeSkill(raw: unknown): CustomMapSkill | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Record<string, unknown>
  const id = typeof r.id === 'string' ? r.id.trim() : ''
  const name = typeof r.name === 'string' ? r.name.trim().slice(0, 60) : ''
  const rowIndex = typeof r.rowIndex === 'number' ? Math.floor(r.rowIndex) : -1
  const family = typeof r.family === 'string' ? r.family.trim().toLowerCase() : ''
  if (!id || !name || rowIndex < 0 || !VALID_FAMILIES.has(family)) return null
  return {
    id: id.slice(0, 40),
    name,
    rowIndex,
    family: family as CustomMapSkill['family'],
    createdAt: typeof r.createdAt === 'string' ? r.createdAt : new Date().toISOString(),
  }
}

export async function listCustomMapSkills(): Promise<CustomMapSkill[]> {
  const data = await readJson<DiskFile>(FILE, { ...EMPTY })
  if (!Array.isArray(data.skills)) return []
  return data.skills.map(safeSkill).filter((s): s is CustomMapSkill => s !== null)
}

export async function addCustomMapSkill(
  name: string,
  rowIndex: number,
  family: CustomMapSkill['family'],
): Promise<CustomMapSkill | null> {
  const cleanName = name.trim().slice(0, 60)
  if (!cleanName || rowIndex < 0 || !VALID_FAMILIES.has(family)) return null
  const skills = await listCustomMapSkills()
  const skill: CustomMapSkill = {
    id: `custom_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
    name: cleanName,
    rowIndex: Math.floor(rowIndex),
    family,
    createdAt: new Date().toISOString(),
  }
  skills.push(skill)
  await writeJson(FILE, {
    kind: 'shape-lab-custom-map-skills',
    version: 1,
    exportedAt: new Date().toISOString(),
    skills,
  } satisfies DiskFile)
  return skill
}

export async function deleteCustomMapSkill(id: string): Promise<boolean> {
  const skills = await listCustomMapSkills()
  const filtered = skills.filter((s) => s.id !== id)
  if (filtered.length === skills.length) return false
  await writeJson(FILE, {
    kind: 'shape-lab-custom-map-skills',
    version: 1,
    exportedAt: new Date().toISOString(),
    skills: filtered,
  } satisfies DiskFile)
  return true
}
