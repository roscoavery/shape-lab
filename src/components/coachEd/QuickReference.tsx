import { useEffect, useMemo, useState } from 'react'
import { loadCondition, searchConditions } from '../../content/coachEd/registry'
import { URGENCY_LABELS, type Claim, type Condition } from '../../content/coachEd/types'
import { urgencyClass } from './urgency'
import { EducationalNote } from './SafetyBanner'
import { SourceList } from './SourceList'

function Quick({ id, name, urgency, onFull }: { id: string; name: string; urgency: Condition['urgency']; onFull: (id: string) => void }) {
  const [open, setOpen] = useState(false)
  const [cond, setCond] = useState<Condition | undefined>()
  useEffect(() => {
    if (!open || cond) return
    let live = true
    void loadCondition(id).then((c) => {
      if (live) setCond(c)
    })
    return () => {
      live = false
    }
  }, [open, id, cond])
  const card = cond?.card
  const block = (label: string, claims: Claim[], tone = '') => (
    <div className={`rounded-lg px-3 py-2 ${tone || 'bg-black/20'}`}>
      <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--muted)]">{label}</p>
      <ul className="mt-1 space-y-1 text-sm leading-snug">
        {claims.map((c, i) => (
          <li key={i}>&bull; {c.text}</li>
        ))}
      </ul>
      <SourceList ids={claims.flatMap((c) => c.sourceIds ?? [])} />
    </div>
  )
  return (
    <li className="rounded-xl border border-white/10 bg-white/[0.03]">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-2 px-3 py-3 text-left"
      >
        <span>
          <span className="block text-base font-semibold leading-snug">{name}</span>
          <span className={`mt-1 inline-block rounded-full border px-2 py-0.5 text-[10px] font-semibold ${urgencyClass(urgency)}`}>
            {URGENCY_LABELS[urgency]}
          </span>
        </span>
        <span aria-hidden className="text-[var(--muted)]">{open ? '\u2212' : '+'}</span>
      </button>
      {open && (
        <div className="space-y-2 px-3 pb-3">
          {!card ? (
            <p className="text-sm text-[var(--muted)]">Loading</p>
          ) : (
            <>
              <p className="text-sm leading-relaxed">{card.summary.text}</p>
              {block('Danger signs', card.redFlags, 'border border-red-400/30 bg-red-500/10')}
              {block('What to do now', card.immediateResponse)}
              {block('Who should evaluate', card.whoEvaluates)}
              <button type="button" onClick={() => onFull(id)} className="text-sm font-semibold text-[var(--accent)] underline">
                Open full card
              </button>
            </>
          )}
        </div>
      )}
    </li>
  )
}

export function QuickReference({ onOpen }: { onOpen: (id: string) => void }) {
  const [q, setQ] = useState('')
  const rows = useMemo(() => searchConditions({ query: q, completeness: 'complete' }), [q])
  return (
    <section className="space-y-3">
      <div>
        <h3 className="text-xl font-semibold">Quick reference</h3>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Danger signs, first response, and who should see the athlete. Written entries only. Sorted so emergencies are not buried.
        </p>
      </div>
      <input
        type="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search"
        aria-label="Search quick reference"
        className="w-full rounded-xl border border-white/15 bg-[#0d1218] px-4 py-3 text-base"
      />
      <ul className="space-y-2">
        {[...rows]
          .sort((a, b) => ['emergency', 'same_day', 'soon', 'monitor'].indexOf(a.urgency) - ['emergency', 'same_day', 'soon', 'monitor'].indexOf(b.urgency))
          .map((r) => (
            <Quick key={r.id} id={r.id} name={r.name} urgency={r.urgency} onFull={onOpen} />
          ))}
      </ul>
      {rows.length === 0 && <p className="py-4 text-center text-sm text-[var(--muted)]">Nothing matches.</p>}
      <EducationalNote />
    </section>
  )
}
