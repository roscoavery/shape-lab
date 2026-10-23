import { useState } from 'react'
import { DECKS } from '../../content/coachEd/practice'
import { SourceList } from './SourceList'

export function FlashcardDeckView({ deckId }: { deckId: string }) {
  const deck = DECKS.find((d) => d.id === deckId)
  const [i, setI] = useState(0)
  const [flipped, setFlipped] = useState(false)
  if (!deck || deck.cards.length === 0) return null
  const card = deck.cards[i]
  const go = (n: number) => {
    setI((n + deck.cards.length) % deck.cards.length)
    setFlipped(false)
  }
  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
      <div className="flex items-center justify-between">
        <h4 className="text-base font-semibold">{deck.title}</h4>
        <span className="text-xs text-[var(--muted)]">
          {i + 1} of {deck.cards.length}
        </span>
      </div>
      <button
        type="button"
        onClick={() => setFlipped((v) => !v)}
        aria-label={flipped ? 'Show the question' : 'Show the answer'}
        className="mt-3 flex min-h-[9rem] w-full items-center justify-center rounded-xl border border-white/15 bg-black/20 px-4 py-5 text-center text-base leading-relaxed active:bg-black/30"
      >
        <span>
          <span className="mb-2 block text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)]">
            {flipped ? 'Answer' : 'Question. Tap to flip.'}
          </span>
          {flipped ? card.back : card.front}
        </span>
      </button>
      <div className="mt-3 flex items-center justify-between">
        <button type="button" onClick={() => go(i - 1)} className="rounded-full border border-white/15 px-4 py-2 text-sm">
          Previous
        </button>
        <button type="button" onClick={() => go(i + 1)} className="rounded-full bg-[var(--accent)] px-5 py-2 text-sm font-semibold text-[var(--on-accent)]">
          Next
        </button>
      </div>
      {flipped && <SourceList ids={card.sourceIds ?? []} />}
    </section>
  )
}
