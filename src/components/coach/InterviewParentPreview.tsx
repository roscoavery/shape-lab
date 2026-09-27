/**
 * InterviewParentPreview — read-only preview of the Parent Guide exactly as
 * parents see it, with Ryan's live interview answers.
 *
 * Editing happens in the CoachInterview editor (separate tab). This view is
 * for reading through and checking what parents will see after a save.
 */
import { useState } from 'react'
import { PARENT_EDUCATION_CATEGORIES } from '../../config/parentEducation'
import { useParentGuide } from '../../lib/useParentGuide'
import { ParentGuideArticle } from '../family/ParentGuideArticle'

export function InterviewParentPreview() {
  const { articles, loading, live } = useParentGuide()
  const [open, setOpen] = useState<string | null>(articles[0]?.id ?? null)
  const article = articles.find((row) => row.id === open) ?? articles[0]

  return (
    <div className="grid gap-4">
      <div className="rounded-xl border border-[var(--panel-border)] bg-[var(--panel)] p-5">
        <p className="text-xs font-semibold uppercase tracking-wider text-[var(--accent)]">
          Preview as parent
        </p>
        <h2 className="mt-1 text-xl font-semibold">What parents see</h2>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Read-only. This is the Parent Guide with your latest saved answers.
          {live ? ' Showing live answers.' : ' Showing the saved snapshot.'}
        </p>
      </div>

      {loading && <p className="text-sm text-[var(--muted)]">Loading the latest answers…</p>}
      {!loading && !live && (
        <p className="rounded-lg bg-yellow-500/10 px-3 py-2 text-xs text-yellow-200/80">
          Could not reach the gym computer — showing the saved snapshot.
        </p>
      )}

      <div className="grid gap-4 lg:grid-cols-[16rem_minmax(0,1fr)]">
        <nav className="rounded-xl border border-[var(--panel-border)] bg-[var(--panel)] p-3">
          <p className="px-2 text-[10px] font-semibold uppercase tracking-wider text-[var(--accent)]">
            For parents
          </p>
          <p className="mt-2 px-2 text-xs leading-relaxed text-[var(--muted)]">
            How to support your athlete for the long run, in Ryan&apos;s words.
          </p>
          {PARENT_EDUCATION_CATEGORIES.map((cat) => (
            <div key={cat.id} className="mt-3">
              <p className="px-2 text-[10px] uppercase tracking-wider text-[var(--muted)]">{cat.label}</p>
              {articles.filter((row) => row.category === cat.id).map((row) => (
                <button
                  key={row.id}
                  type="button"
                  onClick={() => setOpen(row.id)}
                  className={`mt-1 block w-full rounded-lg px-2 py-2 text-left text-sm ${
                    article?.id === row.id ? 'bg-white/10 font-semibold' : 'text-[var(--muted)]'
                  }`}
                >
                  {row.title}
                </button>
              ))}
            </div>
          ))}
        </nav>
        <div className="grid gap-2">
          {article && <ParentGuideArticle article={article} />}
        </div>
      </div>
    </div>
  )
}
