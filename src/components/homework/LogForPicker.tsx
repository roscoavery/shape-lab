import { useMemo, useState } from 'react'
import type { Athlete } from '../../types'
import { AthleteSearchField } from '../today/AthleteSearchField'
import { listLiveMeetings, resolveAttendeeAthletes } from '../../lib/coachClasses'

/**
 * "Who's doing this?" picker for the Train view.
 *
 * When a coach is signed in and hands the device to an athlete to try a
 * hold, the log should land on the athlete — not the coach's profile.
 * - Search any athlete.
 * - If a class is live, the present athletes show as quick chips.
 * - Guest try: the hold runs, nothing is logged.
 */
export function LogForPicker({
  athletes,
  selectedId,
  guest,
  onSelect,
  onGuest,
  onReset,
}: {
  athletes: Athlete[]
  selectedId: string | null
  guest: boolean
  onSelect: (athleteId: string) => void
  onGuest: () => void
  onReset: () => void
}) {
  const [query, setQuery] = useState('')

  const present = useMemo(() => {
    const live = listLiveMeetings()
    if (!live.length) return []
    const seen = new Set<string>()
    const out: Athlete[] = []
    for (const m of live) {
      for (const a of resolveAttendeeAthletes(m, athletes)) {
        if (!seen.has(a.id)) {
          seen.add(a.id)
          out.push(a)
        }
      }
    }
    return out
  }, [athletes])

  const pick = (a: Athlete) => {
    onSelect(a.id)
    setQuery('')
  }

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-[var(--panel-border)] bg-black/25 p-3">
      <p className="text-xs font-bold uppercase tracking-wider text-[var(--muted)]">
        Who's doing the hold?
      </p>

      {present.length > 0 && (
        <div>
          <p className="mb-1.5 text-[11px] font-semibold text-[var(--muted)]">
            Present in class now
          </p>
          <div className="flex flex-wrap gap-1.5">
            {present.map((a) => (
              <button
                key={a.id}
                type="button"
                onClick={() => pick(a)}
                className={`rounded-full px-3 py-1.5 text-xs font-bold ${
                  selectedId === a.id && !guest
                    ? 'bg-[var(--accent)] text-black'
                    : 'bg-white/10 text-white/80'
                }`}
              >
                {a.name}
              </button>
            ))}
          </div>
        </div>
      )}

      <AthleteSearchField
        athletes={athletes}
        query={query}
        onQuery={setQuery}
        onPick={pick}
        placeholder="Search all athletes…"
      />

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onGuest}
          className={`rounded-xl px-4 py-2 text-xs font-bold ${
            guest ? 'bg-amber-300 text-black' : 'bg-white/10 text-white/80'
          }`}
        >
          {guest ? '✓ Guest try — nothing will log' : 'Guest try — log nothing'}
        </button>
        {(selectedId != null || guest) && (
          <button
            type="button"
            onClick={onReset}
            className="rounded-xl bg-white/10 px-4 py-2 text-xs font-bold text-white/60"
          >
            Back to me
          </button>
        )}
      </div>
    </div>
  )
}
