/**
 * Extra coach stills and the main-still pick for each shape.
 */

import { readJson, writeJson } from './persist.ts'

const FILE = 'data/coach-stills.json'

export type CoachStillExtra = {
  id: string
  shapeId: string
  dataUrl: string
  label?: string
  createdAt: string
}

export type CoachStillsFile = {
  kind: 'shape-lab-coach-stills'
  version: 1
  updatedAt: string
  main: Record<string, string>
  extras: CoachStillExtra[]
}

const EMPTY: CoachStillsFile = {
  kind: 'shape-lab-coach-stills',
  version: 1,
  updatedAt: '',
  main: {},
  extras: [],
}

function cleanExtra(row: unknown): CoachStillExtra | null {
  if (!row || typeof row !== 'object') return null
  const item = row as Record<string, unknown>
  const id = typeof item.id === 'string' ? item.id.trim() : ''
  const shapeId = typeof item.shapeId === 'string' ? item.shapeId.trim() : ''
  const dataUrl = typeof item.dataUrl === 'string' ? item.dataUrl : ''
  if (!id || !shapeId || !dataUrl.startsWith('data:image')) return null
  return {
    id: id.slice(0, 80),
    shapeId: shapeId.slice(0, 80),
    dataUrl,
    label: typeof item.label === 'string' ? item.label.trim().slice(0, 80) : undefined,
    createdAt: typeof item.createdAt === 'string' ? item.createdAt : '',
  }
}

export async function readCoachStillsFile(): Promise<CoachStillsFile> {
  const data = await readJson<CoachStillsFile>(FILE, { ...EMPTY })
  if (!data || data.kind !== 'shape-lab-coach-stills') return { ...EMPTY }
  const main: Record<string, string> = {}
  if (data.main && typeof data.main === 'object') {
    for (const [shapeId, stillId] of Object.entries(data.main)) {
      if (shapeId && typeof stillId === 'string' && stillId.trim()) {
        main[shapeId] = stillId.trim()
      }
    }
  }
  return {
    ...EMPTY,
    ...data,
    main,
    extras: Array.isArray(data.extras)
      ? data.extras.map(cleanExtra).filter((row): row is CoachStillExtra => Boolean(row)).slice(0, 80)
      : [],
  }
}

export async function writeCoachStillsFile(data: unknown): Promise<CoachStillsFile> {
  const parsed = data as Partial<CoachStillsFile>
  const main: Record<string, string> = {}
  const incomingMain = parsed.main && typeof parsed.main === 'object' ? parsed.main : {}
  for (const [shapeId, stillId] of Object.entries(incomingMain)) {
    if (shapeId && typeof stillId === 'string' && stillId.trim()) {
      main[shapeId] = stillId.trim()
    }
  }
  const extras = Array.isArray(parsed.extras)
    ? parsed.extras.map(cleanExtra).filter((row): row is CoachStillExtra => Boolean(row)).slice(0, 80)
    : []
  const next: CoachStillsFile = {
    kind: 'shape-lab-coach-stills',
    version: 1,
    updatedAt: new Date().toISOString(),
    main,
    extras,
  }
  await writeJson(FILE, next)
  return next
}
