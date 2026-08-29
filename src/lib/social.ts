import { createId } from './storage'

export const MESSAGE_MAX = 800

export type Follow = {
  followerId: string
  followingId: string
  createdAt: string
}

export type DirectMessage = {
  id: string
  authorId: string
  createdAt: string
  text: string
  shareUrl?: string
}

export type MessageThread = {
  id: string
  participantIds: [string, string]
  updatedAt: string
  messages: DirectMessage[]
}

export type SocialFile = {
  kind: 'shape-lab-social'
  version: 1
  exportedAt: string
  follows: Follow[]
  threads: MessageThread[]
}

const EMPTY: SocialFile = {
  kind: 'shape-lab-social',
  version: 1,
  exportedAt: '',
  follows: [],
  threads: [],
}

export async function loadSocial(): Promise<SocialFile> {
  try {
    const res = await fetch('/api/social')
    if (!res.ok) return { ...EMPTY }
    const data = (await res.json()) as SocialFile
    if (!data || data.kind !== 'shape-lab-social') return { ...EMPTY }
    return {
      ...EMPTY,
      follows: Array.isArray(data.follows) ? data.follows : [],
      threads: Array.isArray(data.threads) ? data.threads : [],
    }
  } catch {
    return { ...EMPTY }
  }
}

export async function saveSocial(file: SocialFile): Promise<SocialFile | null> {
  try {
    const res = await fetch('/api/social', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(file),
    })
    if (!res.ok) return null
    return (await res.json()) as SocialFile
  } catch {
    return null
  }
}

export function isFollowing(file: SocialFile, followerId: string, followingId: string): boolean {
  return file.follows.some((f) => f.followerId === followerId && f.followingId === followingId)
}

export function followerCount(file: SocialFile, profileId: string): number {
  return file.follows.filter((f) => f.followingId === profileId).length
}

export function followingCount(file: SocialFile, profileId: string): number {
  return file.follows.filter((f) => f.followerId === profileId).length
}

export function toggleFollow(file: SocialFile, followerId: string, followingId: string): SocialFile {
  if (!followerId || !followingId || followerId === followingId) return file
  if (isFollowing(file, followerId, followingId)) {
    return {
      ...file,
      follows: file.follows.filter(
        (f) => !(f.followerId === followerId && f.followingId === followingId),
      ),
    }
  }
  return {
    ...file,
    follows: [
      {
        followerId,
        followingId,
        createdAt: new Date().toISOString(),
      },
      ...file.follows,
    ],
  }
}

export function threadWith(file: SocialFile, a: string, b: string): MessageThread | undefined {
  const pair = [a, b].sort()
  return file.threads.find(
    (t) => t.participantIds[0] === pair[0] && t.participantIds[1] === pair[1],
  )
}

export function threadsFor(file: SocialFile, profileId: string): MessageThread[] {
  return file.threads.filter((t) => t.participantIds.includes(profileId))
}

export function sendMessage(
  file: SocialFile,
  params: {
    fromId: string
    toId: string
    text: string
    shareUrl?: string
  },
): SocialFile {
  const text = params.text.trim().slice(0, MESSAGE_MAX)
  if (!text || params.fromId === params.toId) return file
  const pair = [params.fromId, params.toId].sort() as [string, string]
  const now = new Date().toISOString()
  const msg: DirectMessage = {
    id: createId('msg'),
    authorId: params.fromId,
    createdAt: now,
    text,
    ...(params.shareUrl?.trim() ? { shareUrl: params.shareUrl.trim() } : {}),
  }
  const existing = threadWith(file, params.fromId, params.toId)
  if (existing) {
    const next: MessageThread = {
      ...existing,
      updatedAt: now,
      messages: [...existing.messages, msg],
    }
    return {
      ...file,
      threads: [next, ...file.threads.filter((t) => t.id !== existing.id)],
    }
  }
  const thread: MessageThread = {
    id: createId('th'),
    participantIds: pair,
    updatedAt: now,
    messages: [msg],
  }
  return { ...file, threads: [thread, ...file.threads] }
}

export function otherParticipant(thread: MessageThread, me: string): string {
  return thread.participantIds[0] === me ? thread.participantIds[1]! : thread.participantIds[0]!
}
