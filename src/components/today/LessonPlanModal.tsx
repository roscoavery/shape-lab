import { useEffect, useState } from 'react'
import type { Athlete } from '../../types'
import type { TodayCalendarEvent } from '../../lib/calendarClient'
import { lessonPlanDateKey, subscribeClassPlans, pullClassPlans } from '../../lib/classPlans'
import { LessonPlanCard } from './LessonPlanCard'

function formatWhen(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleString([], { weekday: 'short', hour: 'numeric', minute: '2-digit' })
}

/**
 * Plan a lesson from anywhere: the "needs a plan" banner opens this directly
 * for the calendar event, whatever day it's on. Tasks save into the
 * class-plan store under the event's date, so they're there on lesson day.
 * Athletes are added on the event itself (Change), up to 3, so every
 * athlete gets a checklist planned here, like a class.
 */
export function LessonPlanModal({
  event,
  athletes,
  coachId,
  onClose,
}: {
  event: TodayCalendarEvent
  athletes: Athlete[]
  coachId: string
  onClose: () => void
}) {
  const [plansTick, setPlansTick] = useState(0)
  const [taskInput, setTaskInput] = useState('')

  useEffect(() => subscribeClassPlans(() => setPlansTick((n) => n + 1)), [])
  useEffect(() => {
    void pullClassPlans()
  }, [])
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const label =
    athletes.length > 0
      ? athletes.map((a) => a.name).join(' + ')
      : event.title || 'Lesson'
  // Notes that mention adding an athlete, while the event still lists
  // fewer than two, mean someone is missing from the plan.
  const needsMoreAthletes = /add athlete/i.test(event.notes ?? '') && athletes.length < 2

  return (
    <div
      className="fixed inset-0 z-[80] flex items-end justify-center bg-black/70 p-4 sm:items-center"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={`Plan lesson: ${label}`}
    >
      <div
        className="w-full max-w-lg rounded-2xl border border-[var(--panel-border)] bg-[#0d1218] p-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--accent)]">
              Lesson plan
            </p>
            <p className="mt-0.5 truncate text-base font-bold text-[var(--text)]">{label}</p>
            <p className="text-xs text-[var(--muted)]">{formatWhen(event.startAt)}</p>
            {needsMoreAthletes && (
              <p className="mt-1 text-xs font-semibold text-amber-300">
                Notes say &quot;add athlete&quot; — this lesson may have more than one athlete. Add them on the event (Change) so you can plan for everyone here.
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-full px-3 py-1.5 text-sm text-[var(--muted)]"
            aria-label="Close plan"
          >
            Done
          </button>
        </div>
        <LessonPlanCard
          event={event}
          athlete={athletes[0] ?? null}
          athletes={athletes}
          coachId={coachId}
          dateKey={lessonPlanDateKey(event)}
          open={true}
          onToggle={() => {}}
          taskInput={taskInput}
          onTaskInput={setTaskInput}
          plansTick={plansTick}
          hideHeader={true}
        />
        <p className="mt-2 text-xs text-[var(--muted)]">
          Tasks show in the live lesson and on each athlete's checklist.
        </p>
      </div>
    </div>
  )
}
