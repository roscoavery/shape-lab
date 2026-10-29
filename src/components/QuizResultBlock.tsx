import { useEffect, useState } from 'react'
import {
  fetchQuizResults,
  formatQuizDate,
  pickLatestQuizResult,
  quizResultKnowsMisses,
  quizResultMisses,
  type QuizResult,
} from '../lib/quizResults'

/**
 * The athlete's latest shape-test grade: score, date, and what she got
 * wrong (picked answer next to the right shape). Renders nothing when
 * she has no saved test. Shared by the profile card and the lesson plan.
 */
export function QuizResultBlock({
  athlete,
  showName = false,
}: {
  athlete: { id: string; firstName?: string; lastName?: string; name?: string }
  showName?: boolean
}) {
  const [result, setResult] = useState<QuizResult | null | undefined>(undefined)
  useEffect(() => {
    let cancelled = false
    setResult(undefined)
    fetchQuizResults({
      id: athlete.id,
      firstName: athlete.firstName ?? athlete.name?.split(' ')[0] ?? '',
      lastName: athlete.lastName ?? athlete.name?.split(' ').slice(1).join(' ') ?? '',
    })
      .then((results) => {
        if (!cancelled) setResult(pickLatestQuizResult(results))
      })
      .catch(() => {
        if (!cancelled) setResult(null)
      })
    return () => {
      cancelled = true
    }
  }, [athlete.id, athlete.firstName, athlete.lastName, athlete.name])

  if (!result) return null
  const misses = quizResultMisses(result)
  const name = showName
    ? (athlete.firstName ?? athlete.name?.split(' ')[0] ?? 'Athlete')
    : null
  return (
    <div className="mb-2 rounded-md bg-[#0d1218] px-3 py-2">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--accent)]">
        Shape test
        {name ? <span className="normal-case tracking-normal text-[var(--muted)]"> · {name}</span> : null}
      </p>
      <p className="mt-0.5 text-sm">
        {result.score}/{result.total}
        {formatQuizDate(result.takenAt) ? ` · ${formatQuizDate(result.takenAt)}` : ''}
        {misses.length === 0 && quizResultKnowsMisses(result) ? ' · all correct' : ''}
      </p>
      {misses.length > 0 && (
        <ul className="mt-1 space-y-0.5">
          {misses.map((m) => (
            <li key={m.shapeId} className="text-sm text-[var(--muted)]">
              {m.shapeName}
              {m.picked ? <span> — picked {m.picked}</span> : <span> — no answer</span>}
            </li>
          ))}
        </ul>
      )}
      {misses.length === 0 && !quizResultKnowsMisses(result) && result.score < result.total && (
        <p className="text-xs text-[var(--muted)]">Which shapes were missed wasn't saved for this one.</p>
      )}
    </div>
  )
}
