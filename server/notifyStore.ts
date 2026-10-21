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
  homeworkLogId?: string
  fromId?: string
  athleteId?: string
  /**
   * Standing-slot marker. A notice with a slot is the ONE live alert of
   * that kind for its athlete and is updated in place, never stacked.
   * 'recharge' is the homework recharge alert.
   */
  slot?: string
}

type DiskFile = {
  kind: 'shape-lab-notices'
  version: 1
  exportedAt?: string
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
    // Legacy daily nudge alerts ("Progress is waiting" / "Homework is
    // waiting") are gone: they stacked one per day and are replaced by a
    // single standing recharge alert (slot 'recharge') that updates in
    // place. Filtering here removes them from every client at once, and
    // because writes serialize this filtered list, the stored file
    // cleans itself on the next write.
    .filter((n) => n.kind !== 'nudge' || n.slot === 'recharge')
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
    homeworkLogId: safeId(r.homeworkLogId) || undefined,
    fromId: safeId(r.fromId) || undefined,
    athleteId: safeId(r.athleteId) || undefined,
    slot: typeof r.slot === 'string' ? r.slot.trim().slice(0, 24) || undefined : undefined,
  }
  const existing = await noticesForClient()
  // A standing (slotted) notice replaces every other notice in its slot
  // for that athlete, so the slot can never stack even if ids drift.
  const slotPeers =
    notice.slot != null
      ? existing.filter((n) => !(n.toId === notice.toId && n.slot === notice.slot))
      : existing
  await writeJson(FILE, {
    kind: 'shape-lab-notices',
    version: 1,
    exportedAt: new Date().toISOString(),
    notices: [notice, ...slotPeers.filter((n) => n.id !== id)].slice(0, MAX),
  } satisfies DiskFile)
  return notice
}

export async function markNoticesRead(ids: unknown): Promise<DiskNotice[]> {
  const want = new Set(
    (Array.isArray(ids) ? ids : []).map((x) => safeId(x)).filter((x): x is string => Boolean(x)),
  )
  const existing = await noticesForClient()
  const next = existing.map((n) => (want.has(n.id) ? { ...n, read: true } : n))
  await writeJson(FILE, {
    kind: 'shape-lab-notices',
    version: 1,
    exportedAt: new Date().toISOString(),
    notices: next,
  } satisfies DiskFile)
  return next
}

export async function removeNotices(ids: unknown): Promise<DiskNotice[]> {
  const want = new Set(
    (Array.isArray(ids) ? ids : []).map((x) => safeId(x)).filter((x): x is string => Boolean(x)),
  )
  const existing = await noticesForClient()
  const next = existing.filter((n) => !want.has(n.id))
  await writeJson(FILE, {
    kind: 'shape-lab-notices',
    version: 1,
    exportedAt: new Date().toISOString(),
    notices: next,
  } satisfies DiskFile)
  return next
}
