import { createId } from './storage'
import type { CollageShare } from './collages'

export const FEED_CAPTION_MAX = 800

export type FeedChannel = 'gym' | 'wins'

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
  /** Missing = gym feed (older posts). Wins can also appear on gym. */
  channels?: FeedChannel[]
  likes?: string[]
  /** Who high-fived the athlete(s) on this post. */
  hi5s?: string[]
  /** Coach posted this as the athlete's win. */
  sharedById?: string
  sharedByName?: string
}

export function postChannels(post: Pick<FeedPost, 'channels'>): FeedChannel[] {
  return post.channels?.length ? post.channels : ['gym']
}

export function postOnChannel(post: Pick<FeedPost, 'channels'>, channel: FeedChannel): boolean {
  return postChannels(post).includes(channel)
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

export type PublishResult = { post: FeedPost | null; error: string | null }

async function readFeedResponse(res: Response): Promise<PublishResult> {
  const text = await res.text()
  let data: FeedPost | { error?: string } | null = null
  try {
    data = text ? (JSON.parse(text) as FeedPost | { error?: string }) : null
  } catch {
    return { post: null, error: res.ok ? 'The gym link sent a broken reply.' : `Could not post (${res.status}).` }
  }
  if (!res.ok) {
    return { post: null, error: data && 'error' in data && data.error ? data.error : 'Could not post that.' }
  }
  if (data && 'id' in data && data.id) return { post: data as FeedPost, error: null }
  return { post: null, error: 'Could not post that.' }
}

export async function publishFeedPost(params: {
  authorId: string
  caption: string
  taggedIds: string[]
  blob: Blob
  channels?: FeedChannel[]
}): Promise<FeedPost | null> {
  const got = await publishFeedPostResult(params)
  return got.post
}

export async function publishFeedPostResult(params: {
  authorId: string
  caption: string
  taggedIds: string[]
  blob: Blob
  channels?: FeedChannel[]
  sharedById?: string
  sharedByName?: string
}): Promise<PublishResult> {
  const id = createId('post')
  const raw = params.blob.type || ''
  const mime = raw.includes('mp4') || raw.includes('quicktime') ? 'video/mp4' : 'video/webm'
  const qs = new URLSearchParams({
    id,
    authorId: params.authorId,
    caption: params.caption.slice(0, FEED_CAPTION_MAX),
    taggedIds: params.taggedIds.join(','),
    mime,
    createdAt: new Date().toISOString(),
    channels: (params.channels ?? ['gym']).join(','),
    ...(params.sharedById ? { sharedById: params.sharedById } : {}),
    ...(params.sharedByName ? { sharedByName: params.sharedByName } : {}),
  })
  try {
    const res = await fetch(`/api/feed?${qs.toString()}`, {
      method: 'POST',
      headers: { 'Content-Type': mime },
      body: params.blob,
    })
    return readFeedResponse(res)
  } catch {
    return { post: null, error: 'Could not reach the gym link. Stay on this URL and try again.' }
  }
}

export async function publishCollagePost(params: {
  authorId: string
  caption: string
  taggedIds?: string[]
  collage: CollageShare
  channels?: FeedChannel[]
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
        channels: params.channels ?? ['gym'],
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
  channels?: FeedChannel[]
  sharedById?: string
  sharedByName?: string
}): Promise<FeedPost | null> {
  const got = await publishTextPostResult(params)
  return got.post
}

export async function publishTextPostResult(params: {
  authorId: string
  caption: string
  taggedIds: string[]
  channels?: FeedChannel[]
  sharedById?: string
  sharedByName?: string
}): Promise<PublishResult> {
  const id = createId('post')
  const payload = {
    kind: 'text',
    id,
    authorId: params.authorId,
    caption: params.caption.slice(0, FEED_CAPTION_MAX),
    taggedIds: params.taggedIds,
    createdAt: new Date().toISOString(),
    channels: params.channels ?? ['gym'],
    ...(params.sharedById ? { sharedById: params.sharedById } : {}),
    ...(params.sharedByName ? { sharedByName: params.sharedByName } : {}),
  }
  try {
    const res = await fetch('/api/feed?kind=text', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    return readFeedResponse(res)
  } catch {
    return { post: null, error: 'Could not reach the gym link. Stay on this URL and try again.' }
  }
}

export async function toggleFeedHi5(postId: string, actorId: string): Promise<FeedPost | null> {
  try {
    const res = await fetch('/api/feed?kind=hi5', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ kind: 'hi5', id: postId, authorId: actorId }),
    })
    if (!res.ok) return null
    return (await res.json()) as FeedPost
  } catch {
    return null
  }
}

export async function toggleFeedLike(postId: string, actorId: string): Promise<FeedPost | null> {
  try {
    const res = await fetch('/api/feed?kind=like', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ kind: 'like', id: postId, authorId: actorId }),
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
