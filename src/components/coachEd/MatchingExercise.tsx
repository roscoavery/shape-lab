import { useMemo, useState } from 'react'
import { MATCHING } from '../../content/coachEd/practice'

export function MatchingExercise({ matchingId }: { matchingId: string }) {
  const set = MATCHING.find((m) => m.id === matchingId)
  const options = useMemo(() => [...new Set((set?.pairs ?? []).map((p) => p.right))].sort(), [set])
  const [picks, setPicks] = useState<Record<string, string>>({})
  const [checked, setChecked] = useState(false)
  if (!set) return null
  const right = set.pairs.filter((p) => picks[p.id] === p.right).length
  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
      <h4 className="text-base font-semibold">{set.title}</h4>
      <p className="mt-1 text-sm text-[var(--muted)]">{set.prompt}</p>
      <ul className="mt-3 space-y-3">
        {set.pairs.map((p) => {
          const ok = checked && picks[p.id] === p.right
          const bad = checked && picks[p.id] !== p.right
          return (
            <li key={p.id}>
              <label className="block text-sm font-semibold" htmlFor={`${set.id}-${p.id}`}>
                {p.left}
              </label>
              <select
                id={`${set.id}-${p.id}`}
                value={picks[p.id] ?? ''}
                onChange={(e) => {
                  setPicks({ ...picks, [p.id]: e.target.value })
                  setChecked(false)
                }}
                className={`mt-1 w-full rounded-xl border bg-[#0d1218] px-3 py-3 text-sm ${
                  ok ? 'border-emerald-400/60' : bad ? 'border-red-400/60' : 'border-white/15'
                }`}
              >
                <option value="">Choose</option>
                {options.map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </select>
              {bad && <p className="mt-1 text-xs text-red-200">Not quite. Answer: {p.right}</p>}
            </li>
          )
        })}
      </ul>
      <div className="mt-3 flex items-center gap-3">
        <button
          type="button"
          disabled={Object.keys(picks).length < set.pairs.length}
          onClick={() => setChecked(true)}
          className="rounded-full bg-[var(--accent)] px-5 py-2 text-sm font-semibold text-[var(--on-accent)] disabled:opacity-40"
        >
          Check
        </button>
        {checked && (
          <span className="text-sm" aria-live="polite">
            {right} of {set.pairs.length} right
          </span>
        )}
      </div>
    </section>
  )
}
