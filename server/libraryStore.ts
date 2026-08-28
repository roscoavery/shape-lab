/**
 * On-disk Compare library (URL list + names + order).
 * Shared by every preview origin so IndexedDB per-host does not hide the list.
 */

import fs from 'node:fs'
import path from 'node:path'
import type { IncomingMessage } from 'node:http'
import { canonicalSocialUrl, socialPlatform } from '../src/lib/socialUrls.ts'

const FILE = path.join(process.cwd(), 'data', 'library.json')
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

export function readLibraryFile(): DiskLibrary {
  try {
    const data = JSON.parse(fs.readFileSync(FILE, 'utf8')) as DiskLibrary
    if (!data || data.kind !== 'shape-lab-library' || !Array.isArray(data.collections)) {
      return { ...EMPTY }
    }
    return data
  } catch {
    return { ...EMPTY }
  }
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

function cleanCollections(raw: unknown[]): unknown[] {
  return coalesceByName(raw)
    .filter((c) => {
      if (!c || typeof c !== 'object') return false
      const items = (c as { items?: unknown[] }).items
      return Array.isArray(items) && items.length > 0
    })
    .map((c) => {
      const col = c as { items: Array<{ kind?: string; url?: string; keywords?: string[] }> }
      return {
        ...col,
        items: col.items.map((item) => {
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
}

export function writeLibraryFile(data: unknown): DiskLibrary {
  const parsed = data as DiskLibrary
  if (!parsed || parsed.kind !== 'shape-lab-library' || !Array.isArray(parsed.collections)) {
    throw new Error('Invalid library payload')
  }
  const collections = cleanCollections(parsed.collections)
  const next: DiskLibrary = {
    kind: 'shape-lab-library',
    version: 1,
    exportedAt: new Date().toISOString(),
    managed: true,
    collections,
  }
  fs.mkdirSync(path.dirname(FILE), { recursive: true })
  const existing = readLibraryFile()
  if (JSON.stringify(existing.collections) === JSON.stringify(next.collections)) {
    return existing
  }
  const text = JSON.stringify(next, null, 2) + '\n'
  fs.writeFileSync(FILE, text)
  try {
    fs.writeFileSync(SHIPPED, text)
  } catch {
    /* shipped copy is optional in a packed preview */
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
