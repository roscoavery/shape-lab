/**
 * Gym-wide A/B loop points keyed by canonical Instagram / social URL.
 * Shared by Learn scroll, Compare, and Classes collages.
 */

import fs from 'node:fs'
import path from 'node:path'
import { canonicalSocialUrl, socialVideoKey } from '../src/lib/socialUrls.ts'

const FILE = path.join(process.cwd(), 'data', 'clip-loops.json')

export type ClipLoop = {
  a: number
  b: number
  updatedAt: string
}

export type DiskClipLoops = {
  kind: 'shape-lab-clip-loops'
  version: 1
  exportedAt: string
  loops: Record<string, ClipLoop>
}

const EMPTY: DiskClipLoops = {
  kind: 'shape-lab-clip-loops',
  version: 1,
  exportedAt: '',
  loops: {},
}

export function loopKey(url: string): string {
  return socialVideoKey(url) ?? canonicalSocialUrl(url).replace(/\/+$/, '')
}

export function readClipLoopsFile(): DiskClipLoops {
  try {
    const data = JSON.parse(fs.readFileSync(FILE, 'utf8')) as DiskClipLoops
    if (!data || data.kind !== 'shape-lab-clip-loops' || !data.loops || typeof data.loops !== 'object') {
      return { ...EMPTY }
    }
    return { ...EMPTY, ...data, loops: data.loops }
  } catch {
    return { ...EMPTY }
  }
}

export function writeClipLoopsFile(data: unknown): DiskClipLoops {
  const parsed = data as DiskClipLoops
  if (!parsed || parsed.kind !== 'shape-lab-clip-loops' || !parsed.loops || typeof parsed.loops !== 'object') {
    throw new Error('Invalid clip-loops payload')
  }
  const incoming = parsed.loops
  const loops: Record<string, ClipLoop> = {}
  for (const [rawKey, value] of Object.entries(incoming)) {
    if (!value || typeof value !== 'object') continue
    const a = Number((value as ClipLoop).a)
    const b = Number((value as ClipLoop).b)
    if (!Number.isFinite(a) || !Number.isFinite(b) || b <= a) continue
    const key = loopKey(rawKey) || rawKey
    loops[key] = {
      a,
      b,
      updatedAt: (value as ClipLoop).updatedAt || new Date().toISOString(),
    }
  }
  const next: DiskClipLoops = {
    kind: 'shape-lab-clip-loops',
    version: 1,
    exportedAt: new Date().toISOString(),
    loops,
  }
  fs.mkdirSync(path.dirname(FILE), { recursive: true })
  fs.writeFileSync(FILE, JSON.stringify(next, null, 2) + '\n')
  return next
}
