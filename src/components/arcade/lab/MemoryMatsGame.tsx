import { useEffect, useRef, useState } from 'react'
import { LabGameShell, type LabGameResult } from './LabGameShell'
import { MEMORY_MATS_PAIRS, type MemoryMatsPair } from '../../../data/arcade/memoryMatsPack'

const DECK_SIZES = [4, 6, 8] as const
const FLIP_BACK_MS = 800

/** Fisher-Yates shuffle. */
function shuffled<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

type Card = {
  key: string
  pairId: string
  kind: 'name' | 'cue'
  text: string
}

const gridCols = (cards: number) =>
  cards <= 8 ? 'grid-cols-2' : cards <= 12 ? 'grid-cols-3' : 'grid-cols-4'

export function MemoryMatsGame({ onExit }: { onExit: () => void }) {
  return (
    <LabGameShell
      gameId="memory-mats"
      title="Memory Mats"
      tagline="Flip the mats — match each shape to its cue."
      rules={
        <>
          <p>
            Pick a deck size, then flip cards two at a time. Match each{' '}
            <strong>shape name</strong> with its <strong>cue</strong> from the
            shape library.
          </p>
          <p className="mt-2">
            <strong>100 points</strong> per pair. No timer — fewer attempts is
            better.
          </p>
        </>
      }
      whatPracticed="Linking shape names to their cues from memory — the fastest way to make corrections stick."
      onExit={onExit}
    >
      {({ finish }) => <MemoryMatsPlay onFinish={finish} />}
    </LabGameShell>
  )
}

function MemoryMatsPlay({ onFinish }: { onFinish: (r: LabGameResult) => void }) {
  const [pairCount, setPairCount] = useState<number | null>(null)
  const [deck, setDeck] = useState<Card[]>([])
  const [faceUp, setFaceUp] = useState<number[]>([])
  const [matched, setMatched] = useState<Set<string>>(new Set())
  const [attempts, setAttempts] = useState(0)
  const [lock, setLock] = useState(false)
  const timeoutRef = useRef<number | null>(null)
  const finishedRef = useRef(false)

  useEffect(
    () => () => {
      if (timeoutRef.current) window.clearTimeout(timeoutRef.current)
    },
    []
  )

  const startDeck = (n: number) => {
    const pairs: MemoryMatsPair[] = shuffled(MEMORY_MATS_PAIRS).slice(0, n)
    const cards: Card[] = shuffled(
      pairs.flatMap((p) => [
        { key: `${p.id}-name`, pairId: p.id, kind: 'name' as const, text: p.shapeName },
        { key: `${p.id}-cue`, pairId: p.id, kind: 'cue' as const, text: p.cue },
      ])
    )
    setDeck(cards)
    setFaceUp([])
    setMatched(new Set())
    setAttempts(0)
    setLock(false)
    finishedRef.current = false
    setPairCount(n)
  }

  useEffect(() => {
    if (
      pairCount !== null &&
      matched.size === pairCount &&
      pairCount > 0 &&
      !finishedRef.current
    ) {
      finishedRef.current = true
      const t = window.setTimeout(() => {
        onFinish({
          score: pairCount * 100,
          total: pairCount * 100,
          detail: `${attempts} attempts`,
        })
      }, 500)
      timeoutRef.current = t
    }
  }, [matched, pairCount, attempts, onFinish])

  const flip = (idx: number) => {
    if (lock || pairCount === null) return
    const card = deck[idx]
    if (!card || matched.has(card.pairId) || faceUp.includes(idx)) return

    if (faceUp.length === 0) {
      setFaceUp([idx])
      return
    }

    const first = deck[faceUp[0]]
    const second = card
    setAttempts((a) => a + 1)
    if (first.pairId === second.pairId) {
      setMatched((m) => new Set(m).add(first.pairId))
      setFaceUp([])
    } else {
      setFaceUp([faceUp[0], idx])
      setLock(true)
      timeoutRef.current = window.setTimeout(() => {
        setFaceUp([])
        setLock(false)
      }, FLIP_BACK_MS)
    }
  }

  if (pairCount === null) {
    return (
      <div className="flex flex-col gap-4">
        <p className="text-sm text-white/60">How many pairs?</p>
        <div className="flex flex-col gap-2">
          {DECK_SIZES.map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => startDeck(n)}
              className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4 text-left"
            >
              <span className="text-lg font-black text-[var(--text)]">{n} pairs</span>
              <span className="ml-2 text-sm text-white/50">{n * 2} cards</span>
            </button>
          ))}
        </div>
      </div>
    )
  }

  const allMatched = matched.size === pairCount

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wider text-white/40">
          {matched.size} of {pairCount} pairs
        </p>
        <p className="text-xs text-white/50">{attempts} attempts</p>
      </div>
      <div className={`grid ${gridCols(deck.length)} gap-2`}>
        {deck.map((card, idx) => {
          const up = faceUp.includes(idx) || matched.has(card.pairId)
          const isMatched = matched.has(card.pairId)
          return (
            <button
              key={card.key}
              type="button"
              onClick={() => flip(idx)}
              disabled={up || lock}
              aria-label={
                up ? `${card.kind === 'name' ? 'Shape' : 'Cue'}: ${card.text}` : 'Face-down card'
              }
              className={`flex min-h-[5.5rem] items-center justify-center rounded-2xl border p-2 text-center ${
                up
                  ? isMatched
                    ? 'border-emerald-400/60 bg-emerald-400/15'
                    : 'border-white/20 bg-white/10'
                  : 'border-white/10 bg-white/5 active:bg-white/15'
              }`}
            >
              {up ? (
                <span
                  className={
                    card.kind === 'name'
                      ? 'text-sm font-black text-[var(--text)]'
                      : 'text-xs leading-snug text-white/80'
                  }
                >
                  {card.text}
                </span>
              ) : (
                <span className="text-2xl font-black text-white/25" aria-hidden>
                  ?
                </span>
              )}
            </button>
          )
        })}
      </div>
      {allMatched && (
        <p className="text-center text-sm text-white/50">All matched — wrapping up…</p>
      )}
    </div>
  )
}
