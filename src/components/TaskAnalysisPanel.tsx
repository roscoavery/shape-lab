/**
 * Written corrections after a curriculum task.
 */

import type { TaskRunReport } from '../types'

type Props = {
  report: TaskRunReport
  onClose: () => void
  onContinue?: () => void
  continueLabel?: string
}

export function TaskAnalysisPanel({
  report,
  onClose,
  onContinue,
  continueLabel = 'Next task',
}: Props) {
  return (
    <div className="rounded-lg border border-[var(--accent)]/40 bg-[#121f1a] p-3">
      <div className="mb-2 flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)]">
            Task analysis
          </p>
          <h3 className="text-sm font-semibold text-[var(--text)]">{report.taskName}</h3>
        </div>
        <p className="text-[11px] text-[var(--muted)]">
          {new Date(report.createdAt).toLocaleString()}
        </p>
      </div>
      <p className="mb-3 text-sm leading-snug text-[var(--text)]">{report.summary}</p>
      <ol className="space-y-2">
        {report.steps.map((s) => (
          <li
            key={`${s.shapeId}-${s.required ? 'r' : 'p'}`}
            className="rounded-md border border-[var(--panel-border)] bg-[#0d1218] p-2"
          >
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <span className="font-medium text-[var(--text)]">{s.shapeName}</span>
              <span className="text-xs tabular-nums text-[var(--muted)]">
                {s.required ? 'required' : 'practice'} · {s.bestOverall}/100
                {s.tries != null ? ` · ${s.tries} ${s.tries === 1 ? 'try' : 'tries'}` : ''}
              </span>
            </div>
            <p className="mt-1 text-sm leading-snug text-[var(--text)]">{s.notes}</p>
            {s.criteria.filter((c) => {
              if (!c.feedback) return false
              if (c.id === 'shoulders' || c.id === 'shoulders_open') return c.score < 90
              return c.score < 85
            }).length > 0 && (
              <ul className="mt-1 list-disc space-y-0.5 pl-4 text-[11px] text-[var(--muted)]">
                {s.criteria
                  .filter((c) => {
                    if (!c.feedback) return false
                    if (c.id === 'shoulders' || c.id === 'shoulders_open') return c.score < 90
                    return c.score < 85
                  })
                  .sort((a, b) => a.score - b.score)
                  .slice(0, 5)
                  .map((c) => (
                    <li key={c.id}>
                      {c.label} ({c.score}): {c.feedback}
                    </li>
                  ))}
              </ul>
            )}
          </li>
        ))}
      </ol>
      <div className="mt-3 flex flex-wrap gap-2">
        {onContinue && (
          <button
            type="button"
            onClick={onContinue}
            className="rounded-lg bg-[var(--accent)] px-3 py-2 text-sm font-semibold text-[#06281f]"
          >
            {continueLabel}
          </button>
        )}
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg border border-[var(--panel-border)] px-3 py-2 text-sm"
        >
          Close
        </button>
      </div>
    </div>
  )
}
