import { useEffect, useState } from 'react'
import {
  addImproveNote,
  deleteImproveNote,
  hydrateImproveNotes,
  listImproveNotes,
  pageLabel,
  saveImproveNote,
  setImproveNoteDone,
  subscribeImproveNotes,
} from '../lib/improveNotes'

type Props = {
  page: string
}

export function ImproveNotesDock({ page }: Props) {
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState('')
  const [, setTick] = useState(0)
  useEffect(() => subscribeImproveNotes(() => setTick((n) => n + 1)), [])
  useEffect(() => {
    void hydrateImproveNotes()
  }, [])
  const mine = listImproveNotes(page)
  const openCount = mine.filter((n) => !n.doneAt).length

  return (
    <div className="mx-auto mt-8 w-full max-w-3xl px-1 pb-6">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 text-[11px] text-[var(--muted)]/70 hover:text-[var(--muted)]"
      >
        <span aria-hidden>✎</span>
        <span>{open ? 'Hide app notes' : 'App note'}</span>
        {!open && openCount > 0 ? <span>· {openCount} open</span> : null}
      </button>
      {open && (
        <div className="mt-2 rounded-xl border border-[var(--panel-border)]/70 bg-[#0d1218]/80 p-3">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)]">
            Make the app better · {pageLabel(page)}
          </p>
          <p className="mt-1 text-[11px] leading-snug text-[var(--muted)]">
            Stays out of the way. Save what to change. Check off when it is done. Delete anytime.
          </p>
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={2}
            placeholder="What should this page do that it does not yet?"
            className="mt-2 w-full rounded-lg border border-[var(--panel-border)] bg-[#0a0e12] px-3 py-2 text-sm"
          />
          <button
            type="button"
            disabled={!draft.trim()}
            onClick={() => {
              addImproveNote(page, draft)
              setDraft('')
            }}
            className="mt-2 rounded-lg border border-[var(--panel-border)] px-3 py-1.5 text-xs font-semibold disabled:opacity-40"
          >
            Save note
          </button>
          <ul className="mt-3 space-y-2">
            {mine.length === 0 ? (
              <li className="text-[11px] text-[var(--muted)]">No notes on this page yet.</li>
            ) : (
              mine.map((n) => (
                <li key={n.id} className="rounded-lg bg-black/30 px-2.5 py-2">
                  <textarea
                    defaultValue={n.text}
                    rows={2}
                    onBlur={(e) => saveImproveNote(n.id, e.target.value)}
                    className={`w-full resize-none bg-transparent text-sm ${
                      n.doneAt ? 'text-[var(--muted)] line-through' : ''
                    }`}
                  />
                  <p className="mt-1 text-[10px] text-[var(--muted)]">
                    {new Date(n.createdAt).toLocaleString(undefined, {
                      month: 'short',
                      day: 'numeric',
                      hour: 'numeric',
                      minute: '2-digit',
                    })}
                    {n.doneAt ? ' · done' : ''}
                  </p>
                  <div className="mt-1 flex gap-3">
                    <button
                      type="button"
                      className="text-[11px] text-[var(--accent)]"
                      onClick={() => setImproveNoteDone(n.id, !n.doneAt)}
                    >
                      {n.doneAt ? 'Open again' : 'Mark done'}
                    </button>
                    <button
                      type="button"
                      className="text-[11px] text-[var(--bad)]"
                      onClick={() => deleteImproveNote(n.id)}
                    >
                      Delete
                    </button>
                  </div>
                </li>
              ))
            )}
          </ul>
        </div>
      )}
    </div>
  )
}
