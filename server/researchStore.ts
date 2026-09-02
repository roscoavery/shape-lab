/**
 * Gym-wide tumbling research: observations + an ideas inbox.
 * JSON on disk. One observation per athlete per study.
 */

import { readJson, writeJson } from './persist.ts'

const FILE = 'data/research.json'

export type DiskAnswer = string | string[] | number

export type DiskObservation = {
  id: string
  studyId: string
  subjectId: string
  recorderId: string
  createdAt: string
  updatedAt: string
  answers: Record<string, DiskAnswer>
}

export type DiskIdea = {
  id: string
  text: string
  createdAt: string
  authorId?: string
}

export type DiskResearch = {
  kind: 'shape-lab-research'
  version: 1
  exportedAt: string
  observations: DiskObservation[]
  ideas: DiskIdea[]
}

const EMPTY: DiskResearch = {
  kind: 'shape-lab-research',
  version: 1,
  exportedAt: '',
  observations: [],
  ideas: [],
}

function safeId(id: unknown): string | null {
  if (typeof id !== 'string') return null
  const s = id.trim()
  if (!s || s.length > 80) return null
  if (!/^[a-zA-Z0-9_-]+$/.test(s)) return null
  return s
}

function cleanAnswer(raw: unknown): DiskAnswer | null {
  if (typeof raw === 'number' && Number.isFinite(raw)) {
    return Math.round(raw * 100) / 100
  }
  if (typeof raw === 'string') {
    const s = raw.trim()
    if (!s) return null
    return s.slice(0, 800)
  }
  if (Array.isArray(raw)) {
    const list = raw
      .filter((x): x is string => typeof x === 'string')
      .map((x) => x.trim())
      .filter(Boolean)
      .slice(0, 24)
    return list.length ? list : null
  }
  return null
}

function cleanAnswers(raw: unknown): Record<string, DiskAnswer> {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {}
  const out: Record<string, DiskAnswer> = {}
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    if (!/^[a-zA-Z0-9_-]+$/.test(key) || key.length > 60) continue
    const next = cleanAnswer(value)
    if (next === null) continue
    out[key] = next
  }
  return out
}

function cleanObservation(raw: unknown): DiskObservation | null {
  if (!raw || typeof raw !== 'object') return null
  const o = raw as Record<string, unknown>
  const id = safeId(o.id)
  const studyId = safeId(o.studyId)
  const subjectId = safeId(o.subjectId)
  const recorderId = safeId(o.recorderId)
  if (!id || !studyId || !subjectId || !recorderId) return null
  const createdAt =
    typeof o.createdAt === 'string' && o.createdAt ? o.createdAt : new Date().toISOString()
  const updatedAt =
    typeof o.updatedAt === 'string' && o.updatedAt ? o.updatedAt : createdAt
  return {
    id,
    studyId,
    subjectId,
    recorderId,
    createdAt,
    updatedAt,
    answers: cleanAnswers(o.answers),
  }
}

function cleanIdea(raw: unknown): DiskIdea | null {
  if (!raw || typeof raw !== 'object') return null
  const o = raw as Record<string, unknown>
  const id = safeId(o.id)
  const text = typeof o.text === 'string' ? o.text.trim().slice(0, 800) : ''
  if (!id || !text) return null
  return {
    id,
    text,
    createdAt:
      typeof o.createdAt === 'string' && o.createdAt
        ? o.createdAt
        : new Date().toISOString(),
    authorId: safeId(o.authorId) ?? undefined,
  }
}

function dedupeObservations(list: DiskObservation[]): DiskObservation[] {
  const byKey = new Map<string, DiskObservation>()
  for (const obs of list) {
    const key = `${obs.studyId}::${obs.subjectId}`
    const prev = byKey.get(key)
    if (!prev || obs.updatedAt.localeCompare(prev.updatedAt) >= 0) {
      byKey.set(key, obs)
    }
  }
  return [...byKey.values()].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
}

export async function readResearchFile(): Promise<DiskResearch> {
  const data = await readJson<DiskResearch>(FILE, { ...EMPTY })
  if (!data || data.kind !== 'shape-lab-research') return { ...EMPTY }
  return writeShape({
    observations: Array.isArray(data.observations) ? data.observations : [],
    ideas: Array.isArray(data.ideas) ? data.ideas : [],
    exportedAt: typeof data.exportedAt === 'string' ? data.exportedAt : '',
  })
}

function writeShape(input: {
  observations: unknown[]
  ideas: unknown[]
  exportedAt?: string
}): DiskResearch {
  const observations = dedupeObservations(
    input.observations.map(cleanObservation).filter((o): o is DiskObservation => Boolean(o)),
  )
  const ideas = input.ideas
    .map(cleanIdea)
    .filter((i): i is DiskIdea => Boolean(i))
    .slice(0, 200)
  return {
    kind: 'shape-lab-research',
    version: 1,
    exportedAt: input.exportedAt ?? '',
    observations,
    ideas,
  }
}

export async function writeResearchFile(raw: unknown): Promise<DiskResearch> {
  const body = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {}
  const current = await readResearchFile()
  const incoming = writeShape({
    observations: Array.isArray(body.observations) ? body.observations : [],
    ideas: Array.isArray(body.ideas) ? body.ideas : [],
    exportedAt: new Date().toISOString(),
  })
  const next = writeShape({
    observations: [...current.observations, ...incoming.observations],
    ideas: [...current.ideas, ...incoming.ideas],
    exportedAt: new Date().toISOString(),
  })
  await writeJson(FILE, next)
  return next
}
