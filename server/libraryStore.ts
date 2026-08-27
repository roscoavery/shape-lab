/**
 * On-disk Compare library (URL list + names + order).
 * Shared by every preview origin so IndexedDB per-host does not hide the list.
 */

import fs from 'node:fs'
import path from 'node:path'
import type { IncomingMessage } from 'node:http'

const FILE = path.join(process.cwd(), 'data', 'library.json')
const SHIPPED = path.join(process.cwd(), 'src/config/compareLibrary.json')

export type DiskLibrary = {
  kind: 'shape-lab-library'
  version: 1
  exportedAt: string
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

function canonicalIgUrl(url: unknown): string | undefined {
  if (typeof url !== 'string') return undefined
  const m = url.match(
    /instagr(?:am\.com|\.am)\/(?:share\/)?(p|reel|reels|tv)\/([A-Za-z0-9_-]+)/i,
  )
  if (!m) return url
  const type = m[1].toLowerCase() === 'reels' ? 'reel' : m[1].toLowerCase()
  return `https://www.instagram.com/${type}/${m[2]}/`
}

function cleanCollections(raw: unknown[]): unknown[] {
  return raw
    .filter((c) => {
      if (!c || typeof c !== 'object') return false
      const items = (c as { items?: unknown[] }).items
      return Array.isArray(items) && items.length > 0
    })
    .map((c) => {
      const col = c as { items: Array<{ kind?: string; url?: string }> }
      return {
        ...col,
        items: col.items.map((item) =>
          item.kind === 'instagram' && item.url
            ? { ...item, url: canonicalIgUrl(item.url) ?? item.url }
            : item,
        ),
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
    fs.mkdirSync(path.dirname(SHIPPED), { recursive: true })
    fs.writeFileSync(SHIPPED, text)
  } catch {
    // shipped copy is best-effort — data/library.json is the live list
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
