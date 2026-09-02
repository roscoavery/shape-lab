import { useEffect, useState } from 'react'
import type { AppSettings, Athlete } from '../types'
import type { AppTab } from '../lib/storage'
import {
  loadNotices,
  markNoticesRead,
  noticesFor,
  pushNotice,
  type GymNotice,
} from '../lib/notify'
import { daysSinceHomework, homeworkNudgeCopy } from '../lib/homeworkRecs'

type Props = {
  athlete: Athlete | null
  settings: AppSettings
  onOpen: (tab: AppTab) => void
}

const NUDGE_KEY = 'shape-lab.hw-nudge.v1'

export function NotifyBell({ athlete, settings, onOpen }: Props) {
  const [open, setOpen] = useState(false)
  const [list, setList] = useState<GymNotice[]>([])

  useEffect(() => {
    if (!athlete || !settings.notificationsEnabled) return
    void loadNotices().then((all) => setList(noticesFor(all, athlete.id)))
  }, [athlete?.id, settings.notificationsEnabled])

  useEffect(() => {
    if (!athlete || !settings.notificationsEnabled) return
    const days = daysSinceHomework(athlete.id)
    if (days === null || days < 3) return
    const key = `${athlete.id}:${new Date().toISOString().slice(0, 10)}`
    try {
      if (localStorage.getItem(NUDGE_KEY) === key) return
      localStorage.setItem(NUDGE_KEY, key)
    } catch {
      return
    }
    void pushNotice({
      toId: athlete.id,
      kind: 'nudge',
      title: 'Homework is waiting',
      body: homeworkNudgeCopy(athlete),
      href: 'homework',
    }).then((row) => setList((prev) => [row, ...prev]))
  }, [athlete?.id, settings.notificationsEnabled])

  if (!athlete || !settings.notificationsEnabled) return null
  const unread = list.filter((n) => !n.read).length

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => {
          setOpen((v) => !v)
          if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
            void Notification.requestPermission()
          }
        }}
        className="relative rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold"
      >
        Alerts
        {unread > 0 && (
          <span className="ml-1 rounded-full bg-[var(--accent)] px-1.5 text-[10px] font-bold text-[#06281f]">
            {unread}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 z-40 mt-2 w-72 overflow-hidden rounded-xl border border-[var(--panel-border)] bg-[var(--panel)] shadow-xl">
          {list.length === 0 ? (
            <p className="px-3 py-4 text-sm text-[var(--muted)]">Nothing new.</p>
          ) : (
            <ul className="max-h-72 overflow-y-auto">
              {list.slice(0, 16).map((n) => (
                <li key={n.id}>
                  <button
                    type="button"
                    onClick={() => {
                      void markNoticesRead([n.id])
                      setList((prev) => prev.map((x) => (x.id === n.id ? { ...x, read: true } : x)))
                      setOpen(false)
                      if (n.href) onOpen(n.href as AppTab)
                    }}
                    className="block w-full px-3 py-2 text-left"
                  >
                    <p className="text-sm font-semibold">{n.title}</p>
                    <p className="text-xs text-[var(--muted)]">{n.body}</p>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
