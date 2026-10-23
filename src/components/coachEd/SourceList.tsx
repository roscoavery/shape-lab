import { useState } from 'react'
import { sourceById } from '../../content/coachEd/sources'
import { PRACTITIONER_NOTE } from '../../content/coachEd/types'

export function SourceList({ ids, label = 'Sources' }: { ids: string[]; label?: string }) {
  const [open, setOpen] = useState(false)
  const unique = [...new Set(ids)]
  const sources = unique.map((id) => sourceById(id)).filter((s): s is NonNullable<ReturnType<typeof sourceById>> => Boolean(s))
  if (sources.length === 0) return null
  return (
    <div className="mt-2">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="rounded-full border border-white/10 px-2.5 py-1 text-[11px] font-medium text-[var(--muted)] active:bg-white/10"
      >
        {label} ({sources.length}) {open ? '\u2212' : '+'}
      </button>
      {open && (
        <ol className="mt-2 space-y-2 text-xs leading-relaxed text-[var(--muted)]">
          {sources.map((s) => (
            <li key={s.id} className="rounded-lg bg-black/20 px-2.5 py-2">
              <a href={s.url} target="_blank" rel="noreferrer" className="font-medium text-[var(--accent)] underline">
                {s.title}
              </a>
              <div>
                {s.by}
                {s.year ? ` (${s.year})` : ''}. {s.venue}.
                {s.pmid ? ` PMID ${s.pmid}.` : ''}
              </div>
              {s.kind === 'practitioner' && <div className="font-semibold text-amber-200/90">{PRACTITIONER_NOTE}</div>}
              {s.kind === 'historical' && <div className="font-semibold">Historical source, cited for what it said at the time</div>}
              <div className="text-[10px] uppercase tracking-wide opacity-70">Record checked {s.verifiedOn}</div>
            </li>
          ))}
        </ol>
      )}
    </div>
  )
}
