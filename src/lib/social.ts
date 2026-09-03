import { createId } from './storage'
import type { Athlete } from '../types'

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
  shareTitle?: string
}

export type MessageThread = {
  id: string
  participantIds: string[]
  title?: string
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

export async function toggleFollowRemote(opts: {
  followerId: string
  followingId: string
}): Promise<SocialFile> {
  if (!opts.followerId || !opts.followingId || opts.followerId === opts.followingId) {
    throw new Error('Pick someone else to follow.')
  }
  const res = await fetch('/api/social', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      followerId: opts.followerId,
      followingId: opts.followingId,
    }),
  })
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { error?: string }
    throw new Error(err.error || 'Could not update that follow.')
  }
  return (await res.json()) as SocialFile
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
  return file.threads.find((t) => {
    if (t.participantIds.length !== 2) return false
    const ids = [...t.participantIds].sort()
    return ids[0] === pair[0] && ids[1] === pair[1]
  })
}

export function threadsFor(file: SocialFile, profileId: string): MessageThread[] {
  return file.threads
    .filter((t) => t.participantIds.includes(profileId))
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
}

export function isGroupThread(thread: MessageThread): boolean {
  return thread.participantIds.length > 2 || Boolean(thread.title)
}

export function createGroupThread(
  file: SocialFile,
  params: { fromId: string; memberIds: string[]; title: string },
): SocialFile {
  const members = [...new Set([params.fromId, ...params.memberIds])].filter(Boolean)
  if (members.length < 2) return file
  const now = new Date().toISOString()
  const thread: MessageThread = {
    id: createId('th'),
    participantIds: members,
    title: params.title.trim().slice(0, 60) || undefined,
    updatedAt: now,
    messages: [],
  }
  return { ...file, threads: [thread, ...file.threads] }
}

export function sendGroupMessage(
  file: SocialFile,
  params: {
    threadId: string
    fromId: string
    text: string
    shareUrl?: string
    shareTitle?: string
  },
): SocialFile {
  const thread = file.threads.find((t) => t.id === params.threadId)
  if (!thread || !thread.participantIds.includes(params.fromId)) return file
  const share = params.shareUrl?.trim()
  const text = (params.text.trim() || (share ? params.shareTitle || 'Shared a reference' : '')).slice(
    0,
    MESSAGE_MAX,
  )
  if (!text && !share) return file
  const now = new Date().toISOString()
  const msg: DirectMessage = {
    id: createId('msg'),
    authorId: params.fromId,
    createdAt: now,
    text,
    ...(share ? { shareUrl: share } : {}),
    ...(params.shareTitle?.trim() ? { shareTitle: params.shareTitle.trim().slice(0, 80) } : {}),
  }
  const next: MessageThread = {
    ...thread,
    updatedAt: now,
    messages: [...thread.messages, msg],
  }
  return {
    ...file,
    threads: [next, ...file.threads.filter((t) => t.id !== thread.id)],
  }
}

export function sendMessage(
  file: SocialFile,
  params: {
    fromId: string
    toId: string
    text: string
    shareUrl?: string
    shareTitle?: string
    from?: { role?: Athlete['role']; name?: string } | null
    to?: { role?: Athlete['role'] } | null
  },
): SocialFile {
  const share = params.shareUrl?.trim()
  const fromRole = params.from?.role
  const toRole = params.to?.role
  const coachToAthlete =
    (fromRole === 'coach' || fromRole === 'gym_owner') && toRole === 'athlete'
  if (coachToAthlete && !share) return file
  const text = (params.text.trim() || (share ? 'Shared a reference' : '')).slice(0, MESSAGE_MAX)
  if ((!text && !share) || params.fromId === params.toId) return file
  const pair = [params.fromId, params.toId].sort() as [string, string]
  const now = new Date().toISOString()
  const msg: DirectMessage = {
    id: createId('msg'),
    authorId: params.fromId,
    createdAt: now,
    text,
    ...(share ? { shareUrl: share } : {}),
    ...(params.shareTitle?.trim() || share
      ? { shareTitle: (params.shareTitle || params.text).trim().slice(0, 80) || undefined }
      : {}),
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
