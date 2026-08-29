/**
 * Gym-computer overlays for athlete vs app shape copy.
 * Ryan edits these in Learn; every browser hydrates them.
 */

import { readJson, writeJson } from './persist.ts'

const FILE = 'data/shape-copy.json'

export type ShapeCopyFields = { athlete: string; app: string }

export type ShapeCopyFile = {
  kind: 'shape-lab-shape-copy'
  version: 1
  updatedAt: string
  shapes: Record<string, ShapeCopyFields>
}

const EMPTY: ShapeCopyFile = {
  kind: 'shape-lab-shape-copy',
  version: 1,
  updatedAt: '',
  shapes: {},
}

export async function readShapeCopyFile(): Promise<ShapeCopyFile> {
  const data = await readJson<ShapeCopyFile>(FILE, { ...EMPTY })
  if (!data || data.kind !== 'shape-lab-shape-copy' || typeof data.shapes !== 'object') {
    return { ...EMPTY }
  }
  return data
}

export async function writeShapeCopyFile(data: unknown): Promise<ShapeCopyFile> {
  const parsed = data as Partial<ShapeCopyFile>
  const shapes: Record<string, ShapeCopyFields> = {}
  const incoming = parsed.shapes && typeof parsed.shapes === 'object' ? parsed.shapes : {}
  for (const [id, fields] of Object.entries(incoming)) {
    if (!id || !fields || typeof fields !== 'object') continue
    const athlete = typeof fields.athlete === 'string' ? fields.athlete : ''
    const app = typeof fields.app === 'string' ? fields.app : ''
    if (!athlete.trim() && !app.trim()) continue
    shapes[id] = { athlete, app }
  }
  const next: ShapeCopyFile = {
    kind: 'shape-lab-shape-copy',
    version: 1,
    updatedAt: new Date().toISOString(),
    shapes,
  }
  await writeJson(FILE, next)
  return next
}
