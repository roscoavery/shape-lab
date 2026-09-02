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
  }
  try {
    await fetch('/api/notices', {
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
      new Notification(row.title, { body: row.body })
    } catch {
      /* ignore */
    }
  }
  return row
}

export async function markNoticesRead(ids: string[]): Promise<void> {
  if (ids.length === 0) return
  try {
    await fetch('/api/notices', {
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
