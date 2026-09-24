import { readJson, writeJson } from './persist.ts'

const FILE = 'data/improve-notes.json'

export type ImproveNotesFile = {
  kind: 'shape-lab-improve-notes'
  version: 1
  exportedAt: string
  notes: unknown[]
}

const EMPTY: ImproveNotesFile = {
  kind: 'shape-lab-improve-notes',
  version: 1,
  exportedAt: '',
  notes: [],
}

export async function readImproveNotesFile(): Promise<ImproveNotesFile> {
  const data = await readJson<ImproveNotesFile>(FILE)
  if (!data || data.kind !== 'shape-lab-improve-notes') return { ...EMPTY }
  return {
    kind: 'shape-lab-improve-notes',
    version: 1,
    exportedAt: data.exportedAt ?? '',
    notes: Array.isArray(data.notes) ? data.notes : [],
  }
}

export async function writeImproveNotesFile(body: unknown): Promise<ImproveNotesFile> {
  const incoming = (body && typeof body === 'object' ? body : {}) as Partial<ImproveNotesFile>
  const prior = await readImproveNotesFile()
  const notes = Array.isArray(incoming.notes) ? incoming.notes : prior.notes
  const next: ImproveNotesFile = {
    kind: 'shape-lab-improve-notes',
    version: 1,
    exportedAt: new Date().toISOString(),
    notes,
  }
  await writeJson(FILE, next)
  return next
}
