import { useState } from 'react'
import type { Athlete } from '../../types'
import { ClassStopwatch } from '../today/ClassStopwatch'
import { ContestStopwatch } from '../today/ContestStopwatch'

type Props = {
  parent: Athlete
  kids: Athlete[]
  onBack: () => void
}

type Tab = 'together' | 'contest'

/**
 * Family practice: a parent runs holds for their linked siblings.
 *
 * Together: everyone does the same hold for a set time, like in class.
 * Log only for the kids who held the full time.
 *
 * Contest: tap each child's name the moment they come out. Each child's
 * own time logs to their homework. Last one holding wins.
 */
export function FamilyPracticeView({ parent, kids, onBack }: Props) {
  const [tab, setTab] = useState<Tab>('together')
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

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setTab('together')}
          className={`flex-1 rounded-xl px-4 py-2.5 text-sm font-semibold ${
            tab === 'together'
              ? 'bg-[var(--accent)] text-[var(--on-accent)]'
              : 'border border-[var(--panel-border)] text-[var(--muted)]'
          }`}
        >
          Hold together
        </button>
        <button
          type="button"
          onClick={() => setTab('contest')}
          className={`flex-1 rounded-xl px-4 py-2.5 text-sm font-semibold ${
            tab === 'contest'
              ? 'bg-amber-300 text-black'
              : 'border border-[var(--panel-border)] text-[var(--muted)]'
          }`}
        >
          🏆 Hold contest
        </button>
      </div>

      {tab === 'together' ? (
        <>
          <div className="rounded-2xl border border-[var(--panel-border)] bg-[var(--panel)] p-4">
            <p className="text-sm text-[var(--text)]">
              Everyone does the same hold for a set time, just like in class. Not every hold
              has to be a max. Holding at 70% of their best still counts.
            </p>
          </div>
          <ClassStopwatch
            athletes={kids}
            signedIn={parent}
            sessionPool={kids}
            familyMode
          />
        </>
      ) : (
        <>
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
        </>
      )}
    </div>
  )
}
