/**
 * Contextual Parent Guide recommendations.
 *
 * Separate layer from the Parent Guide content itself: this maps athlete
 * context (already parent-visible) to EXISTING Parent Guide article IDs.
 * No article text is duplicated here and no Parent Guide content is changed.
 *
 * Rules are simple and deterministic — no AI inference. Only surface an
 * article when the connection is straightforward; otherwise fall back to a
 * general recommendation.
 *
 * To disable the whole feature without reverting: set
 * PARENT_GUIDE_RECOMMENDATIONS_ENABLED = false.
 */

import { PARENT_EDUCATION } from '../config/parentEducation'
import type { Athlete, HomeworkItem, HomeworkLog } from '../types'

export const PARENT_GUIDE_RECOMMENDATIONS_ENABLED = true

export type ParentGuideRecommendation = {
  articleId: string
  /** Neutral, observational reason generated from athlete context. */
  reason: string
  /** Higher wins. Used to sort and cap the list. */
  priority: number
}

export type RecommendationContext = {
  homework: HomeworkItem[]
  logs: HomeworkLog[]
}

const MAX_RECOMMENDATIONS = 3
const OPEN_COUNT_KEY = 'sl-parent-guide-rec-opens'
const SUPPRESS_AFTER_OPENS = 3

/** Article ids referenced here must exist in PARENT_EDUCATION. */
const KNOWN_IDS = new Set(PARENT_EDUCATION.map((a) => a.id))

function firstNameOf(athlete: Athlete): string {
  return athlete.firstName || athlete.name || 'your athlete'
}

function goalLabels(athlete: Athlete): string[] {
  return (athlete.skillGoals ?? []).map((g) => `${g.label ?? ''} ${g.id ?? ''}`.toLowerCase())
}

function homeworkLabels(homework: HomeworkItem[]): string[] {
  return homework.map((h) => `${h.customLabel ?? ''} ${h.shapeId ?? ''}`.toLowerCase())
}

function daysBetween(a: string, b: string): number {
  return Math.abs(new Date(a).getTime() - new Date(b).getTime()) / 86_400_000
}

function readOpenCounts(): Record<string, number> {
  try {
    return JSON.parse(localStorage.getItem(OPEN_COUNT_KEY) ?? '{}') as Record<string, number>
  } catch {
    return {}
  }
}

/** Call when a parent opens a recommended article. After several opens the
 * recommendation stops being pushed for that article. */
export function recordRecommendationOpen(articleId: string): void {
  try {
    const counts = readOpenCounts()
    counts[articleId] = (counts[articleId] ?? 0) + 1
    localStorage.setItem(OPEN_COUNT_KEY, JSON.stringify(counts))
  } catch {
    /* storage unavailable — recommendations still work */
  }
}

const FUNDAMENTAL_HINTS = [
  'handstand',
  'hollow',
  'arch',
  'lunge',
  'lever',
  'candlestick',
  'basic',
  'shape',
  'support',
  'tight body',
]

export function getParentEducationRecommendations(
  athlete: Athlete | null,
  ctx: RecommendationContext,
): ParentGuideRecommendation[] {
  if (!PARENT_GUIDE_RECOMMENDATIONS_ENABLED) return []
  if (!athlete) {
    return [
      {
        articleId: 'what-progress-looks-like',
        reason: 'A good general starting point for supporting your athlete.',
        priority: 10,
      },
    ]
  }
  const name = firstNameOf(athlete)
  const recs: ParentGuideRecommendation[] = []
  const goals = goalLabels(athlete)
  const hw = homeworkLabels(ctx.homework)

  // R1 — athlete is working heavily on fundamentals.
  const fundamentalWork =
    goals.some((g) => FUNDAMENTAL_HINTS.some((h) => g.includes(h))) ||
    hw.some((h) => FUNDAMENTAL_HINTS.some((hint) => h.includes(hint)))
  if (fundamentalWork) {
    recs.push({
      articleId: 'why-still-working-on-basics',
      reason: `A lot of ${name}'s current work is focused on foundational shapes and drills.`,
      priority: 100,
    })
  }

  // R2 — athlete is working drills / deconstruction.
  const drillWork = hw.some((h) => h.includes('drill'))
  if (drillWork) {
    recs.push({
      articleId: 'why-not-just-try-the-skill',
      reason: `Much of ${name}'s current work is drill-based rather than full skills.`,
      priority: 90,
    })
  }

  // R3 — steady work on the same skill for weeks (plateau signal).
  const logs = [...ctx.logs].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
  )
  if (logs.length >= 4) {
    const spanDays = daysBetween(logs[0].date, logs[logs.length - 1].date)
    const topKey = (() => {
      const counts = new Map<string, number>()
      for (const l of logs) {
        const key = l.homeworkId || l.shapeId
        counts.set(key, (counts.get(key) ?? 0) + 1)
      }
      let best = ''
      let bestN = 0
      for (const [k, n] of counts) {
        if (n > bestN) {
          best = k
          bestN = n
        }
      }
      return { key: best, share: bestN / logs.length }
    })()
    if (spanDays >= 21 && topKey.share >= 0.6) {
      recs.push({
        articleId: 'plateaus-are-information',
        reason: `${name} has been putting in steady work on the same skills for a few weeks.`,
        priority: 80,
      })
    }
  }

  // R4 — athlete has homework assigned.
  if (ctx.homework.length > 0) {
    recs.push({
      articleId: 'small-habits-big-skills',
      reason: `${name} has homework on file — this connects with making the most of it.`,
      priority: 70,
    })
  }

  // R5 — working toward a skill goal (started, not yet owned).
  const activeGoal = (athlete.skillGoals ?? []).find(
    (g) => (g.pathDone?.length ?? 0) > 0,
  )
  if (activeGoal) {
    recs.push({
      articleId: 'doing-it-once-vs-owning-it',
      reason: `${name} is working toward ${activeGoal.label || 'a new skill'}.`,
      priority: 60,
    })
  }

  // Fallback — general recommendation instead of forcing a match.
  if (recs.length === 0) {
    recs.push({
      articleId: 'what-progress-looks-like',
      reason: 'A good general starting point for supporting your athlete.',
      priority: 10,
    })
  }

  // Keep only known article ids, dedupe, sort by priority, cap the list,
  // and stop pushing articles the parent has already opened several times.
  const openCounts = readOpenCounts()
  const seen = new Set<string>()
  return recs
    .filter((r) => KNOWN_IDS.has(r.articleId))
    .filter((r) => {
      if (seen.has(r.articleId)) return false
      seen.add(r.articleId)
      return true
    })
    .filter((r) => (openCounts[r.articleId] ?? 0) < SUPPRESS_AFTER_OPENS)
    .sort((a, b) => b.priority - a.priority)
    .slice(0, MAX_RECOMMENDATIONS)
}
