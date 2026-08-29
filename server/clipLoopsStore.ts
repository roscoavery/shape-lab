/**
 * Gym-wide A/B loop points keyed by canonical Instagram / social URL.
 * Each URL can keep a handful of named loops; one is active.
 * Shared by Learn scroll, Compare, and Classes collages.
 */

import { canonicalSocialUrl, socialVideoKey } from '../src/lib/socialUrls.ts'
import { readJson, writeJson } from './persist.ts'

const FILE = 'data/clip-loops.json'
export const MAX_LOOP_PRESETS = 8

export type ClipLoopPreset = {
  id: string
  name: string
  a: number
  b: number
  updatedAt: string
}

export type ClipLoopSet = {
  presets: ClipLoopPreset[]
  activeId: string | null
}

/** Legacy single pair still accepted on read. */
export type LegacyClipLoop = {
  a: number
  b: number
  updatedAt?: string
}

export type DiskClipLoops = {
  kind: 'shape-lab-clip-loops'
  version: 1
  exportedAt: string
  loops: Record<string, ClipLoopSet>
}

const EMPTY: DiskClipLoops = {
  kind: 'shape-lab-clip-loops',
  version: 1,
  exportedAt: '',
  loops: {},
}

export function loopKey(url: string): string {
  const trimmed = url.trim()
  if (/^(instagram|tiktok|facebook):/i.test(trimmed)) return trimmed.toLowerCase()
  return socialVideoKey(trimmed) ?? canonicalSocialUrl(trimmed).replace(/\/+$/, '')
}

function migrateLoopKey(rawKey: string): string {
  const key = loopKey(rawKey) || rawKey
  if (key.startsWith('null') && key.length > 4) {
    const rest = key.slice(4)
    if (/^[a-z0-9_-]+$/i.test(rest)) return `instagram:${rest.toLowerCase()}`
  }
  return key
}

function cleanPreset(raw: unknown, index: number): ClipLoopPreset | null {
  if (!raw || typeof raw !== 'object') return null
  const p = raw as ClipLoopPreset
  const a = Number(p.a)
  const b = Number(p.b)
  if (!Number.isFinite(a) || !Number.isFinite(b) || b <= a) return null
  const id = typeof p.id === 'string' && p.id.trim() ? p.id.trim() : `loop_${index + 1}`
  const name =
    typeof p.name === 'string' && p.name.trim()
      ? p.name.trim().slice(0, 40)
      : `Loop ${index + 1}`
  return {
    id,
    name,
    a,
    b,
    updatedAt: typeof p.updatedAt === 'string' ? p.updatedAt : new Date().toISOString(),
  }
}

export function normalizeLoopEntry(value: unknown): ClipLoopSet | null {
  if (!value || typeof value !== 'object') return null
  const raw = value as ClipLoopSet & LegacyClipLoop
  if (Array.isArray(raw.presets)) {
    const presets = raw.presets
      .map(cleanPreset)
      .filter((p): p is ClipLoopPreset => Boolean(p))
      .slice(0, MAX_LOOP_PRESETS)
    if (presets.length === 0) return null
    const activeId =
      typeof raw.activeId === 'string' && presets.some((p) => p.id === raw.activeId)
        ? raw.activeId
        : presets[0]!.id
    return { presets, activeId }
  }
  const a = Number(raw.a)
  const b = Number(raw.b)
  if (!Number.isFinite(a) || !Number.isFinite(b) || b <= a) return null
  const id = 'loop_1'
  return {
    presets: [
      {
        id,
        name: 'Loop 1',
        a,
        b,
        updatedAt: typeof raw.updatedAt === 'string' ? raw.updatedAt : new Date().toISOString(),
      },
    ],
    activeId: id,
  }
}

export async function readClipLoopsFile(): Promise<DiskClipLoops> {
  const data = await readJson<DiskClipLoops>(FILE, { ...EMPTY })
  if (!data || data.kind !== 'shape-lab-clip-loops' || !data.loops || typeof data.loops !== 'object') {
    return { ...EMPTY }
  }
  const loops: Record<string, ClipLoopSet> = {}
  for (const [rawKey, value] of Object.entries(data.loops)) {
    const entry = normalizeLoopEntry(value)
    if (!entry) continue
    loops[migrateLoopKey(rawKey)] = entry
  }
  return { ...EMPTY, ...data, loops }
}

export async function writeClipLoopsFile(data: unknown): Promise<DiskClipLoops> {
  const parsed = data as DiskClipLoops
  if (!parsed || parsed.kind !== 'shape-lab-clip-loops' || !parsed.loops || typeof parsed.loops !== 'object') {
    throw new Error('Invalid clip-loops payload')
  }
  const loops: Record<string, ClipLoopSet> = {}
  for (const [rawKey, value] of Object.entries(parsed.loops)) {
    const entry = normalizeLoopEntry(value)
    if (!entry) continue
    loops[migrateLoopKey(rawKey)] = entry
  }
  const next: DiskClipLoops = {
    kind: 'shape-lab-clip-loops',
    version: 1,
    exportedAt: new Date().toISOString(),
    loops,
  }
  await writeJson(FILE, next)
  return next
}
