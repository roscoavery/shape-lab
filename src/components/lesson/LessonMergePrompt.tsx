import { useState } from 'react'
import {
  dismissLessonMergePair,
  findDuplicateLessons,
  isLessonMergeDismissed,
  mergeLessonSessions,
} from '../../lib/lessonStore'
import type { Athlete } from '../../types'

/**
 * When a lesson was accidentally started twice (e.g., on two devices),
 * offer to consolidate the two sessions into one. Requires same athlete
 * and same day, which findDuplicateLessons already enforces.
 */
export function LessonMergePrompt({ athletes }: { athletes: Athlete[] }) {
  const [tick, setTick] = useState(0)
  const pairs = findDuplicateLessons().filter(
    ({ a, b }) => !isLessonMergeDismissed(a.id, b.id),
  )
  // Recompute when tick changes (after merge/dismiss).
  void tick
  if (pairs.length === 0) return null

  const athleteName = (id: string) => {
    const a = athletes.find((x) => x.id === id)
    return a ? `${a.firstName} ${a.lastName}`.trim() : 'athlete'
  }

  return (
    <div className="flex flex-col gap-2">
      {pairs.map(({ a, b }) => {
        const name = athleteName(a.athleteId)
        const day = new Date(a.startedAt).toLocaleDateString([], {
          weekday: 'short',
          month: 'short',
          day: 'numeric',
        })
        const key = `${a.id}|${b.id}`
        return (
          <div
            key={key}
            className="rounded-xl border border-amber-300/40 bg-amber-300/10 px-4 py-3"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-bold text-[var(--text)]">
                  Two lessons with {name} on {day}
                </p>
                <p className="mt-0.5 text-xs text-[var(--muted)]">
                  Looks like this lesson was started twice. Merge them into one
                  recap? Notes and holds from both are kept.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  dismissLessonMergePair(a.id, b.id)
                  setTick((t) => t + 1)
                }}
                className="shrink-0 rounded-full px-2 py-1 text-xs text-[var(--muted)]"
                aria-label="Dismiss"
              >
                ✕
              </button>
            </div>
            <button
              type="button"
              onClick={() => {
                mergeLessonSessions(a.id, b.id)
                setTick((t) => t + 1)
              }}
              className="mt-2 w-full rounded-xl bg-amber-300 px-4 py-2.5 text-sm font-black text-black"
            >
              Merge into one lesson
            </button>
          </div>
        )
      })}
    </div>
  )
}
