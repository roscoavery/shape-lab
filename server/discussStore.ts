/**
 * Coach lounge threads. JSON on disk. Tagged so Research can count them.
 */

import { DISCUSS_TOPICS } from '../src/config/discussTopics.ts'
import { readJson, writeJson } from './persist.ts'

const FILE = 'data/discuss.json'
const TOPIC_IDS = new Set(DISCUSS_TOPICS.map((t) => t.id))

export type DiskDiscussPost = {
  id: string
  authorId: string
  createdAt: string
  body: string
  reasoning: string
}

export type DiskDiscussThread = {
  id: string
  title: string
  topicId: string
  authorId: string
  createdAt: string
  updatedAt: string
  posts: DiskDiscussPost[]
}

export type DiskDiscuss = {
  kind: 'shape-lab-discuss'
  version: 1
  exportedAt: string
  threads: DiskDiscussThread[]
}

const EMPTY: DiskDiscuss = {
  kind: 'shape-lab-discuss',
  version: 1,
  exportedAt: '',
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

function cleanPost(raw: unknown): DiskDiscussPost | null {
  if (!raw || typeof raw !== 'object') return null
  const o = raw as Record<string, unknown>
  const id = safeId(o.id)
  const authorId = safeId(o.authorId)
  const body = cleanText(o.body, 1200)
  if (!id || !authorId || !body) return null
  return {
    id,
    authorId,
    createdAt:
      typeof o.createdAt === 'string' && o.createdAt
        ? o.createdAt
        : new Date().toISOString(),
    body,
    reasoning: cleanText(o.reasoning, 800),
  }
}

function cleanThread(raw: unknown): DiskDiscussThread | null {
  if (!raw || typeof raw !== 'object') return null
  const o = raw as Record<string, unknown>
  const id = safeId(o.id)
  const authorId = safeId(o.authorId)
  const title = cleanText(o.title, 120)
  const topicId = typeof o.topicId === 'string' && TOPIC_IDS.has(o.topicId) ? o.topicId : 'other'
  const posts = Array.isArray(o.posts)
    ? o.posts.map(cleanPost).filter((p): p is DiskDiscussPost => Boolean(p)).slice(0, 80)
    : []
  if (!id || !authorId || !title || posts.length === 0) return null
  return {
    id,
    title,
    topicId,
    authorId,
    createdAt:
      typeof o.createdAt === 'string' && o.createdAt
        ? o.createdAt
        : posts[0]!.createdAt,
    updatedAt:
      typeof o.updatedAt === 'string' && o.updatedAt
        ? o.updatedAt
        : posts.at(-1)!.createdAt,
    posts,
  }
}

function sanitizeDiscuss(data: DiskDiscuss): DiskDiscuss {
  const threads = (Array.isArray(data.threads) ? data.threads : [])
    .map(cleanThread)
    .filter((t): t is DiskDiscussThread => Boolean(t))
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .slice(0, 80)
  return {
    kind: 'shape-lab-discuss',
    version: 1,
    exportedAt: typeof data.exportedAt === 'string' ? data.exportedAt : '',
    threads,
  }
}

export async function readDiscussFile(): Promise<DiskDiscuss> {
  const data = await readJson<DiskDiscuss>(FILE, { ...EMPTY })
  if (!data || data.kind !== 'shape-lab-discuss') return { ...EMPTY }
  return sanitizeDiscuss(data)
}

export async function writeDiscussFile(data: unknown): Promise<DiskDiscuss> {
  const parsed = data as DiskDiscuss
  if (!parsed || parsed.kind !== 'shape-lab-discuss') {
    throw new Error('Invalid discuss payload')
  }
  const next = { ...sanitizeDiscuss(parsed), exportedAt: new Date().toISOString() }
  await writeJson(FILE, next)
  return next
}
