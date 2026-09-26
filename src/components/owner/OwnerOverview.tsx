/**
 * Owner overview — gym health at a glance. Read-only aggregates:
 * athlete/coach counts, onboarding in progress, recent wins,
 * athletes quiet for 14+ days.
 */
import { useEffect, useMemo, useState } from 'react'
import type { Athlete } from '../../types'
import { profileRole } from '../../lib/profileRole'
import { loadHomeworkLogs } from '../../lib/storage'
import {
  assignmentProgress,
  loadOnboardingAssignments,
  loadOnboardingTracks,
  subscribeOwnerData,
} from '../../lib/ownerData'
import { listFeedPosts, postOnChannel, winSubjectIds, type FeedPost } from '../../lib/feedPosts'

type Props = { athletes: Athlete[] }

const INACTIVE_DAYS = 14

function daysAgo(iso: string): number {
  const t = Date.parse(iso)
  if (!Number.isFinite(t)) return Infinity
  return (Date.now() - t) / 86400000
}

export function OwnerOverview({ athletes }: Props) {
  const [tick, setTick] = useState(0)
  const [wins, setWins] = useState<FeedPost[]>([])
  useEffect(() => subscribeOwnerData(() => setTick((n) => n + 1)), [])
  useEffect(() => {
    let live = true
    void listFeedPosts()
      .then((posts) => {
        if (live) setWins(posts.filter((p) => postOnChannel(p, 'wins')).slice(0, 5))
      })
      .catch(() => {})
    return () => {
      live = false
    }
  }, [tick])

  const stats = useMemo(() => {
    void tick
    const athleteProfiles = athletes.filter((a) => profileRole(a) === 'athlete')
    const coachProfiles = athletes.filter((a) => profileRole(a) === 'coach')
    const tracks = new Map(loadOnboardingTracks().map((t) => [t.id, t]))
    const inProgress = loadOnboardingAssignments().filter((a) => {
      if (a.signedOff) return false
      const track = tracks.get(a.trackId)
      if (!track || track.items.length === 0) return false
      const { done, total } = assignmentProgress(a, track)
      return done < total
    })
    const logs = loadHomeworkLogs()
    const lastLogByAthlete = new Map<string, string>()
    for (const log of logs) {
      if (!log?.athleteId) continue
      const prev = lastLogByAthlete.get(log.athleteId)
      if (!prev || (log.date ?? '') > prev) lastLogByAthlete.set(log.athleteId, log.date ?? '')
    }
    const inactive = athleteProfiles
      .filter((a) => {
        const last = lastLogByAthlete.get(a.id)
        return !last || daysAgo(last) >= INACTIVE_DAYS
      })
      .slice(0, 10)
    return { athleteProfiles, coachProfiles, inProgress, inactive, tracks }
  }, [athletes, tick])

  const nameOf = (id: string) => athletes.find((a) => a.id === id)?.name ?? 'Coach'
  const winAthletes = (p: FeedPost) =>
    winSubjectIds(p)
      .map((id) => athletes.find((a) => a.id === id)?.name)
      .filter(Boolean)
      .slice(0, 3)
      .join(', ')

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {[
          { label: 'Athletes', value: stats.athleteProfiles.length },
          { label: 'Coaches', value: stats.coachProfiles.length },
          { label: 'Onboarding in progress', value: stats.inProgress.length },
          { label: 'Quiet 14+ days', value: stats.inactive.length },
        ].map((s) => (
          <div
            key={s.label}
            className="rounded-2xl border border-[var(--panel-border)] bg-[#0d1614] px-3 py-3 text-center"
          >
            <p className="text-2xl font-extrabold tabular-nums text-[var(--text)]">{s.value}</p>
            <p className="mt-0.5 text-[11px] font-semibold uppercase tracking-wider text-[var(--muted)]">
              {s.label}
            </p>
          </div>
        ))}
      </div>

      {stats.inProgress.length > 0 && (
        <div className="rounded-2xl border border-[var(--panel-border)] bg-[#0d1614] p-4">
          <h2 className="text-sm font-bold text-[var(--text)]">Onboarding in progress</h2>
          <ul className="mt-2 space-y-1.5">
            {stats.inProgress.slice(0, 6).map((a) => {
              const track = stats.tracks.get(a.trackId)
              const { done, total } = assignmentProgress(a, track)
              return (
                <li key={a.id} className="flex items-center justify-between gap-2 text-sm">
                  <span className="min-w-0 truncate text-[var(--text)]">
                    <span className="font-semibold">{nameOf(a.coachId)}</span>
                    <span className="text-[var(--muted)]"> · {track?.name ?? 'Track'}</span>
                  </span>
                  <span className="shrink-0 text-xs tabular-nums text-[var(--muted)]">
                    {done}/{total}
                  </span>
                </li>
              )
            })}
          </ul>
        </div>
      )}

      {wins.length > 0 && (
        <div className="rounded-2xl border border-[var(--panel-border)] bg-[#0d1614] p-4">
          <h2 className="text-sm font-bold text-[var(--text)]">Recent wins</h2>
          <ul className="mt-2 space-y-2">
            {wins.map((p) => (
              <li key={p.id} className="text-sm">
                <p className="line-clamp-2 text-[var(--text)]">{p.caption || 'Win'}</p>
                <p className="mt-0.5 text-xs text-[var(--muted)]">
                  {[winAthletes(p), new Date(p.createdAt).toLocaleDateString()].filter(Boolean).join(' · ')}
                </p>
              </li>
            ))}
          </ul>
        </div>
      )}

      {stats.inactive.length > 0 && (
        <div className="rounded-2xl border border-[var(--panel-border)] bg-[#0d1614] p-4">
          <h2 className="text-sm font-bold text-[var(--text)]">Quiet 14+ days</h2>
          <p className="mt-0.5 text-xs text-[var(--muted)]">No homework logs in the last two weeks.</p>
          <ul className="mt-2 flex flex-wrap gap-1.5">
            {stats.inactive.map((a) => (
              <li
                key={a.id}
                className="rounded-full bg-white/5 px-2.5 py-1 text-xs font-medium text-[var(--text)]"
              >
                {a.name}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
