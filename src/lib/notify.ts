import { markedFetch } from './authSession'
import { createId } from './storage'

export type NotifyKind =
  | 'homework'
  | 'like'
  | 'win'
  | 'follow'
  | 'hi5'
  | 'fist'
  | 'prove'
  | 'nudge'
  | 'share'
  | 'flex'
  | 'heart'
  | 'lesson'

export const NOTICE_EVENT = 'shape-lab:notice'

export type GymNotice = {
  id: string
  toId: string
  kind: NotifyKind
  title: string
  body: string
  createdAt: string
  read: boolean
  href?: string
  /** Homework log a coach can high-five / fist bump from Alerts. */
  homeworkLogId?: string
  fromId?: string
  athleteId?: string
  /**
   * Standing-slot marker: the ONE live alert of its kind for this
   * athlete, updated in place instead of stacking. 'recharge' is the
   * homework recharge alert.
   */
  slot?: string
}

type NotifyFile = {
  kind: 'shape-lab-notices'
  version: 1
  notices: GymNotice[]
}

const EMPTY: NotifyFile = { kind: 'shape-lab-notices', version: 1, notices: [] }

export async function loadNotices(): Promise<GymNotice[]> {
  try {
    const res = await fetch('/api/notices')
    if (!res.ok) return []
    const data = (await res.json()) as NotifyFile
    return Array.isArray(data.notices) ? data.notices : []
  } catch {
    return []
  }
}

export async function pushNotice(notice: Omit<GymNotice, 'id' | 'createdAt' | 'read'> & Partial<GymNotice>) {
  const row: GymNotice = {
    id: notice.id || createId('ntc'),
    createdAt: notice.createdAt || new Date().toISOString(),
    read: notice.read ?? false,
    toId: notice.toId,
    kind: notice.kind,
    title: notice.title,
    body: notice.body,
    href: notice.href,
    homeworkLogId: notice.homeworkLogId,
    fromId: notice.fromId,
    athleteId: notice.athleteId,
    slot: notice.slot,
  }
  try {
    await markedFetch('/api/notices', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(row),
    })
  } catch {
    /* keep the UI going */
  }
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(NOTICE_EVENT, { detail: row }))
  }
  if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
    try {
      // Tagged with the notice id, so an updated standing alert replaces
      // the one already in the notification center instead of stacking.
      new Notification(row.title, { body: row.body, tag: row.id })
    } catch {
      /* ignore */
    }
  }
  return row
}

/** Remove one notice (used when a standing alert no longer applies). */
export async function removeNotice(id: string): Promise<void> {
  try {
    await markedFetch(`/api/notices?id=${encodeURIComponent(id)}`, { method: 'DELETE' })
  } catch {
    /* ignore */
  }
}

export async function markNoticesRead(ids: string[]): Promise<void> {
  if (ids.length === 0) return
  try {
    await markedFetch('/api/notices', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids }),
    })
  } catch {
    /* ignore */
  }
}

export function noticesFor(list: GymNotice[], athleteId: string): GymNotice[] {
  return list
    .filter((n) => n.toId === athleteId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

export { EMPTY as EMPTY_NOTICES }
