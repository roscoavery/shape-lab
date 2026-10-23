import { useState } from 'react'
import { SCENARIOS } from '../../content/coachEd/scenarios'
import { SourceList } from './SourceList'

function Scenario({ id }: { id: string }) {
  const sc = SCENARIOS.find((s) => s.id === id)
  const [picked, setPicked] = useState<string | null>(null)
  if (!sc) return null
  const choice = sc.choices.find((c) => c.id === picked)
  const safest = sc.choices.find((c) => c.safest)
  return (
    <section
      className={`rounded-2xl border p-3 ${sc.emergency ? 'border-red-400/40 bg-red-500/5' : 'border-white/10 bg-white/[0.03]'}`}
    >
      {sc.emergency && <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-red-200">Emergency scenario</p>}
      <h4 className="text-base font-semibold">{sc.title}</h4>
      <p className="mt-1 text-sm leading-relaxed">{sc.setup}</p>
      <ul className="mt-3 space-y-2">
        {sc.choices.map((c) => {
          const chosen = picked === c.id
          const reveal = picked !== null
          const cls = !reveal
            ? 'border-white/15 active:bg-white/10'
            : c.safest
              ? 'border-emerald-400/60 bg-emerald-400/10'
              : chosen
                ? 'border-red-400/60 bg-red-500/10'
                : 'border-white/10 opacity-70'
          return (
            <li key={c.id}>
              <button
                type="button"
                disabled={reveal}
                onClick={() => setPicked(c.id)}
                className={`w-full rounded-xl border px-3 py-3 text-left text-sm leading-snug ${cls}`}
              >
                {c.label}
              </button>
            </li>
          )
        })}
      </ul>
      {choice && (
        <div className="mt-3 space-y-2 text-sm leading-relaxed" aria-live="polite">
          <p>
            <span className="font-semibold">{choice.safest ? 'Safest choice. ' : 'Not the safest choice. '}</span>
            {choice.feedback}
          </p>
          {!choice.safest && safest && (
            <p className="rounded-lg bg-emerald-400/10 px-3 py-2">
              <span className="font-semibold">Safest: </span>
              {safest.label} {safest.feedback}
            </p>
          )}
          <p className="text-[var(--muted)]">{sc.takeaway}</p>
          <button type="button" onClick={() => setPicked(null)} className="text-xs font-semibold text-[var(--accent)] underline">
            Try again
          </button>
        </div>
      )}
      <SourceList ids={sc.sourceIds} />
    </section>
  )
}

export function ScenarioRunner({ scenarioIds }: { scenarioIds: string[] }) {
  return (
    <div className="space-y-3">
      {scenarioIds.map((id) => (
        <Scenario key={id} id={id} />
      ))}
    </div>
  )
}
