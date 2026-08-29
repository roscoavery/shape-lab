/**
 * On-disk Compare library (URL list + names + order).
 * Shared by every preview origin so IndexedDB per-host does not hide the list.
 */

import fs from 'node:fs'
import path from 'node:path'
import type { IncomingMessage } from 'node:http'
import { canonicalSocialUrl, socialPlatform } from '../src/lib/socialUrls.ts'
import { readJson, writeJson } from './persist.ts'

const FILE = 'data/library.json'
const SHIPPED = path.join(process.cwd(), 'src/config/compareLibrary.json')

export type DiskLibrary = {
  kind: 'shape-lab-library'
  version: 1
  exportedAt: string
  managed?: boolean
  collections: unknown[]
}

const EMPTY: DiskLibrary = {
  kind: 'shape-lab-library',
  version: 1,
  exportedAt: '',
  collections: [],
}

export async function readLibraryFile(): Promise<DiskLibrary> {
  const data = await readJson<DiskLibrary>(FILE, { ...EMPTY })
  if (data && data.kind === 'shape-lab-library' && Array.isArray(data.collections) && data.collections.length) {
    return data
  }
  try {
    const shipped = JSON.parse(fs.readFileSync(SHIPPED, 'utf8')) as DiskLibrary
    if (shipped && shipped.kind === 'shape-lab-library' && Array.isArray(shipped.collections)) {
      return shipped
    }
  } catch {
    /* optional seed */
  }
  if (data && data.kind === 'shape-lab-library' && Array.isArray(data.collections)) {
    return data
  }
  return { ...EMPTY }
}

function itemUrlKey(url: string): string {
  return canonicalSocialUrl(url).replace(/\/+$/, '')
}

function unionKeywords(a?: unknown, b?: unknown): string[] | undefined {
  const parts = [...(Array.isArray(a) ? a : []), ...(Array.isArray(b) ? b : [])]
    .map((x) => String(x).trim())
    .filter(Boolean)
  const seen = new Set<string>()
  const out: string[] = []
  for (const tag of parts) {
    const key = tag.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    out.push(tag)
  }
  return out.length ? out : undefined
}

function coalesceByName(raw: unknown[]): unknown[] {
  const out: Array<Record<string, unknown> & { name: string; items: Array<Record<string, unknown>> }> = []
  for (const c of raw) {
    if (!c || typeof c !== 'object') continue
    const col = c as { name?: unknown; items?: unknown[] }
    const name = typeof col.name === 'string' ? col.name : ''
    const items = Array.isArray(col.items)
      ? col.items.filter((i) => i && typeof i === 'object') as Array<Record<string, unknown>>
      : []
    const existing = out.find((x) => x.name.trim().toLowerCase() === name.trim().toLowerCase())
    if (!existing) {
      out.push({ ...(col as Record<string, unknown>), name, items: items.map((i) => ({ ...i })) })
      continue
    }
    for (const item of items) {
      const url = typeof item.url === 'string' ? item.url : ''
      const match = existing.items.find((e) => {
        if (e.id && item.id && e.id === item.id) return true
        const eu = typeof e.url === 'string' ? e.url : ''
        return Boolean(url && eu && itemUrlKey(eu) === itemUrlKey(url))
      })
      if (match) {
        const keywords = unionKeywords(match.keywords, item.keywords)
        if (keywords) match.keywords = keywords
        else delete match.keywords
      } else {
        existing.items.push({ ...item })
      }
    }
  }
  return out
}

type DiskItem = Record<string, unknown> & { url?: string; name?: string; id?: string }
type DiskCollection = Record<string, unknown> & {
  id?: string
  name: string
  items: DiskItem[]
}

function isGenericIgName(name: string): boolean {
  return /^(IG|TikTok|Facebook)\s+\S+$/i.test(name.trim())
}

function preferItemName(existing: string, incoming: string): string {
  const next = incoming.trim()
  if (!next) return existing
  if (isGenericIgName(existing) && !isGenericIgName(next)) return next
  if (!isGenericIgName(next) && next !== existing) return next
  return existing
}

function isLocalDevUrl(url: string): boolean {
  try {
    const host = new URL(url).hostname
    return host === '127.0.0.1' || host === 'localhost'
  } catch {
    return false
  }
}

function isPlaceholderIgUrl(url: string): boolean {
  return /\/(ABC123xyz99|C8Qw0x0N0x0)\/?$/i.test(url)
}

function cleanCollections(raw: unknown[]): DiskCollection[] {
  return coalesceByName(raw)
    .filter((c) => {
      if (!c || typeof c !== 'object') return false
      const items = (c as { items?: unknown[] }).items
      return Array.isArray(items) && items.length > 0
    })
    .map((c) => {
      const col = c as DiskCollection
      const { athleteId: _athleteId, ...rest } = col
      void _athleteId
      return {
        ...rest,
        items: col.items
          .filter((item) => {
            const url = typeof item.url === 'string' ? item.url : ''
            if (!url) return false
            if (isLocalDevUrl(url) || isPlaceholderIgUrl(url)) return false
            return true
          })
          .map((item) => {
            const keywords = unionKeywords(item.keywords)
            const next = { ...item, ...(keywords ? { keywords } : {}) }
            if (!keywords) delete (next as { keywords?: string[] }).keywords
            if (!item.url) return next
            const platform = socialPlatform(item.url)
            if (!platform) return next
            return {
              ...next,
              kind: platform,
              url: canonicalSocialUrl(item.url),
            }
          }),
      }
    })
    .filter((c) => c.items.length > 0)
}

/** Union gym libraries. Incoming names win; existing URLs are never dropped. */
function unionCollections(existingRaw: unknown[], incomingRaw: unknown[]): DiskCollection[] {
  const existing = cleanCollections(existingRaw)
  const incoming = cleanCollections(incomingRaw)
  if (incoming.length === 0) return existing
  if (existing.length === 0) return incoming

  const result: DiskCollection[] = existing.map((c) => ({
    ...c,
    items: c.items.map((i) => ({ ...i })),
  }))

  const findCollection = (inc: DiskCollection) =>
    result.find((e) => e.id && inc.id && e.id === inc.id) ??
    result.find(
      (e) => e.name.trim().toLowerCase() === inc.name.trim().toLowerCase(),
    )

  for (const inc of incoming) {
    let target = findCollection(inc)
    if (!target) {
      result.push({ ...inc, items: inc.items.map((i) => ({ ...i })) })
      continue
    }
    if (inc.id && target.id === inc.id && inc.name.trim()) {
      target.name = inc.name
    } else if (inc.name.trim() && !isGenericIgName(inc.name)) {
      target.name = inc.name
    }
    for (const item of inc.items) {
      const url = typeof item.url === 'string' ? item.url : ''
      const match = target.items.find((e) => {
        if (e.id && item.id && e.id === item.id) return true
        const eu = typeof e.url === 'string' ? e.url : ''
        return Boolean(url && eu && itemUrlKey(eu) === itemUrlKey(url))
      })
      if (match) {
        const existingName = typeof match.name === 'string' ? match.name : ''
        const incomingName = typeof item.name === 'string' ? item.name : ''
        match.name = preferItemName(existingName, incomingName)
        const keywords = unionKeywords(match.keywords, item.keywords)
        if (keywords) match.keywords = keywords
        else delete match.keywords
      } else {
        target.items.push({ ...item })
      }
    }
  }

  return cleanCollections(result)
}

export async function writeLibraryFile(data: unknown): Promise<DiskLibrary> {
  const parsed = data as DiskLibrary
  if (!parsed || parsed.kind !== 'shape-lab-library' || !Array.isArray(parsed.collections)) {
    throw new Error('Invalid library payload')
  }
  const existing = await readLibraryFile()
  const collections = unionCollections(existing.collections, parsed.collections)
  const next: DiskLibrary = {
    kind: 'shape-lab-library',
    version: 1,
    exportedAt: new Date().toISOString(),
    managed: true,
    collections,
  }
  if (JSON.stringify(existing.collections) === JSON.stringify(next.collections)) {
    return existing
  }
  await writeJson(FILE, next)
  try {
    fs.mkdirSync(path.dirname(SHIPPED), { recursive: true })
    fs.writeFileSync(SHIPPED, JSON.stringify(next, null, 2) + '\n')
  } catch {
    /* shipped copy is optional on Vercel */
  }
  return next
}

export function readRequestBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    req.on('data', (c: Buffer) => chunks.push(c))
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')))
    req.on('error', reject)
  })
}
