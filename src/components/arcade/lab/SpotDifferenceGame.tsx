import { useState } from 'react'
import { LabGameShell, type LabGameResult } from './LabGameShell'
import { ShapeFigure } from './ShapeFigure'
import { SPOT_DIFFERENCE_PAIRS, type SpotDifferencePair } from '../../../data/arcade/spotDifferencePack'

const ROUNDS = 5
const TOTAL = 500

/** Fisher-Yates shuffle. */
function shuffled<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

type Pick = 'A' | 'B' | 'both'

export function SpotDifferenceGame({ onExit }: { onExit: () => void }) {
  return (
    <LabGameShell
      gameId="spot-difference"
      title="Spot the Difference"
      tagline="Two figures, one difference. Which one is stronger?"
      rules={
        <>
          <p>
            You get <strong>{ROUNDS} pairs</strong> per round. Study both figures and tap the one
            that answers the prompt, or tap <strong>Both fine</strong> if neither is wrong.
          </p>
          <p className="mt-2">
            <strong>100 points</strong> for a correct first tap. Miss once and you get a hint, then
            one retry for <strong>50 points</strong>.
          </p>
        </>
      }
      whatPracticed="Reading body positions the way a coach does. Seeing what actually matters in a shape."
      onExit={onExit}
    >
      {({ finish }) => <SpotDifferencePlay onFinish={finish} />}
    </LabGameShell>
  )
}

function SpotDifferencePlay({ onFinish }: { onFinish: (r: LabGameResult) => void }) {
  const [pairs] = useState<SpotDifferencePair[]>(() => shuffled(SPOT_DIFFERENCE_PAIRS).slice(0, ROUNDS))
  const [index, setIndex] = useState(0)
  const [score, setScore] = useState(0)
  const [firstTry, setFirstTry] = useState(0)
  const [attempts, setAttempts] = useState(0)
  const [resolved, setResolved] = useState<null | 'correct' | 'revealed'>(null)

  const pair = pairs[index]
  const last = index === pairs.length - 1

  const choose = (pick: Pick) => {
    if (resolved) return
    if (pick === pair.correctSide) {
      const pts = attempts === 0 ? 100 : 50
      setScore((s) => s + pts)
      if (attempts === 0) setFirstTry((n) => n + 1)
      setResolved('correct')
    } else if (attempts === 0) {
      setAttempts(1)
    } else {
      setResolved('revealed')
    }
  }

  const next = () => {
    if (last) {
      onFinish({ score, total: TOTAL, detail: `${firstTry} of ${ROUNDS} spotted on the first look` })
    } else {
      setIndex((i) => i + 1)
      setAttempts(0)
      setResolved(null)
    }
  }

  const borderFor = (side: 'A' | 'B') => {
    if (!resolved) return 'border-white/10'
    if (pair.correctSide === 'both') return 'border-white/10'
    return side === pair.correctSide ? 'border-[var(--accent)]' : 'border-white/10 opacity-60'
  }

  return (
    <div className="mt-4 flex flex-col gap-4">
      <div className="flex items-center justify-between text-xs text-white/50">
        <span>
          Pair {index + 1} of {pairs.length}
        </span>
        <span className="font-mono font-bold tabular-nums text-[var(--text)]">{score} pts</span>
      </div>

      <p className="text-base font-bold text-[var(--text)]">{pair.prompt}</p>

      <div className="grid grid-cols-2 gap-3">
        {(['A', 'B'] as const).map((side) => (
          <button
            key={side}
            type="button"
            onClick={() => choose(side)}
            disabled={resolved !== null}
            className={`rounded-2xl border bg-black/30 p-3 transition ${borderFor(side)} ${
              resolved ? '' : 'active:scale-95'
            }`}
          >
            <ShapeFigure
              pose={side === 'A' ? pair.poseA : pair.poseB}
              className="mx-auto h-36 w-auto"
            />
            <p className="mt-2 text-center text-sm font-black text-white/70">Figure {side}</p>
          </button>
        ))}
      </div>

      {!resolved && (
        <button
          type="button"
          onClick={() => choose('both')}
          className="rounded-xl bg-white/10 px-4 py-3 text-sm font-bold text-white/80 active:scale-95"
        >
          Both fine
        </button>
      )}

      {attempts > 0 && !resolved && (
        <div className="rounded-xl border border-amber-300/30 bg-amber-300/10 p-3">
          <p className="text-xs font-bold uppercase tracking-wider text-amber-200">Hint: one more try for 50</p>
          <p className="mt-1 text-sm text-white/80">{pair.difference}</p>
        </div>
      )}

      {resolved && (
        <div
          className={`rounded-xl border p-3 ${
            resolved === 'correct'
              ? 'border-[var(--accent)]/40 bg-[var(--accent)]/10'
              : 'border-white/15 bg-black/30'
          }`}
        >
          <p className="text-sm font-black text-[var(--text)]">
            {resolved === 'correct'
              ? attempts === 0
                ? 'Nailed it. 100 points.'
                : 'Got it on the retry. 50 points.'
              : pair.correctSide === 'both'
                ? 'Both were fine. 0 points this time.'
                : `The answer was Figure ${pair.correctSide}. 0 points this time.`}
          </p>
          <p className="mt-1 text-sm text-white/70">{pair.why}</p>
          <button
            type="button"
            onClick={next}
            className="mt-3 w-full rounded-xl bg-[var(--accent)] px-4 py-3 text-sm font-black text-black"
          >
            {last ? 'See results' : 'Next pair'}
          </button>
        </div>
      )}
    </div>
  )
}
