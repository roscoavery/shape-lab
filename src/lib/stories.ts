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

export async function loadStories(): Promise<StoriesFile> {
  try {
    const res = await fetch('/api/stories')
    if (!res.ok) return { stories: [], highlights: [] }
    const data = (await res.json()) as StoriesFile
    return {
      stories: Array.isArray(data.stories) ? data.stories : [],
      highlights: Array.isArray(data.highlights) ? data.highlights : [],
    }
  } catch {
    return { stories: [], highlights: [] }
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

export async function publishStory(opts: {
  authorId: string
  blob: Blob
  caption?: string
}): Promise<GymStory> {
  const id = createId('stry')
  const mime = opts.blob.type || 'video/webm'
  const qs = new URLSearchParams({
    id,
    authorId: opts.authorId,
    caption: opts.caption ?? '',
    mime,
  })
  const res = await fetch(`/api/stories?${qs.toString()}`, {
    method: 'POST',
    headers: { 'Content-Type': mime },
    body: opts.blob,
  })
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { error?: string }
    throw new Error(err.error || 'Could not post that story.')
  }
  return (await res.json()) as GymStory
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
