import { useMemo, useRef, useState } from 'react'
import type { StudyQuestion } from '../../lib/studyQuiz'
import { QuizReview } from './QuizReview'
import { CroppedStill } from '../CroppedStill'

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

function sameSet(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false
  const set = new Set(a)
  return b.every((id) => set.has(id))
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
  const buildRef = useRef(build)
  buildRef.current = build
  const questions = useMemo(() => buildRef.current(), [seed])
  const [index, setIndex] = useState(0)
  const [picked, setPicked] = useState<string | null>(null)
  const [pickedSet, setPickedSet] = useState<string[]>([])
  const [checked, setChecked] = useState(false)
  const [pickedIds, setPickedIds] = useState<(string | string[] | null)[]>(() =>
    questions.map(() => null),
  )
  const [done, setDone] = useState(false)

  const q = questions[index]
  const total = questions.length
  const isMulti = Boolean(q?.answerIds?.length)

  const restart = () => {
    setSeed((n) => n + 1)
    setIndex(0)
    setPicked(null)
    setPickedSet([])
    setChecked(false)
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
      const multi = Boolean(question.answerIds?.length)
      const correct = multi
        ? sameSet(Array.isArray(choice) ? choice : [], question.answerIds ?? [])
        : choice === question.answerId
      const pickedChoiceIds = multi
        ? Array.isArray(choice)
          ? choice
          : []
        : typeof choice === 'string'
          ? [choice]
          : []
      const pickedLabel =
        pickedChoiceIds
          .map((id) => question.choices.find((c) => c.id === id)?.label)
          .filter((label): label is string => Boolean(label))
          .join(', ') || '(no answer)'
      const correctIds = multi ? (question.answerIds ?? []) : [question.answerId]
      const correctLabel = correctIds
        .map((id) => question.choices.find((c) => c.id === id)?.label)
        .filter((label): label is string => Boolean(label))
        .join(', ')
      return {
        prompt: question.prompt,
        photoUrl: question.photoUrl,
        stillId: question.stillId,
        photoUrl2: question.photoUrl2,
        stillId2: question.stillId2,
        stillChoiceIds: question.stillChoiceIds,
        pickedChoiceId: multi ? undefined : typeof choice === 'string' ? choice : null,
        correctChoiceId: multi ? undefined : question.answerId,
        pickedLabel,
        correctLabel,
        correct,
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

  const locked = isMulti ? checked : picked !== null
  const correct = isMulti ? sameSet(pickedSet, q.answerIds ?? []) : picked === q.answerId
  const lesson = lessonTitle?.(q.lessonId)
  // Comparison questions are answered by tapping a still, not a name: the
  // shape names never appear as buttons, or the prompt gives the answer
  // away. stillChoiceIds rides with the shuffled stills, so the left still
  // always answers the shape that still shows.
  const isStillPick = Boolean(q.photoUrl2 && q.stillChoiceIds && !isMulti)
  const stillOptions =
    isStillPick && q.photoUrl && q.photoUrl2
      ? [
          { url: q.photoUrl, stillId: q.stillId, shapeId: q.stillChoiceIds![0] },
          { url: q.photoUrl2, stillId: q.stillId2, shapeId: q.stillChoiceIds![1] },
        ]
      : []

  const pickSingle = (id: string) => {
    setPicked(id)
    setPickedIds((prev) => {
      const next = prev.length === total ? [...prev] : questions.map(() => null)
      next[index] = id
      return next
    })
  }

  const checkMulti = () => {
    setChecked(true)
    setPickedIds((prev) => {
      const next = prev.length === total ? [...prev] : questions.map(() => null)
      next[index] = [...pickedSet]
      return next
    })
  }

  const nextQuestion = () => {
    if (index + 1 >= total) {
      setDone(true)
    } else {
      setIndex((i) => i + 1)
      setPicked(null)
      setPickedSet([])
      setChecked(false)
    }
  }

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
      {q.photoUrl && !q.photoUrl2 && (
        <div className="mt-3 overflow-hidden rounded-lg bg-black">
          <CroppedStill
            src={q.photoUrl}
            stillId={q.stillId}
            alt=""
            className="mx-auto max-h-72 w-full object-contain"
          />
        </div>
      )}
      {q.photoUrl && q.photoUrl2 && isStillPick && (
        <div className="mt-3 grid grid-cols-2 gap-2">
          {stillOptions.map((still, i) => {
            const inAnswer = still.shapeId === q.answerId
            const inPicked = picked === still.shapeId
            let cls =
              'overflow-hidden rounded-lg border border-[var(--panel-border)] bg-black'
            if (!locked && inPicked) {
              cls = 'overflow-hidden rounded-lg border border-[var(--accent)] bg-[#1a2636]'
            }
            if (locked) {
              if (inAnswer)
                cls = 'overflow-hidden rounded-lg border border-[var(--good)] bg-[#102820]'
              else if (inPicked)
                cls = 'overflow-hidden rounded-lg border border-[var(--bad)] bg-[#2a1518]'
              else
                cls =
                  'overflow-hidden rounded-lg border border-[var(--panel-border)] bg-black opacity-50'
            }
            return (
              <button
                key={still.stillId ?? i}
                type="button"
                disabled={locked}
                aria-label={i === 0 ? 'Choose the left still' : 'Choose the right still'}
                className={cls}
                onClick={() => pickSingle(still.shapeId)}
              >
                <CroppedStill
                  src={still.url}
                  stillId={still.stillId}
                  alt=""
                  className="mx-auto max-h-72 w-full object-contain"
                />
              </button>
            )
          })}
        </div>
      )}
      {q.photoUrl && q.photoUrl2 && !isStillPick && (
        <div className="mt-3 grid grid-cols-2 gap-2">
          <div className="overflow-hidden rounded-lg bg-black">
            <CroppedStill
              src={q.photoUrl}
              stillId={q.stillId}
              alt=""
              className="mx-auto max-h-72 w-full object-contain"
            />
          </div>
          <div className="overflow-hidden rounded-lg bg-black">
            <CroppedStill
              src={q.photoUrl2}
              stillId={q.stillId2}
              alt=""
              className="mx-auto max-h-72 w-full object-contain"
            />
          </div>
        </div>
      )}

      {isStillPick && !locked && (
        <p className="mt-3 text-xs text-[var(--muted)]">Tap the still that fits.</p>
      )}

      {isMulti && !locked && (
        <p className="mt-3 text-xs text-[var(--muted)]">
          Tap every shape that fits, then check your answers.
        </p>
      )}

      {!isStillPick && (
      <div className="mt-4 grid gap-2">
        {q.choices.map((c) => {
          const inAnswer = q.answerIds?.includes(c.id) ?? c.id === q.answerId
          const inPicked = isMulti ? pickedSet.includes(c.id) : picked === c.id
          let cls =
            'rounded-lg border border-[var(--panel-border)] px-3 py-2 text-left text-sm hover:bg-[#243040]'
          if (isMulti && !locked && inPicked) {
            cls =
              'rounded-lg border border-[var(--accent)] bg-[#1a2636] px-3 py-2 text-left text-sm'
          }
          if (locked) {
            if (inAnswer)
              cls =
                'rounded-lg border border-[var(--good)] bg-[#102820] px-3 py-2 text-left text-sm text-[var(--good)]'
            else if (inPicked)
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
                if (isMulti) {
                  setPickedSet((prev) =>
                    prev.includes(c.id) ? prev.filter((id) => id !== c.id) : [...prev, c.id],
                  )
                  return
                }
                pickSingle(c.id)
              }}
            >
              {isMulti && !locked && (inPicked ? '✓ ' : '')}
              {c.label}
            </button>
          )
        })}
      </div>
      )}

      {isMulti && !locked && (
        <div className="mt-4 flex justify-end">
          <button
            type="button"
            disabled={pickedSet.length === 0}
            className="rounded-lg bg-[var(--accent)] px-3 py-2 text-sm font-semibold text-[var(--on-accent)] disabled:opacity-50"
            onClick={checkMulti}
          >
            Check answers
          </button>
        </div>
      )}

      {locked && (
        <div className="mt-4 space-y-3">
          <p className="text-sm font-medium" style={{ color: correct ? 'var(--good)' : 'var(--bad)' }}>
            {correct ? 'Correct.' : 'Not that one. See the right idea below, then keep going.'}
          </p>
          {!correct && (
            <p className="rounded-lg border border-[var(--panel-border)] bg-[#152018] px-3 py-2 text-sm leading-relaxed text-[var(--muted)]">
              <span className="font-medium text-[var(--good)]">
                {(isMulti ? (q.answerIds ?? []) : [q.answerId])
                  .map((id) => q.choices.find((c) => c.id === id)?.label)
                  .filter((label): label is string => Boolean(label))
                  .join(', ')}
              </span>
              <span className="mt-1 block">{q.explain}</span>
            </p>
          )}
          <div className="flex justify-end">
            <button
              type="button"
              className="rounded-lg bg-[var(--accent)] px-3 py-2 text-sm font-semibold text-[var(--on-accent)]"
              onClick={nextQuestion}
            >
              {index + 1 >= total ? 'See score and misses' : 'Next'}
            </button>
          </div>
        </div>
      )}
    </section>
  )
}
