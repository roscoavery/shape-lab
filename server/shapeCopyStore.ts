/**
 * Gym-computer overlays for athlete vs app shape copy.
 * Ryan edits these in Learn; every browser hydrates them.
 */

import fs from 'node:fs'
import path from 'node:path'

const FILE = path.join(process.cwd(), 'data', 'shape-copy.json')

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

export function readShapeCopyFile(): ShapeCopyFile {
  try {
    const data = JSON.parse(fs.readFileSync(FILE, 'utf8')) as ShapeCopyFile
    if (!data || data.kind !== 'shape-lab-shape-copy' || typeof data.shapes !== 'object') {
      return { ...EMPTY }
    }
    return data
  } catch {
    return { ...EMPTY }
  }
}

export function writeShapeCopyFile(data: unknown): ShapeCopyFile {
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
  fs.mkdirSync(path.dirname(FILE), { recursive: true })
  fs.writeFileSync(FILE, JSON.stringify(next, null, 2) + '\n')
  return next
}
