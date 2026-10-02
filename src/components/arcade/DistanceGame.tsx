import { useMemo, useState } from 'react'
import type { Athlete } from '../../types'
import { AthleteSearchField } from '../today/AthleteSearchField'
import {
  DISTANCE_EVENTS,
  DISTANCE_MODES,
  distanceBestIn,
  distanceLeaderboard,
  formatInches,
  getBodyLengthIn,
  recordDistanceBest,
  saveArcadeRecord,
  scoreDistance,
  setBodyLengthIn,
  type DistanceEventId,
  type DistanceMode,
  type DistancePlayer,
  type DistanceScore,
} from '../../lib/arcade'
import { KindLeaderboard } from './KindLeaderboard'

type Phase = 'setup' | 'play' | 'done'

const ATTEMPTS = 3

function AttemptInput({
  feet,
  inches,
  onChange,
  label,
}: {
  feet: string
  inches: string
  onChange: (feet: string, inches: string) => void
  label: string
}) {
  return (
    <label className="flex items-center gap-2">
      <span className="w-16 shrink-0 text-xs font-semibold uppercase tracking-wider text-white/40">
        {label}
      </span>
      <input
        type="number"
        inputMode="numeric"
        min={0}
        value={feet}
        onChange={(e) => onChange(e.target.value, inches)}
        placeholder="ft"
        className="w-16 rounded-lg border border-white/10 bg-black/30 px-2 py-1.5 text-center text-sm"
      />
      <input
        type="number"
        inputMode="decimal"
        min={0}
        max={11.99}
        step="0.5"
        value={inches}
        onChange={(e) => onChange(feet, e.target.value)}
        placeholder="in"
        className="w-20 rounded-lg border border-white/10 bg-black/30 px-2 py-1.5 text-center text-sm"
      />
    </label>
  )
}

export function DistanceGame({ athletes, onExit }: { athletes: Athlete[]; onExit: () => void }) {
  const [phase, setPhase] = useState<Phase>('setup')
  const [eventId, setEventId] = useState<DistanceEventId>('standing-flat-back')
  const [mode, setMode] = useState<DistanceMode>('beat-best')
  const [players, setPlayers] = useState<DistancePlayer[]>([])
  const [query, setQuery] = useState('')
  const [guestName, setGuestName] = useState('')
  const [attemptDrafts, setAttemptDrafts] = useState<Record<string, { ft: string; inch: string }[]>>({})
  const [results, setResults] = useState<DistanceScore[]>([])
  const [board, setBoard] = useState<ReturnType<typeof distanceLeaderboard>>([])

  const event = DISTANCE_EVENTS.find((e) => e.id === eventId) ?? DISTANCE_EVENTS[0]

  const addAthlete = (a: Athlete) => {
    if (players.some((p) => p.id === a.id)) return
    setPlayers((ps) => [
      ...ps,
      { id: a.id, name: a.name, athleteId: a.id, bodyLengthIn: getBodyLengthIn(a.id), attemptsIn: [] },
    ])
    setQuery('')
  }

  const addGuest = () => {
    const name = guestName.trim()
    if (!name) return
    const id = `guest:${name.toLowerCase()}`
    if (players.some((p) => p.id === id)) return
    setPlayers((ps) => [
      ...ps,
      { id, name, bodyLengthIn: getBodyLengthIn(id), attemptsIn: [] },
    ])
    setGuestName('')
  }

  const removePlayer = (id: string) => setPlayers((ps) => ps.filter((p) => p.id !== id))

  const setPlayerBodyLength = (id: string, inches: number | null) => {
    setPlayers((ps) => ps.map((p) => (p.id === id ? { ...p, bodyLengthIn: inches } : p)))
    if (inches != null && inches > 0) setBodyLengthIn(id, inches)
  }

  const missingBody = useMemo(
    () => mode === 'body-lengths' && players.some((p) => p.bodyLengthIn == null || p.bodyLengthIn <= 0),
    [mode, players],
  )

  const canStart = players.length >= 2 && !missingBody

  const startGame = () => {
    if (!canStart) return
    const drafts: Record<string, { ft: string; inch: string }[]> = {}
    for (const p of players) {
      drafts[p.id] = Array.from({ length: ATTEMPTS }, () => ({ ft: '', inch: '' }))
    }
    setAttemptDrafts(drafts)
    setPhase('play')
  }

  const setDraft = (playerId: string, idx: number, ft: string, inch: string) => {
    setAttemptDrafts((d) => ({
      ...d,
      [playerId]: (d[playerId] ?? []).map((a, i) => (i === idx ? { ft, inch } : a)),
    }))
  }

  const finishGame = () => {
    const scored: DistancePlayer[] = players.map((p) => {
      const attemptsIn = (attemptDrafts[p.id] ?? [])
        .map((a) => {
          const ft = parseFloat(a.ft)
          const inch = parseFloat(a.inch)
          const total = (Number.isFinite(ft) ? ft : 0) * 12 + (Number.isFinite(inch) ? inch : 0)
          return total
        })
        .filter((v) => v > 0)
      return { ...p, attemptsIn }
    })
    const withJumps = scored.filter((p) => p.attemptsIn.length > 0)
    if (!withJumps.length) return
    const ranked = scoreDistance(eventId, mode, withJumps)
    // Personal bests update after scoring, so beat-best compares against the old best.
    for (const p of withJumps) {
      const best = distanceBestIn(p)
      if (best != null) recordDistanceBest(eventId, p.id, best)
    }
    const contenders = ranked.filter((r) => !r.isBaseline)
    const winner = (contenders.length ? contenders : ranked)[0] ?? null
    const winnerPlayer = winner ? withJumps.find((p) => p.id === winner.playerId) ?? null : null
    if (winnerPlayer && contenders.length) {
      saveArcadeRecord({
        gameId: 'distance',
        skillLabel: `${event.label} · ${DISTANCE_MODES.find((m) => m.id === mode)?.label}`,
        playerNames: withJumps.map((p) => p.name),
        winnerName: winnerPlayer.name,
        winnerAthleteId: winnerPlayer.athleteId,
      })
    }
    setPlayers(withJumps)
    setResults(ranked)
    setBoard(distanceLeaderboard())
    setPhase('done')
  }

  const playAgain = () => {
    setPhase('setup')
    setResults([])
    setPlayers((ps) => ps.map((p) => ({ ...p, attemptsIn: [] })))
  }

  const winner = results.filter((r) => !r.isBaseline)[0] ?? null
  const winnerName = winner ? players.find((p) => p.id === winner.playerId)?.name ?? null : null

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--accent)]">
            Tumbling arcade
          </p>
          <h2 className="text-xl font-black">Distance Challenge</h2>
        </div>
        <button
          type="button"
          onClick={onExit}
          className="rounded-full bg-white/10 px-4 py-2 text-sm font-semibold"
        >
          All games
        </button>
      </div>

      {phase === 'setup' && (
        <>
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-white/50">The event</p>
            <div className="grid gap-2 sm:grid-cols-2">
              {DISTANCE_EVENTS.map((e) => (
                <button
                  key={e.id}
                  type="button"
                  onClick={() => setEventId(e.id)}
                  className={`rounded-xl border p-3 text-left ${
                    e.id === eventId
                      ? 'border-[var(--accent)] bg-[var(--accent)]/15'
                      : 'border-white/10 bg-black/25'
                  }`}
                >
                  <span className="block text-sm font-bold">{e.label}</span>
                  <span className="mt-0.5 block text-xs text-white/50">{e.hint}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-white/50">
              How the winner is decided
            </p>
            <div className="flex flex-col gap-2">
              {DISTANCE_MODES.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setMode(m.id)}
                  className={`rounded-xl border p-3 text-left ${
                    m.id === mode
                      ? 'border-[var(--accent)] bg-[var(--accent)]/15'
                      : 'border-white/10 bg-black/25'
                  }`}
                >
                  <span className="block text-sm font-bold">{m.label}</span>
                  <span className="mt-0.5 block text-xs text-white/50">{m.blurb}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-white/50">
              Who's jumping ({players.length})
            </p>
            <AthleteSearchField
              athletes={athletes}
              query={query}
              onQuery={setQuery}
              onPick={addAthlete}
              excludeIds={players.map((p) => p.id)}
              placeholder="Type an athlete's name…"
            />
            <div className="mt-2 flex gap-2">
              <input
                value={guestName}
                onChange={(e) => setGuestName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addGuest()}
                placeholder="Guest name (no profile needed)"
                className="min-w-0 flex-1 rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm"
              />
              <button
                type="button"
                onClick={addGuest}
                className="rounded-xl bg-white/10 px-4 py-2 text-sm font-bold"
              >
                Add guest
              </button>
            </div>
            {players.length > 0 && (
              <ul className="mt-3 flex flex-col gap-1.5">
                {players.map((p) => (
                  <li
                    key={p.id}
                    className="flex items-center gap-2 rounded-xl bg-black/25 px-3 py-2"
                  >
                    <span className="flex-1 truncate text-sm font-medium">{p.name}</span>
                    <label className="flex items-center gap-1 text-xs text-white/50">
                      Body
                      <input
                        type="number"
                        inputMode="decimal"
                        min={0}
                        value={p.bodyLengthIn ?? ''}
                        onChange={(e) => {
                          const v = parseFloat(e.target.value)
                          setPlayerBodyLength(p.id, Number.isFinite(v) && v > 0 ? v : null)
                        }}
                        placeholder="in"
                        className="w-16 rounded-lg border border-white/10 bg-black/30 px-2 py-1 text-center text-sm text-white"
                      />
                      in
                    </label>
                    <button
                      type="button"
                      onClick={() => removePlayer(p.id)}
                      className="text-sm font-bold text-white/40"
                      aria-label={`Remove ${p.name}`}
                    >
                      ✕
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <p className="mt-2 text-xs text-white/40">
              Body length: measure lying down, head to toe. Saved for next time.
            </p>
          </div>

          {missingBody && (
            <p className="text-sm text-amber-300">
              Body-lengths mode needs every jumper's body length above.
            </p>
          )}
          <button
            type="button"
            onClick={startGame}
            disabled={!canStart}
            className="rounded-xl bg-[var(--accent)] px-4 py-3 text-sm font-black text-black disabled:opacity-40"
          >
            Start — {players.length} jumper{players.length === 1 ? '' : 's'}
          </button>
        </>
      )}

      {phase === 'play' && (
        <>
          <p className="text-sm text-white/60">
            {event.label} · {ATTEMPTS} attempts each, best counts. Measure from the takeoff line to
            the farthest point of the landing.
          </p>
          <div className="flex flex-col gap-3">
            {players.map((p) => (
              <div key={p.id} className="rounded-xl bg-black/25 p-3">
                <p className="mb-2 text-sm font-bold">{p.name}</p>
                <div className="flex flex-col gap-2">
                  {(attemptDrafts[p.id] ?? []).map((a, i) => (
                    <AttemptInput
                      key={i}
                      label={`Jump ${i + 1}`}
                      feet={a.ft}
                      inches={a.inch}
                      onChange={(ft, inch) => setDraft(p.id, i, ft, inch)}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setPhase('setup')}
              className="rounded-xl bg-white/10 px-4 py-3 text-sm font-bold"
            >
              Back
            </button>
            <button
              type="button"
              onClick={finishGame}
              className="flex-1 rounded-xl bg-[var(--accent)] px-4 py-3 text-sm font-black text-black"
            >
              Finish + score it
            </button>
          </div>
        </>
      )}

      {phase === 'done' && (
        <>
          <div className="rounded-xl bg-[var(--accent)]/15 p-4 text-center">
            {winner && winnerName ? (
              <>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--accent)]">
                  Winner
                </p>
                <p className="mt-1 text-2xl font-black">{winnerName}</p>
                <p className="mt-1 text-sm text-white/60">{winner.display}</p>
              </>
            ) : (
              <>
                <p className="text-lg font-black">Baselines set</p>
                <p className="mt-1 text-sm text-white/60">
                  Everyone's first jumps are saved. Run it again and Beat-your-best crowns a winner.
                </p>
              </>
            )}
          </div>

          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-white/50">Results</p>
            <ul className="flex flex-col gap-1.5">
              {results.map((r, i) => {
                const p = players.find((x) => x.id === r.playerId)
                if (!p) return null
                const best = distanceBestIn(p)
                return (
                  <li
                    key={r.playerId}
                    className="flex items-center gap-3 rounded-xl bg-black/25 px-3 py-2"
                  >
                    <span className="w-6 text-center text-sm font-black text-white/50">{i + 1}</span>
                    <span className="flex-1 truncate text-sm font-medium">{p.name}</span>
                    <span className="text-xs text-white/50">
                      {best != null ? formatInches(best) : '—'}
                    </span>
                    <span className="text-sm font-bold text-[var(--accent)]">{r.display}</span>
                  </li>
                )
              })}
            </ul>
          </div>

          <KindLeaderboard
            entries={board}
            emptyText="No distance wins yet. Play the first one."
          />

          <div className="flex gap-2">
            <button
              type="button"
              onClick={playAgain}
              className="flex-1 rounded-xl bg-[var(--accent)] px-4 py-3 text-sm font-black text-black"
            >
              Run it back
            </button>
            <button
              type="button"
              onClick={onExit}
              className="rounded-xl bg-white/10 px-4 py-3 text-sm font-bold"
            >
              All games
            </button>
          </div>
        </>
      )}
    </div>
  )
}
