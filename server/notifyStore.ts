import { readJson, writeJson } from './persist.ts'

const FILE = 'data/notices.json'
const MAX = 400

export type DiskNotice = {
  id: string
  toId: string
  kind: string
  title: string
  body: string
  createdAt: string
  read: boolean
  href?: string
}

type DiskFile = {
  kind: 'shape-lab-notices'
  version: 1
  notices: DiskNotice[]
}

const EMPTY: DiskFile = { kind: 'shape-lab-notices', version: 1, notices: [] }

function safeId(id: unknown): string | null {
  if (typeof id !== 'string') return null
  const s = id.trim()
  if (!s || s.length > 120) return null
  if (!/^[a-zA-Z0-9_-]+$/.test(s)) return null
  return s
}

export async function noticesForClient(): Promise<DiskNotice[]> {
  const data = await readJson<DiskFile>(FILE, { ...EMPTY })
  const list = Array.isArray(data.notices) ? data.notices : []
  return list
    .filter((n) => n && typeof n.id === 'string' && typeof n.toId === 'string')
    .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''))
    .slice(0, MAX)
}

export async function addNotice(raw: unknown): Promise<DiskNotice | null> {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Record<string, unknown>
  const id = safeId(r.id) || `ntc_${Date.now().toString(36)}`
  const toId = safeId(r.toId)
  const title = typeof r.title === 'string' ? r.title.trim().slice(0, 120) : ''
  const body = typeof r.body === 'string' ? r.body.trim().slice(0, 400) : ''
  const kind = typeof r.kind === 'string' ? r.kind.trim().slice(0, 24) : 'nudge'
  if (!toId || !title) return null
  const notice: DiskNotice = {
    id,
    toId,
    kind,
    title,
    body,
    createdAt: typeof r.createdAt === 'string' ? r.createdAt : new Date().toISOString(),
    read: false,
    href: typeof r.href === 'string' ? r.href : undefined,
  }
  const existing = await noticesForClient()
  await writeJson(FILE, {
    kind: 'shape-lab-notices',
    version: 1,
    notices: [notice, ...existing.filter((n) => n.id !== id)].slice(0, MAX),
  } satisfies DiskFile)
  return notice
}

export async function markNoticesRead(ids: unknown): Promise<DiskNotice[]> {
  const want = new Set(
    (Array.isArray(ids) ? ids : []).map((x) => safeId(x)).filter((x): x is string => Boolean(x)),
  )
  const existing = await noticesForClient()
  const next = existing.map((n) => (want.has(n.id) ? { ...n, read: true } : n))
  await writeJson(FILE, { kind: 'shape-lab-notices', version: 1, notices: next } satisfies DiskFile)
  return next
}
