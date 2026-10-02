import { useState } from 'react'
import type { LeaderboardEntry } from '../../lib/arcade'

const MEDALS = ['🥇', '🥈', '🥉']

/**
 * The kind leaderboard (Ryan's rule): top 3 get ranks, medals, and scores.
 * Everyone else shows as names only — alphabetical, no rank numbers,
 * no scores — so nobody sees themselves sitting in last place.
 */
export function KindLeaderboard({
  entries,
  scoreLabel = 'wins',
  emptyText = 'No games yet. Play the first one.',
}: {
  entries: LeaderboardEntry[]
  scoreLabel?: string
  emptyText?: string
}) {
  const [showAll, setShowAll] = useState(false)
  if (!entries.length) {
    return <p className="py-6 text-center text-sm text-white/45">{emptyText}</p>
  }
  const top = entries.slice(0, 3)
  const rest = entries.slice(3)

  return (
    <div className="flex flex-col gap-2">
      <ol className="flex flex-col gap-1.5">
        {top.map((e, i) => (
          <li
            key={e.key}
            className="flex items-center gap-3 rounded-xl bg-black/25 px-3 py-2.5"
          >
            <span className="w-8 text-center text-xl">{MEDALS[i]}</span>
            <span className="flex-1 truncate text-sm font-semibold">{e.name}</span>
            <span className="text-sm font-bold tabular-nums text-[var(--accent)]">
              {e.wins} {scoreLabel}
            </span>
          </li>
        ))}
      </ol>
      {rest.length > 0 && (
        <div className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5">
          <button
            type="button"
            onClick={() => setShowAll((s) => !s)}
            className="flex w-full items-center justify-between text-left"
          >
            <span className="text-xs font-semibold uppercase tracking-wider text-white/45">
              Also played
            </span>
            <span className="text-xs font-semibold text-[var(--accent)]">
              {showAll ? 'Hide' : `Show ${rest.length}`}
            </span>
          </button>
          {showAll && (
            <p className="mt-2 text-sm leading-7 text-white/70">
              {[...rest]
                .map((e) => e.name)
                .sort((a, b) => a.localeCompare(b))
                .join(' · ')}
            </p>
          )}
        </div>
      )}
    </div>
  )
}
