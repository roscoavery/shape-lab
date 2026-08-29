import { createId } from './storage'
import type { CollageShare } from './collages'

export const FEED_CAPTION_MAX = 800

export type FeedPost = {
  id: string
  authorId: string
  caption: string
  createdAt: string
  taggedIds: string[]
  mime: string
  sizeBytes: number
  url: string
  kind?: 'video' | 'collage' | 'text'
  collage?: CollageShare
}

export async function listFeedPosts(): Promise<FeedPost[]> {
  try {
    const res = await fetch('/api/feed')
    if (!res.ok) return []
    const data = (await res.json()) as { posts?: FeedPost[] }
    return Array.isArray(data.posts) ? data.posts : []
  } catch {
    return []
  }
}

export async function publishFeedPost(params: {
  authorId: string
  caption: string
  taggedIds: string[]
  blob: Blob
}): Promise<FeedPost | null> {
  const id = createId('post')
  const mime = params.blob.type.includes('mp4') ? 'video/mp4' : 'video/webm'
  const qs = new URLSearchParams({
    id,
    authorId: params.authorId,
    caption: params.caption.slice(0, FEED_CAPTION_MAX),
    taggedIds: params.taggedIds.join(','),
    mime,
    createdAt: new Date().toISOString(),
  })
  try {
    const res = await fetch(`/api/feed?${qs.toString()}`, {
      method: 'POST',
      headers: { 'Content-Type': mime },
      body: params.blob,
    })
    if (!res.ok) return null
    return (await res.json()) as FeedPost
  } catch {
    return null
  }
}

export async function publishCollagePost(params: {
  authorId: string
  caption: string
  taggedIds?: string[]
  collage: CollageShare
}): Promise<FeedPost | null> {
  const id = createId('post')
  try {
    const res = await fetch('/api/feed?kind=collage', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        kind: 'collage',
        id,
        authorId: params.authorId,
        caption: params.caption.slice(0, FEED_CAPTION_MAX),
        taggedIds: params.taggedIds ?? [],
        createdAt: new Date().toISOString(),
        collage: params.collage,
      }),
    })
    if (!res.ok) return null
    return (await res.json()) as FeedPost
  } catch {
    return null
  }
}

export async function publishTextPost(params: {
  authorId: string
  caption: string
  taggedIds: string[]
}): Promise<FeedPost | null> {
  const id = createId('post')
  try {
    const res = await fetch('/api/feed?kind=text', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        kind: 'text',
        id,
        authorId: params.authorId,
        caption: params.caption.slice(0, FEED_CAPTION_MAX),
        taggedIds: params.taggedIds,
        createdAt: new Date().toISOString(),
      }),
    })
    if (!res.ok) return null
    return (await res.json()) as FeedPost
  } catch {
    return null
  }
}

export async function removeFeedPost(id: string, actorId: string, admin: boolean): Promise<boolean> {
  try {
    const qs = new URLSearchParams({
      id,
      actorId,
      admin: admin ? '1' : '0',
    })
    const res = await fetch(`/api/feed?${qs.toString()}`, { method: 'DELETE' })
    return res.ok
  } catch {
    return false
  }
}
