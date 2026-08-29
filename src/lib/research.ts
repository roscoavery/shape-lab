import { createId } from './storage'
import { fieldVisible, type StudyDef, type StudyField } from '../config/researchStudies'

export type ResearchAnswer = string | string[] | number

export type Observation = {
  id: string
  studyId: string
  subjectId: string
  recorderId: string
  createdAt: string
  updatedAt: string
  answers: Record<string, ResearchAnswer>
}

export type StudyIdea = {
  id: string
  text: string
  createdAt: string
  authorId?: string
}

export type ResearchFile = {
  kind: 'shape-lab-research'
  version: 1
  exportedAt: string
  observations: Observation[]
  ideas: StudyIdea[]
}

const EMPTY: ResearchFile = {
  kind: 'shape-lab-research',
  version: 1,
  exportedAt: '',
  observations: [],
  ideas: [],
}

export async function loadResearch(): Promise<ResearchFile> {
  try {
    const res = await fetch('/api/research')
    if (!res.ok) return { ...EMPTY }
    const data = (await res.json()) as ResearchFile
    if (!data || data.kind !== 'shape-lab-research') return { ...EMPTY }
    return {
      ...EMPTY,
      ...data,
      observations: Array.isArray(data.observations) ? data.observations : [],
      ideas: Array.isArray(data.ideas) ? data.ideas : [],
    }
  } catch {
    return { ...EMPTY }
  }
}

export async function saveResearch(file: ResearchFile): Promise<ResearchFile | null> {
  try {
    const res = await fetch('/api/research', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(file),
    })
    if (!res.ok) return null
    return (await res.json()) as ResearchFile
  } catch {
    return null
  }
}

export function observationFor(
  file: ResearchFile,
  studyId: string,
  subjectId: string,
): Observation | undefined {
  return file.observations.find(
    (o) => o.studyId === studyId && o.subjectId === subjectId,
  )
}

export function observationsForStudy(file: ResearchFile, studyId: string): Observation[] {
  return file.observations.filter((o) => o.studyId === studyId)
}

export function upsertObservation(
  file: ResearchFile,
  params: {
    study: StudyDef
    subjectId: string
    recorderId: string
    answers: Record<string, ResearchAnswer>
    existing?: Observation
  },
): ResearchFile {
  const now = new Date().toISOString()
  const next: Observation = {
    id: params.existing?.id ?? createId('obs'),
    studyId: params.study.id,
    subjectId: params.subjectId,
    recorderId: params.recorderId,
    createdAt: params.existing?.createdAt ?? now,
    updatedAt: now,
    answers: params.answers,
  }
  const others = file.observations.filter(
    (o) => !(o.studyId === next.studyId && o.subjectId === next.subjectId),
  )
  return { ...file, observations: [next, ...others] }
}

export function addIdea(
  file: ResearchFile,
  text: string,
  authorId?: string,
): ResearchFile {
  const idea: StudyIdea = {
    id: createId('idea'),
    text: text.trim().slice(0, 800),
    createdAt: new Date().toISOString(),
    authorId,
  }
  if (!idea.text) return file
  return { ...file, ideas: [idea, ...file.ideas] }
}

export function removeIdea(file: ResearchFile, id: string): ResearchFile {
  return { ...file, ideas: file.ideas.filter((i) => i.id !== id) }
}

export function removeObservation(file: ResearchFile, id: string): ResearchFile {
  return { ...file, observations: file.observations.filter((o) => o.id !== id) }
}

export function answersFromDraft(
  study: StudyDef,
  draft: Record<string, unknown>,
): { answers: Record<string, ResearchAnswer> } | { error: string } {
  const answers: Record<string, ResearchAnswer> = {}
  for (const field of study.fields) {
    if (!fieldVisible(field, draft)) continue
    const raw = draft[field.id]
    const parsed = parseField(field, raw)
    if (parsed.error) {
      if (field.required) return { error: parsed.error }
      continue
    }
    if (parsed.value === undefined) {
      if (field.required) {
        return { error: `Fill in ${field.label.toLowerCase()}.` }
      }
      continue
    }
    answers[field.id] = parsed.value
  }
  return { answers }
}

function parseField(
  field: StudyField,
  raw: unknown,
): { value?: ResearchAnswer; error?: string } {
  if (field.kind === 'multi') {
    const list = Array.isArray(raw)
      ? raw.filter((x): x is string => typeof x === 'string' && x.trim().length > 0)
      : []
    const allowed = new Set((field.options ?? []).map((o) => o.value))
    const next = list.filter((v) => allowed.has(v))
    if (!next.length) return {}
    return { value: next }
  }
  if (field.kind === 'number') {
    if (raw === '' || raw === null || raw === undefined) return {}
    const n = typeof raw === 'number' ? raw : Number(raw)
    if (!Number.isFinite(n)) return { error: `${field.label} needs a number.` }
    const min = field.min ?? 0
    const max = field.max ?? 100
    if (n < min || n > max) {
      return { error: `${field.label} should be between ${min} and ${max}.` }
    }
    return { value: n }
  }
  if (field.kind === 'text') {
    const s = typeof raw === 'string' ? raw.trim() : ''
    if (!s) return {}
    return { value: s.slice(0, 800) }
  }
  const s = typeof raw === 'string' ? raw.trim() : ''
  if (!s) return {}
  const allowed = (field.options ?? []).map((o) => o.value)
  if (allowed.length && !allowed.includes(s)) {
    return { error: `Pick a listed option for ${field.label.toLowerCase()}.` }
  }
  return { value: s }
}
