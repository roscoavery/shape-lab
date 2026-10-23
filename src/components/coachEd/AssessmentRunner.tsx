import { useEffect, useMemo, useState } from 'react'
import { ASSESSMENTS } from '../../content/coachEd/assessments'
import { QUESTION_BANK } from '../../content/coachEd/questions/bank.generated'
import type { Assessment, QuestionPublic } from '../../content/coachEd/types'
import { coachEdApi, type GradeResponse } from './api'
import { useCoachEd } from './CoachEdContext'
import { SourceList } from './SourceList'

const bankById = new Map(QUESTION_BANK.map((q) => [q.id, q]))

type Phase =
  | { kind: 'list' }
  | { kind: 'loading'; assessment: Assessment }
  | { kind: 'run'; assessment: Assessment; attemptId: string; questions: QuestionPublic[]; passPercent: number }
  | { kind: 'grading' }
  | { kind: 'done'; assessment: Assessment; questions: QuestionPublic[]; result: GradeResponse }

function Run({
  assessment,
  questions,
  passPercent,
  onSubmit,
  onCancel,
}: {
  assessment: Assessment
  questions: QuestionPublic[]
  passPercent: number
  onSubmit: (answers: Record<string, string>) => void
  onCancel: () => void
}) {
  const [i, setI] = useState(0)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const q = questions[i]
  const answered = Object.keys(answers).length
  const last = i === questions.length - 1
  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between text-xs text-[var(--muted)]">
        <button type="button" onClick={onCancel} className="text-[var(--accent)]">
          Leave
        </button>
        <span>
          {assessment.title}: {i + 1} of {questions.length}
        </span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-white/10" aria-hidden>
        <div className="h-full bg-[var(--accent)] transition-all" style={{ width: `${((i + 1) / questions.length) * 100}%` }} />
      </div>
      <p className="text-xs text-[var(--muted)]">
        Pass mark: {passPercent}% and every safety-critical question right. Answers show after you submit.
      </p>
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
        {q.critical && (
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-red-200">Safety-critical: must be right to pass</p>
        )}
        <p className="text-base font-medium leading-relaxed">{q.prompt}</p>
        <ul className="mt-3 space-y-2" role="radiogroup" aria-label="Answer choices">
          {q.choices.map((c) => {
            const on = answers[q.id] === c.id
            return (
              <li key={c.id}>
                <button
                  type="button"
                  role="radio"
                  aria-checked={on}
                  onClick={() => setAnswers({ ...answers, [q.id]: c.id })}
                  className={`w-full rounded-xl border px-3 py-3 text-left text-sm leading-snug ${
                    on ? 'border-[var(--accent)] bg-[var(--accent)]/15' : 'border-white/15 active:bg-white/10'
                  }`}
                >
                  {c.label}
                </button>
              </li>
            )
          })}
        </ul>
      </div>
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          disabled={i === 0}
          onClick={() => setI(i - 1)}
          className="rounded-full border border-white/15 px-5 py-2.5 text-sm disabled:opacity-30"
        >
          Back
        </button>
        {last ? (
          <button
            type="button"
            onClick={() => {
              if (answered < questions.length && !window.confirm(`${questions.length - answered} unanswered. Unanswered counts as wrong. Submit anyway?`)) return
              onSubmit(answers)
            }}
            className="rounded-full bg-[var(--accent)] px-6 py-2.5 text-sm font-semibold text-[var(--on-accent)]"
          >
            Submit
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setI(i + 1)}
            className="rounded-full bg-[var(--accent)] px-6 py-2.5 text-sm font-semibold text-[var(--on-accent)]"
          >
            Next
          </button>
        )}
      </div>
    </section>
  )
}

function Done({
  assessment,
  questions,
  result,
  onAgain,
  onList,
}: {
  assessment: Assessment
  questions: QuestionPublic[]
  result: GradeResponse
  onAgain: () => void
  onList: () => void
}) {
  const qById = new Map(questions.map((q) => [q.id, q]))
  const critMiss = result.criticalMissed.length
  return (
    <section className="space-y-4">
      <div
        className={`rounded-2xl border p-4 ${result.passed ? 'border-emerald-400/50 bg-emerald-400/10' : 'border-amber-400/40 bg-amber-400/10'}`}
        aria-live="polite"
      >
        <p className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">{assessment.title}</p>
        <p className="mt-1 text-3xl font-semibold">{result.percent}%</p>
        <p className="mt-1 text-sm">
          {result.correct} of {result.total} right. {result.passed ? 'Passed.' : `Not passed yet. You need ${result.passPercent}% and every safety-critical question right.`}
        </p>
        {critMiss > 0 && (
          <p className="mt-2 text-sm font-semibold text-red-200">
            {critMiss} safety-critical {critMiss === 1 ? 'question' : 'questions'} missed. Review {critMiss === 1 ? 'it' : 'them'} below, then try again.
          </p>
        )}
      </div>
      <ol className="space-y-3">
        {result.results.map((r, n) => {
          const q = qById.get(r.id)
          if (!q) return null
          const right = q.choices.find((c) => c.id === r.answerId)
          const given = q.choices.find((c) => c.id === r.given)
          return (
            <li key={r.id} className={`rounded-xl border p-3 ${r.correct ? 'border-white/10' : 'border-red-400/40 bg-red-500/5'}`}>
              <p className="text-xs text-[var(--muted)]">
                {n + 1}. {r.correct ? 'Right' : 'Missed'}
                {q.critical ? ', safety-critical' : ''}
              </p>
              <p className="mt-1 text-sm font-medium leading-relaxed">{q.prompt}</p>
              {!r.correct && <p className="mt-1 text-sm text-red-200">Your answer: {given?.label ?? 'No answer'}</p>}
              <p className="mt-1 text-sm text-emerald-200">Correct: {right?.label}</p>
              <p className="mt-1 text-sm leading-relaxed text-[var(--muted)]">{r.explain}</p>
              <SourceList ids={q.sourceIds} />
            </li>
          )
        })}
      </ol>
      <div className="flex gap-3">
        <button type="button" onClick={onAgain} className="flex-1 rounded-full bg-[var(--accent)] px-5 py-3 text-sm font-semibold text-[var(--on-accent)]">
          New attempt
        </button>
        <button type="button" onClick={onList} className="flex-1 rounded-full border border-white/15 px-5 py-3 text-sm">
          All assessments
        </button>
      </div>
    </section>
  )
}

export function AssessmentRunner() {
  const ctx = useCoachEd()
  const [phase, setPhase] = useState<Phase>({ kind: 'list' })
  const [error, setError] = useState<string | null>(null)
  const mine = ctx.state?.mine.assessments ?? {}
  const passPercent = ctx.state?.passPercent ?? 85

  const counts = useMemo(() => {
    const out = new Map<string, number>()
    for (const a of ASSESSMENTS) {
      const topics = new Set(a.topicIds)
      out.set(a.id, QUESTION_BANK.filter((q) => topics.has(q.topicId)).length)
    }
    return out
  }, [])

  const start = async (assessment: Assessment) => {
    setError(null)
    setPhase({ kind: 'loading', assessment })
    try {
      const res = await coachEdApi.startAttempt(assessment.id)
      const questions = res.questionIds.map((id) => bankById.get(id)).filter((q): q is QuestionPublic => Boolean(q))
      setPhase({ kind: 'run', assessment, attemptId: res.attemptId, questions, passPercent: res.passPercent })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not start.')
      setPhase({ kind: 'list' })
    }
  }

  useEffect(() => {
    if (phase.kind !== 'run') return
    const warn = (e: BeforeUnloadEvent) => e.preventDefault()
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [phase.kind])

  if (phase.kind === 'loading' || phase.kind === 'grading') return <p className="py-10 text-center text-sm text-[var(--muted)]">Working</p>
  if (phase.kind === 'run') {
    const { assessment, attemptId, questions } = phase
    return (
      <Run
        assessment={assessment}
        questions={questions}
        passPercent={phase.passPercent}
        onCancel={() => setPhase({ kind: 'list' })}
        onSubmit={async (answers) => {
          setPhase({ kind: 'grading' })
          try {
            const result = await coachEdApi.submitAttempt(attemptId, answers)
            ctx.patch({ mine: result.mine })
            setPhase({ kind: 'done', assessment, questions, result })
          } catch (e) {
            setError(e instanceof Error ? e.message : 'Could not submit. Your answers were not saved. Start a new attempt.')
            setPhase({ kind: 'list' })
          }
        }}
      />
    )
  }
  if (phase.kind === 'done') {
    return (
      <Done
        assessment={phase.assessment}
        questions={phase.questions}
        result={phase.result}
        onAgain={() => void start(phase.assessment)}
        onList={() => setPhase({ kind: 'list' })}
      />
    )
  }
  return (
    <section className="space-y-3">
      <div>
        <h3 className="text-xl font-semibold">Assessments</h3>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Each pass needs {passPercent}% and every safety-critical question right. Questions are drawn fresh each time and graded on
          the server. Draft content is still being reviewed, so questions may be reworded.
        </p>
      </div>
      {error && <p role="alert" className="rounded-xl border border-red-400/40 bg-red-500/10 px-3 py-2 text-sm text-red-200">{error}</p>}
      <ul className="space-y-2">
        {ASSESSMENTS.map((a) => {
          const m = mine[a.id]
          return (
            <li key={a.id}>
              <button
                type="button"
                onClick={() => void start(a)}
                className="flex w-full items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-3 text-left active:bg-white/10"
              >
                <span className="min-w-0">
                  <span className="block text-base font-semibold leading-snug">{a.title}</span>
                  <span className="block text-xs text-[var(--muted)]">{a.blurb}</span>
                  <span className="mt-1 block text-[11px] text-[var(--muted)]">
                    {counts.get(a.id)} questions in the bank
                    {a.requiresCriticalCorrect ? ', includes safety-critical items' : ''}
                  </span>
                </span>
                <span className="shrink-0 text-right text-xs">
                  {m ? (
                    <>
                      <span className={`block font-semibold ${m.passed ? 'text-emerald-300' : 'text-amber-200'}`}>{m.passed ? 'Passed' : 'Not passed'}</span>
                      <span className="block text-[var(--muted)]">Best {m.bestPercent}%</span>
                    </>
                  ) : (
                    <span className="text-[var(--muted)]">Not taken</span>
                  )}
                </span>
              </button>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
