import { useEffect, useMemo, useState } from 'react'
import { LabGameShell, type LabGameResult } from './LabGameShell'
import { SEQUENCE_MEMORY_POOLS, type SequenceMemoryPool } from '../../../data/arcade/sequenceMemoryPack'

const ROUNDS = 5
const MEMORIZE_SECONDS = 3

type Phase = 'pick' | 'memorize' | 'recall' | 'reveal'

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export function SequenceMemoryGame({ onExit }: { onExit: () => void }) {
  return (
    <LabGameShell
      gameId="sequence-memory"
      title="Sequence Memory"
      tagline="Memorize the shape flow, then rebuild it from memory."
      rules={
        <>
          <p>Watch the shape sequence, then rebuild it in order from the shuffled cards.</p>
          <p>
            Start at 2 shapes, +1 each fully-correct round, up to 6. 100 points per correct
            position. A miss shows you the right answer. Retry the round, no elimination.
          </p>
        </>
      }
      whatPracticed="Holding a sequence of shapes in working memory. The mental side of choreography and pass planning."
      onExit={onExit}
    >
      {({ finish }) => <SequenceMemoryPlay onFinish={finish} />}
    </LabGameShell>
  )
}

function SequenceMemoryPlay({ onFinish }: { onFinish: (r: LabGameResult) => void }) {
  const [pool, setPool] = useState<SequenceMemoryPool | null>(null)
  const [phase, setPhase] = useState<Phase>('pick')
  const [round, setRound] = useState(1)
  const [score, setScore] = useState(0)
  const [errors, setErrors] = useState(0)
  const [countdown, setCountdown] = useState(MEMORIZE_SECONDS)
  const [guess, setGuess] = useState<string[]>([])
  const [wrongAt, setWrongAt] = useState<number[]>([])

  const length = round + 1
  const sequence = useMemo(
    () => (pool ? pool.shapes.slice(0, length) : []),
    [pool, length]
  )
  const bank = useMemo(() => (pool ? shuffle(pool.shapes) : []), [pool, round])

  const beginRound = (p: SequenceMemoryPool, r: number) => {
    setPool(p)
    setRound(r)
    setGuess([])
    setWrongAt([])
    setCountdown(MEMORIZE_SECONDS)
    setPhase('memorize')
  }

  useEffect(() => {
    if (phase !== 'memorize') return
    if (countdown <= 0) {
      setPhase('recall')
      return
    }
    const t = window.setTimeout(() => setCountdown((c) => c - 1), 1000)
    return () => window.clearTimeout(t)
  }, [phase, countdown])

  const place = (shape: string) => {
    if (phase !== 'recall' || guess.length >= length) return
    setGuess((g) => [...g, shape])
  }

  const unplace = (index: number) => {
    if (phase !== 'recall') return
    setGuess((g) => g.filter((_, i) => i !== index))
  }

  useEffect(() => {
    if (phase !== 'recall' || guess.length < length) return
    const bad = sequence.map((s, i) => (guess[i] === s ? -1 : i)).filter((i) => i >= 0)
    if (bad.length === 0) {
      const earned = length * 100
      const nextScore = score + earned
      if (round >= ROUNDS) {
        onFinish({
          score: nextScore,
          total: 2000,
          detail: `${nextScore} of 2000 · ${errors} ${errors === 1 ? 'miss' : 'misses'}`,
        })
      } else {
        setScore(nextScore)
        if (pool) beginRound(pool, round + 1)
      }
    } else {
      setErrors((e) => e + 1)
      setWrongAt(bad)
      setPhase('reveal')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [guess, phase])

  const retry = () => {
    if (!pool) return
    beginRound(pool, round)
  }

  const available = (shape: string) =>
    bank.filter((s) => s === shape).length > guess.filter((s) => s === shape).length

  if (phase === 'pick') {
    return (
      <div className="flex flex-col gap-2">
        <p className="text-sm text-white/60">Pick a flow to memorize:</p>
        {SEQUENCE_MEMORY_POOLS.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => beginRound(p, 1)}
            className="rounded-xl border border-white/10 bg-black/25 px-4 py-3 text-left font-semibold"
          >
            {p.name}
            <span className="block text-xs font-normal text-white/50">
              {p.shapes.slice(0, 3).join(' → ')} …
            </span>
          </button>
        ))}
        <button
          type="button"
          onClick={() =>
            beginRound(
              SEQUENCE_MEMORY_POOLS[Math.floor(Math.random() * SEQUENCE_MEMORY_POOLS.length)],
              1
            )
          }
          className="mt-1 rounded-xl bg-[var(--accent)] px-4 py-3 font-black text-black"
        >
          Random flow
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-white/50">
        <span>
          Round {round} of {ROUNDS} · length {length}
        </span>
        <span className="font-mono tabular-nums normal-case tracking-normal text-white/70">
          {score} pts
        </span>
      </div>

      {phase === 'memorize' && (
        <div className="flex flex-col gap-3">
          <p className="text-center text-sm font-bold text-[var(--accent)]">
            Memorize… {countdown}
          </p>
          <ol className="flex flex-col gap-2">
            {sequence.map((s, i) => (
              <li
                key={i}
                className="rounded-xl border border-white/10 bg-black/25 px-4 py-3 font-semibold"
              >
                <span className="mr-2 font-mono text-white/40">{i + 1}.</span>
                {s}
              </li>
            ))}
          </ol>
        </div>
      )}

      {phase === 'recall' && (
        <div className="flex flex-col gap-3">
          <p className="text-sm text-white/60">Tap cards to rebuild the order. Tap a slot to remove.</p>
          <div className="grid grid-cols-1 gap-1.5">
            {Array.from({ length }).map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => unplace(i)}
                className={`rounded-xl border px-4 py-2.5 text-left font-semibold ${
                  guess[i]
                    ? 'border-[var(--accent)]/60 bg-[var(--accent)]/10'
                    : 'border-dashed border-white/15 bg-black/20 text-white/35'
                }`}
              >
                <span className="mr-2 font-mono text-white/40">{i + 1}.</span>
                {guess[i] ?? '—'}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-2">
            {bank.map((s, i) => {
              const ok = available(s)
              return (
                <button
                  key={`${s}-${i}`}
                  type="button"
                  disabled={!ok}
                  onClick={() => place(s)}
                  className="rounded-xl border border-white/10 bg-white/5 px-3 py-3 text-sm font-semibold disabled:opacity-25"
                >
                  {s}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {phase === 'reveal' && (
        <div className="flex flex-col gap-3">
          <p className="text-sm font-bold text-red-300">
            Not quite. The missed {wrongAt.length === 1 ? 'spot is' : 'spots are'} highlighted.
          </p>
          <ol className="flex flex-col gap-2">
            {sequence.map((s, i) => (
              <li
                key={i}
                className={`rounded-xl border px-4 py-3 font-semibold ${
                  wrongAt.includes(i)
                    ? 'border-red-400/70 bg-red-400/10'
                    : 'border-white/10 bg-black/25'
                }`}
              >
                <span className="mr-2 font-mono text-white/40">{i + 1}.</span>
                {s}
              </li>
            ))}
          </ol>
          <button
            type="button"
            onClick={retry}
            className="rounded-xl bg-[var(--accent)] px-4 py-3 font-black text-black"
          >
            Retry this round
          </button>
        </div>
      )}
    </div>
  )
}
