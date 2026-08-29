/**
 * Per-coach Compare collections (Instagram / TikTok / Facebook URLs).
 * These never write into the gym library.json file. Ryan’s gym list stays separate.
 */

import { canonicalSocialUrl, socialPlatform } from '../src/lib/socialUrls.ts'
import { readJson, writeJson } from './persist.ts'

const FILE = 'data/coach-libraries.json'

export type DiskCoachItem = {
  id: string
  kind: string
  name: string
  url?: string
  keywords?: string[]
  createdAt: string
}

export type DiskCoachCollection = {
  id: string
  name: string
  createdAt: string
  athleteId: string
  items: DiskCoachItem[]
}

export type DiskCoachLibrary = {
  kind: 'shape-lab-library'
  version: 1
  exportedAt: string
  managed?: boolean
  collections: DiskCoachCollection[]
}

export type DiskCoachLibraries = {
  kind: 'shape-lab-coach-libraries'
  version: 1
  exportedAt: string
  byAthleteId: Record<string, DiskCoachLibrary>
}

const EMPTY: DiskCoachLibraries = {
  kind: 'shape-lab-coach-libraries',
  version: 1,
  exportedAt: '',
  byAthleteId: {},
}

const EMPTY_LIB: DiskCoachLibrary = {
  kind: 'shape-lab-library',
  version: 1,
  exportedAt: '',
  managed: true,
  collections: [],
}

function safeId(id: unknown): string | null {
  if (typeof id !== 'string') return null
  const s = id.trim()
  if (!s || s.length > 80) return null
  if (!/^[a-zA-Z0-9_-]+$/.test(s)) return null
  return s
}

function isLocalDevUrl(url: string): boolean {
  try {
    const host = new URL(url).hostname
    return host === '127.0.0.1' || host === 'localhost'
  } catch {
    return false
  }
}

function cleanItem(raw: unknown): DiskCoachItem | null {
  if (!raw || typeof raw !== 'object') return null
  const item = raw as Record<string, unknown>
  const url = typeof item.url === 'string' ? item.url.trim() : ''
  if (!url || !/^https?:\/\//i.test(url) || isLocalDevUrl(url)) return null
  const id = safeId(item.id) ?? `ref_${Math.random().toString(36).slice(2, 10)}`
  const platform = socialPlatform(url)
  const kind =
    item.kind === 'instagram' ||
    item.kind === 'tiktok' ||
    item.kind === 'facebook' ||
    item.kind === 'url'
      ? item.kind
      : platform ?? 'url'
  const keywords = Array.isArray(item.keywords)
    ? item.keywords
        .filter((x): x is string => typeof x === 'string')
        .map((x) => x.trim())
        .filter(Boolean)
        .slice(0, 24)
    : []
  return {
    id,
    kind,
    name: typeof item.name === 'string' && item.name.trim() ? item.name.trim().slice(0, 160) : url,
    url: platform ? canonicalSocialUrl(url) : url,
    ...(keywords.length ? { keywords } : {}),
    createdAt:
      typeof item.createdAt === 'string' && item.createdAt
        ? item.createdAt
        : new Date().toISOString(),
  }
}

function cleanCollection(raw: unknown, athleteId: string): DiskCoachCollection | null {
  if (!raw || typeof raw !== 'object') return null
  const col = raw as Record<string, unknown>
  const name = typeof col.name === 'string' ? col.name.trim().slice(0, 120) : ''
  if (!name) return null
  const items = Array.isArray(col.items)
    ? col.items.map(cleanItem).filter((x): x is DiskCoachItem => Boolean(x))
    : []
  return {
    id: safeId(col.id) ?? `col_${Math.random().toString(36).slice(2, 10)}`,
    name,
    createdAt:
      typeof col.createdAt === 'string' && col.createdAt
        ? col.createdAt
        : new Date().toISOString(),
    athleteId,
    items,
  }
}

function emptyLibrary(athleteId: string): DiskCoachLibrary {
  void athleteId
  return { ...EMPTY_LIB, collections: [] }
}

export async function readCoachLibrariesFile(): Promise<DiskCoachLibraries> {
  const data = await readJson<DiskCoachLibraries>(FILE, { ...EMPTY, byAthleteId: {} })
  if (
    !data ||
    data.kind !== 'shape-lab-coach-libraries' ||
    !data.byAthleteId ||
    typeof data.byAthleteId !== 'object'
  ) {
    return { ...EMPTY, byAthleteId: {} }
  }
  return data
}

async function writeFile(next: DiskCoachLibraries): Promise<DiskCoachLibraries> {
  await writeJson(FILE, next)
  return next
}

export async function readCoachLibrary(athleteId: string): Promise<DiskCoachLibrary> {
  const id = safeId(athleteId)
  if (!id) return emptyLibrary('')
  const file = await readCoachLibrariesFile()
  return file.byAthleteId[id] ?? emptyLibrary(id)
}

export async function writeCoachLibrary(athleteId: string, data: unknown): Promise<DiskCoachLibrary> {
  const id = safeId(athleteId)
  if (!id) throw new Error('Missing athleteId')
  const parsed = data as { kind?: unknown; collections?: unknown[] }
  if (!parsed || parsed.kind !== 'shape-lab-library' || !Array.isArray(parsed.collections)) {
    throw new Error('Invalid coach library payload')
  }
  const collections = parsed.collections
    .map((c) => cleanCollection(c, id))
    .filter((c): c is DiskCoachCollection => Boolean(c))
  const nextLib: DiskCoachLibrary = {
    kind: 'shape-lab-library',
    version: 1,
    exportedAt: new Date().toISOString(),
    managed: true,
    collections,
  }
  const file = await readCoachLibrariesFile()
  const next: DiskCoachLibraries = {
    kind: 'shape-lab-coach-libraries',
    version: 1,
    exportedAt: nextLib.exportedAt,
    byAthleteId: { ...file.byAthleteId, [id]: nextLib },
  }
  await writeFile(next)
  return nextLib
}
