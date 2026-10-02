import { useState } from 'react'
import type { Athlete } from '../../types'
import { ClassStopwatch } from './ClassStopwatch'
import { ContestStopwatch } from './ContestStopwatch'

/**
 * Today-page clock overlay with an arcade switch: the regular class clock
 * or the hold contest.
 */
export function ClockOverlay({
  athletes,
  signedIn,
  coach,
  onClose,
}: {
  athletes: Athlete[]
  signedIn: Athlete | null
  coach: boolean
  onClose: () => void
}) {
  const [view, setView] = useState<'clock' | 'contest'>('clock')

  return (
    <div className="fixed inset-0 z-[80] flex flex-col bg-[#07110e] text-[var(--text)]">
      <header className="flex items-start justify-between gap-3 px-4 py-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--accent)]">
            Class clock
          </p>
          <div className="mt-2 flex rounded-full border border-white/10 bg-black/30 p-1">
            <button
              type="button"
              onClick={() => setView('clock')}
              className={`rounded-full px-4 py-1.5 text-xs font-bold ${
                view === 'clock' ? 'bg-[var(--accent)] text-black' : 'text-white/60'
              }`}
            >
              ⏱ Clock
            </button>
            <button
              type="button"
              onClick={() => setView('contest')}
              className={`rounded-full px-4 py-1.5 text-xs font-bold ${
                view === 'contest' ? 'bg-amber-300 text-black' : 'text-white/60'
              }`}
            >
              🏆 Contest
            </button>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-xl border border-white/15 px-3 py-2 text-sm font-semibold"
        >
          Close
        </button>
      </header>
      <div className="mx-auto w-full max-w-lg flex-1 overflow-y-auto px-4 pb-8">
        {view === 'clock' ? (
          <ClassStopwatch athletes={athletes} signedIn={signedIn} coach={coach} />
        ) : (
          <ContestStopwatch athletes={athletes} signedIn={signedIn} />
        )}
      </div>
    </div>
  )
}
