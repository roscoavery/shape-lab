/**
 * Athlete progress (owner side) — aggregated table, read-only.
 * Per athlete: logs in the last 30 days, latest win, current skill goal.
 */
import { useEffect, useMemo, useState } from 'react'
import type { Athlete } from '../../types'
import { profileRole } from '../../lib/profileRole'
import { loadHomeworkLogs } from '../../lib/storage'
import { listFeedPosts, postOnChannel, winSubjectIds, type FeedPost } from '../../lib/feedPosts'

type Props = { athletes: Athlete[] }

const WINDOW_DAYS = 30

export function AthleteProgress({ athletes }: Props) {
  const [wins, setWins] = useState<FeedPost[]>([])

  useEffect(() => {
    let live = true
    void listFeedPosts()
      .then((posts) => {
        if (live) setWins(posts.filter((p) => postOnChannel(p, 'wins')))
      })
      .catch(() => {})
    return () => {
      live = false
    }
  }, [])

  const rows = useMemo(() => {
    const cutoff = Date.now() - WINDOW_DAYS * 86400000
    const allLogs = loadHomeworkLogs()
    const winsByAthlete = new Map<string, FeedPost[]>()
    for (const p of wins) {
      for (const id of winSubjectIds(p)) {
        const list = winsByAthlete.get(id) ?? []
        list.push(p)
        winsByAthlete.set(id, list)
      }
    }
    return athletes
      .filter((a) => profileRole(a) === 'athlete')
      .map((a) => {
        const logs = allLogs.filter(
          (l) => l.athleteId === a.id && Number.isFinite(Date.parse(l.date)) && Date.parse(l.date) >= cutoff,
        )
        const athleteWins = (winsByAthlete.get(a.id) ?? []).sort((x, y) =>
          (y.createdAt ?? '').localeCompare(x.createdAt ?? ''),
        )
        const latestWin = athleteWins[0]
        const goal = (a.skillGoals ?? [])
          .filter((g) => g && g.label)
          .sort((x, y) => (y.setAt ?? '').localeCompare(x.setAt ?? ''))[0]
        return { athlete: a, logCount: logs.length, latestWin, goal }
      })
      .sort((x, y) => y.logCount - x.logCount)
  }, [athletes, wins])

  return (
    <div className="space-y-2">
      <p className="text-xs text-[var(--muted)]">
        Last {WINDOW_DAYS} days · sorted by activity. Tap an athlete's profile for detail.
      </p>
      {rows.map(({ athlete, logCount, latestWin, goal }) => (
        <div
          key={athlete.id}
          className="rounded-2xl border border-[var(--panel-border)] bg-[#0d1614] p-3.5"
        >
          <div className="flex items-baseline justify-between gap-2">
            <p className="min-w-0 truncate text-sm font-bold text-[var(--text)]">{athlete.name}</p>
            <p className="shrink-0 text-xs tabular-nums text-[var(--muted)]">
              {logCount} log{logCount === 1 ? '' : 's'}
            </p>
          </div>
          <div className="mt-1 space-y-0.5 text-xs">
            {goal ? (
              <p className="text-[var(--text)]">
                <span className="font-semibold text-[var(--accent)]">Working on: </span>
                {goal.label}
              </p>
            ) : (
              <p className="text-[var(--muted)]">No skill goal set</p>
            )}
            {latestWin ? (
              <p className="truncate text-[var(--muted)]">
                <span className="font-semibold text-[var(--text)]">Latest win: </span>
                {latestWin.caption || 'Win'} · {new Date(latestWin.createdAt).toLocaleDateString()}
              </p>
            ) : (
              <p className="text-[var(--muted)]">No wins yet</p>
            )}
          </div>
        </div>
      ))}
      {rows.length === 0 && (
        <p className="rounded-2xl border border-[var(--panel-border)] bg-[#0d1614] p-4 text-sm text-[var(--muted)]">
          No athlete profiles yet.
        </p>
      )}
    </div>
  )
}
