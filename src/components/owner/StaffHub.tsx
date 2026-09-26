/**
 * Staff hub (owner side) — post short staff updates, and see upcoming
 * birthdays for coaches/staff in the next 30 days (from profile birth dates).
 */
import { useEffect, useMemo, useState } from 'react'
import type { Athlete } from '../../types'
import { profileRole } from '../../lib/profileRole'
import {
  deleteStaffNews,
  loadStaffNews,
  postStaffNews,
  subscribeOwnerData,
  type StaffNewsPost,
} from '../../lib/ownerData'

type Props = { owner: Athlete; athletes: Athlete[] }

function nextBirthday(dateOfBirth: string): Date | null {
  const d = new Date(dateOfBirth)
  if (Number.isNaN(d.getTime())) return null
  const now = new Date()
  const next = new Date(now.getFullYear(), d.getMonth(), d.getDate())
  if (next < now) next.setFullYear(now.getFullYear() + 1)
  return next
}

export function upcomingBirthdays(athletes: Athlete[], days = 30) {
  const now = new Date()
  return athletes
    .filter((a) => profileRole(a) === 'coach' || profileRole(a) === 'gym_owner')
    .map((a) => ({ athlete: a, next: a.dateOfBirth ? nextBirthday(a.dateOfBirth) : null }))
    .filter((r): r is { athlete: Athlete; next: Date } => !!r.next)
    .map((r) => ({
      ...r,
      daysAway: Math.round((r.next.getTime() - now.getTime()) / 86400000),
    }))
    .filter((r) => r.daysAway >= 0 && r.daysAway <= days)
    .sort((a, b) => a.daysAway - b.daysAway)
}

export function StaffHub({ owner, athletes }: Props) {
  const [posts, setPosts] = useState<StaffNewsPost[]>([])
  const [draft, setDraft] = useState('')

  useEffect(() => {
    const refresh = () => setPosts(loadStaffNews())
    refresh()
    return subscribeOwnerData(refresh)
  }, [])

  const birthdays = useMemo(() => upcomingBirthdays(athletes), [athletes])

  const publish = () => {
    if (postStaffNews(draft, owner.id, owner.name)) setDraft('')
  }

  return (
    <div className="space-y-3">
      <div className="rounded-2xl border border-[var(--panel-border)] bg-[#0d1614] p-4">
        <h2 className="text-sm font-bold text-[var(--text)]">Upcoming birthdays</h2>
        {birthdays.length === 0 ? (
          <p className="mt-1 text-xs text-[var(--muted)]">
            No coach or staff birthdays in the next 30 days. Birth dates come from profiles.
          </p>
        ) : (
          <ul className="mt-2 space-y-1.5">
            {birthdays.map(({ athlete, next, daysAway }) => (
              <li key={athlete.id} className="flex items-baseline justify-between gap-2 text-sm">
                <span className="font-semibold text-[var(--text)]">{athlete.name}</span>
                <span className="shrink-0 text-xs text-[var(--muted)]">
                  {next.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                  {daysAway === 0 ? ' · today!' : ` · in ${daysAway}d`}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="rounded-2xl border border-[var(--panel-border)] bg-[#0d1614] p-4">
        <h2 className="text-sm font-bold text-[var(--text)]">Staff news</h2>
        <p className="mt-0.5 text-xs text-[var(--muted)]">Short updates all coaches see on their Today view.</p>
        <div className="mt-2.5 flex gap-1.5">
          <input
            className="min-w-0 flex-1 rounded-lg border border-[var(--panel-border)] bg-[#0d1218] px-3 py-2 text-sm text-[var(--text)]"
            placeholder="Post a staff update…"
            value={draft}
            maxLength={500}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') publish()
            }}
          />
          <button
            type="button"
            disabled={!draft.trim()}
            className="shrink-0 rounded-xl bg-[var(--accent)] px-4 py-2 text-sm font-bold text-[var(--on-accent)] disabled:opacity-40"
            onClick={publish}
          >
            Post
          </button>
        </div>
        <ul className="mt-3 space-y-2.5">
          {posts.map((p) => (
            <li key={p.id} className="rounded-xl bg-white/[0.03] p-2.5">
              <p className="text-sm text-[var(--text)]">{p.body}</p>
              <div className="mt-1 flex items-center justify-between gap-2">
                <p className="text-xs text-[var(--muted)]">
                  {p.authorName} · {new Date(p.createdAt).toLocaleDateString()}
                </p>
                <button
                  type="button"
                  className="rounded-lg px-1.5 py-0.5 text-xs text-[var(--muted)] hover:text-red-400"
                  onClick={() => deleteStaffNews(p.id)}
                >
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
        {posts.length === 0 && (
          <p className="mt-2 text-xs text-[var(--muted)]">Nothing posted yet.</p>
        )}
      </div>
    </div>
  )
}
