/**
 * On-disk Compare library (URL list + names + order).
 * Shared by every preview origin so IndexedDB per-host does not hide the list.
 */

import fs from 'node:fs'
import path from 'node:path'
import type { IncomingMessage } from 'node:http'

const FILE = path.join(process.cwd(), 'data', 'library.json')

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

export function writeLibraryFile(data: unknown): DiskLibrary {
  const parsed = data as DiskLibrary
  if (!parsed || parsed.kind !== 'shape-lab-library' || !Array.isArray(parsed.collections)) {
    throw new Error('Invalid library payload')
  }
  const next: DiskLibrary = {
    kind: 'shape-lab-library',
    version: 1,
    exportedAt: new Date().toISOString(),
    collections: parsed.collections,
  }
  fs.mkdirSync(path.dirname(FILE), { recursive: true })
  fs.writeFileSync(FILE, JSON.stringify(next, null, 2))
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
