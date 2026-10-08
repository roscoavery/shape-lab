import { useEffect, useMemo, useState } from 'react'
import type { Athlete } from '../../types'
import {
  tasksForAthleteOnDate,
  togglePlanTask,
  bumpTaskReps,
  subscribeClassPlans,
  todayKey,
} from '../../lib/classPlans'
import { getOffering } from '../../lib/coachClasses'

/**
 * Today's focus for an athlete: the tasks their coach planned for them
 * in today's classes. Shows before class so they know what to work on.
 */
export function AthleteTodayTasks({ athlete }: { athlete: Athlete | null }) {
  const [tick, setTick] = useState(0)

  useEffect(() => subscribeClassPlans(() => setTick((n) => n + 1)), [])

  const items = useMemo(() => {
    if (!athlete) return []
    // eslint-disable-next-line react-hooks/exhaustive-deps
    return tasksForAthleteOnDate(athlete.id, todayKey())
  }, [athlete?.id, tick])

  if (!athlete || items.length === 0) return null

  const open = items.filter((i) => !i.task.done)

  return (
    <section className="rounded-xl border border-amber-300/30 bg-amber-300/5 p-5">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-amber-300">
        From your coach
      </p>
      <h2 className="mt-1 text-xl font-semibold text-[var(--text)]">
        Today's focus
      </h2>
      {open.length === 0 ? (
        <p className="mt-2 text-sm text-[var(--muted)]">
          All done. Nice work today.
        </p>
      ) : (
        <ul className="mt-3 space-y-2">
          {items.map(({ plan, task }) => {
            const offering = getOffering(plan.offeringId)
            return (
              <li
                key={task.id}
                className={`flex w-full items-center gap-3 rounded-xl border p-3 ${
                  task.done
                    ? 'border-[var(--accent)]/30 bg-[var(--accent)]/5'
                    : 'border-[var(--panel-border)] bg-[var(--panel)]'
                }`}
              >
                {task.repsTarget ? (
                  <>
                    <span className="min-w-0 flex-1">
                      <span
                        className={`block text-sm font-medium ${
                          task.done
                            ? 'text-[var(--muted)] line-through'
                            : 'text-[var(--text)]'
                        }`}
                      >
                        {task.text}
                      </span>
                      {offering && (
                        <span className="block text-xs text-[var(--muted)]">
                          {offering.time} · {offering.name}
                        </span>
                      )}
                    </span>
                    <div className="flex shrink-0 items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => bumpTaskReps(plan.id, task.id, -1)}
                        className="flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--panel-border)] text-lg text-[var(--text)]"
                        aria-label="Remove a rep"
                      >
                        −
                      </button>
                      <span className="min-w-[2.75rem] text-center text-sm font-bold tabular-nums text-[var(--text)]">
                        {task.repsDone ?? 0}
                        <span className="text-[var(--muted)]">/{task.repsTarget}</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => bumpTaskReps(plan.id, task.id, 1)}
                        className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--accent)] text-lg font-bold text-[var(--on-accent)]"
                        aria-label="Add a rep"
                      >
                        +
                      </button>
                    </div>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => togglePlanTask(plan.id, task.id)}
                    className="flex w-full items-center gap-3 text-left"
                  >
                    <span
                      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border text-lg ${
                        task.done
                          ? 'border-[var(--accent)] bg-[var(--accent)] text-[var(--on-accent)]'
                          : 'border-[var(--panel-border)] text-transparent'
                      }`}
                    >
                      ✓
                    </span>
                    <span className="min-w-0">
                      <span
                        className={`block text-sm font-medium ${
                          task.done
                            ? 'text-[var(--muted)] line-through'
                            : 'text-[var(--text)]'
                        }`}
                      >
                        {task.text}
                      </span>
                      {offering && (
                        <span className="block text-xs text-[var(--muted)]">
                          {offering.time} · {offering.name}
                        </span>
                      )}
                    </span>
                  </button>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
