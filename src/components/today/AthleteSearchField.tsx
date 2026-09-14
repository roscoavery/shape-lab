import type { Athlete } from '../../types'
import { athleteMatchesQuery } from '../../lib/gymScope'
import { isAthleteProfile } from '../../lib/profileRole'
import { AthleteAvatar } from '../AthleteAvatar'

type Props = {
  athletes: Athlete[]
  query: string
  onQuery: (v: string) => void
  onPick: (row: Athlete) => void
  excludeIds?: string[]
  placeholder?: string
  /** Coaches posting to feed need to tag other coaches too. */
  anyRole?: boolean
  emptyText?: string
  className?: string
  limit?: number
}

/** Search-to-pick. No results until they type — never dumps the whole roster. */
export function AthleteSearchField({
  athletes,
  query,
  onQuery,
  onPick,
  excludeIds = [],
  placeholder = 'Search a name',
  anyRole = false,
  emptyText,
  className = 'h-11 w-full rounded-xl border border-white/10 bg-black/30 px-3 text-sm',
  limit = 8,
}: Props) {
  const q = query.trim()
  const hits = q
    ? athletes
        .filter(
          (a) =>
            !excludeIds.includes(a.id) &&
            (anyRole || isAthleteProfile(a)) &&
            athleteMatchesQuery(a, q),
        )
        .slice(0, limit)
    : []
  return (
    <div>
      <input
        value={query}
        onChange={(e) => onQuery(e.target.value)}
        placeholder={placeholder}
        className={className}
        autoComplete="off"
        autoCorrect="off"
        spellCheck={false}
      />
      {q && hits.length === 0 && (
        <p className="mt-1.5 text-xs text-[var(--muted)]">
          {emptyText ?? 'No names match that search.'}
        </p>
      )}
      {hits.length > 0 && (
        <ul className="mt-1 max-h-44 overflow-y-auto rounded-xl border border-white/10 bg-[#0d1218]">
          {hits.map((a) => (
            <li key={a.id}>
              <button
                type="button"
                onClick={() => onPick(a)}
                className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm hover:bg-white/8"
              >
                <AthleteAvatar athlete={a} size="xs" />
                <span className="min-w-0 flex-1 truncate font-semibold">{a.name}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
