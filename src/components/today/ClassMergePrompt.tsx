import { useState } from 'react'
import {
  dismissClassMergeGroup,
  findDuplicateClassMeetingGroups,
  isClassMergeGroupDismissed,
  mergeClassMeetingGroup,
} from '../../lib/coachClasses'

/**
 * When a class was accidentally started more than once on the same day
 * (e.g., on two devices), offer to consolidate all of that offering's
 * meetings for the day into one. One prompt per offering+day, one tap
 * merges everything.
 */
export function ClassMergePrompt() {
  const [tick, setTick] = useState(0)
  // Recompute when tick changes (after merge/dismiss).
  void tick
  const groups = findDuplicateClassMeetingGroups().filter(
    (g) => !isClassMergeGroupDismissed(g.offeringId, g.day),
  )
  if (groups.length === 0) return null

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
        const day = formatDay(g.day)
        const count = g.meetings.length
        const timeLabel = g.offeringTime ? ` (${g.offeringTime})` : ''
        return (
          <div
            key={`${g.offeringId}|${g.day}`}
            className="rounded-xl border border-amber-300/40 bg-amber-300/10 px-4 py-3"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-bold text-[var(--text)]">
                  {count} {g.offeringName} classes{timeLabel} on {day}
                </p>
                <p className="mt-0.5 text-xs text-[var(--muted)]">
                  Looks like this class was started {count} times. Merge them into
                  one recap? Roll, notes, and coach hours from all are kept.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  dismissClassMergeGroup(g.offeringId, g.day)
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
                mergeClassMeetingGroup(g.meetings)
                setTick((t) => t + 1)
              }}
              className="mt-2 w-full rounded-xl bg-amber-300 px-4 py-2.5 text-sm font-black text-black"
            >
              Merge into one class
            </button>
          </div>
        )
      })}
    </div>
  )
}
