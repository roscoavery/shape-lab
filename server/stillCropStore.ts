/**
 * Gym-computer display crops for coach / IG stills.
 * Ryan sets borders in Learn; every browser hydrates them.
 */

import { readJson, writeJson } from './persist.ts'

const FILE = 'data/still-crops.json'

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

export async function readStillCropFile(): Promise<StillCropFile> {
  const data = await readJson<StillCropFile>(FILE, { ...EMPTY })
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
}

export async function writeStillCropFile(data: unknown): Promise<StillCropFile> {
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
  await writeJson(FILE, out)
  return out
}
