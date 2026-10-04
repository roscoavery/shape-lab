import { useState } from 'react'
import {
  dismissLessonMergeGroup,
  findDuplicateLessonGroups,
  isLessonMergeGroupDismissed,
  lessonAthleteIds,
  mergeLessonGroup,
} from '../../lib/lessonStore'
import type { Athlete } from '../../types'

/**
 * When a lesson was accidentally started more than once (e.g., on two
 * devices), offer to consolidate all of that athlete's sessions for the day
 * into one. One prompt per athlete+day, one tap merges everything.
 */
export function LessonMergePrompt({ athletes }: { athletes: Athlete[] }) {
  const [tick, setTick] = useState(0)
  // Recompute when tick changes (after merge/dismiss).
  void tick
  const groups = findDuplicateLessonGroups().filter(
    (g) => !isLessonMergeGroupDismissed(g.athleteId, g.day),
  )
  if (groups.length === 0) return null

  const athleteName = (id: string) => {
    const a = athletes.find((x) => x.id === id)
    return a ? `${a.firstName} ${a.lastName}`.trim() : 'athlete'
  }

  const formatDay = (day: string) => {
    const d = new Date(`${day}T12:00:00`)
    return d.toLocaleDateString([], {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    })
  }

  return (
    <div className="flex flex-col gap-2">
      {groups.map((g) => {
        // Resolve the name from the group's sessions in case the stored
        // athleteId on one session doesn't match a profile.
        const nameIds = g.sessions.flatMap((s) => lessonAthleteIds(s))
        const resolved =
          nameIds.map((id) => athleteName(id)).find((n) => n !== 'athlete') ?? 'athlete'
        const day = formatDay(g.day)
        const count = g.sessions.length
        return (
          <div
            key={`${g.athleteId}|${g.day}`}
            className="rounded-xl border border-amber-300/40 bg-amber-300/10 px-4 py-3"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-bold text-[var(--text)]">
                  {count} lessons with {resolved} on {day}
                </p>
                <p className="mt-0.5 text-xs text-[var(--muted)]">
                  Looks like this lesson was started {count} times. Merge them into
                  one recap? Notes and holds from all are kept.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  dismissLessonMergeGroup(g.athleteId, g.day)
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
                mergeLessonGroup(g.sessions)
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
