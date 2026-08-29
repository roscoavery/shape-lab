/**
 * Research tab — scientific-method studies of tumbling in this gym.
 */

import { useEffect, useMemo, useState } from 'react'
import type { Athlete } from '../../types'
import {
  RESEARCH_STUDIES,
  fieldVisible,
  studyById,
  type StudyDef,
  type StudyField,
} from '../../config/researchStudies'
import {
  addIdea,
  answersFromDraft,
  loadResearch,
  observationFor,
  observationsForStudy,
  removeIdea,
  removeObservation,
  saveResearch,
  upsertObservation,
  type Observation,
  type ResearchFile,
} from '../../lib/research'
import {
  countChoice,
  countMulti,
  integerHistogram,
  lateralityCrosstabs,
  majorityLine,
  numberValues,
  studyFinding,
  summarizeNumbers,
  type CountRow,
  type Crosstab,
} from '../../lib/researchStats'
import { isCoachProfile } from '../../lib/profileRole'

type View =
  | { page: 'list' }
  | { page: 'study'; id: string }
  | { page: 'correlations' }
  | { page: 'ideas' }

type Props = {
  athletes: Athlete[]
  athlete: Athlete | null
}

export function ResearchPanel({ athletes, athlete }: Props) {
  const [file, setFile] = useState<ResearchFile | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [view, setView] = useState<View>({ page: 'list' })

  useEffect(() => {
    let cancelled = false
    void loadResearch().then((next) => {
      if (!cancelled) setFile(next)
    })
    return () => {
      cancelled = true
    }
  }, [])

  const persist = async (next: ResearchFile): Promise<boolean> => {
    const saved = await saveResearch(next)
    if (!saved) {
      setError('Could not save on this gym computer.')
      return false
    }
    setFile(saved)
    setError(null)
    return true
  }

  if (!file) {
    return (
      <div className="mx-auto max-w-3xl">
        <p className="rounded-2xl border border-[var(--panel-border)] bg-[var(--panel)] px-4 py-8 text-center text-sm text-[var(--muted)]">
          Loading gym research…
        </p>
      </div>
    )
  }

  const lateralityStudy = studyById('laterality')
  const fearStudy = studyById('fear-blocks')

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <section className="rounded-2xl border border-[var(--panel-border)] bg-[var(--panel)] px-4 py-4">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--accent)]">
          Research
        </p>
        <h2 className="mt-1 text-xl font-semibold text-[var(--text)]">Tumbling studies</h2>
        <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">
          Ask a question, state what we think, log what this gym actually does, then look
          at the counts. n is this gym — not a world census, and not a cause. Anyone can
          read findings. Unlock a profile to log. Coaches log for any athlete; athletes
          log for themselves.
        </p>
        <div className="mt-3 flex flex-wrap gap-1">
          {(
            [
              ['list', 'Studies'],
              ['correlations', 'Correlations'],
              ['ideas', 'Ideas'],
            ] as const
          ).map(([id, label]) => {
            const on =
              (id === 'list' && (view.page === 'list' || view.page === 'study')) ||
              (id === 'correlations' && view.page === 'correlations') ||
              (id === 'ideas' && view.page === 'ideas')
            return (
              <button
                key={id}
                type="button"
                onClick={() =>
                  setView(
                    id === 'list'
                      ? { page: 'list' }
                      : id === 'correlations'
                        ? { page: 'correlations' }
                        : { page: 'ideas' },
                  )
                }
                className={`rounded-md px-3 py-1.5 text-sm ${
                  on
                    ? 'bg-[var(--accent-dim)] font-semibold text-white'
                    : 'text-[var(--muted)] hover:text-[var(--text)]'
                }`}
              >
                {label}
              </button>
            )
          })}
        </div>
      </section>

      {error && (
        <p className="rounded-xl border border-[var(--bad)]/40 bg-[#2a1518] px-4 py-2 text-sm text-[var(--bad)]">
          {error}
        </p>
      )}

      {view.page === 'list' && (
        <StudyList file={file} onOpen={(id) => setView({ page: 'study', id })} />
      )}
      {view.page === 'study' && (
        <StudyPage
          study={studyById(view.id)}
          file={file}
          athletes={athletes}
          athlete={athlete}
          onBack={() => setView({ page: 'list' })}
          onSave={persist}
        />
      )}
      {view.page === 'correlations' && lateralityStudy && (
        <CorrelationsPage
          file={file}
          lateralityStudy={lateralityStudy}
          fearStudy={fearStudy}
        />
      )}
      {view.page === 'ideas' && (
        <IdeasPage file={file} athlete={athlete} athletes={athletes} onSave={persist} />
      )}
    </div>
  )
}

function StudyList({
  file,
  onOpen,
}: {
  file: ResearchFile
  onOpen: (id: string) => void
}) {
  return (
    <ul className="space-y-3">
      {RESEARCH_STUDIES.map((study) => {
        const rows = observationsForStudy(file, study.id)
        return (
          <li key={study.id}>
            <button
              type="button"
              onClick={() => onOpen(study.id)}
              className="w-full rounded-2xl border border-[var(--panel-border)] bg-[var(--panel)] px-4 py-4 text-left"
            >
              <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--accent)]">
                {study.title}
              </p>
              <p className="mt-1 text-sm font-semibold text-[var(--text)]">{study.question}</p>
              <p className="mt-2 text-sm text-[var(--muted)]">{studyFinding(study, rows)}</p>
            </button>
          </li>
        )
      })}
    </ul>
  )
}

function StudyPage({
  study,
  file,
  athletes,
  athlete,
  onBack,
  onSave,
}: {
  study: StudyDef | undefined
  file: ResearchFile
  athletes: Athlete[]
  athlete: Athlete | null
  onBack: () => void
  onSave: (next: ResearchFile) => Promise<boolean>
}) {
  if (!study) {
    return (
      <p className="text-sm text-[var(--muted)]">
        That study is not in this build.{' '}
        <button type="button" className="text-[var(--accent)]" onClick={onBack}>
          Back to studies
        </button>
      </p>
    )
  }
  const rows = observationsForStudy(file, study.id)
  const coach = isCoachProfile(athlete)
  return (
    <div className="space-y-4">
      <button
        type="button"
        onClick={onBack}
        className="text-sm text-[var(--muted)] hover:text-[var(--text)]"
      >
        ← Studies
      </button>
      <section className="rounded-2xl border border-[var(--panel-border)] bg-[var(--panel)] px-4 py-4">
        <h3 className="text-lg font-semibold text-[var(--text)]">{study.title}</h3>
        <MethodBlock study={study} />
      </section>
      <CollectForm
        study={study}
        file={file}
        athletes={athletes}
        athlete={athlete}
        onSave={onSave}
      />
      <Findings study={study} observations={rows} />
      {coach && rows.length > 0 && (
        <WhoLogged
          observations={rows}
          athletes={athletes}
          study={study}
          file={file}
          onSave={onSave}
        />
      )}
    </div>
  )
}

function MethodBlock({ study }: { study: StudyDef }) {
  return (
    <dl className="mt-3 space-y-3 text-sm leading-relaxed">
      <div>
        <dt className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)]">
          Question
        </dt>
        <dd className="mt-0.5 text-[var(--text)]">{study.question}</dd>
      </div>
      <div>
        <dt className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)]">
          Hypothesis
        </dt>
        <dd className="mt-0.5 text-[var(--muted)]">{study.hypothesis}</dd>
      </div>
      <div>
        <dt className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)]">
          Method
        </dt>
        <dd className="mt-0.5 text-[var(--muted)]">{study.method}</dd>
      </div>
      <div>
        <dt className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)]">
          Caveats
        </dt>
        <dd className="mt-0.5 text-[var(--muted)]">{study.caveats}</dd>
      </div>
    </dl>
  )
}

function CollectForm({
  study,
  file,
  athletes,
  athlete,
  onSave,
}: {
  study: StudyDef
  file: ResearchFile
  athletes: Athlete[]
  athlete: Athlete | null
  onSave: (next: ResearchFile) => Promise<boolean>
}) {
  const coach = isCoachProfile(athlete)
  const [subjectId, setSubjectId] = useState(athlete && !coach ? athlete.id : athlete?.id ?? '')
  const [draft, setDraft] = useState<Record<string, unknown>>({})
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const [formError, setFormError] = useState<string | null>(null)

  const existing = subjectId ? observationFor(file, study.id, subjectId) : undefined

  useEffect(() => {
    if (!coach && athlete) setSubjectId(athlete.id)
  }, [coach, athlete])

  useEffect(() => {
    if (existing) {
      setDraft({ ...existing.answers })
      return
    }
    setDraft({})
  }, [existing, subjectId, study.id])

  if (!athlete) {
    return (
      <section className="rounded-2xl border border-dashed border-[var(--panel-border)] px-4 py-4 text-sm text-[var(--muted)]">
        Unlock a profile on Athletes to log an observation. Findings below stay readable.
      </section>
    )
  }

  const subjects = coach ? athletes : athletes.filter((a) => a.id === athlete.id)

  const setField = (id: string, value: unknown) => {
    setDraft((prev) => ({ ...prev, [id]: value }))
    setFormError(null)
    setNotice(null)
  }

  const submit = async () => {
    if (!subjectId) {
      setFormError('Pick who this observation is about.')
      return
    }
    const parsed = answersFromDraft(study, draft)
    if ('error' in parsed) {
      setFormError(parsed.error)
      return
    }
    setBusy(true)
    const ok = await onSave(
      upsertObservation(file, {
        study,
        subjectId,
        recorderId: athlete.id,
        answers: parsed.answers,
        existing,
      }),
    )
    setBusy(false)
    if (ok) setNotice(existing ? 'Updated this log.' : 'Logged for this gym’s sample.')
  }

  return (
    <section className="rounded-2xl border border-[var(--panel-border)] bg-[var(--panel)] p-4">
      <h4 className="text-sm font-semibold text-[var(--text)]">Collect</h4>
      <p className="mt-1 text-xs text-[var(--muted)]">
        {coach
          ? 'Log for any athlete. One record per person — saving again updates it.'
          : 'This log is for you. Saving again updates it.'}
      </p>
      <form
        className="mt-3 space-y-4"
        onSubmit={(e) => {
          e.preventDefault()
          void submit()
        }}
      >
        {coach && (
          <label className="block text-sm">
            <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-[var(--muted)]">
              Athlete
            </span>
            <select
              value={subjectId}
              onChange={(e) => setSubjectId(e.target.value)}
              className="w-full rounded-lg border border-[var(--panel-border)] bg-[#0d1218] px-3 py-2"
            >
              <option value="">Pick an athlete</option>
              {subjects.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </label>
        )}
        {study.fields.map((field) =>
          fieldVisible(field, draft) ? (
            <FieldInput
              key={field.id}
              field={field}
              value={draft[field.id]}
              onChange={(v) => setField(field.id, v)}
            />
          ) : null,
        )}
        {formError && <p className="text-sm text-[var(--bad)]">{formError}</p>}
        {notice && <p className="text-sm text-[var(--accent)]">{notice}</p>}
        <button
          type="submit"
          disabled={busy}
          className="rounded-lg bg-[var(--accent)] px-3 py-1.5 text-sm font-semibold text-[#06281f] disabled:opacity-50"
        >
          {busy ? 'Saving…' : existing ? 'Update log' : 'Save observation'}
        </button>
      </form>
    </section>
  )
}

function FieldInput({
  field,
  value,
  onChange,
}: {
  field: StudyField
  value: unknown
  onChange: (value: unknown) => void
}) {
  if (field.kind === 'text') {
    return (
      <label className="block text-sm">
        <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-[var(--muted)]">
          {field.label}
        </span>
        {field.help && <span className="mb-1 block text-xs text-[var(--muted)]">{field.help}</span>}
        <textarea
          value={typeof value === 'string' ? value : ''}
          onChange={(e) => onChange(e.target.value)}
          rows={2}
          className="w-full rounded-lg border border-[var(--panel-border)] bg-[#0d1218] px-3 py-2 text-sm"
        />
      </label>
    )
  }
  if (field.kind === 'number') {
    return (
      <label className="block text-sm">
        <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-[var(--muted)]">
          {field.label}
        </span>
        {field.help && <span className="mb-1 block text-xs text-[var(--muted)]">{field.help}</span>}
        <input
          type="number"
          min={field.min}
          max={field.max}
          value={typeof value === 'number' ? value : typeof value === 'string' ? value : ''}
          onChange={(e) => onChange(e.target.value === '' ? '' : Number(e.target.value))}
          className="w-28 rounded-lg border border-[var(--panel-border)] bg-[#0d1218] px-3 py-2 text-sm"
        />
      </label>
    )
  }
  if (field.kind === 'multi') {
    const selected = Array.isArray(value) ? value : []
    return (
      <fieldset>
        <legend className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-[var(--muted)]">
          {field.label}
        </legend>
        {field.help && <p className="mb-2 text-xs text-[var(--muted)]">{field.help}</p>}
        <div className="flex flex-wrap gap-2">
          {(field.options ?? []).map((opt) => {
            const on = selected.includes(opt.value)
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  const next = on
                    ? selected.filter((v) => v !== opt.value)
                    : [...selected, opt.value]
                  onChange(next)
                }}
                className={`rounded-full px-2.5 py-1 text-xs ${
                  on
                    ? 'bg-[var(--accent-dim)] font-semibold text-white'
                    : 'border border-[var(--panel-border)] text-[var(--muted)]'
                }`}
              >
                {opt.label}
              </button>
            )
          })}
        </div>
      </fieldset>
    )
  }
  return (
    <fieldset>
      <legend className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-[var(--muted)]">
        {field.label}
      </legend>
      {field.help && <p className="mb-2 text-xs text-[var(--muted)]">{field.help}</p>}
      <div className="flex flex-wrap gap-2">
        {(field.options ?? []).map((opt) => {
          const on = value === opt.value
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => onChange(opt.value)}
              className={`rounded-full px-2.5 py-1 text-xs ${
                on
                  ? 'bg-[var(--accent-dim)] font-semibold text-white'
                  : 'border border-[var(--panel-border)] text-[var(--muted)]'
              }`}
            >
              {opt.label}
            </button>
          )
        })}
      </div>
    </fieldset>
  )
}

function Findings({
  study,
  observations,
}: {
  study: StudyDef
  observations: Observation[]
}) {
  const n = observations.length
  return (
    <section className="rounded-2xl border border-[var(--panel-border)] bg-[var(--panel)] p-4">
      <h4 className="text-sm font-semibold text-[var(--text)]">Findings</h4>
      <p className="mt-1 text-xs text-[var(--muted)]">
        {n === 0
          ? 'No observations yet. The first log starts this gym’s sample.'
          : `n = ${n} athlete${n === 1 ? '' : 's'} in this gym.`}
      </p>
      <div className="mt-4 space-y-5">
        {study.fields.map((field) => {
          if (field.kind === 'text') return null
          if (field.kind === 'number') {
            const values = numberValues(observations, field.id)
            const summary = summarizeNumbers(values)
            const hist = integerHistogram(values)
            return (
              <div key={field.id}>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--muted)]">
                  {field.label}
                </p>
                {summary ? (
                  <p className="mt-1 text-sm text-[var(--text)]">
                    Median {fmtNum(summary.median)} · mean {summary.mean.toFixed(1)} · range{' '}
                    {fmtNum(summary.min)}–{fmtNum(summary.max)}
                  </p>
                ) : (
                  <p className="mt-1 text-sm text-[var(--muted)]">No numbers yet.</p>
                )}
                {hist.length > 0 && <BarList rows={hist} />}
              </div>
            )
          }
          if (field.kind === 'multi') {
            const { rows, respondents } = countMulti(observations, field)
            return (
              <div key={field.id}>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--muted)]">
                  {field.label}
                </p>
                <p className="mt-1 text-sm text-[var(--muted)]">
                  {respondents === 0
                    ? 'No answers yet.'
                    : `${majorityLine(rows)} People could pick more than one.`}
                </p>
                {respondents > 0 && <BarList rows={rows} />}
              </div>
            )
          }
          const rows = countChoice(observations, field)
          const total = rows.reduce((a, r) => a + r.n, 0)
          return (
            <div key={field.id}>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--muted)]">
                {field.label}
              </p>
              <p className="mt-1 text-sm text-[var(--muted)]">
                {total === 0 ? 'No answers yet.' : majorityLine(rows)}
              </p>
              {total > 0 && <BarList rows={rows} />}
            </div>
          )
        })}
      </div>
    </section>
  )
}

function BarList({ rows }: { rows: CountRow[] }) {
  const max = Math.max(1, ...rows.map((r) => r.n))
  return (
    <ul className="mt-2 space-y-1.5">
      {rows.map((row) => (
        <li
          key={row.value}
          className="grid grid-cols-[minmax(0,8rem)_minmax(0,1fr)_auto] items-center gap-2"
        >
          <span className="truncate text-xs text-[var(--muted)]">{row.label}</span>
          <div className="h-2 overflow-hidden rounded-full bg-[#0d1218]">
            <div
              className="h-full rounded-full bg-[var(--accent-dim)]"
              style={{ width: `${(row.n / max) * 100}%` }}
            />
          </div>
          <span className="w-14 text-right text-xs tabular-nums text-[var(--muted)]">
            {row.n}
            {row.n > 0 ? ` · ${row.pct}%` : ''}
          </span>
        </li>
      ))}
    </ul>
  )
}

function WhoLogged({
  observations,
  athletes,
  study,
  file,
  onSave,
}: {
  observations: Observation[]
  athletes: Athlete[]
  study: StudyDef
  file: ResearchFile
  onSave: (next: ResearchFile) => Promise<boolean>
}) {
  const [open, setOpen] = useState(false)
  const nameOf = (id: string) => athletes.find((a) => a.id === id)?.name ?? 'Unknown'
  return (
    <section className="rounded-2xl border border-[var(--panel-border)] bg-[var(--panel)] p-4">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="text-sm font-semibold text-[var(--text)]"
      >
        Who is in this sample {open ? '▾' : '▸'}
      </button>
      {open && (
        <ul className="mt-3 space-y-2">
          {observations.map((obs) => (
            <li
              key={obs.id}
              className="flex flex-wrap items-baseline justify-between gap-2 text-sm"
            >
              <span className="text-[var(--text)]">{nameOf(obs.subjectId)}</span>
              <span className="text-xs text-[var(--muted)]">
                logged {new Date(obs.updatedAt).toLocaleDateString()}
                {obs.recorderId !== obs.subjectId ? ` by ${nameOf(obs.recorderId)}` : ''}
              </span>
              <button
                type="button"
                className="text-xs text-[var(--bad)]"
                onClick={() => {
                  if (!confirm(`Remove ${nameOf(obs.subjectId)} from ${study.title}?`)) return
                  void onSave(removeObservation(file, obs.id))
                }}
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

function CorrelationsPage({
  file,
  lateralityStudy,
  fearStudy,
}: {
  file: ResearchFile
  lateralityStudy: StudyDef
  fearStudy?: StudyDef
}) {
  const tables = useMemo(() => {
    const laterality = observationsForStudy(file, lateralityStudy.id)
    const fear = fearStudy ? observationsForStudy(file, fearStudy.id) : []
    return lateralityCrosstabs(laterality, lateralityStudy, fear, fearStudy)
  }, [file, lateralityStudy, fearStudy])
  const lateralityCount = observationsForStudy(file, lateralityStudy.id).length
  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-[var(--panel-border)] bg-[var(--panel)] px-4 py-4">
        <h3 className="text-lg font-semibold text-[var(--text)]">Correlations</h3>
        <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">
          Laterality fields live on one form so we can cross them without guessing. Fear
          joins when the same athlete is in both studies. Empty cells are zeros. These
          tables do not prove that one thing causes another.
        </p>
      </section>
      {lateralityCount === 0 ? (
        <p className="rounded-2xl border border-dashed border-[var(--panel-border)] px-4 py-8 text-center text-sm text-[var(--muted)]">
          Log laterality first — handedness, front foot, twist, doubles, triples, skate.
          Crosstabs show up here.
        </p>
      ) : tables.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-[var(--panel-border)] px-4 py-8 text-center text-sm text-[var(--muted)]">
          Not enough paired answers yet for a table.
        </p>
      ) : (
        tables.map((table) => <CrosstabCard key={table.title} table={table} />)
      )}
    </div>
  )
}

function CrosstabCard({ table }: { table: Crosstab }) {
  return (
    <section className="overflow-x-auto rounded-2xl border border-[var(--panel-border)] bg-[var(--panel)] p-4">
      <h4 className="text-sm font-semibold text-[var(--text)]">{table.title}</h4>
      <p className="mt-1 text-xs text-[var(--muted)]">
        {table.detail} n = {table.n}.
      </p>
      <table className="mt-3 w-full min-w-[20rem] border-collapse text-left text-xs">
        <thead>
          <tr>
            <th className="border-b border-[var(--panel-border)] py-1.5 pr-2 font-semibold text-[var(--muted)]">
              {table.rowLabel} \ {table.colLabel}
            </th>
            {table.cols.map((c) => (
              <th
                key={c.value}
                className="border-b border-[var(--panel-border)] px-2 py-1.5 font-semibold text-[var(--muted)]"
              >
                {c.label}
              </th>
            ))}
            <th className="border-b border-[var(--panel-border)] px-2 py-1.5 font-semibold text-[var(--muted)]">
              Total
            </th>
          </tr>
        </thead>
        <tbody>
          {table.rows.map((row, ri) => (
            <tr key={row.value}>
              <th className="py-1.5 pr-2 font-medium text-[var(--text)]">{row.label}</th>
              {table.cols.map((col, ci) => (
                <td key={col.value} className="px-2 py-1.5 tabular-nums text-[var(--text)]">
                  {table.cells[ri][ci]}
                </td>
              ))}
              <td className="px-2 py-1.5 tabular-nums text-[var(--muted)]">{table.rowTotals[ri]}</td>
            </tr>
          ))}
          <tr>
            <th className="border-t border-[var(--panel-border)] py-1.5 pr-2 font-medium text-[var(--muted)]">
              Total
            </th>
            {table.colTotals.map((n, i) => (
              <td
                key={table.cols[i].value}
                className="border-t border-[var(--panel-border)] px-2 py-1.5 tabular-nums text-[var(--muted)]"
              >
                {n}
              </td>
            ))}
            <td className="border-t border-[var(--panel-border)] px-2 py-1.5 tabular-nums text-[var(--muted)]">
              {table.n}
            </td>
          </tr>
        </tbody>
      </table>
    </section>
  )
}

function IdeasPage({
  file,
  athlete,
  athletes,
  onSave,
}: {
  file: ResearchFile
  athlete: Athlete | null
  athletes: Athlete[]
  onSave: (next: ResearchFile) => Promise<boolean>
}) {
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const coach = isCoachProfile(athlete)
  const nameOf = (id?: string) => athletes.find((a) => a.id === id)?.name

  const submit = async () => {
    const next = text.trim()
    if (!next) {
      setFormError('Write the question or thought first.')
      return
    }
    if (!athlete) {
      setFormError('Unlock a profile to add an idea.')
      return
    }
    setBusy(true)
    setFormError(null)
    const ok = await onSave(addIdea(file, next, athlete.id))
    setBusy(false)
    if (ok) setText('')
  }

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-[var(--panel-border)] bg-[var(--panel)] p-4">
        <h3 className="text-lg font-semibold text-[var(--text)]">Ideas inbox</h3>
        <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">
          Dump a tumbling / gymnastics / cheer / acro question here until it becomes a
          study. Philosophical notes welcome — we will turn the ones that can be counted
          into a form later.
        </p>
        {athlete ? (
          <form
            className="mt-3 space-y-2"
            onSubmit={(e) => {
              e.preventDefault()
              void submit()
            }}
          >
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={3}
              placeholder="What else should this gym count — and what do we think we will find?"
              className="w-full rounded-lg border border-[var(--panel-border)] bg-[#0d1218] px-3 py-2 text-sm"
            />
            {formError && <p className="text-sm text-[var(--bad)]">{formError}</p>}
            <button
              type="submit"
              disabled={busy}
              className="rounded-lg bg-[var(--accent)] px-3 py-1.5 text-sm font-semibold text-[#06281f] disabled:opacity-50"
            >
              {busy ? 'Saving…' : 'Add idea'}
            </button>
          </form>
        ) : (
          <p className="mt-3 text-sm text-[var(--muted)]">
            Unlock a profile to add an idea. Anyone can still read the list.
          </p>
        )}
      </section>
      {file.ideas.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-[var(--panel-border)] px-4 py-8 text-center text-sm text-[var(--muted)]">
          No ideas yet. First thought can live here.
        </p>
      ) : (
        <ul className="space-y-3">
          {file.ideas.map((idea) => (
            <li
              key={idea.id}
              className="rounded-2xl border border-[var(--panel-border)] bg-[var(--panel)] px-4 py-3"
            >
              <p className="text-sm leading-relaxed text-[var(--text)]">{idea.text}</p>
              <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                <p className="text-[11px] text-[var(--muted)]">
                  {new Date(idea.createdAt).toLocaleString()}
                  {idea.authorId && nameOf(idea.authorId) ? ` · ${nameOf(idea.authorId)}` : ''}
                </p>
                {coach && (
                  <button
                    type="button"
                    className="text-xs text-[var(--bad)]"
                    onClick={() => {
                      if (!confirm('Remove this idea?')) return
                      void onSave(removeIdea(file, idea.id))
                    }}
                  >
                    Remove
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function fmtNum(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(1)
}
