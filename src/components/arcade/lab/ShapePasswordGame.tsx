import { useMemo, useState } from 'react'
import { LabGameShell, type LabGameResult } from './LabGameShell'
import { SHAPE_PASSWORD_CARDS } from '../../../data/arcade/shapePasswordPack'

const CARDS_PER_ROUND = 6
const POINTS_PER_CARD = 100

function shuffle<T>(items: T[]): T[] {
  const a = [...items]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

type Answer = 'got' | 'skipped' | null

function ShapePasswordPlay({ onFinish }: { onFinish: (r: LabGameResult) => void }) {
  const cards = useMemo(() => shuffle(SHAPE_PASSWORD_CARDS).slice(0, CARDS_PER_ROUND), [])
  const [index, setIndex] = useState(0)
  const [got, setGot] = useState(0)
  const [answer, setAnswer] = useState<Answer>(null)

  const card = cards[index]
  const last = index === cards.length - 1
  // Alternate who describes: even cards Partner A, odd cards Partner B.
  const describer = index % 2 === 0 ? 'Partner A' : 'Partner B'

  const mark = (a: Exclude<Answer, null>) => {
    if (a === 'got') setGot((g) => g + 1)
    setAnswer(a)
  }

  const next = () => {
    if (last) {
      onFinish({
        score: got * POINTS_PER_CARD,
        total: CARDS_PER_ROUND * POINTS_PER_CARD,
        detail: `${got} of ${CARDS_PER_ROUND} shapes guessed`,
      })
      return
    }
    setIndex((i) => i + 1)
    setAnswer(null)
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wider text-white/40">
          Card {index + 1} of {cards.length}
        </p>
        <p className="font-mono text-sm font-bold tabular-nums text-[var(--accent)]">
          {got * POINTS_PER_CARD} pts
        </p>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--accent)]">
          {describer} describes. Partner B guesses out loud
        </p>
        <h4 className="mt-2 text-2xl font-black text-[var(--text)]">{card.shapeName}</h4>

        <p className="mt-4 text-xs font-semibold uppercase tracking-wider text-white/50">
          Forbidden words
        </p>
        <ul className="mt-1 flex flex-col gap-1">
          {card.forbidden.map((w) => (
            <li
              key={w}
              className="rounded-lg bg-red-400/10 px-3 py-1.5 text-sm font-semibold text-red-300"
            >
              {w}
            </li>
          ))}
        </ul>

        <div className="mt-4 rounded-xl border border-[var(--accent)]/25 bg-[var(--accent)]/5 p-3">
          <p className="text-xs font-bold uppercase tracking-wider text-[var(--accent)]">
            Angle you CAN use
          </p>
          <p className="mt-1 text-sm text-white/80">{card.hint}</p>
        </div>
      </div>

      {answer === null ? (
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => mark('got')}
            className="rounded-2xl bg-[var(--accent)] px-4 py-4 text-base font-black text-black"
          >
            They got it
          </button>
          <button
            type="button"
            onClick={() => mark('skipped')}
            className="rounded-2xl bg-white/10 px-4 py-4 text-base font-bold text-white/70"
          >
            Skip
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <p className="rounded-xl bg-black/25 px-4 py-3 text-center text-sm font-semibold text-white/80">
            {answer === 'got' ? 'Got it.' : 'Skipped.'} that was {card.shapeName}.
          </p>
          <button
            type="button"
            onClick={next}
            className="rounded-2xl bg-[var(--accent)] px-6 py-4 text-lg font-black text-black"
          >
            {last ? 'See results' : 'Next card'}
          </button>
          {!last && (
            <p className="text-center text-xs text-white/50">
              Hand the phone over. {index % 2 === 0 ? 'Partner B' : 'Partner A'} describes next.
            </p>
          )}
        </div>
      )}
    </div>
  )
}

export function ShapePasswordGame({ onExit }: { onExit: () => void }) {
  return (
    <LabGameShell
      gameId="shape-password"
      title="Shape Password"
      tagline="Describe the shape without saying the forbidden words."
      rules={
        <>
          <p className="font-semibold text-white/90">How to play</p>
          <ul className="mt-2 list-disc space-y-1.5 pl-5">
            <li>Two partners. One holds the phone and describes, the other guesses out loud.</li>
            <li>
              Say anything except the shape name and the forbidden words. Describe what the
              body actually does.
            </li>
            <li>
              No acting it out with your own body: words only. (Seated guessing mode is fine.)
            </li>
            <li>Tap "They got it" for 100 points, or "Skip" for 0. Six cards per round.</li>
            <li>
              There is no speech recognition. Partners confirm the guess honestly, on the honor
              system.
            </li>
          </ul>
        </>
      }
      whatPracticed="Describing shapes by what the body actually does. The skill behind every good correction."
      onExit={onExit}
    >
      {({ finish }) => <ShapePasswordPlay onFinish={finish} />}
    </LabGameShell>
  )
}
