import { useMemo } from 'react'
import type { Athlete, HomeworkItem, HomeworkLog } from '../../types'
import { PARENT_EDUCATION } from '../../config/parentEducation'
import {
  PARENT_GUIDE_RECOMMENDATIONS_ENABLED,
  getParentEducationRecommendations,
  recordRecommendationOpen,
} from '../../lib/parentGuideRecommendations'

type Props = {
  child: Athlete | null
  homework: HomeworkItem[]
  logs: HomeworkLog[]
  onOpenArticle: (articleId: string) => void
}

/**
 * "Helpful right now" — compact contextual shortcuts into the existing
 * Parent Guide. Shows at most 3 existing articles with a short,
 * neutral reason. The full guide is untouched.
 */
export function HelpfulRightNow({ child, homework, logs, onOpenArticle }: Props) {
  const recs = useMemo(() => {
    if (!PARENT_GUIDE_RECOMMENDATIONS_ENABLED) return []
    return getParentEducationRecommendations(child, { homework, logs })
  }, [child, homework, logs])

  if (recs.length === 0) return null

  return (
    <section className="rounded-xl border border-[var(--panel-border)] bg-[var(--panel)] p-5">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--accent)]">
        Helpful right now
      </p>
      <div className="mt-3 grid gap-3">
        {recs.map((rec) => {
          const article = PARENT_EDUCATION.find((a) => a.id === rec.articleId)
          if (!article) return null
          return (
            <div
              key={rec.articleId}
              className="rounded-lg border border-[var(--panel-border)] bg-white/5 p-4"
            >
              <p className="font-semibold text-[var(--text)]">{article.title}</p>
              <p className="mt-1 text-sm text-[var(--muted)]">{article.summary}</p>
              <p className="mt-2 text-sm text-[var(--text)]/80">{rec.reason}</p>
              <button
                type="button"
                onClick={() => {
                  recordRecommendationOpen(rec.articleId)
                  onOpenArticle(rec.articleId)
                }}
                className="mt-3 rounded-lg bg-[var(--accent)] px-3 py-1.5 text-sm font-semibold text-[var(--on-accent)]"
              >
                Read
              </button>
            </div>
          )
        })}
      </div>
    </section>
  )
}
