/**
 * Coach Interview — Ryan answers in his own words. No rewriting, no AI voice.
 * Answers save to the gym computer and become the raw material for the Parent Guide.
 */
import { useEffect, useMemo, useState } from 'react'
import { COACH_INTERVIEW } from '../../config/coachInterview'
import { pullCoachInterview, pushCoachInterview } from '../../lib/coachInterviewStore'

const totalQuestions = COACH_INTERVIEW.reduce((n, s) => n + s.questions.length, 0)

export function CoachInterview() {
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [loaded, setLoaded] = useState(false)
  const [saving, setSaving] = useState(false)
  const [savedAt, setSavedAt] = useState<string | null>(null)
  const [openSection, setOpenSection] = useState<string | null>(COACH_INTERVIEW[0]?.lessonId ?? null)
  const [reviewMode, setReviewMode] = useState(false)

  useEffect(() => {
    pullCoachInterview().then((a) => {
      setAnswers(a)
      setLoaded(true)
    })
  }, [])

  const answeredCount = useMemo(
    () => Object.values(answers).filter((t) => t.trim().length > 0).length,
    [answers],
  )

  const save = async () => {
    setSaving(true)
    const ok = await pushCoachInterview(answers)
    setSaving(false)
    if (ok) setSavedAt(new Date().toLocaleTimeString())
  }

  if (!loaded) {
    return <p className="text-sm text-[var(--muted)]">Loading your interview…</p>
  }

  if (reviewMode) {
    return (
      <div className="grid gap-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-[var(--accent)]">
              Coach interview
            </p>
            <h2 className="mt-1 text-xl font-semibold">Your answers, organized</h2>
            <p className="mt-1 text-sm text-[var(--muted)]">
              Your words, grouped by lesson. Nothing rewritten.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setReviewMode(false)}
            className="rounded-lg border border-[var(--panel-border)] px-3 py-2 text-sm"
          >
            Back to questions
          </button>
        </div>
        {COACH_INTERVIEW.map((section) => {
          const sectionAnswers = section.questions.filter((q) => answers[q.id]?.trim())
          if (sectionAnswers.length === 0) return null
          return (
            <section
              key={section.lessonId}
              className="rounded-xl border border-[var(--panel-border)] bg-[var(--panel)] p-5"
            >
              <h3 className="font-semibold">{section.lessonTitle}</h3>
              <div className="mt-3 space-y-4">
                {sectionAnswers.map((q) => (
                  <div key={q.id}>
                    <p className="text-xs uppercase tracking-wider text-[var(--muted)]">{q.question}</p>
                    <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed">{answers[q.id]}</p>
                  </div>
                ))}
              </div>
            </section>
          )
        })}
        {answeredCount === 0 && (
          <p className="text-sm text-[var(--muted)]">No answers yet. Go answer some questions.</p>
        )}
      </div>
    )
  }

  return (
    <div className="grid gap-4">
      <div className="rounded-xl border border-[var(--panel-border)] bg-[var(--panel)] p-5">
        <p className="text-xs font-semibold uppercase tracking-wider text-[var(--accent)]">
          Coach interview
        </p>
        <h2 className="mt-1 text-xl font-semibold">Say it like you would on the floor</h2>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[var(--muted)]">
          These questions pull out how you actually coach. Answer in your own words, the way you
          would talk to a parent at the gym. Short answers are fine. Bullet points are fine. Nobody
          is grading this. Your answers become the raw material for the Parent Guide, and nothing
          gets rewritten into something that does not sound like you.
        </p>
        <div className="mt-3 flex items-center gap-3">
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-[var(--accent)] transition-all"
              style={{ width: `${Math.round((answeredCount / totalQuestions) * 100)}%` }}
            />
          </div>
          <p className="text-xs text-[var(--muted)]">
            {answeredCount} of {totalQuestions} answered
          </p>
        </div>
        <div className="mt-3 flex gap-2">
          <button
            type="button"
            onClick={save}
            disabled={saving}
            className="rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-[#061418] disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Save answers'}
          </button>
          <button
            type="button"
            onClick={() => setReviewMode(true)}
            className="rounded-lg border border-[var(--panel-border)] px-4 py-2 text-sm"
          >
            Review my answers
          </button>
          {savedAt && <p className="self-center text-xs text-[var(--muted)]">Saved {savedAt}</p>}
        </div>
      </div>

      {COACH_INTERVIEW.map((section) => {
        const open = openSection === section.lessonId
        const sectionAnswered = section.questions.filter((q) => answers[q.id]?.trim()).length
        return (
          <section
            key={section.lessonId}
            className="rounded-xl border border-[var(--panel-border)] bg-[var(--panel)]"
          >
            <button
              type="button"
              onClick={() => setOpenSection(open ? null : section.lessonId)}
              className="flex w-full items-center justify-between px-5 py-4 text-left"
            >
              <div>
                <h3 className="font-semibold">{section.lessonTitle}</h3>
                <p className="mt-0.5 text-xs text-[var(--muted)]">{section.intro}</p>
              </div>
              <span className="ml-4 shrink-0 text-xs text-[var(--muted)]">
                {sectionAnswered}/{section.questions.length} {open ? '▾' : '▸'}
              </span>
            </button>
            {open && (
              <div className="space-y-5 border-t border-[var(--panel-border)] px-5 py-5">
                {section.questions.map((q) => (
                  <div key={q.id}>
                    <label
                      htmlFor={`interview-${q.id}`}
                      className="block text-sm font-medium leading-relaxed"
                    >
                      {q.question}
                    </label>
                    {q.hint && (
                      <p className="mt-1 text-xs text-[var(--muted)]">{q.hint}</p>
                    )}
                    <textarea
                      id={`interview-${q.id}`}
                      value={answers[q.id] ?? ''}
                      onChange={(e) =>
                        setAnswers((prev) => ({ ...prev, [q.id]: e.target.value }))
                      }
                      onBlur={save}
                      rows={4}
                      placeholder="Say it your way…"
                      className="mt-2 w-full rounded-lg border border-[var(--panel-border)] bg-black/20 px-3 py-2 text-sm leading-relaxed placeholder:text-[var(--muted)]/60 focus:border-[var(--accent)] focus:outline-none"
                    />
                  </div>
                ))}
              </div>
            )}
          </section>
        )
      })}

      <div className="flex gap-2">
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-[#061418] disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'Save answers'}
        </button>
        {savedAt && <p className="self-center text-xs text-[var(--muted)]">Saved {savedAt}</p>}
      </div>
    </div>
  )
}
