/**
 * Gym-wide favorites: starred Compare URLs, plus starred A/B loops per URL.
 * Shared by Compare, Learn scroll, and Classes.
 */

import fs from 'node:fs'
import path from 'node:path'
import { loopKey } from './clipLoopsStore.ts'

const FILE = path.join(process.cwd(), 'data', 'favorites.json')

export type DiskFavorites = {
  kind: 'shape-lab-favorites'
  version: 1
  exportedAt: string
  urls: string[]
  loops: Record<string, string[]>
}

const EMPTY: DiskFavorites = {
  kind: 'shape-lab-favorites',
  version: 1,
  exportedAt: '',
  urls: [],
  loops: {},
}

export function favoriteKey(raw: string): string {
  const trimmed = raw.trim()
  if (!trimmed) return ''
  if (trimmed.startsWith('item:')) return trimmed
  return loopKey(trimmed) || trimmed.toLowerCase()
}

function cleanKeys(list: unknown): string[] {
  if (!Array.isArray(list)) return []
  const seen = new Set<string>()
  const out: string[] = []
  for (const raw of list) {
    if (typeof raw !== 'string') continue
    const key = favoriteKey(raw)
    if (!key || seen.has(key)) continue
    seen.add(key)
    out.push(key)
  }
  return out
}

function cleanLoops(raw: unknown): Record<string, string[]> {
  if (!raw || typeof raw !== 'object') return {}
  const out: Record<string, string[]> = {}
  for (const [url, ids] of Object.entries(raw as Record<string, unknown>)) {
    const key = favoriteKey(url)
    if (!key) continue
    const seen = new Set<string>()
    const list: string[] = []
    if (Array.isArray(ids)) {
      for (const id of ids) {
        if (typeof id !== 'string' || !id.trim()) continue
        const next = id.trim()
        if (seen.has(next)) continue
        seen.add(next)
        list.push(next)
      }
    }
    if (list.length > 0) out[key] = list
  }
  return out
}

export function readFavoritesFile(): DiskFavorites {
  try {
    const data = JSON.parse(fs.readFileSync(FILE, 'utf8')) as DiskFavorites
    if (!data || data.kind !== 'shape-lab-favorites') return { ...EMPTY }
    return {
      kind: 'shape-lab-favorites',
      version: 1,
      exportedAt: typeof data.exportedAt === 'string' ? data.exportedAt : '',
      urls: cleanKeys(data.urls),
      loops: cleanLoops(data.loops),
    }
  } catch {
    return { ...EMPTY }
  }
}

export function writeFavoritesFile(data: unknown): DiskFavorites {
  const parsed = data as DiskFavorites
  if (!parsed || parsed.kind !== 'shape-lab-favorites') {
    throw new Error('Invalid favorites payload')
  }
  const next: DiskFavorites = {
    kind: 'shape-lab-favorites',
    version: 1,
    exportedAt: new Date().toISOString(),
    urls: cleanKeys(parsed.urls),
    loops: cleanLoops(parsed.loops),
  }
  fs.mkdirSync(path.dirname(FILE), { recursive: true })
  fs.writeFileSync(FILE, JSON.stringify(next, null, 2) + '\n')
  return next
}
