import { useMemo, useState } from 'react'
import { buildShapeQuiz, type QuizQuestion } from '../lib/shapeQuiz'
import type { ReferencePhoto } from '../types'

type Props = {
  referencePhotos: ReferencePhoto[]
  onExit: () => void
}

export function ShapeQuiz({ referencePhotos, onExit }: Props) {
  const [seed, setSeed] = useState(0)
  const questions = useMemo(
    () => buildShapeQuiz(referencePhotos, 8),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [referencePhotos, seed],
  )
  const [index, setIndex] = useState(0)
  const [picked, setPicked] = useState<string | null>(null)
  const [score, setScore] = useState(0)
  const [done, setDone] = useState(false)

  const q: QuizQuestion | undefined = questions[index]
  const total = questions.length

  const restart = () => {
    setSeed((n) => n + 1)
    setIndex(0)
    setPicked(null)
    setScore(0)
    setDone(false)
  }

  if (!total) {
    return (
      <section className="rounded-xl border border-[var(--panel-border)] bg-[var(--panel)] p-5">
        <p className="text-sm text-[var(--muted)]">
          Need more shapes in the library before a quiz can be built.
        </p>
        <button type="button" className="mt-3 text-sm text-[var(--accent)]" onClick={onExit}>
          Back
        </button>
      </section>
    )
  }

  if (done) {
    return (
      <section className="rounded-xl border border-[var(--panel-border)] bg-[var(--panel)] p-5">
        <p className="text-xs uppercase tracking-wider text-[var(--muted)]">Shape test</p>
        <h3 className="mt-1 text-xl font-semibold">
          {score} / {total} correct
        </h3>
        <p className="mt-2 text-sm text-[var(--muted)]">
          {score === total
            ? 'Perfect — you know these positions.'
            : score >= total * 0.7
              ? 'Solid. Review the misses in the shape library, then try again.'
              : 'Keep studying the body-position cards, then retake the test.'}
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            className="rounded-lg bg-[var(--accent)] px-3 py-2 text-sm font-semibold text-[#06281f]"
            onClick={restart}
          >
            New quiz
          </button>
          <button
            type="button"
            className="rounded-lg border border-[var(--panel-border)] px-3 py-2 text-sm"
            onClick={onExit}
          >
            Back to Learn
          </button>
        </div>
      </section>
    )
  }

  const locked = picked !== null
  const correct = picked === q!.answerId

  return (
    <section className="rounded-xl border border-[var(--panel-border)] bg-[var(--panel)] p-5">
      <div className="mb-3 flex items-baseline justify-between gap-2">
        <p className="text-xs uppercase tracking-wider text-[var(--muted)]">
          Shape test · {q!.kind === 'picture' ? 'Name the picture' : 'Name the description'}
        </p>
        <p className="text-xs text-[var(--muted)]">
          {index + 1} / {total}
        </p>
      </div>

      {q!.kind === 'picture' && q!.photoUrl && (
        <img
          src={q!.photoUrl}
          alt="Quiz reference"
          className="mb-3 max-h-64 w-full rounded-lg bg-[#0d1218] object-contain"
        />
      )}

      <p className="whitespace-pre-wrap text-sm leading-relaxed text-[var(--text)]">{q!.prompt}</p>

      <div className="mt-4 grid gap-2">
        {q!.choices.map((c) => {
          let cls =
            'rounded-lg border border-[var(--panel-border)] px-3 py-2 text-left text-sm hover:bg-[#243040]'
          if (locked) {
            if (c.id === q!.answerId) cls = 'rounded-lg border border-[var(--good)] bg-[#102820] px-3 py-2 text-left text-sm text-[var(--good)]'
            else if (c.id === picked) cls = 'rounded-lg border border-[var(--bad)] bg-[#2a1518] px-3 py-2 text-left text-sm text-[var(--bad)]'
            else cls = 'rounded-lg border border-[var(--panel-border)] px-3 py-2 text-left text-sm opacity-50'
          }
          return (
            <button
              key={c.id}
              type="button"
              disabled={locked}
              className={cls}
              onClick={() => {
                setPicked(c.id)
                if (c.id === q!.answerId) setScore((s) => s + 1)
              }}
            >
              {c.label}
            </button>
          )
        })}
      </div>

      {locked && (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-medium" style={{ color: correct ? 'var(--good)' : 'var(--bad)' }}>
            {correct ? 'Correct.' : `It's ${q!.choices.find((c) => c.id === q!.answerId)?.label}.`}
          </p>
          <button
            type="button"
            className="rounded-lg bg-[var(--accent)] px-3 py-2 text-sm font-semibold text-[#06281f]"
            onClick={() => {
              if (index + 1 >= total) {
                setDone(true)
              } else {
                setIndex((i) => i + 1)
                setPicked(null)
              }
            }}
          >
            {index + 1 >= total ? 'See score' : 'Next'}
          </button>
        </div>
      )}
    </section>
  )
}
