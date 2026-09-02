import { useEffect, useState } from 'react'
import type { AppSettings, Athlete } from '../types'
import type { AppTab } from '../lib/storage'
import {
  NOTICE_EVENT,
  loadNotices,
  markNoticesRead,
  noticesFor,
  pushNotice,
  type GymNotice,
} from '../lib/notify'
import { daysSinceHomework, homeworkNudgeCopy } from '../lib/homeworkRecs'
import { HOMEWORK_REACTIONS, reactToHomeworkLog, reactionOnLog } from '../lib/homeworkReactions'
import { loadHomeworkLogs } from '../lib/storage'
import { isCoachProfile } from '../lib/profileRole'

type Props = {
  athlete: Athlete | null
  settings: AppSettings
  onOpen: (tab: AppTab) => void
}

const NUDGE_KEY = 'shape-lab.hw-nudge.v1'

export function NotifyBell({ athlete, settings, onOpen }: Props) {
  const [open, setOpen] = useState(false)
  const [list, setList] = useState<GymNotice[]>([])
  const [logTick, setLogTick] = useState(0)

  useEffect(() => {
    if (!athlete) return
    let cancelled = false
    const refresh = () => {
      void loadNotices().then((all) => {
        if (!cancelled) setList(noticesFor(all, athlete.id))
      })
    }
    refresh()
    const onNotice = (e: Event) => {
      const row = (e as CustomEvent<GymNotice>).detail
      if (row && row.toId === athlete.id) {
        setList((prev) => [row, ...prev.filter((n) => n.id !== row.id)])
      } else {
        refresh()
      }
    }
    window.addEventListener(NOTICE_EVENT, onNotice)
    const id = window.setInterval(refresh, 8000)
    return () => {
      cancelled = true
      window.removeEventListener(NOTICE_EVENT, onNotice)
      window.clearInterval(id)
    }
  }, [athlete?.id])

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

  if (!athlete) return null
  const unread = list.filter((n) => !n.read).length
  const coach = isCoachProfile(athlete)

  const markRead = (id: string) => {
    void markNoticesRead([id])
    setList((prev) => prev.map((x) => (x.id === id ? { ...x, read: true } : x)))
  }

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
        <div className="absolute right-0 z-40 mt-2 w-80 overflow-hidden rounded-xl border border-[var(--panel-border)] bg-[var(--panel)] shadow-xl">
          {list.length === 0 ? (
            <p className="px-3 py-4 text-sm text-[var(--muted)]">Nothing new.</p>
          ) : (
            <ul className="max-h-80 overflow-y-auto">
              {list.slice(0, 16).map((n) => {
                const log =
                  n.homeworkLogId && n.kind === 'homework'
                    ? loadHomeworkLogs().find((row) => row.id === n.homeworkLogId)
                    : undefined
                const mine = log ? reactionOnLog(log, athlete.id) : undefined
                const canReact = Boolean(coach && n.kind === 'homework' && n.homeworkLogId)
                return (
                  <li key={n.id} className="border-b border-white/5 last:border-b-0">
                    <button
                      type="button"
                      onClick={() => {
                        markRead(n.id)
                        setOpen(false)
                        if (n.href) onOpen(n.href as AppTab)
                      }}
                      className="block w-full px-3 py-2 text-left"
                    >
                      <p className={`text-sm font-semibold ${n.read ? '' : 'text-[var(--accent)]'}`}>
                        {n.title}
                      </p>
                      <p className="text-xs text-[var(--muted)]">{n.body}</p>
                    </button>
                    {canReact && (
                      <div className="flex flex-wrap items-center gap-0.5 px-3 pb-2" data-tick={logTick}>
                        {HOMEWORK_REACTIONS.map((r) => (
                          <button
                            key={r.kind}
                            type="button"
                            title={r.label}
                            onClick={() => {
                              if (!n.homeworkLogId) return
                              reactToHomeworkLog(n.homeworkLogId, athlete, r.kind)
                              markRead(n.id)
                              setLogTick((n) => n + 1)
                            }}
                            className={`rounded-md px-1.5 py-0.5 text-sm ${
                              mine?.kind === r.kind
                                ? 'bg-[var(--accent)]/25 ring-1 ring-[var(--accent)]'
                                : 'hover:bg-white/10'
                            }`}
                          >
                            {r.emoji}
                          </button>
                        ))}
                      </div>
                    )}
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
