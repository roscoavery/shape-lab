/**
 * Follows and direct messages. JSON on disk, gym-wide.
 */

import { readJson, writeJson } from './persist.ts'

const FILE = 'data/social.json'

export type DiskFollow = {
  followerId: string
  followingId: string
  createdAt: string
}

export type DiskMessage = {
  id: string
  authorId: string
  createdAt: string
  text: string
  shareUrl?: string
  shareTitle?: string
}

export type DiskThread = {
  id: string
  participantIds: string[]
  title?: string
  updatedAt: string
  messages: DiskMessage[]
}

export type DiskSocial = {
  kind: 'shape-lab-social'
  version: 1
  exportedAt: string
  follows: DiskFollow[]
  threads: DiskThread[]
}

const EMPTY: DiskSocial = {
  kind: 'shape-lab-social',
  version: 1,
  exportedAt: '',
  follows: [],
  threads: [],
}

function safeId(id: unknown): string | null {
  if (typeof id !== 'string') return null
  const s = id.trim()
  if (!s || s.length > 80) return null
  if (!/^[a-zA-Z0-9_-]+$/.test(s)) return null
  return s
}

function cleanText(raw: unknown, max: number): string {
  return typeof raw === 'string' ? raw.trim().slice(0, max) : ''
}

function cleanFollow(raw: unknown): DiskFollow | null {
  if (!raw || typeof raw !== 'object') return null
  const o = raw as Record<string, unknown>
  const followerId = safeId(o.followerId)
  const followingId = safeId(o.followingId)
  if (!followerId || !followingId || followerId === followingId) return null
  return {
    followerId,
    followingId,
    createdAt:
      typeof o.createdAt === 'string' && o.createdAt
        ? o.createdAt
        : new Date().toISOString(),
  }
}

function cleanMessage(raw: unknown): DiskMessage | null {
  if (!raw || typeof raw !== 'object') return null
  const o = raw as Record<string, unknown>
  const id = safeId(o.id)
  const authorId = safeId(o.authorId)
  const text = cleanText(o.text, 800)
  const shareUrl = cleanShare(o.shareUrl)
  if (!id || !authorId || (!text && !shareUrl)) return null
  const msg: DiskMessage = {
    id,
    authorId,
    createdAt:
      typeof o.createdAt === 'string' && o.createdAt
        ? o.createdAt
        : new Date().toISOString(),
    text: text || cleanText(o.shareTitle, 80) || 'Shared a reference',
  }
  if (shareUrl) msg.shareUrl = shareUrl
  const shareTitle = cleanText(o.shareTitle, 80)
  if (shareTitle) msg.shareTitle = shareTitle
  return msg
}

function cleanShare(raw: unknown): string {
  const u = cleanText(raw, 500)
  if (!u) return ''
  if (/^https?:\/\//i.test(u)) return u
  if (u.startsWith('shape-lab:')) return u
  if (u.startsWith('/')) return u
  return ''
}

function cleanThread(raw: unknown): DiskThread | null {
  if (!raw || typeof raw !== 'object') return null
  const o = raw as Record<string, unknown>
  const id = safeId(o.id)
  const parts = Array.isArray(o.participantIds)
    ? o.participantIds.map(safeId).filter((x): x is string => Boolean(x))
    : []
  const unique = [...new Set(parts)]
  if (!id || unique.length < 2 || unique.length > 12) return null
  const messages = Array.isArray(o.messages)
    ? o.messages
        .map(cleanMessage)
        .filter((m): m is DiskMessage => Boolean(m))
        .filter((m) => unique.includes(m.authorId))
        .slice(-200)
    : []
  const title = cleanText(o.title, 60)
  return {
    id,
    participantIds: unique,
    ...(title ? { title } : {}),
    updatedAt:
      typeof o.updatedAt === 'string' && o.updatedAt
        ? o.updatedAt
        : messages.at(-1)?.createdAt ?? new Date().toISOString(),
    messages,
  }
}

function dedupeFollows(list: DiskFollow[]): DiskFollow[] {
  const seen = new Set<string>()
  const out: DiskFollow[] = []
  for (const f of list) {
    const key = `${f.followerId}::${f.followingId}`
    if (seen.has(key)) continue
    seen.add(key)
    out.push(f)
  }
  return out.slice(0, 400)
}

function sanitizeSocial(data: DiskSocial): DiskSocial {
  const follows = dedupeFollows(
    (Array.isArray(data.follows) ? data.follows : [])
      .map(cleanFollow)
      .filter((f): f is DiskFollow => Boolean(f)),
  )
  const threads = (Array.isArray(data.threads) ? data.threads : [])
    .map(cleanThread)
    .filter((t): t is DiskThread => Boolean(t))
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .slice(0, 120)
  return {
    kind: 'shape-lab-social',
    version: 1,
    exportedAt: typeof data.exportedAt === 'string' ? data.exportedAt : '',
    follows,
    threads,
  }
}

export async function readSocialFile(): Promise<DiskSocial> {
  const data = await readJson<DiskSocial>(FILE, { ...EMPTY })
  if (!data || data.kind !== 'shape-lab-social') return { ...EMPTY }
  return sanitizeSocial(data)
}

export async function writeSocialFile(data: unknown): Promise<DiskSocial> {
  const parsed = data as DiskSocial
  if (!parsed || parsed.kind !== 'shape-lab-social') {
    throw new Error('Invalid social payload')
  }
  const incoming = sanitizeSocial(parsed)
  const current = await readSocialFile()
  const next = {
    ...incoming,
    follows: dedupeFollows([...current.follows, ...incoming.follows]),
    threads: mergeThreads(current.threads, incoming.threads),
    exportedAt: new Date().toISOString(),
  }
  await writeJson(FILE, next)
  return next
}

function mergeThreads(current: DiskThread[], incoming: DiskThread[]): DiskThread[] {
  const map = new Map<string, DiskThread>()
  for (const t of current) map.set(t.id, t)
  for (const t of incoming) {
    const prev = map.get(t.id)
    if (!prev) {
      map.set(t.id, t)
      continue
    }
    const newer = t.updatedAt.localeCompare(prev.updatedAt) >= 0
    const more = t.messages.length >= prev.messages.length
    if (newer || more) map.set(t.id, t)
  }
  return [...map.values()]
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .slice(0, 120)
}

export async function toggleFollowOnDisk(
  followerId: string,
  followingId: string,
): Promise<DiskSocial> {
  const a = safeId(followerId)
  const b = safeId(followingId)
  if (!a || !b || a === b) {
    throw new Error('Pick two different profiles to follow.')
  }
  const current = await readSocialFile()
  const already = current.follows.some((f) => f.followerId === a && f.followingId === b)
  const follows = already
    ? current.follows.filter((f) => !(f.followerId === a && f.followingId === b))
    : [
        { followerId: a, followingId: b, createdAt: new Date().toISOString() },
        ...current.follows,
      ]
  const next: DiskSocial = {
    ...current,
    follows: dedupeFollows(follows),
    exportedAt: new Date().toISOString(),
  }
  await writeJson(FILE, next)
  return next
}
