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
}

export type DiskThread = {
  id: string
  participantIds: [string, string]
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
  if (!id || !authorId || !text) return null
  const shareUrl = cleanText(o.shareUrl, 400)
  const msg: DiskMessage = {
    id,
    authorId,
    createdAt:
      typeof o.createdAt === 'string' && o.createdAt
        ? o.createdAt
        : new Date().toISOString(),
    text,
  }
  if (shareUrl && /^https?:\/\//i.test(shareUrl)) msg.shareUrl = shareUrl
  return msg
}

function cleanThread(raw: unknown): DiskThread | null {
  if (!raw || typeof raw !== 'object') return null
  const o = raw as Record<string, unknown>
  const id = safeId(o.id)
  const parts = Array.isArray(o.participantIds)
    ? o.participantIds.map(safeId).filter((x): x is string => Boolean(x))
    : []
  const unique = [...new Set(parts)].sort()
  if (!id || unique.length !== 2) return null
  const messages = Array.isArray(o.messages)
    ? o.messages
        .map(cleanMessage)
        .filter((m): m is DiskMessage => Boolean(m))
        .filter((m) => unique.includes(m.authorId))
        .slice(-200)
    : []
  return {
    id,
    participantIds: [unique[0]!, unique[1]!],
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
  const next = { ...sanitizeSocial(parsed), exportedAt: new Date().toISOString() }
  await writeJson(FILE, next)
  return next
}
