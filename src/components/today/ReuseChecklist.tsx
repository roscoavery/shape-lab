import { useMemo, useState } from 'react'
import type { Athlete } from '../../types'
import {
  checklistCopyCount,
  checklistSourcesForAthlete,
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
 * "Use {name}'s checklist" — pull an athlete's checklist from a past
 * session into the plan being written. The main button copies her most
 * recent one; when she has older ones too, a More toggle lists every
 * past session (last lesson, any class she attended) so the coach can
 * pick exactly which checklist to reuse.
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
  const [open, setOpen] = useState(false)
  const rows = useMemo(
    () =>
      checklistSourcesForAthlete(athlete.id, beforeDate, target?.id)
        .map((s) => ({ ...s, count: checklistCopyCount(s.plan, target, athlete.id) }))
        .filter((s) => s.count > 0),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [athlete.id, beforeDate, target?.id, target?.tasks, refreshKey],
  )
  if (rows.length === 0) return null
  const first = rows[0]!
  const name = athlete.firstName || athlete.name
  const overlay = tone === 'overlay'
  const mainBtn = overlay
    ? 'rounded-xl border border-[var(--accent)]/40 bg-[var(--accent)]/10 px-4 py-3 text-left text-base text-white'
    : 'rounded-xl border border-[var(--accent)]/40 bg-[var(--accent)]/10 px-3 py-2 text-left text-sm text-[var(--text)]'
  const sub = overlay ? 'text-white/60' : 'text-[var(--muted)]'
  return (
    <div className={className}>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => {
            onPick(first.plan)
            setOpen(false)
          }}
          className={`min-w-0 flex-1 ${mainBtn}`}
        >
          <span className="font-semibold">Use {name}'s checklist</span>{' '}
          <span className={sub}>
            Copy {first.count} task{first.count === 1 ? '' : 's'} from{' '}
            {checklistSessionLabel(first.plan)} · {fmtPlanDay(first.plan.date)}.
          </span>
        </button>
        {rows.length > 1 && (
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            aria-label="More checklists"
            className={`shrink-0 ${mainBtn}`}
          >
            {open ? '▴' : '▾'}
          </button>
        )}
      </div>
      {open && rows.length > 1 && (
        <div className="mt-2 grid gap-2">
          {rows.map(({ plan, count }) => (
            <button
              key={plan.id}
              type="button"
              onClick={() => {
                onPick(plan)
                setOpen(false)
              }}
              className={`w-full ${mainBtn}`}
            >
              <span className="font-semibold">
                {checklistSessionLabel(plan)} · {fmtPlanDay(plan.date)}
              </span>{' '}
              <span className={sub}>
                {count} task{count === 1 ? '' : 's'}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
