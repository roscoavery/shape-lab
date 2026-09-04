import { createId } from './storage'
import type { CollageShare } from './collages'
import { feedBlobPath, uploadGymMedia } from './mediaUpload'

export const FEED_CAPTION_MAX = 800

export type FeedChannel = 'gym' | 'wins' | 'passes'

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
  /** Profiles who put this on their own page. */
  reposts?: string[]
}

export function postChannels(post: Pick<FeedPost, 'channels'>): FeedChannel[] {
  return post.channels?.length ? post.channels : ['gym']
}

export function postOnChannel(post: Pick<FeedPost, 'channels'>, channel: FeedChannel): boolean {
  return postChannels(post).includes(channel)
}

export function isPassPost(post: Pick<FeedPost, 'channels'>): boolean {
  return postOnChannel(post, 'passes')
}

/** What this profile shared — authored or reposted, not merely tagged. */
export function profileSharedPosts(posts: FeedPost[], profileId: string): FeedPost[] {
  return posts.filter(
    (p) => p.authorId === profileId || (p.reposts ?? []).includes(profileId),
  )
}

export function profilePosts(posts: FeedPost[], profileId: string): FeedPost[] {
  return profileSharedPosts(posts, profileId).filter((p) => !isPassPost(p))
}

export function profilePasses(posts: FeedPost[], profileId: string): FeedPost[] {
  return profileSharedPosts(posts, profileId).filter((p) => isPassPost(p))
}

let feedCache: FeedPost[] | null = null

function rememberFeedPost(post: FeedPost | null) {
  if (!post) return
  const prev = feedCache ?? []
  feedCache = [post, ...prev.filter((row) => row.id !== post.id)]
}

function unionFeedPosts(local: FeedPost[], remote: FeedPost[]): FeedPost[] {
  const byId = new Map<string, FeedPost>()
  for (const row of [...local, ...remote]) {
    if (!row?.id) continue
    const keep = byId.get(row.id)
    if (!keep) {
      byId.set(row.id, row)
      continue
    }
    const newer = (row.createdAt || '') >= (keep.createdAt || '') ? row : keep
    const older = newer === row ? keep : row
    byId.set(row.id, {
      ...older,
      ...newer,
      channels: [...new Set([...postChannels(older), ...postChannels(newer)])],
      likes: [...new Set([...(older.likes ?? []), ...(newer.likes ?? [])])],
      hi5s: [...new Set([...(older.hi5s ?? []), ...(newer.hi5s ?? [])])],
      reposts: [...new Set([...(older.reposts ?? []), ...(newer.reposts ?? [])])],
      taggedIds: [...new Set([...(older.taggedIds ?? []), ...(newer.taggedIds ?? [])])],
    })
  }
  return [...byId.values()].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

export async function listFeedPosts(): Promise<FeedPost[]> {
  try {
    const res = await fetch('/api/feed', { cache: 'no-store', credentials: 'same-origin' })
    if (!res.ok) return feedCache ?? []
    const data = (await res.json()) as { posts?: FeedPost[] }
    const posts = Array.isArray(data.posts) ? data.posts : []
    feedCache = unionFeedPosts(feedCache ?? [], posts)
    return feedCache
  } catch {
    return feedCache ?? []
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
  if (data && 'id' in data && data.id) {
    const post = data as FeedPost
    rememberFeedPost(post)
    return { post, error: null }
  }
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
  const uploaded = await uploadGymMedia(feedBlobPath(id, mime), params.blob, mime)
  if ('url' in uploaded) {
    try {
      const res = await fetch('/api/feed?kind=video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store',
        credentials: 'same-origin',
        body: JSON.stringify({
          kind: 'video',
          id,
          authorId: params.authorId,
          caption: params.caption.slice(0, FEED_CAPTION_MAX),
          taggedIds: params.taggedIds,
          createdAt: new Date().toISOString(),
          channels: params.channels ?? ['gym'],
          mime,
          url: uploaded.url,
          sizeBytes: params.blob.size,
          ...(params.sharedById ? { sharedById: params.sharedById } : {}),
          ...(params.sharedByName ? { sharedByName: params.sharedByName } : {}),
        }),
      })
      return readFeedResponse(res)
    } catch {
      return { post: null, error: 'Could not reach the gym link. Stay on this URL and try again.' }
    }
  }
  if (uploaded.direct) {
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
  return {
    post: null,
    error:
      uploaded.error && uploaded.error !== 'direct'
        ? uploaded.error
        : 'That clip is too big to post through this link. Try a shorter video from Photos.',
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
    const post = (await res.json()) as FeedPost
    rememberFeedPost(post)
    return post
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
    const post = (await res.json()) as FeedPost
    rememberFeedPost(post)
    return post
  } catch {
    return null
  }
}

export async function toggleFeedRepost(postId: string, actorId: string): Promise<FeedPost | null> {
  try {
    const res = await fetch('/api/feed?kind=repost', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ kind: 'repost', id: postId, authorId: actorId }),
    })
    if (!res.ok) return null
    const post = (await res.json()) as FeedPost
    rememberFeedPost(post)
    return post
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
    const post = (await res.json()) as FeedPost
    rememberFeedPost(post)
    return post
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
