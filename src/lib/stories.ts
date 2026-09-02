import { createId } from './storage'

export const STORY_LIFE_MS = 24 * 60 * 60 * 1000

export type GymStory = {
  id: string
  authorId: string
  createdAt: string
  expiresAt: string
  caption: string
  mime: string
  url: string
  live: boolean
  taggedIds?: string[]
}

export type StoryHighlight = {
  id: string
  ownerId: string
  title: string
  storyIds: string[]
  createdAt: string
  coverStoryId?: string
}

export type StoriesFile = {
  stories: GymStory[]
  highlights: StoryHighlight[]
}

let storiesCache: StoriesFile | null = null

export async function loadStories(): Promise<StoriesFile> {
  try {
    const res = await fetch('/api/stories')
    if (!res.ok) return storiesCache ?? { stories: [], highlights: [] }
    const data = (await res.json()) as StoriesFile
    const next: StoriesFile = {
      stories: Array.isArray(data.stories) ? data.stories : [],
      highlights: Array.isArray(data.highlights) ? data.highlights : [],
    }
    storiesCache = next
    return next
  } catch {
    return storiesCache ?? { stories: [], highlights: [] }
  }
}

export function liveStories(file: StoriesFile): GymStory[] {
  return file.stories.filter((s) => s.live)
}

export function storiesByAuthor(file: StoriesFile, authorId: string, liveOnly = true): GymStory[] {
  return file.stories
    .filter((s) => s.authorId === authorId && (!liveOnly || s.live))
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
}

export function highlightStories(file: StoriesFile, highlight: StoryHighlight): GymStory[] {
  const map = new Map(file.stories.map((s) => [s.id, s]))
  return highlight.storyIds.map((id) => map.get(id)).filter((s): s is GymStory => Boolean(s))
}

function storyMime(blob: Blob): string {
  const raw = (blob.type || '').toLowerCase().split(';')[0]!.trim()
  if (raw.startsWith('image/') || raw.startsWith('video/')) return raw
  return 'video/mp4'
}

export async function publishStory(opts: {
  authorId: string
  blob: Blob
  caption?: string
  taggedIds?: string[]
}): Promise<GymStory> {
  if (!opts.authorId.trim()) {
    throw new Error('Unlock a profile, then post the story again.')
  }
  if (!opts.blob.size) {
    throw new Error('That clip was empty. Try a shorter video or a photo from Photos.')
  }
  if (opts.blob.size > 18 * 1024 * 1024) {
    throw new Error('That clip is too large for a story. Keep it under about 18 MB.')
  }
  const id = createId('stry')
  const mime = storyMime(opts.blob)
  const body =
    opts.blob.type === mime ? opts.blob : new Blob([opts.blob], { type: mime })
  const qs = new URLSearchParams({
    id,
    authorId: opts.authorId,
    caption: opts.caption ?? '',
    mime,
    tagged: (opts.taggedIds ?? []).join(','),
  })
  const res = await fetch(`/api/stories?${qs.toString()}`, {
    method: 'POST',
    headers: { 'Content-Type': mime },
    body,
  })
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { error?: string }
    throw new Error(err.error || 'Could not post that story.')
  }
  return (await res.json()) as GymStory
}

export async function publishStoryFromUrl(opts: {
  authorId: string
  url: string
  caption?: string
  taggedIds?: string[]
}): Promise<GymStory> {
  const blob = await blobFromShareUrl(opts.url)
  return publishStory({
    authorId: opts.authorId,
    blob,
    caption: opts.caption,
    taggedIds: opts.taggedIds,
  })
}

async function blobFromShareUrl(raw: string): Promise<Blob> {
  const url = raw.trim()
  if (!url) throw new Error('This still needs a clip to post to a story.')
  if (url.startsWith('shape-lab:')) {
    throw new Error(
      'A collage is several clips. Open Play and Save to Photos, or share one panel’s clip to your story.',
    )
  }
  const { fetchInstagramVideo } = await import('./igCache')
  const { socialPlatform } = await import('./socialUrls')
  if (socialPlatform(url)) {
    const { blob } = await fetchInstagramVideo(url)
    if (!blob.size) throw new Error('Could not load that Instagram clip for a story.')
    return blob
  }
  const res = await fetch(url)
  if (!res.ok) throw new Error('Could not load that clip to post to a story.')
  const blob = await res.blob()
  if (!blob.size) throw new Error('That clip was empty.')
  return blob
}

export async function saveHighlight(opts: {
  ownerId: string
  title: string
  storyIds: string[]
}): Promise<StoryHighlight> {
  const res = await fetch('/api/stories?kind=highlight', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      id: createId('hl'),
      ownerId: opts.ownerId,
      title: opts.title,
      storyIds: opts.storyIds,
    }),
  })
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { error?: string }
    throw new Error(err.error || 'Could not save that highlight.')
  }
  return (await res.json()) as StoryHighlight
}

const SEEN_KEY = 'shape-lab.stories.seen.v1'

export function seenStoryIds(): Set<string> {
  try {
    const raw = localStorage.getItem(SEEN_KEY)
    const list = raw ? (JSON.parse(raw) as string[]) : []
    return new Set(Array.isArray(list) ? list : [])
  } catch {
    return new Set()
  }
}

export function markStoriesSeen(ids: string[]): void {
  const next = seenStoryIds()
  for (const id of ids) next.add(id)
  try {
    localStorage.setItem(SEEN_KEY, JSON.stringify([...next].slice(-400)))
  } catch {
    /* quota */
  }
}
