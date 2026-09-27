/**
 * useParentGuide — Parent Guide articles with Ryan's LIVE interview answers.
 *
 * Structure (titles, summaries, intros, questions, ordering) comes from the
 * static PARENT_EDUCATION config. Answer text is pulled live from
 * /api/coach-interview so edits in the Coach Interview show up for parents
 * automatically — no build step.
 *
 * The baked-in `answer` arrays in parentEducation.ts are the offline fallback:
 * while loading, or if the API is unreachable, parents see the snapshot instead
 * of a broken page.
 */
import { useEffect, useState } from 'react'
import {
  PARENT_EDUCATION,
  type ParentEducationArticle,
} from '../config/parentEducation'
import { pullCoachInterview, type CoachInterviewAnswers } from './coachInterviewStore'

/** Split a saved answer string into display paragraphs (blank-line separated). */
function splitParagraphs(text: string): string[] {
  return text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0)
}

function mergeAnswers(
  live: CoachInterviewAnswers,
): { articles: ParentEducationArticle[]; live: boolean } {
  const hasLive = Object.keys(live).length > 0
  const articles = PARENT_EDUCATION.map((article) => ({
    ...article,
    qa: article.qa.map((item) => {
      const raw = hasLive ? live[item.answerKey] : undefined
      const trimmed = raw?.trim()
      if (trimmed) {
        return { ...item, answer: splitParagraphs(trimmed) }
      }
      return item // baked-in fallback
    }),
  }))
  return { articles, live: hasLive }
}

export function useParentGuide() {
  const [liveAnswers, setLiveAnswers] = useState<CoachInterviewAnswers | null>(null)

  useEffect(() => {
    let cancelled = false
    pullCoachInterview().then((a) => {
      if (!cancelled) setLiveAnswers(a)
    })
    return () => {
      cancelled = true
    }
  }, [])

  if (liveAnswers === null) {
    // Still loading — show the baked-in snapshot so it never looks broken.
    return { articles: PARENT_EDUCATION, loading: true, live: false as const }
  }
  const { articles, live } = mergeAnswers(liveAnswers)
  return { articles, loading: false as const, live }
}
