import { createId } from './storage'
import { DISCUSS_TOPICS } from '../config/discussTopics'

export const DISCUSS_BODY_MAX = 1200
export const DISCUSS_REASON_MAX = 800

export type DiscussPost = {
  id: string
  authorId: string
  createdAt: string
  body: string
  reasoning: string
}

export type DiscussThread = {
  id: string
  title: string
  topicId: string
  authorId: string
  createdAt: string
  updatedAt: string
  posts: DiscussPost[]
}

export type DiscussFile = {
  kind: 'shape-lab-discuss'
  version: 1
  exportedAt: string
  threads: DiscussThread[]
}

const EMPTY: DiscussFile = {
  kind: 'shape-lab-discuss',
  version: 1,
  exportedAt: '',
  threads: [],
}

export async function loadDiscuss(): Promise<DiscussFile> {
  try {
    const res = await fetch('/api/discuss')
    if (!res.ok) return { ...EMPTY }
    const data = (await res.json()) as DiscussFile
    if (!data || data.kind !== 'shape-lab-discuss') return { ...EMPTY }
    return { ...EMPTY, threads: Array.isArray(data.threads) ? data.threads : [] }
  } catch {
    return { ...EMPTY }
  }
}

export async function saveDiscuss(file: DiscussFile): Promise<DiscussFile | null> {
  try {
    const res = await fetch('/api/discuss', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(file),
    })
    if (!res.ok) return null
    return (await res.json()) as DiscussFile
  } catch {
    return null
  }
}

export function startThread(
  file: DiscussFile,
  params: {
    authorId: string
    title: string
    topicId: string
    body: string
    reasoning: string
  },
): DiscussFile {
  const title = params.title.trim().slice(0, 120)
  const body = params.body.trim().slice(0, DISCUSS_BODY_MAX)
  const reasoning = params.reasoning.trim().slice(0, DISCUSS_REASON_MAX)
  if (!title || !body) return file
  const topicId = DISCUSS_TOPICS.some((t) => t.id === params.topicId)
    ? params.topicId
    : 'other'
  const now = new Date().toISOString()
  const post: DiscussPost = {
    id: createId('dpost'),
    authorId: params.authorId,
    createdAt: now,
    body,
    reasoning,
  }
  const thread: DiscussThread = {
    id: createId('dth'),
    title,
    topicId,
    authorId: params.authorId,
    createdAt: now,
    updatedAt: now,
    posts: [post],
  }
  return { ...file, threads: [thread, ...file.threads] }
}

export function replyToThread(
  file: DiscussFile,
  params: {
    threadId: string
    authorId: string
    body: string
    reasoning: string
  },
): DiscussFile {
  const body = params.body.trim().slice(0, DISCUSS_BODY_MAX)
  const reasoning = params.reasoning.trim().slice(0, DISCUSS_REASON_MAX)
  if (!body) return file
  const now = new Date().toISOString()
  return {
    ...file,
    threads: file.threads.map((t) => {
      if (t.id !== params.threadId) return t
      const post: DiscussPost = {
        id: createId('dpost'),
        authorId: params.authorId,
        createdAt: now,
        body,
        reasoning,
      }
      return { ...t, updatedAt: now, posts: [...t.posts, post] }
    }),
  }
}
