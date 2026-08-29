/**
 * End-of-test review: score plus every miss with the correct answer,
 * so they can learn it immediately instead of only seeing a number.
 */

export type QuizReviewItem = {
  prompt: string
  photoUrl?: string | null
  pickedLabel: string
  correctLabel: string
  correct: boolean
  explain?: string
}

type Props = {
  title: string
  score: number
  total: number
  items: QuizReviewItem[]
  passCopy: string
  midCopy: string
  failCopy: string
  retryLabel?: string
  onRetry: () => void
  onExit: () => void
}

export function QuizReview({
  title,
  score,
  total,
  items,
  passCopy,
  midCopy,
  failCopy,
  retryLabel = 'New quiz',
  onRetry,
  onExit,
}: Props) {
  const misses = items.filter((i) => !i.correct)
  const hits = items.filter((i) => i.correct)
  const blurb =
    score === total ? passCopy : score >= total * 0.7 ? midCopy : failCopy

  return (
    <section className="space-y-4">
      <div className="rounded-xl border border-[var(--panel-border)] bg-[var(--panel)] p-5">
        <p className="text-xs uppercase tracking-wider text-[var(--muted)]">{title}</p>
        <h3 className="mt-1 text-xl font-semibold text-[var(--text)]">
          {score} / {total} correct
        </h3>
        <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">{blurb}</p>
        {misses.length > 0 && (
          <p className="mt-2 text-sm text-[var(--text)]">
            {misses.length} miss{misses.length === 1 ? '' : 'es'} below — your answer, the
            right one, and why.
          </p>
        )}
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            className="rounded-lg bg-[var(--accent)] px-3 py-2 text-sm font-semibold text-[#06281f]"
            onClick={onRetry}
          >
            {retryLabel}
          </button>
          <button
            type="button"
            className="rounded-lg border border-[var(--panel-border)] px-3 py-2 text-sm"
            onClick={onExit}
          >
            Back to Learn
          </button>
        </div>
      </div>

      {misses.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-[var(--text)]">What you missed</h4>
          {misses.map((item, i) => (
            <ReviewCard key={`miss-${i}`} item={item} index={i + 1} />
          ))}
        </div>
      )}

      {hits.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-semibold text-[var(--text)]">What you got right</h4>
          <ul className="space-y-2">
            {hits.map((item, i) => (
              <li
                key={`hit-${i}`}
                className="rounded-lg border border-[var(--good)]/30 bg-[#102820] px-3 py-2 text-sm text-[var(--text)]"
              >
                <p className="whitespace-pre-wrap leading-relaxed">{item.prompt}</p>
                <p className="mt-1 text-[12px] text-[var(--good)]">
                  {item.correctLabel}
                </p>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  )
}

function ReviewCard({ item, index }: { item: QuizReviewItem; index: number }) {
  return (
    <article className="rounded-xl border border-[var(--bad)]/35 bg-[var(--panel)] p-4">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)]">
        Miss {index}
      </p>
      {item.photoUrl && (
        <img
          src={item.photoUrl}
          alt=""
          className="mt-2 max-h-48 w-full rounded-lg bg-[#0d1218] object-contain"
        />
      )}
      <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-[var(--text)]">
        {item.prompt}
      </p>
      <dl className="mt-3 space-y-1 text-sm">
        <div>
          <dt className="text-[11px] uppercase tracking-wider text-[var(--muted)]">You chose</dt>
          <dd className="text-[var(--bad)]">{item.pickedLabel}</dd>
        </div>
        <div>
          <dt className="text-[11px] uppercase tracking-wider text-[var(--muted)]">
            Correct answer
          </dt>
          <dd className="font-medium text-[var(--good)]">{item.correctLabel}</dd>
        </div>
      </dl>
      {item.explain && (
        <p className="mt-3 rounded-lg border border-[var(--panel-border)] bg-[#152018] px-3 py-2 text-sm leading-relaxed text-[var(--text)]">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--accent)]">
            Why
          </span>
          <span className="mt-1 block text-[var(--muted)]">{item.explain}</span>
        </p>
      )}
    </article>
  )
}
