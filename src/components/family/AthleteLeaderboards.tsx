import { useMemo, useState } from 'react'
import type { Athlete } from '../../types'
import {
  LEADERBOARDS,
  boardEntries,
  formatBoardValue,
  getBoardName,
  setBoardName,
  type BoardId,
} from '../../lib/leaderboards'

/**
 * Leaderboards: freestanding handstand, wall handstand, push-ups, v-ups.
 * Custom gamer-tag display names — never profile names. Values come from
 * gym-wide homework logs.
 */

const GOLD_GLOW = '0 0 12px rgba(251,191,36,0.55), 0 0 32px rgba(251,191,36,0.25)'
const GREEN_GLOW = '0 0 12px rgba(74,222,128,0.55), 0 0 32px rgba(74,222,128,0.25)'

const MEDALS = ['🥇', '🥈', '🥉']

export function AthleteLeaderboards({ athlete }: { athlete: Athlete }) {
  const [boardId, setBoardId] = useState<BoardId>('handstand')
  const [nameDraft, setNameDraft] = useState(() => getBoardName(athlete.id, ''))
  const [tick, setTick] = useState(0)
  const board = LEADERBOARDS.find((b) => b.id === boardId)!
  const entries = useMemo(() => {
    void tick
    return boardEntries(board, athlete.id)
  }, [board, athlete.id, tick])
  const myRank = entries.findIndex((e) => e.isYou)

  const saveName = () => {
    setBoardName(athlete.id, nameDraft)
    setTick((n) => n + 1)
  }

  return (
    <section
      className="rounded-2xl border bg-[#100d18] p-5"
      style={{ borderColor: 'rgba(180,140,232,0.4)', boxShadow: '0 0 24px rgba(180,140,232,0.10)' }}
    >
      <p
        className="text-[10px] font-black uppercase tracking-widest text-purple-300"
        style={{ textShadow: '0 0 12px rgba(180,140,232,0.6)' }}
      >
        Leaderboards
      </p>
      <h2 className="mt-1 text-xl font-black text-[var(--text)]">Gym bests</h2>

      {/* Board picker */}
      <div className="mt-3 grid grid-cols-2 gap-2">
        {LEADERBOARDS.map((b) => (
          <button
            key={b.id}
            type="button"
            onClick={() => setBoardId(b.id)}
            className={`rounded-xl border px-3 py-2.5 text-left text-sm font-black ${
              b.id === boardId
                ? 'border-purple-300/60 bg-purple-300/10 text-purple-200'
                : 'border-[var(--panel-border)] text-[var(--muted)]'
            }`}
            style={b.id === boardId ? { boxShadow: '0 0 14px rgba(180,140,232,0.25)' } : undefined}
          >
            {b.name}
          </button>
        ))}
      </div>

      {/* Entries */}
      <ol className="mt-3 space-y-1.5">
        {entries.map((e, i) => (
          <li
            key={e.athleteId}
            className={`flex items-baseline justify-between gap-2 rounded-xl px-3 py-2.5 ${
              e.isYou ? 'border border-green-300/40 bg-green-300/5' : 'bg-black/30'
            }`}
            style={i === 0 ? { boxShadow: GOLD_GLOW } : e.isYou ? { boxShadow: GREEN_GLOW } : undefined}
          >
            <span className="flex min-w-0 items-baseline gap-2">
              <span className="w-7 shrink-0 text-center text-base">{MEDALS[i] ?? <span className="text-xs font-bold text-[var(--muted)]">{i + 1}</span>}</span>
              <span className={`truncate font-bold ${e.isYou ? 'text-green-200' : 'text-[var(--text)]'}`}>
                {e.displayName}
                {e.isYou && <span className="ml-1.5 text-[10px] font-black uppercase tracking-wide text-green-300/80">you</span>}
              </span>
            </span>
            <span
              className={`shrink-0 tabular-nums font-black ${i === 0 ? 'text-amber-200' : ''}`}
              style={i === 0 ? { textShadow: GOLD_GLOW } : undefined}
            >
              {formatBoardValue(e.value, board.unit)}
            </span>
          </li>
        ))}
        {entries.length === 0 && (
          <li className="rounded-xl bg-black/30 px-3 py-4 text-center text-sm text-[var(--muted)]">
            No entries yet — be the first on the board.
          </li>
        )}
      </ol>
      {myRank >= 0 && (
        <p className="mt-2 text-center text-xs font-bold text-[var(--muted)]">
          You're #{myRank + 1} on this board.
        </p>
      )}

      {/* Display name */}
      <div className="mt-4 rounded-xl border border-[var(--panel-border)] bg-black/30 p-3">
        <p className="text-xs font-bold text-[var(--text)]">Your board name</p>
        <p className="mt-0.5 text-[11px] text-[var(--muted)]">
          Pick a gamer tag — it shows instead of your name.
        </p>
        <div className="mt-2 flex gap-2">
          <input
            value={nameDraft}
            onChange={(e) => setNameDraft(e.target.value)}
            maxLength={24}
            placeholder="e.g. TuckQueen"
            className="min-w-0 flex-1 rounded-xl border border-[var(--panel-border)] bg-[#0d1218] px-3 py-2 text-sm text-[var(--text)]"
          />
          <button
            type="button"
            onClick={saveName}
            className="shrink-0 rounded-xl bg-purple-300 px-4 py-2 text-sm font-black text-black"
          >
            Save
          </button>
        </div>
      </div>
    </section>
  )
}
