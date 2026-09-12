import { useMemo, useState } from 'react'
import type { StudyQuestion } from '../../lib/studyQuiz'
import { QuizReview } from './QuizReview'

type Props = {
  title: string
  build: () => StudyQuestion[]
  lessonTitle?: (id: string) => string | undefined
  passCopy: string
  midCopy: string
  failCopy: string
  retryLabel: string
  onExit: () => void
}

export function StudyQuiz({
  title,
  build,
  lessonTitle,
  passCopy,
  midCopy,
  failCopy,
  retryLabel,
  onExit,
}: Props) {
  const [seed, setSeed] = useState(0)
  const questions = useMemo(() => build(), [build, seed])
  const [index, setIndex] = useState(0)
  const [picked, setPicked] = useState<string | null>(null)
  const [pickedIds, setPickedIds] = useState<(string | null)[]>(() => questions.map(() => null))
  const [done, setDone] = useState(false)

  const q = questions[index]
  const total = questions.length

  const restart = () => {
    setSeed((n) => n + 1)
    setIndex(0)
    setPicked(null)
    setPickedIds([])
    setDone(false)
  }

  if (!total || !q) {
    return (
      <section className="rounded-xl border border-[var(--panel-border)] bg-[var(--panel)] p-5">
        <p className="text-sm text-[var(--muted)]">No questions yet.</p>
        <button type="button" className="mt-3 text-sm text-[var(--accent)]" onClick={onExit}>
          Back
        </button>
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
        pickedLabel: pickedChoice?.label ?? '(no answer)',
        correctLabel: correctChoice?.label ?? '',
        correct: choice === question.answerId,
        explain: question.explain,
      }
    })
    const score = items.filter((item) => item.correct).length
    return (
      <QuizReview
        title={title}
        score={score}
        total={total}
        items={items}
        passCopy={passCopy}
        midCopy={midCopy}
        failCopy={failCopy}
        retryLabel={retryLabel}
        onRetry={restart}
        onExit={onExit}
      />
    )
  }

  const locked = picked !== null
  const correct = picked === q.answerId
  const lesson = lessonTitle?.(q.lessonId)

  return (
    <section className="rounded-xl border border-[var(--panel-border)] bg-[var(--panel)] p-5">
      <div className="mb-3 flex items-baseline justify-between gap-2">
        <p className="text-xs uppercase tracking-wider text-[var(--muted)]">
          {title}
          {lesson ? ` · ${lesson}` : ''}
        </p>
        <p className="text-xs text-[var(--muted)]">
          {index + 1} / {total}
        </p>
      </div>

      <p className="whitespace-pre-wrap text-sm leading-relaxed text-[var(--text)]">{q.prompt}</p>

      <div className="mt-4 grid gap-2">
        {q.choices.map((c) => {
          let cls =
            'rounded-lg border border-[var(--panel-border)] px-3 py-2 text-left text-sm hover:bg-[#243040]'
          if (locked) {
            if (c.id === q.answerId)
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
              onClick={() => {
                setPicked(c.id)
                setPickedIds((prev) => {
                  const next = prev.length === total ? [...prev] : questions.map(() => null)
                  next[index] = c.id
                  return next
                })
              }}
            >
              {c.label}
            </button>
          )
        })}
      </div>

      {locked && (
        <div className="mt-4 space-y-3">
          <p className="text-sm font-medium" style={{ color: correct ? 'var(--good)' : 'var(--bad)' }}>
            {correct ? 'Correct.' : 'Not that one. See the right idea below, then keep going.'}
          </p>
          {!correct && (
            <p className="rounded-lg border border-[var(--panel-border)] bg-[#152018] px-3 py-2 text-sm leading-relaxed text-[var(--muted)]">
              <span className="font-medium text-[var(--good)]">
                {q.choices.find((c) => c.id === q.answerId)?.label}
              </span>
              <span className="mt-1 block">{q.explain}</span>
            </p>
          )}
          <div className="flex justify-end">
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
        </div>
      )}
    </section>
  )
}
