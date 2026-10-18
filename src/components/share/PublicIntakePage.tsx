/**
 * Public athlete intake (build 1076).
 *
 * Rendered standalone at /intake/<token> with NO sign-in. The token is tied
 * to one athlete's profile (made by the coach via quick-add) — the link only
 * ever touches that profile. No roster search, no name enumeration.
 *
 * The athlete answers any unanswered intake questions. Questions that
 * reference a body position show the shape still, same as the in-app intake.
 */

import { useEffect, useMemo, useState } from 'react'
import { CORE_INTAKE, type IntakeQuestion } from '../../lib/intakeQuestions'
import { shippedFileList } from '../../lib/shippedRefs'

function stillUrl(q: IntakeQuestion): string | null {
  if (q.stillFile) return `/references/${q.stillFile}`
  if (q.stillShapeId) {
    const files = shippedFileList(q.stillShapeId)
    if (files.length > 0) return `/references/${files[0]}`
  }
  return null
}

function QuestionView({
  q,
  value,
  onChange,
}: {
  q: IntakeQuestion
  value: string
  onChange: (v: string) => void
}) {
  const still = stillUrl(q)
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
      {still && (
        <img
          src={still}
          alt=""
          className="mb-4 max-h-56 w-full rounded-xl object-contain bg-black/40"
        />
      )}
      <p className="text-base font-semibold text-white">{q.prompt}</p>
      {q.kind === 'choice' && q.options && (
        <div className="mt-3 grid grid-cols-2 gap-2">
          {q.options.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => onChange(opt.value)}
              className={`rounded-xl border px-3 py-2.5 text-sm font-semibold ${
                value === opt.value
                  ? 'border-sky-400 bg-sky-400/20 text-white'
                  : 'border-white/15 bg-black/30 text-white/80'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
      {q.kind === 'color' && q.options && (
        <div className="mt-3 grid grid-cols-3 gap-2">
          {q.options.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => onChange(opt.value)}
              className={`rounded-xl border px-3 py-2.5 text-sm font-semibold ${
                value === opt.value
                  ? 'border-sky-400 bg-sky-400/20 text-white'
                  : 'border-white/15 bg-black/30 text-white/80'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
      {(q.kind === 'skip-phone') && (
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="mt-3 h-11 w-full rounded-xl border border-white/15 bg-black/40 px-3 text-white"
          placeholder="Phone number (optional)"
          inputMode="tel"
        />
      )}
      {q.kind === 'photo' && (
        <p className="mt-3 text-sm text-white/55">
          You can add a photo when you see your coach.
        </p>
      )}
    </div>
  )
}

export default function PublicIntakePage({ token }: { token: string }) {
  const [coachName, setCoachName] = useState('Your coach')
  const [athleteName, setAthleteName] = useState('')
  const [answeredIds, setAnsweredIds] = useState<string[]>([])
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [qIndex, setQIndex] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [invalid, setInvalid] = useState(false)
  const [done, setDone] = useState(false)

  useEffect(() => {
    fetch(`/api/share/intake?token=${encodeURIComponent(token)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!d?.ok) {
          setInvalid(true)
          return
        }
        setCoachName(d.coachName ?? 'Your coach')
        setAthleteName(d.athleteName ?? '')
        setAnsweredIds(d.answeredIds ?? [])
      })
      .catch(() => setInvalid(true))
  }, [token])

  // All questions in order, skipping ones already answered.
  const questions = useMemo(() => {
    const answered = new Set(answeredIds)
    return CORE_INTAKE.filter((q) => !answered.has(q.id))
  }, [answeredIds])

  const submit = async () => {
    setSubmitting(true)
    setError(null)
    try {
      const payloadAnswers = questions.map((q) => ({
        questionId: q.id,
        prompt: q.prompt,
        answer: answers[q.id] ?? '',
        askedAt: new Date().toISOString(),
      }))
      const r = await fetch(`/api/share/intake-submit?token=${encodeURIComponent(token)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answers: payloadAnswers }),
      })
      const d = await r.json()
      if (!r.ok || !d?.ok) throw new Error(d?.error ?? 'Could not save.')
      setDone(true)
    } catch (e: any) {
      setError(e?.message ?? 'Could not save. Try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (invalid) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-[#0a1014] p-6">
        <p className="text-center text-white/70">This link is invalid or expired.</p>
      </div>
    )
  }

  const q = questions[qIndex]
  const last = qIndex >= questions.length - 1

  return (
    <div className="min-h-dvh bg-[#0a1014] px-4 py-8">
      <div className="mx-auto w-full max-w-md">
        <p className="text-center text-xs font-semibold uppercase tracking-[0.2em] text-sky-300/80">
          {coachName} · Athlete intake
        </p>

        {done ? (
          <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-6 text-center">
            <h1 className="text-xl font-bold text-white">You're all set!</h1>
            <p className="mt-2 text-sm text-white/60">
              Your answers are saved. See you at the gym!
            </p>
          </div>
        ) : questions.length === 0 ? (
          <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-6 text-center">
            <h1 className="text-xl font-bold text-white">
              Hi{athleteName ? ` ${athleteName.split(' ')[0]}` : ''}!
            </h1>
            <p className="mt-2 text-sm text-white/60">
              You've already answered everything. See you at the gym!
            </p>
          </div>
        ) : (
          q && (
            <div className="mt-6">
              <h1 className="mb-1 text-center text-lg font-bold text-white">
                Hi{athleteName ? ` ${athleteName.split(' ')[0]}` : ''}!
              </h1>
              <p className="mb-3 text-center text-sm text-white/50">
                Question {qIndex + 1} of {questions.length}
              </p>
              <QuestionView
                q={q}
                value={answers[q.id] ?? ''}
                onChange={(v) => setAnswers((s) => ({ ...s, [q.id]: v }))}
              />
              {error && <p className="mt-2 text-sm text-red-300">{error}</p>}
              <div className="mt-4 flex gap-2">
                {qIndex > 0 && (
                  <button
                    type="button"
                    onClick={() => setQIndex(qIndex - 1)}
                    className="h-12 flex-1 rounded-xl border border-white/15 text-white font-semibold"
                  >
                    Back
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => (last ? void submit() : setQIndex(qIndex + 1))}
                  disabled={submitting}
                  className="h-12 flex-[2] rounded-xl bg-sky-400 text-base font-bold text-black disabled:opacity-40"
                >
                  {submitting ? 'Saving…' : last ? 'Save answers' : 'Next'}
                </button>
              </div>
            </div>
          )
        )}
      </div>
    </div>
  )
}
