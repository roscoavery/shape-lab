import { useState } from 'react'
import { COMPARISONS } from '../../content/coachEd/comparisons'
import { SourceList } from './SourceList'

/**
 * Phone layout: one column at a time with chips to switch, so nothing needs
 * sideways scrolling. Wide screens get the full table.
 */
export function ComparisonTableView({ comparisonId }: { comparisonId: string }) {
  const table = COMPARISONS.find((c) => c.id === comparisonId)
  const [col, setCol] = useState(table?.columns[0]?.id ?? '')
  if (!table) return null
  const ids = table.rows.flatMap((r) => r.sourceIds ?? [])
  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
      <h4 className="text-base font-semibold">{table.title}</h4>
      <p className="mt-1 text-sm text-[var(--muted)]">{table.intro}</p>

      <div className="mt-3 md:hidden">
        <div role="tablist" className="flex gap-1.5 overflow-x-auto pb-1">
          {table.columns.map((c) => (
            <button
              key={c.id}
              type="button"
              role="tab"
              aria-selected={col === c.id}
              onClick={() => setCol(c.id)}
              className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold ${
                col === c.id ? 'border-[var(--accent)] bg-[var(--accent)] text-[var(--on-accent)]' : 'border-white/15 text-[var(--muted)]'
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>
        <dl className="mt-2 space-y-2">
          {table.rows.map((r) => (
            <div key={r.label} className="rounded-xl bg-black/20 px-3 py-2">
              <dt className="text-[11px] font-semibold uppercase tracking-wide text-[var(--muted)]">{r.label}</dt>
              <dd className="mt-0.5 text-sm leading-relaxed">{r.cells[col]}</dd>
            </div>
          ))}
        </dl>
      </div>

      <div className="mt-3 hidden overflow-x-auto md:block">
        <table className="w-full min-w-[40rem] border-separate border-spacing-0 text-sm">
          <thead>
            <tr>
              <th className="sticky left-0 bg-[#11181e] px-2 py-2 text-left text-xs text-[var(--muted)]" />
              {table.columns.map((c) => (
                <th key={c.id} className="px-2 py-2 text-left text-xs font-semibold">
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {table.rows.map((r) => (
              <tr key={r.label} className="align-top">
                <th className="sticky left-0 border-t border-white/10 bg-[#11181e] px-2 py-2 text-left text-xs font-semibold text-[var(--muted)]">
                  {r.label}
                </th>
                {table.columns.map((c) => (
                  <td key={c.id} className="border-t border-white/10 px-2 py-2 leading-relaxed">
                    {r.cells[c.id]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {table.footnote && <p className="mt-2 text-xs text-[var(--muted)]">{table.footnote}</p>}
      <SourceList ids={ids} />
    </section>
  )
}
