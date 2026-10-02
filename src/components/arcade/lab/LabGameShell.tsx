import { useState, type ReactNode } from 'react'
import { ARCADE_GAMES } from '../../../lib/arcade'

export type LabGameResult = {
  score: number
  total: number
  /** One-line summary, e.g. "4 of 5 cues matched". */
  detail?: string
}

type ShellCtx = {
  /** Call when the round is over. */
  finish: (r: LabGameResult) => void
}

/**
 * Shared shell for Experimental Lab games: rules screen, play area with
 * restart/exit, and a results screen with "What you practiced".
 *
 * Usage:
 *   <LabGameShell gameId="cue-quest" title="Cue Quest" tagline="..."
 *     rules={<p>…</p>} whatPracticed="…" onExit={onExit}>
 *     {({ finish }) => <MyGameplay onFinish={finish} />}
 *   </LabGameShell>
 *
 * The gameplay subtree remounts on every replay (keyed), so internal state
 * starts fresh without extra wiring.
 */
export function LabGameShell({
  gameId,
  title,
  tagline,
  rules,
  whatPracticed,
  onExit,
  children,
}: {
  gameId: string
  title: string
  tagline: string
  rules: ReactNode
  whatPracticed: string
  onExit: () => void
  children: (ctx: ShellCtx) => ReactNode
}) {
  const [phase, setPhase] = useState<'rules' | 'play' | 'done'>('rules')
  const [result, setResult] = useState<LabGameResult | null>(null)
  const [sessionKey, setSessionKey] = useState(0)

  const def = ARCADE_GAMES.find((g) => g.id === gameId)
  const draft = def?.contentStatus === 'draft'

  const finish = (r: LabGameResult) => {
    setResult(r)
    setPhase('done')
  }
  const replay = () => {
    setResult(null)
    setSessionKey((k) => k + 1)
    setPhase('play')
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wider text-[var(--accent)]">
            Experimental Lab
            {draft && (
              <span className="rounded-full bg-amber-300/15 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-amber-200">
                Draft content
              </span>
            )}
          </p>
          <h3 className="mt-1 text-lg font-semibold text-[var(--text)]">{title}</h3>
          <p className="mt-0.5 text-sm text-white/55">{tagline}</p>
        </div>
        <button
          type="button"
          onClick={onExit}
          className="shrink-0 rounded-full bg-white/10 px-4 py-2 text-sm font-semibold"
        >
          All games
        </button>
      </div>

      {phase === 'rules' && (
        <div className="mt-4 flex flex-col gap-4">
          <div className="rounded-xl bg-black/25 p-4 text-sm leading-relaxed text-white/80">
            {rules}
          </div>
          <button
            type="button"
            onClick={() => setPhase('play')}
            className="rounded-2xl bg-[var(--accent)] px-6 py-4 text-lg font-black text-black"
          >
            Start
          </button>
        </div>
      )}

      {phase === 'play' && (
        <div className="mt-4">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wider text-white/40">{title}</p>
            <button
              type="button"
              onClick={replay}
              className="rounded-lg bg-white/10 px-3 py-1.5 text-xs font-semibold text-white/70"
            >
              ↺ Restart
            </button>
          </div>
          <div key={sessionKey}>{children({ finish })}</div>
        </div>
      )}

      {phase === 'done' && result && (
        <div className="mt-4 flex flex-col gap-3">
          <div className="rounded-xl bg-black/25 p-4 text-center">
            <p className="font-mono text-4xl font-black tabular-nums text-[var(--accent)]">
              {result.score}
              <span className="text-lg text-white/40"> / {result.total}</span>
            </p>
            {result.detail && <p className="mt-1 text-sm text-white/60">{result.detail}</p>}
          </div>
          <div className="rounded-xl border border-[var(--accent)]/25 bg-[var(--accent)]/5 p-4">
            <p className="text-xs font-bold uppercase tracking-wider text-[var(--accent)]">
              What you practiced
            </p>
            <p className="mt-1 text-sm leading-relaxed text-white/80">{whatPracticed}</p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={replay}
              className="flex-1 rounded-xl bg-[var(--accent)] px-4 py-3 text-sm font-black text-black"
            >
              Play again
            </button>
            <button
              type="button"
              onClick={onExit}
              className="flex-1 rounded-xl bg-white/10 px-4 py-3 text-sm font-bold"
            >
              All games
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
