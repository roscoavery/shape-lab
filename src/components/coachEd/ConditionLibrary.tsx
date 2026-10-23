import { useMemo, useState } from 'react'
import { searchConditions } from '../../content/coachEd/registry'
import { REGION_LABELS, URGENCY_LABELS, type Region } from '../../content/coachEd/types'
import { useCoachEd } from './CoachEdContext'
import { urgencyClass } from './urgency'
import { ReviewBadge } from './SafetyBanner'

const REGIONS = Object.keys(REGION_LABELS) as Region[]

export function ConditionLibrary({ onOpen }: { onOpen: (id: string) => void }) {
  const ctx = useCoachEd()
  const [query, setQuery] = useState('')
  const [region, setRegion] = useState<Region | 'all'>('all')
  const [onlyComplete, setOnlyComplete] = useState(false)
  const rows = useMemo(
    () => searchConditions({ query, region, completeness: onlyComplete ? 'complete' : 'all' }),
    [query, region, onlyComplete],
  )
  return (
    <section className="space-y-3">
      <div>
        <h3 className="text-xl font-semibold">Injury library</h3>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Search by name, nickname, or what you saw. Entries marked In preparation are not written yet and have no medical content.
        </p>
      </div>
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Try wrist lump, back pain, heel, head bump"
        aria-label="Search injuries"
        className="w-full rounded-xl border border-white/15 bg-[#0d1218] px-4 py-3 text-base"
      />
      <div className="flex gap-1.5 overflow-x-auto pb-1" role="group" aria-label="Body region">
        {(['all', ...REGIONS] as const).map((r) => (
          <button
            key={r}
            type="button"
            aria-pressed={region === r}
            onClick={() => setRegion(r)}
            className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold ${
              region === r ? 'border-[var(--accent)] bg-[var(--accent)] text-[var(--on-accent)]' : 'border-white/15 text-[var(--muted)]'
            }`}
          >
            {r === 'all' ? 'All regions' : REGION_LABELS[r]}
          </button>
        ))}
      </div>
      <label className="flex items-center gap-2 text-sm text-[var(--muted)]">
        <input type="checkbox" checked={onlyComplete} onChange={(e) => setOnlyComplete(e.target.checked)} className="h-4 w-4" />
        Show written entries only
      </label>
      {rows.length === 0 ? (
        <p className="rounded-xl border border-dashed border-white/20 px-4 py-6 text-center text-sm text-[var(--muted)]">
          Nothing matches. Try a simpler word, or clear the region filter. If someone is hurt right now, open Injury response.
        </p>
      ) : (
        <ul className="space-y-2">
          {rows.map((r) => (
            <li key={r.id}>
              <button
                type="button"
                onClick={() => onOpen(r.id)}
                className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-3 text-left active:bg-white/10"
              >
                <span className="flex items-start justify-between gap-2">
                  <span className="text-base font-semibold leading-snug">{r.name}</span>
                  {r.completeness === 'in_preparation' ? (
                    <span className="shrink-0 rounded-full border border-white/20 px-2 py-0.5 text-[10px] font-semibold uppercase text-[var(--muted)]">
                      In preparation
                    </span>
                  ) : (
                    <ReviewBadge status={ctx.reviewOf('condition', r.id, r.review)} />
                  )}
                </span>
                <span className="mt-1 flex flex-wrap gap-1.5">
                  <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${urgencyClass(r.urgency)}`}>
                    {URGENCY_LABELS[r.urgency]}
                  </span>
                  {r.regions.map((g) => (
                    <span key={g} className="rounded-full border border-white/10 px-2 py-0.5 text-[10px] text-[var(--muted)]">
                      {REGION_LABELS[g]}
                    </span>
                  ))}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
