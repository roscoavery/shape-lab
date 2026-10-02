import { useState } from 'react'
import type { Athlete } from '../../types'
import { ARCADE_GAMES } from '../../lib/arcade'
import { StickItGame } from './StickItGame'
import { DistanceGame } from './DistanceGame'

/**
 * Tumbling Arcade hub — lives in the admin section.
 * New games get registered in src/lib/arcade.ts as Ryan hands over the rules.
 */
export function ArcadeHub({ athletes, onClose }: { athletes: Athlete[]; onClose: () => void }) {
  const [activeGame, setActiveGame] = useState<string | null>(null)

  if (activeGame === 'stick-it') {
    return (
      <div className="mx-auto w-full max-w-2xl px-4 py-6">
        <StickItGame athletes={athletes} onExit={() => setActiveGame(null)} />
      </div>
    )
  }

  if (activeGame === 'distance') {
    return (
      <div className="mx-auto w-full max-w-2xl px-4 py-6">
        <DistanceGame athletes={athletes} onExit={() => setActiveGame(null)} />
      </div>
    )
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4 px-4 py-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--accent)]">
            Admin
          </p>
          <h2 className="text-2xl font-black">Tumbling Arcade</h2>
          <p className="mt-1 text-sm text-white/55">
            Class games with scoring built in. Pick a game to run it.
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-full bg-white/10 px-4 py-2 text-sm font-semibold"
        >
          Close
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {ARCADE_GAMES.map((g) => (
          <button
            key={g.id}
            type="button"
            disabled={!g.playable}
            onClick={() => g.playable && setActiveGame(g.id)}
            className={`sl-card p-5 text-left ${g.playable ? '' : 'opacity-50'}`}
          >
            <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--accent)]">
              {g.playable ? 'Play now' : 'Coming soon'}
            </span>
            <span className="mt-1 block text-lg font-black tracking-tight">{g.name}</span>
            <span className="mt-1 block text-sm text-[var(--muted)]">{g.tagline}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
