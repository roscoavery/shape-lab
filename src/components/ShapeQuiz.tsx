import { useMemo, useState } from 'react'
import {
  buildShapeQuiz,
  QUIZ_FORMATS,
  type QuizFormat,
  type QuizPool,
  type QuizQuestion,
} from '../lib/shapeQuiz'
import { useShapeCopy } from './ShapeCopyContext'
import type { Athlete, ReferencePhoto } from '../types'
import { QuizReview } from './learn/QuizReview'
import { ReferenceStill } from './ReferenceStill'
import { QuizWho, type QuizTaker } from './learn/QuizWho'
import { PreTestIntake } from './learn/PreTestIntake'
import { displayPersonName } from '../lib/classStation'
import { makeShapeTestRecord } from '../lib/quizGrades'
import type { ShapeTestRecord } from '../types'
import {
  clearGuestPark,
  makeShapeTestPark,
  parkQuestions,
  readTakerPark,
  reviveQuestions,
  upsertGuestPark,
  type ShapeTestPark,
} from '../lib/shapeTestPark'

type Props = {
  referencePhotos: ReferencePhoto[]
  onExit: () => void
  pool?: QuizPool
  athletes?: Athlete[]
  presetTaker?: QuizTaker | null
  onTakerReady?: (taker: QuizTaker) => void
  onGrade?: (taker: QuizTaker, record: ShapeTestRecord) => void
  onAthleteChange?: (next: Athlete) => void
  onPark?: () => void
}

export function ShapeQuiz({
  referencePhotos,
  onExit,
  pool = 'pathway',
  athletes = [],
  presetTaker = null,
  onTakerReady,
  onGrade,
  onAthleteChange,
  onPark,
}: Props) {
  const { copyFor } = useShapeCopy()
  const parkedAtOpen = readTakerPark(presetTaker, athletes)
  const [taker, setTaker] = useState<QuizTaker | null>(presetTaker)
  const [intakeDone, setIntakeDone] = useState(
    () => parkedAtOpen?.phase === 'format' || parkedAtOpen?.phase === 'quiz',
  )
  const [format, setFormat] = useState<QuizFormat | null>(() =>
    parkedAtOpen?.phase === 'quiz' ? parkedAtOpen.format ?? null : null,
  )
  const [seed, setSeed] = useState(0)
  const generated = useMemo(
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
  const [parkedQuestions, setParkedQuestions] = useState<QuizQuestion[] | null>(() =>
    parkedAtOpen?.phase === 'quiz' && parkedAtOpen.questions?.length
      ? reviveQuestions(parkedAtOpen.questions, referencePhotos)
      : null,
  )
  const questions = parkedQuestions ?? generated
  const [index, setIndex] = useState(() => parkedAtOpen?.index ?? 0)
  const [picked, setPicked] = useState<string | null>(() => {
    if (!parkedAtOpen) return null
    if (parkedAtOpen.picked) return parkedAtOpen.picked
    const i = parkedAtOpen.index ?? 0
    return parkedAtOpen.pickedIds?.[i] ?? null
  })
  const [pickedIds, setPickedIds] = useState<(string | null)[]>(() => parkedAtOpen?.pickedIds ?? [])
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

  const rosterAthlete = taker?.athleteId
    ? athletes.find((a) => a.id === taker.athleteId) ?? null
    : null

  const writePark = (park: ShapeTestPark) => {
    if (rosterAthlete) {
      onAthleteChange?.({ ...rosterAthlete, shapeTestPark: park })
      return
    }
    if (taker) upsertGuestPark(taker.firstName, taker.lastName, park)
  }

  const parkAndLeave = (park: ShapeTestPark) => {
    writePark(park)
    if (onPark) onPark()
    else onExit()
  }

  const begin = (next: QuizFormat) => {
    setParkedQuestions(null)
    setFormat(next)
    setSeed((n) => n + 1)
    setIndex(0)
    setPicked(null)
    setPickedIds([])
    setDone(false)
    writePark(makeShapeTestPark('quiz', { format: next, pool }))
  }

  const restartSame = () => {
    if (!format) return
    begin(format)
  }

  const changeType = () => {
    setParkedQuestions(null)
    setFormat(null)
    setIndex(0)
    setPicked(null)
    setPickedIds([])
    setDone(false)
    writePark(makeShapeTestPark('format', { pool }))
  }

  const recordPick = (id: string) => {
    setPicked(id)
    setPickedIds((prev) => {
      const next = prev.length === total ? [...prev] : questions.map(() => null)
      next[index] = id
      writePark(
        makeShapeTestPark('quiz', {
          format: format ?? undefined,
          pool,
          index,
          picked: id,
          pickedIds: next,
          questions: parkQuestions(questions),
        }),
      )
      return next
    })
  }

  const finishLaterBtn = (onClick: () => void) => (
    <button
      type="button"
      onClick={onClick}
      className="shrink-0 rounded-lg border border-[var(--panel-border)] px-3 py-2 text-xs font-semibold text-[var(--text)]"
    >
      Finish later
    </button>
  )

  if (!taker) {
    return (
      <QuizWho
        athletes={athletes}
        preset={presetTaker}
        onReady={(next) => {
          setTaker(next)
          onTakerReady?.(next)
        }}
        onExit={onExit}
      />
    )
  }

  if (rosterAthlete && !intakeDone) {
    return (
      <PreTestIntake
        athlete={rosterAthlete}
        athletes={athletes}
        photos={referencePhotos}
        onLeave={() => setTaker(null)}
        onSave={(next) => {
          onAthleteChange?.({
            ...next,
            shapeTestPark: next.shapeTestPark ?? makeShapeTestPark('intake', { pool }),
          })
        }}
        onDone={(next) => {
          onAthleteChange?.({
            ...next,
            shapeTestPark: makeShapeTestPark('format', { pool }),
          })
          setIntakeDone(true)
        }}
        onPark={(next) => {
          onAthleteChange?.({
            ...next,
            shapeTestPark: makeShapeTestPark('intake', { pool }),
          })
          if (onPark) onPark()
          else onExit()
        }}
      />
    )
  }

  if (!format) {
    return (
      <section className="rounded-xl border border-[var(--panel-border)] bg-[var(--panel)] p-5">
        <div className="flex items-start justify-between gap-3">
          <p className="text-xs uppercase tracking-wider text-[var(--muted)]">
            {baseTitle} · {displayPersonName(taker.firstName, taker.lastName)}
          </p>
          {finishLaterBtn(() => parkAndLeave(makeShapeTestPark('format', { pool })))}
        </div>
        <h3 className="mt-1 text-xl font-semibold text-[var(--text)]">How do you want to take it?</h3>
        <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">
          Pictures are the easy way — name the coach stills. Descriptions and mixed
          sit underneath if you want a harder test.
        </p>
        <div className="mt-4 flex flex-col gap-2">
          {QUIZ_FORMATS.filter((o) => o.id === 'picture').map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => begin(opt.id)}
              className="rounded-2xl bg-[var(--accent)] px-5 py-6 text-left text-[#06281f] shadow-[0_16px_40px_rgba(45,212,168,0.28)]"
            >
              <p className="text-2xl font-bold">{opt.title}</p>
              <p className="mt-1 text-sm font-medium opacity-80">{opt.blurb}</p>
            </button>
          ))}
          <div className="grid gap-2 sm:grid-cols-2">
            {QUIZ_FORMATS.filter((o) => o.id !== 'picture').map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => begin(opt.id)}
                className="rounded-xl border border-[var(--panel-border)] bg-[#0d1218] p-3 text-left text-sm hover:border-[var(--accent-dim)]"
              >
                <p className="font-semibold text-[var(--text)]">{opt.title}</p>
                <p className="mt-1 text-xs leading-relaxed text-[var(--muted)]">{opt.blurb}</p>
              </button>
            ))}
          </div>
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
        stillId: question.stillId,
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
        <div className="flex items-center gap-2">
          <p className="text-xs text-[var(--muted)]">
            {index + 1} / {total}
          </p>
          {finishLaterBtn(() =>
            parkAndLeave(
              makeShapeTestPark('quiz', {
                format,
                pool,
                index,
                picked,
                pickedIds,
                questions: parkQuestions(questions),
              }),
            ),
          )}
        </div>
      </div>

      {q!.kind === 'picture' && (
        <div className="mb-3 overflow-hidden rounded-lg bg-[#0d1218]">
          <ReferenceStill
            shapeId={q!.shapeId}
            photos={referencePhotos}
            alt=""
            className="max-h-64 w-full object-contain"
          />
        </div>
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
                const score = questions.reduce((n, question, i) => {
                  return n + (pickedIds[i] === question.answerId ? 1 : 0)
                }, 0)
                if (taker) {
                  onGrade?.(taker, makeShapeTestRecord(pool, format, score, total))
                  if (!taker.athleteId) clearGuestPark(taker.firstName, taker.lastName)
                }
                setDone(true)
              } else {
                const nextIndex = index + 1
                setIndex(nextIndex)
                setPicked(null)
                writePark(
                  makeShapeTestPark('quiz', {
                    format,
                    pool,
                    index: nextIndex,
                    picked: null,
                    pickedIds,
                    questions: parkQuestions(questions),
                  }),
                )
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
