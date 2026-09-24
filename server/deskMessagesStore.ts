import { readJson, writeJson } from './persist.ts'

const FILE = 'data/desk-messages.json'

export type DeskMessageAudience = 'athlete' | 'parent' | 'all'
export type DeskMessageSurface = 'home' | 'learn' | 'all'

export type DeskMessage = {
  id: string
  text: string
  audience: DeskMessageAudience
  surface: DeskMessageSurface
  enabled: boolean
  createdAt: string
  updatedAt: string
}

export type DeskMessagesFile = {
  kind: 'shape-lab-desk-messages'
  version: 1
  exportedAt: string
  messages: DeskMessage[]
}

const EMPTY: DeskMessagesFile = {
  kind: 'shape-lab-desk-messages',
  version: 1,
  exportedAt: '',
  messages: [],
}

function normalizeMessage(raw: unknown): DeskMessage | null {
  if (!raw || typeof raw !== 'object') return null
  const row = raw as Record<string, unknown>
  if (typeof row.id !== 'string' || !row.id.trim()) return null
  if (typeof row.text !== 'string' || !row.text.trim()) return null
  const audience =
    row.audience === 'athlete' || row.audience === 'parent' || row.audience === 'all'
      ? row.audience
      : 'all'
  const surface =
    row.surface === 'home' || row.surface === 'learn' || row.surface === 'all' ? row.surface : 'all'
  const createdAt = typeof row.createdAt === 'string' ? row.createdAt : new Date().toISOString()
  const updatedAt = typeof row.updatedAt === 'string' ? row.updatedAt : createdAt
  return {
    id: row.id.trim(),
    text: row.text.trim(),
    audience,
    surface,
    enabled: row.enabled !== false,
    createdAt,
    updatedAt,
  }
}

export async function readDeskMessagesFile(): Promise<DeskMessagesFile> {
  const data = await readJson<DeskMessagesFile>(FILE, { ...EMPTY })
  if (!data || data.kind !== 'shape-lab-desk-messages') return { ...EMPTY }
  const messages = (Array.isArray(data.messages) ? data.messages : [])
    .map(normalizeMessage)
    .filter((row): row is DeskMessage => Boolean(row))
  return {
    kind: 'shape-lab-desk-messages',
    version: 1,
    exportedAt: typeof data.exportedAt === 'string' ? data.exportedAt : '',
    messages,
  }
}

export async function writeDeskMessagesFile(body: unknown): Promise<DeskMessagesFile> {
  const incoming = (body && typeof body === 'object' ? body : {}) as Partial<DeskMessagesFile>
  const messages = (Array.isArray(incoming.messages) ? incoming.messages : [])
    .map(normalizeMessage)
    .filter((row): row is DeskMessage => Boolean(row))
  const next: DeskMessagesFile = {
    kind: 'shape-lab-desk-messages',
    version: 1,
    exportedAt: new Date().toISOString(),
    messages,
  }
  await writeJson(FILE, next)
  return next
}
