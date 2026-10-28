/**
 * Public parent Learn desk.
 *
 * Rendered standalone at /share/learn/<token> with NO sign-in: the whole
 * Learn section as a signed-in parent sees it — Parent Guide articles,
 * the 4 levels of progression, coaching concepts, and nutrition. No
 * athlete data, no roster, no edit paths. The desk announcement carousel
 * is left out: it needs the signed-in desk feed.
 */

import { useEffect, useState } from 'react'
import {
  PARENT_EDUCATION_CATEGORIES,
  type ParentEducationArticle,
} from '../../config/parentEducation'
import { CollapsibleSection } from '../CollapsibleSection'
import { ParentGuideArticle } from '../family/ParentGuideArticle'
import { ConceptCards } from '../learn/ConceptCards'
import { NutritionFactsBrowse } from '../learn/NutritionFactsBrowse'
import { ProgressionLevels } from '../learn/ProgressionLevels'

type LoadState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; live: boolean; articles: ParentEducationArticle[] }

export default function PublicLearnPage({ token }: { token: string }) {
  const [state, setState] = useState<LoadState>({ status: 'loading' })
  const [open, setOpen] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setState({ status: 'loading' })
    fetch(`/api/share/learn?token=${encodeURIComponent(token)}`)
      .then(async (r) => {
        const body = await r.json().catch(() => null)
        if (!r.ok) {
          throw new Error(
            (body && body.error) || 'This shared page could not be found.',
          )
        }
        return body as { live: boolean; articles: ParentEducationArticle[] }
      })
      .then((body) => {
        if (!cancelled) {
          setState({ status: 'ready', live: body.live, articles: body.articles })
          setOpen((cur) => cur ?? body.articles[0]?.id ?? null)
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setState({
            status: 'error',
            message: err instanceof Error ? err.message : 'Could not load this page.',
          })
        }
      })
    return () => {
      cancelled = true
    }
  }, [token])

  const articles = state.status === 'ready' ? state.articles : []
  const article = articles.find((row) => row.id === open) ?? articles[0]

  return (
    <div className="min-h-dvh bg-[#0b0f14] text-white">
      <header className="border-b border-white/10 px-4 py-3">
        <div className="mx-auto flex max-w-3xl items-center justify-between">
          <span className="text-sm font-extrabold tracking-wide">Shape Lab</span>
          <span className="text-[11px] font-semibold uppercase tracking-wider text-white/50">
            Learn, for parents
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 pb-16 pt-5">
        {state.status === 'loading' && (
          <p className="py-16 text-center text-sm text-white/60">Loading Learn…</p>
        )}
        {state.status === 'error' && (
          <div className="py-16 text-center">
            <p className="text-sm font-bold">{state.message}</p>
            <p className="mt-2 text-xs text-white/60">
              The link may be old, or the gym may be offline right now.
            </p>
          </div>
        )}
        {state.status === 'ready' && (
          <div className="grid gap-4">
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
                    <p className="px-2 text-[10px] uppercase tracking-wider text-[var(--muted)]">
                      {cat.label}
                    </p>
                    {articles
                      .filter((row) => row.category === cat.id)
                      .map((row) => (
                        <button
                          key={row.id}
                          type="button"
                          onClick={() => setOpen(row.id)}
                          className={`mt-1 block w-full rounded-lg px-2 py-2 text-left text-sm ${
                            article?.id === row.id
                              ? 'bg-white/10 font-semibold'
                              : 'text-[var(--muted)]'
                          }`}
                        >
                          {row.title}
                        </button>
                      ))}
                  </div>
                ))}
              </nav>
              <div className="grid gap-2">
                {!state.live && (
                  <p className="rounded-lg bg-yellow-500/10 px-3 py-2 text-xs text-yellow-200/80">
                    Showing saved answers.
                  </p>
                )}
                {article && <ParentGuideArticle article={article} />}
              </div>
            </div>
            <CollapsibleSection title="The 4 levels of progression" hint="How skills build" defaultOpen={false}>
              <ProgressionLevels />
            </CollapsibleSection>
            <CollapsibleSection title="Coaching concepts" hint="The ideas behind the coaching" defaultOpen={false}>
              <ConceptCards />
            </CollapsibleSection>
            <CollapsibleSection title="Nutrition questions" hint="NutritionFacts.org" defaultOpen={false}>
              <NutritionFactsBrowse compact />
            </CollapsibleSection>
          </div>
        )}
      </main>

      <footer className="border-t border-white/10 px-4 py-6">
        <p className="mx-auto max-w-3xl text-center text-xs text-white/50">
          Shared from Shape Lab · This link works while Coach Ryan&apos;s gym is online.
        </p>
      </footer>
    </div>
  )
}
