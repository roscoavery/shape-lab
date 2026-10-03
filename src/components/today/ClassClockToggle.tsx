import { useState } from 'react'
import type { Athlete } from '../../types'
import { ClassStopwatch } from './ClassStopwatch'
import { ContestStopwatch } from './ContestStopwatch'

/**
 * Toggle between the regular class clock and the contest view.
 * Contest mode logs each athlete's own time when they come down —
 * the class clock's single time would give everyone the winner's time.
 */
export function ClassClockToggle({
  athletes,
  signedIn,
}: {
  athletes: Athlete[]
  signedIn: Athlete | null
}) {
  const [contest, setContest] = useState(false)
  return (
    <div>
      <div className="mb-2 flex gap-1 rounded-lg bg-black/30 p-1">
        <button
          type="button"
          onClick={() => setContest(false)}
          className={`flex-1 rounded-md px-3 py-1.5 text-sm font-semibold ${
            !contest ? 'bg-[var(--accent)] text-[var(--on-accent)]' : 'text-[var(--muted)]'
          }`}
        >
          Class clock
        </button>
        <button
          type="button"
          onClick={() => setContest(true)}
          className={`flex-1 rounded-md px-3 py-1.5 text-sm font-semibold ${
            contest ? 'bg-[var(--accent)] text-[var(--on-accent)]' : 'text-[var(--muted)]'
          }`}
        >
          Contest
        </button>
      </div>
      {contest ? (
        <ContestStopwatch athletes={athletes} signedIn={signedIn} />
      ) : (
        <ClassStopwatch athletes={athletes} signedIn={signedIn} coach embed />
      )}
    </div>
  )
}
