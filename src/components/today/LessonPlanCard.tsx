import { useMemo, useState } from 'react'
import type { Athlete } from '../../types'
import type { TodayCalendarEvent } from '../../lib/calendarClient'
import {
  getOrCreateClassPlan,
  addPlanTask,
  togglePlanTask,
  removePlanTask,
  reorderPlanTask,
  type ClassPlan,
} from '../../lib/classPlans'
import { useDragList, DragGrip } from './useDragList'

function formatTime(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  let h = d.getHours()
  const m = String(d.getMinutes()).padStart(2, '0')
  const ampm = h >= 12 ? 'pm' : 'am'
  h = h % 12 || 12
  return `${h}:${m}${ampm}`
}

/**
 * Task planning for a single lesson. Uses the class-plan store with a
 * synthetic offering id (`lesson:<eventId>`) so tasks sync, appear in the
 * athlete checklist, and show on the athlete's Today view — same as classes.
 *
 * Shared by the morning brief, the calendar event detail, and the live
 * lesson workspace.
 */
export function LessonPlanCard({
  event,
  athlete,
  coachId,
  dateKey,
  open,
  onToggle,
  taskInput,
  onTaskInput,
  plansTick,
  /** Hide the header row; the parent already shows the lesson title. */
  hideHeader = false,
}: {
  event: TodayCalendarEvent
  athlete: Athlete | null
  coachId: string
  dateKey: string
  open: boolean
  onToggle: () => void
  taskInput: string
  onTaskInput: (v: string) => void
  plansTick: number
  hideHeader?: boolean
}) {
  const planId = `lesson:${event.id}`
  const plan: ClassPlan = useMemo(
    () => getOrCreateClassPlan(dateKey, planId, coachId),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [dateKey, planId, coachId, plansTick],
  )
  const [repsInput, setRepsInput] = useState('')

  const { handleProps, rowStyle } = useDragList((from, to) => {
    const task = plan.tasks[from]
    if (task) reorderPlanTask(plan.id, task.id, to)
  })

  const addTask = () => {
    if (!taskInput.trim()) return
    const reps = parseInt(repsInput, 10)
    // Lesson tasks belong to the matched athlete; fall back to 'all' so the
    // task still shows if the event isn't linked yet.
    const athleteIds = athlete ? [athlete.id] : ['all']
    addPlanTask(plan.id, athleteIds, taskInput, Number.isFinite(reps) && reps > 0 ? reps : undefined)
    onTaskInput('')
    setRepsInput('')
  }

  const label = athlete?.firstName || athlete?.name || event.title || 'Lesson'
  const doneCount = plan.tasks.filter((t) => t.done).length

  const body = (
    <>
      {plan.tasks.length > 0 && (
        <ul className="mb-2 space-y-1">
          {plan.tasks.map((t, i) => (
            <li
              key={t.id}
              style={rowStyle(i)}
              className="flex items-center gap-1.5 text-sm"
            >
              <DragGrip {...handleProps(i)} />
              <button
                type="button"
                onClick={() => togglePlanTask(plan.id, t.id)}
                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border ${
                  t.done
                    ? 'border-[var(--accent)] bg-[var(--accent)] text-[#06281f]'
                    : 'border-white/30'
                }`}
                aria-label={t.done ? 'Mark not done' : 'Mark done'}
              >
                {t.done ? '✓' : ''}
              </button>
              <span className={`min-w-0 flex-1 ${t.done ? 'line-through opacity-50' : ''}`}>
                {t.text}
                {t.repsTarget ? ` (${t.repsDone ?? 0}/${t.repsTarget})` : ''}
              </span>
              <button
                type="button"
                onClick={() => removePlanTask(plan.id, t.id)}
                className="shrink-0 px-1 text-xs text-[var(--muted)] hover:text-red-400"
                aria-label="Remove task"
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="flex min-w-0 gap-2">
        <input
          type="text"
          value={taskInput}
          onChange={(e) => onTaskInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') addTask()
          }}
          placeholder={`What will ${athlete?.firstName || 'they'} work on?`}
          className="min-w-0 flex-1 rounded-lg border border-[var(--panel-border)] bg-[#0d1218] px-3 py-1.5 text-sm"
        />
        <input
          type="number"
          value={repsInput}
          onChange={(e) => setRepsInput(e.target.value)}
          placeholder="Reps"
          className="w-14 shrink-0 rounded-lg border border-[var(--panel-border)] bg-[#0d1218] px-2 py-1.5 text-sm"
        />
        <button
          type="button"
          onClick={addTask}
          className="shrink-0 rounded-lg bg-[var(--accent)] px-3 py-1.5 text-sm font-semibold text-[#06281f]"
        >
          Add
        </button>
      </div>
    </>
  )

  if (hideHeader) {
    return <div className="mt-2 border-t border-white/10 pt-2">{body}</div>
  }

  return (
    <div className="min-w-0 rounded-lg bg-[#121820] px-3 py-2">
      <button
        type="button"
        className="flex w-full min-w-0 items-center justify-between gap-2 text-left"
        onClick={onToggle}
      >
        <span className="min-w-0 truncate text-sm text-[var(--text)]">
          {formatTime(event.startAt)} · {label}
          {plan.tasks.length > 0 && (
            <span className="ml-2 text-xs text-[var(--muted)]">
              {doneCount}/{plan.tasks.length} done
            </span>
          )}
        </span>
        <span className="shrink-0 text-xs text-[var(--muted)]">{open ? '▾' : '▸'}</span>
      </button>
      {open && <div className="mt-2 min-w-0 border-t border-white/10 pt-2">{body}</div>}
    </div>
  )
}
