import { useMemo, useState } from 'react'
import {
  buildShapeQuiz,
  QUIZ_FORMATS,
  type QuizFormat,
  type QuizPool,
  type QuizQuestion,
} from '../lib/shapeQuiz'
import { useShapeCopy } from './ShapeCopyContext'
import type { ReferencePhoto } from '../types'
import { QuizReview } from './learn/QuizReview'

type Props = {
  referencePhotos: ReferencePhoto[]
  onExit: () => void
  pool?: QuizPool
}

export function ShapeQuiz({ referencePhotos, onExit, pool = 'pathway' }: Props) {
  const { copyFor } = useShapeCopy()
  const [format, setFormat] = useState<QuizFormat | null>(null)
  const [seed, setSeed] = useState(0)
  const questions = useMemo(
    () =>
      format
        ? buildShapeQuiz(
            referencePhotos,
            pool === 'arm-positions' ? 10 : 12,
            pool,
            (shape) => copyFor(shape.id).athlete,
            format,
          )
        : [],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [referencePhotos, seed, pool, copyFor, format],
  )
  const [index, setIndex] = useState(0)
  const [picked, setPicked] = useState<string | null>(null)
  const [pickedIds, setPickedIds] = useState<(string | null)[]>([])
  const [done, setDone] = useState(false)

  const q: QuizQuestion | undefined = questions[index]
  const total = questions.length
  const baseTitle = pool === 'arm-positions' ? 'Arm positions test' : 'Shape test'
  const formatTitle =
    format === 'picture'
      ? 'Pictures'
      : format === 'describe'
        ? 'Descriptions'
        : format === 'mixed'
          ? 'Pictures and descriptions'
          : null
  const title = formatTitle ? `${baseTitle} · ${formatTitle}` : baseTitle

  const begin = (next: QuizFormat) => {
    setFormat(next)
    setSeed((n) => n + 1)
    setIndex(0)
    setPicked(null)
    setPickedIds([])
    setDone(false)
  }

  const restartSame = () => {
    if (!format) return
    begin(format)
  }

  const changeType = () => {
    setFormat(null)
    setIndex(0)
    setPicked(null)
    setPickedIds([])
    setDone(false)
  }

  const recordPick = (id: string) => {
    setPicked(id)
    setPickedIds((prev) => {
      const next = prev.length === total ? [...prev] : questions.map(() => null)
      next[index] = id
      return next
    })
  }

  if (!format) {
    return (
      <section className="rounded-xl border border-[var(--panel-border)] bg-[var(--panel)] p-5">
        <p className="text-xs uppercase tracking-wider text-[var(--muted)]">{baseTitle}</p>
        <h3 className="mt-1 text-xl font-semibold text-[var(--text)]">How do you want to take it?</h3>
        <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">
          Pictures are coach stills. Descriptions are body-position notes with the
          shape’s name taken out, so the question cannot read “this is a tuck.”
          Take them separately, or mix both.
        </p>
        <div className="mt-4 grid gap-2 sm:grid-cols-3">
          {QUIZ_FORMATS.map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => begin(opt.id)}
              className="rounded-xl border border-[var(--panel-border)] bg-[#0d1218] p-4 text-left transition hover:border-[var(--accent-dim)]"
            >
              <p className="font-semibold text-[var(--text)]">{opt.title}</p>
              <p className="mt-1 text-[13px] leading-relaxed text-[var(--muted)]">{opt.blurb}</p>
            </button>
          ))}
        </div>
        <button type="button" className="mt-4 text-sm text-[var(--accent)]" onClick={onExit}>
          Back to Learn
        </button>
      </section>
    )
  }

  if (!total) {
    return (
      <section className="rounded-xl border border-[var(--panel-border)] bg-[var(--panel)] p-5">
        <p className="text-sm text-[var(--muted)]">
          {format === 'picture'
            ? 'Need coach stills in the library before a picture test can be built.'
            : 'Need more shapes in the library before a quiz can be built.'}
        </p>
        <div className="mt-3 flex flex-wrap gap-3">
          <button type="button" className="text-sm text-[var(--accent)]" onClick={changeType}>
            Choose another type
          </button>
          <button type="button" className="text-sm text-[var(--muted)]" onClick={onExit}>
            Back
          </button>
        </div>
      </section>
    )
  }

  if (done) {
    const items = questions.map((question, i) => {
      const choice = pickedIds[i]
      const correctChoice = question.choices.find((c) => c.id === question.answerId)
      const pickedChoice = question.choices.find((c) => c.id === choice)
      return {
        prompt: question.prompt,
        photoUrl: question.photoUrl,
        pickedLabel: pickedChoice?.label ?? '(no answer)',
        correctLabel: correctChoice?.label ?? '',
        correct: choice === question.answerId,
      }
    })
    const score = items.filter((item) => item.correct).length
    return (
      <div className="space-y-3">
        <QuizReview
          title={title}
          score={score}
          total={total}
          items={items}
          passCopy="Perfect — you know these positions."
          midCopy="Solid. The misses below name the right shape. Review those cards, then try again."
          failCopy="Study the correct names on each miss, then retake."
          retryLabel="New quiz, same type"
          onRetry={restartSame}
          onExit={onExit}
        />
        <button type="button" className="text-sm text-[var(--accent)]" onClick={changeType}>
          Pictures, descriptions, or both…
        </button>
      </div>
    )
  }

  const locked = picked !== null
  const correct = picked === q!.answerId

  return (
    <section className="rounded-xl border border-[var(--panel-border)] bg-[var(--panel)] p-5">
      <div className="mb-3 flex items-baseline justify-between gap-2">
        <p className="text-xs uppercase tracking-wider text-[var(--muted)]">
          {title} · {q!.kind === 'picture' ? 'Name what you see' : 'Name what is being described'}
        </p>
        <p className="text-xs text-[var(--muted)]">
          {index + 1} / {total}
        </p>
      </div>

      {q!.kind === 'picture' && q!.photoUrl && (
        <img
          src={q!.photoUrl}
          alt=""
          className="mb-3 max-h-64 w-full rounded-lg bg-[#0d1218] object-contain"
        />
      )}

      <p className="whitespace-pre-wrap text-sm leading-relaxed text-[var(--text)]">{q!.prompt}</p>

      <div className="mt-4 grid gap-2">
        {q!.choices.map((c) => {
          let cls =
            'rounded-lg border border-[var(--panel-border)] px-3 py-2 text-left text-sm hover:bg-[#243040]'
          if (locked) {
            if (c.id === q!.answerId)
              cls =
                'rounded-lg border border-[var(--good)] bg-[#102820] px-3 py-2 text-left text-sm text-[var(--good)]'
            else if (c.id === picked)
              cls =
                'rounded-lg border border-[var(--bad)] bg-[#2a1518] px-3 py-2 text-left text-sm text-[var(--bad)]'
            else
              cls =
                'rounded-lg border border-[var(--panel-border)] px-3 py-2 text-left text-sm opacity-50'
          }
          return (
            <button
              key={c.id}
              type="button"
              disabled={locked}
              className={cls}
              onClick={() => recordPick(c.id)}
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
            {index + 1 >= total ? 'See score and misses' : 'Next'}
          </button>
        </div>
      )}

      <button type="button" className="mt-4 text-xs text-[var(--muted)] hover:text-[var(--text)]" onClick={changeType}>
        Change test type
      </button>
    </section>
  )
}
