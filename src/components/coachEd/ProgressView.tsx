import { useEffect, useState } from 'react'
import { ASSESSMENTS, MASTERY_LEVELS } from '../../content/coachEd/assessments'
import { MASTERY_DISCLAIMER } from '../../content/coachEd/types'
import { coachEdApi, type DashboardRow } from './api'
import { AssessmentRunner } from './AssessmentRunner'
import { useCoachEd } from './CoachEdContext'
import { useLessons } from './useLessons'

function Mine() {
  const ctx = useCoachEd()
  const lessons = useLessons()
  const mine = ctx.state?.mine
  if (!mine) return <p className="py-6 text-center text-sm text-[var(--muted)]">Loading</p>
  const passed = new Set(Object.entries(mine.assessments).filter(([, v]) => v.passed).map(([k]) => k))
  const read = Object.keys(mine.lessons).length
  return (
    <section className="space-y-4">
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">ShapeLab achievement</p>
        <p className="mt-1 text-2xl font-semibold">{mine.mastery?.label ?? 'Not started'}</p>
        <p className="mt-1 text-xs leading-relaxed text-[var(--muted)]">{MASTERY_DISCLAIMER}</p>
      </div>
      <ol className="space-y-2">
        {MASTERY_LEVELS.map((lvl) => {
          const got = lvl.requires.filter((r) => passed.has(r)).length
          const full = got === lvl.requires.length
          return (
            <li key={lvl.id} className="rounded-xl border border-white/10 px-3 py-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-base font-semibold">{lvl.label}</span>
                <span className={`text-xs font-semibold ${full ? 'text-emerald-300' : 'text-[var(--muted)]'}`}>
                  {full ? 'Reached' : `${got} of ${lvl.requires.length} passed`}
                </span>
              </div>
              <p className="mt-0.5 text-xs text-[var(--muted)]">{lvl.blurb}</p>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10" aria-hidden>
                <div className="h-full bg-[var(--accent)]" style={{ width: `${(got / lvl.requires.length) * 100}%` }} />
              </div>
              {!full && (
                <p className="mt-1.5 text-[11px] text-[var(--muted)]">
                  Still needed: {lvl.requires.filter((r) => !passed.has(r)).map((r) => ASSESSMENTS.find((a) => a.id === r)?.title ?? r).join(', ')}
                </p>
              )}
            </li>
          )
        })}
      </ol>
      <p className="text-sm text-[var(--muted)]">
        Lessons read: {read}
        {lessons ? ` of ${lessons.length}` : ''}.
      </p>
    </section>
  )
}

function Team() {
  const [rows, setRows] = useState<DashboardRow[] | null>(null)
  const [total, setTotal] = useState(0)
  const [error, setError] = useState<string | null>(null)
  useEffect(() => {
    let live = true
    coachEdApi
      .dashboard()
      .then((d) => {
        if (!live) return
        setRows(d.coaches)
        setTotal(d.lessonCount)
      })
      .catch((e) => live && setError(e instanceof Error ? e.message : 'Could not load.'))
    return () => {
      live = false
    }
  }, [])
  if (error) return <p role="alert" className="text-sm text-red-200">{error}</p>
  if (!rows) return <p className="py-6 text-center text-sm text-[var(--muted)]">Loading</p>
  return (
    <section className="space-y-3">
      <p className="text-sm text-[var(--muted)]">
        Coach progress. Achievements are internal ShapeLab milestones, not credentials. This is separate from athlete medical history.
      </p>
      {rows.length === 0 && <p className="text-sm text-[var(--muted)]">No coach accounts yet.</p>}
      <ul className="space-y-2">
        {rows.map((r) => {
          const passed = Object.values(r.assessments).filter((a) => a.passed).length
          return (
            <li key={r.accountId} className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-base font-semibold">{r.name}</span>
                <span className="text-xs font-semibold text-[var(--accent)]">{r.mastery?.label ?? 'Not started'}</span>
              </div>
              <p className="mt-0.5 text-xs text-[var(--muted)]">
                {r.lessonsDone} of {total} lessons read, {passed} of {ASSESSMENTS.length} assessments passed
              </p>
              <ul className="mt-2 flex flex-wrap gap-1.5">
                {ASSESSMENTS.map((a) => {
                  const m = r.assessments[a.id]
                  return (
                    <li
                      key={a.id}
                      title={a.title}
                      className={`rounded-full border px-2 py-0.5 text-[10px] ${
                        m?.passed ? 'border-emerald-400/50 text-emerald-200' : m ? 'border-amber-400/40 text-amber-200' : 'border-white/10 text-[var(--muted)]'
                      }`}
                    >
                      {a.title}
                      {m ? ` ${m.bestPercent}%` : ''}
                    </li>
                  )
                })}
              </ul>
            </li>
          )
        })}
      </ul>
    </section>
  )
}

type Sub = 'mine' | 'tests' | 'team'

export function ProgressView({ children }: { children?: React.ReactNode }) {
  const ctx = useCoachEd()
  const [sub, setSub] = useState<Sub>('tests')
  const tabs: { id: Sub | 'admin'; label: string }[] = [
    { id: 'tests', label: 'Assessments' },
    { id: 'mine', label: 'My progress' },
    ...(ctx.isAdmin ? [{ id: 'team' as const, label: 'Coaches' }, { id: 'admin' as const, label: 'Review' }] : []),
  ]
  const [admin, setAdmin] = useState(false)
  return (
    <div className="space-y-4">
      <div role="tablist" className="flex gap-1.5 overflow-x-auto pb-1">
        {tabs.map((t) => {
          const on = t.id === 'admin' ? admin : !admin && sub === t.id
          return (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={on}
              onClick={() => {
                if (t.id === 'admin') setAdmin(true)
                else {
                  setAdmin(false)
                  setSub(t.id)
                }
              }}
              className={`shrink-0 rounded-full border px-3.5 py-1.5 text-xs font-semibold ${
                on ? 'border-[var(--accent)] bg-[var(--accent)] text-[var(--on-accent)]' : 'border-white/15 text-[var(--muted)]'
              }`}
            >
              {t.label}
            </button>
          )
        })}
      </div>
      {admin ? children : sub === 'tests' ? <AssessmentRunner /> : sub === 'mine' ? <Mine /> : <Team />}
    </div>
  )
}
