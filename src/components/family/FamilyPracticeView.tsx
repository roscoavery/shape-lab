import type { Athlete } from '../../types'
import { ContestStopwatch } from '../today/ContestStopwatch'

type Props = {
  parent: Athlete
  kids: Athlete[]
  onBack: () => void
}

/**
 * Family practice: a parent runs hold contests for their linked siblings.
 * Each child's time is logged to their own homework when the parent taps
 * their name the moment they come out of the hold.
 */
export function FamilyPracticeView({ parent, kids, onBack }: Props) {
  const kidNames = kids.map((k) => k.firstName || k.name).join(', ')

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4 px-4 py-4">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onBack}
          className="rounded-xl border border-[var(--panel-border)] px-3 py-2 text-sm text-[var(--muted)]"
        >
          ← Back
        </button>
        <div>
          <h1 className="text-lg font-semibold text-[var(--text)]">Practice together</h1>
          <p className="text-sm text-[var(--muted)]">{kidNames}</p>
        </div>
      </div>

      <div className="rounded-2xl border border-amber-300/30 bg-amber-300/5 p-4">
        <p className="text-sm font-semibold text-amber-200">How this works</p>
        <ul className="mt-2 space-y-1.5 text-sm text-[var(--text)]">
          <li>Pick a hold below, then tap Start when everyone is in position.</li>
          <li>
            <strong>Tap each child's name the moment they come out of the hold.</strong>{' '}
            Their time stops and logs to their own homework.
          </li>
          <li>
            You run the timer, so they can focus on holding. The last one holding wins.
          </li>
        </ul>
      </div>

      <ContestStopwatch
        athletes={kids}
        signedIn={parent}
        preselectIds={kids.map((k) => k.id)}
        loggedFrom="family"
      />
    </div>
  )
}
