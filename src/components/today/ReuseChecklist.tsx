import { useMemo, useState } from 'react'
import type { Athlete } from '../../types'
import {
  checklistCopyCount,
  checklistSourcesForAthlete,
  copiedTasksForAthlete,
  removeCopiedTasksForAthlete,
  taskDoneFor,
  type ClassPlan,
} from '../../lib/classPlans'
import { getOffering } from '../../lib/coachClasses'

/** "Private lesson" for lesson plans, the class name for class plans. */
export function checklistSessionLabel(plan: ClassPlan): string {
  if (plan.offeringId.startsWith('lesson:')) return 'Private lesson'
  return getOffering(plan.offeringId)?.name ?? 'Class'
}

export function fmtPlanDay(iso: string): string {
  return new Date(`${iso}T12:00:00`).toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })
}

/**
 * Browse an athlete's past checklists (last lesson, any class she
 * attended) and reuse one in the plan being written. Tapping a session
 * only OPENS it for viewing — the coach reads the tasks first, then
 * taps Add to copy them in. Sources stay listed after copying (marked
 * as added), and the tasks this picker added can all be removed again
 * from the footer, so exploring never pollutes today's plan.
 */
export function ReuseChecklist({
  athlete,
  beforeDate,
  target,
  refreshKey,
  tone = 'brief',
  className = '',
  onPick,
}: {
  athlete: Athlete
  beforeDate: string
  /** Target plan for copy counts; null when it does not exist yet. */
  target: ClassPlan | null
  refreshKey?: string | number
  tone?: 'brief' | 'overlay'
  className?: string
  onPick: (source: ClassPlan) => void
}) {
  const [openId, setOpenId] = useState<string | null>(null)
  const rows = useMemo(
    () =>
      checklistSourcesForAthlete(athlete.id, beforeDate, target?.id).map((s) => ({
        ...s,
        count: checklistCopyCount(s.plan, target, athlete.id),
      })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [athlete.id, beforeDate, target?.id, target?.tasks, refreshKey],
  )
  const copiedCount = useMemo(
    () => (target ? copiedTasksForAthlete(target, athlete.id).length : 0),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [target?.tasks, athlete.id, refreshKey],
  )
  if (rows.length === 0) return null
  const name = athlete.firstName || athlete.name
  const overlay = tone === 'overlay'
  const sub = overlay ? 'text-white/60' : 'text-[var(--muted)]'
  const rowBtn = overlay
    ? 'w-full rounded-xl border border-[var(--accent)]/40 bg-[var(--accent)]/10 px-4 py-3 text-left text-base text-white'
    : 'w-full rounded-xl border border-[var(--accent)]/40 bg-[var(--accent)]/10 px-3 py-2 text-left text-sm text-[var(--text)]'
  return (
    <div className={className}>
      <p className={`mb-2 text-xs font-semibold uppercase tracking-wide ${sub}`}>
        {name}'s past checklists
      </p>
      <div className="grid gap-2">
        {rows.map(({ plan, tasks, count }) => {
          const open = openId === plan.id
          return (
            <div key={plan.id}>
              <button
                type="button"
                onClick={() => setOpenId(open ? null : plan.id)}
                className={rowBtn}
                aria-expanded={open}
              >
                <span className="flex items-baseline justify-between gap-2">
                  <span className="min-w-0 font-semibold">
                    {checklistSessionLabel(plan)} · {fmtPlanDay(plan.date)}
                  </span>
                  <span className={`shrink-0 ${sub}`}>
                    {tasks.length} task{tasks.length === 1 ? '' : 's'} {open ? '▴' : '▾'}
                  </span>
                </span>
              </button>
              {open && (
                <div
                  className={`mt-1 rounded-xl border px-3 py-2 ${
                    overlay ? 'border-white/10 bg-white/[0.03]' : 'border-[var(--accent)]/20'
                  }`}
                >
                  <ul className="space-y-1">
                    {tasks.map((t) => (
                      <li
                        key={t.id}
                        className={`flex items-baseline gap-2 text-sm ${overlay ? 'text-white/85' : ''}`}
                      >
                        <span className={taskDoneFor(t, athlete.id) ? 'text-emerald-400' : sub}>
                          {taskDoneFor(t, athlete.id) ? '✓' : '•'}
                        </span>
                        <span className="min-w-0 flex-1">
                          {t.text}
                          {t.repsTarget ? (
                            <span className={sub}> · {t.repsTarget} reps</span>
                          ) : null}
                        </span>
                      </li>
                    ))}
                  </ul>
                  <div className="mt-2">
                    {count > 0 ? (
                      <button
                        type="button"
                        onClick={() => onPick(plan)}
                        className="rounded-lg bg-[var(--accent)] px-3 py-2 text-sm font-semibold text-[#06281f]"
                      >
                        Add {count} task{count === 1 ? '' : 's'} to today's plan
                      </button>
                    ) : (
                      <p className={`text-sm ${sub}`}>Already in today's plan.</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
      {target && copiedCount > 0 && (
        <button
          type="button"
          onClick={() => removeCopiedTasksForAthlete(target.id, athlete.id)}
          className="mt-3 rounded-lg border border-red-400/30 px-3 py-2 text-xs font-semibold text-red-400"
        >
          Remove all added tasks ({copiedCount})
        </button>
      )}
    </div>
  )
}
