/**
 * Gym-computer display crops for coach / IG stills.
 * Ryan sets borders in Learn; every browser hydrates them.
 */

import fs from 'node:fs'
import path from 'node:path'

const FILE = path.join(process.cwd(), 'data', 'still-crops.json')

export type StillCropRect = { x: number; y: number; w: number; h: number }

export type StillCropFile = {
  kind: 'shape-lab-still-crops'
  version: 1
  updatedAt: string
  crops: Record<string, StillCropRect>
}

const EMPTY: StillCropFile = {
  kind: 'shape-lab-still-crops',
  version: 1,
  updatedAt: '',
  crops: {},
}

function parseRect(value: unknown): StillCropRect | null {
  if (!value || typeof value !== 'object') return null
  const r = value as Record<string, unknown>
  const x = Number(r.x)
  const y = Number(r.y)
  const w = Number(r.w)
  const h = Number(r.h)
  if (![x, y, w, h].every(Number.isFinite)) return null
  const cx = Math.min(0.94, Math.max(0, x))
  const cy = Math.min(0.94, Math.max(0, y))
  const cw = Math.min(1 - cx, Math.max(0.06, w))
  const ch = Math.min(1 - cy, Math.max(0.06, h))
  if (cx <= 0.004 && cy <= 0.004 && cw >= 0.992 && ch >= 0.992) return null
  return { x: cx, y: cy, w: cw, h: ch }
}

export function readStillCropFile(): StillCropFile {
  try {
    const data = JSON.parse(fs.readFileSync(FILE, 'utf8')) as StillCropFile
    if (!data || data.kind !== 'shape-lab-still-crops' || typeof data.crops !== 'object') {
      return { ...EMPTY }
    }
    const crops: Record<string, StillCropRect> = {}
    for (const [id, rect] of Object.entries(data.crops)) {
      if (!id) continue
      const parsed = parseRect(rect)
      if (parsed) crops[id] = parsed
    }
    return { ...data, crops }
  } catch {
    return { ...EMPTY }
  }
}

export function writeStillCropFile(data: unknown): StillCropFile {
  const parsed = data as Partial<StillCropFile>
  const crops: Record<string, StillCropRect> = {}
  const incoming = parsed.crops && typeof parsed.crops === 'object' ? parsed.crops : {}
  for (const [id, rect] of Object.entries(incoming)) {
    if (!id) continue
    const next = parseRect(rect)
    if (next) crops[id] = next
  }
  const out: StillCropFile = {
    kind: 'shape-lab-still-crops',
    version: 1,
    updatedAt: new Date().toISOString(),
    crops,
  }
  fs.mkdirSync(path.dirname(FILE), { recursive: true })
  fs.writeFileSync(FILE, JSON.stringify(out, null, 2) + '\n')
  return out
}
