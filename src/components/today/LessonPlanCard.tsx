import { useEffect, useMemo, useState } from 'react'
import type { Athlete } from '../../types'
import type { TodayCalendarEvent } from '../../lib/calendarClient'
import { parseAcuityNotes } from '../../lib/acuityNotes'
import { AthleteAvatar } from '../AthleteAvatar'
import {
  getOrCreateClassPlan,
  addPlanTask,
  togglePlanTask,
  taskDoneFor,
  taskDoneForAll,
  taskRepsDoneFor,
  taskAssignees,
  removePlanTask,
  reorderPlanTask,
  copyChecklistForAthlete,
  stampPlanAthlete,
  type ClassPlan,
} from '../../lib/classPlans'
import { ReuseChecklist } from './ReuseChecklist'
import { QuizResultBlock } from '../QuizResultBlock'
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
 * Task planning for a lesson, one event, up to 3 athletes. Uses the
 * class-plan store with a synthetic offering id (`lesson:<eventId>`) so
 * tasks sync, appear in the athlete checklists, and show on each
 * athlete's Today view — same as classes.
 *
 * With one athlete the card behaves exactly as before: tasks belong to
 * her. With several, it works like a class plan: Everyone / athlete
 * chips pick who a task belongs to, shared tasks carry several names,
 * and each athlete's checklist shows her own tasks plus Everyone tasks.
 *
 * Shared by the morning brief, the calendar event detail, and the live
 * lesson workspace.
 */
export function LessonPlanCard({
  event,
  athlete,
  athletes,
  coachId,
  dateKey,
  open,
  onToggle,
  taskInput,
  onTaskInput,
  plansTick,
  /** Hide the header row; the parent already shows the lesson title. */
  hideHeader = false,
  /** Open the athlete's profile (tap on their photo). */
  onViewProfile,
}: {
  event: TodayCalendarEvent
  athlete: Athlete | null
  /** Every athlete on the event, primary first. Defaults to [athlete]. */
  athletes?: Athlete[]
  coachId: string
  dateKey: string
  open: boolean
  onToggle: () => void
  taskInput: string
  onTaskInput: (v: string) => void
  plansTick: number
  hideHeader?: boolean
  onViewProfile?: (id: string) => void
}) {
  const planId = `lesson:${event.id}`
  const plan: ClassPlan = useMemo(
    () => getOrCreateClassPlan(dateKey, planId, coachId),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [dateKey, planId, coachId, plansTick],
  )
  const people = useMemo(
    () => (athletes?.length ? athletes : athlete ? [athlete] : []),
    [athletes, athlete],
  )
  const multi = people.length > 1
  // Who the next task belongs to. Single-athlete lessons keep the old
  // behavior (tasks belong to her); multi-athlete lessons start on
  // Everyone, like a class plan.
  const [chipIds, setChipIds] = useState<string[]>(['all'])
  const effectiveChips = useMemo(() => {
    if (!multi) return people.length ? [people[0]!.id] : ['all']
    const kept = chipIds.filter((id) => id === 'all' || people.some((p) => p.id === id))
    return kept.length > 0 ? kept : ['all']
  }, [multi, chipIds, people])
  // Stamp the plan with every athlete it belongs to, so this lesson's
  // checklist can be found as hers later even if its tasks were written
  // before the lesson was linked to her, and so Everyone tasks resolve
  // to all of them.
  useEffect(() => {
    for (const person of people) stampPlanAthlete(plan.id, person.id)
  }, [plan.id, people])
  const [repsInput, setRepsInput] = useState('')

  const { handleProps, rowStyle } = useDragList((from, to) => {
    const task = plan.tasks[from]
    if (task) reorderPlanTask(plan.id, task.id, to)
  })

  const toggleChip = (id: string) => {
    if (id === 'all') {
      setChipIds(['all'])
      return
    }
    const withoutAll = effectiveChips.filter((x) => x !== 'all')
    if (withoutAll.includes(id)) {
      const next = withoutAll.filter((x) => x !== id)
      setChipIds(next.length > 0 ? next : ['all'])
    } else {
      setChipIds([...withoutAll, id])
    }
  }

  const addTask = () => {
    if (!taskInput.trim()) return
    const reps = parseInt(repsInput, 10)
    addPlanTask(plan.id, effectiveChips, taskInput, Number.isFinite(reps) && reps > 0 ? reps : undefined)
    onTaskInput('')
    setRepsInput('')
    if (multi) setChipIds(['all'])
  }

  // When exactly one athlete is picked in the task writer, offer that
  // athlete's own checklist from a past session, as class plans do.
  const soloAthlete =
    multi && effectiveChips.length === 1 && effectiveChips[0] !== 'all'
      ? (people.find((p) => p.id === effectiveChips[0]) ?? undefined)
      : undefined

  const label = useMemo(() => {
    if (people.length > 1) return people.map((p) => p.firstName || p.name).join(' + ')
    if (athlete?.firstName || athlete?.name) return athlete.firstName || athlete.name
    // Unmatched lesson: prefer the tumbler name from the event notes over the
    // raw title (Acuity titles carry the parent's name).
    if (event.notes) {
      const parsed = parseAcuityNotes(event.notes)
      if (parsed?.tumblerName) return parsed.tumblerName
      const marker = event.notes.match(/(?:athlete|tumbler)[ \t]*name[ \t]*:[ \t]*([A-Za-z][A-Za-z'-]{1,24})(?:[ \t]+([A-Za-z][A-Za-z'-]{1,24}))?/i)
      if (marker) return marker[2] ? `${marker[1]} ${marker[2]}` : marker[1]!
    }
    return event.title || 'Lesson'
  }, [athlete, people, event.notes, event.title])
  const doneCount = plan.tasks.filter((t) =>
    multi ? taskDoneForAll(t, plan, people) : athlete ? taskDoneFor(t, athlete.id) : taskDoneForAll(t, plan),
  ).length

  const body = (
    <>
      {plan.tasks.length > 0 && (
        <ul className="mb-2 space-y-1">
          {plan.tasks.map((t, i) => {
            const done = multi
              ? taskDoneForAll(t, plan, people)
              : athlete
                ? taskDoneFor(t, athlete.id)
                : taskDoneForAll(t, plan)
            // Coach view: checked when every assigned athlete has checked
            // it off. Reps show only for a single-athlete task, where one
            // count is meaningful.
            const assignees = multi ? taskAssignees(t, plan, people) : []
            const reps =
              !multi && athlete
                ? taskRepsDoneFor(t, athlete.id)
                : assignees.length === 1
                  ? taskRepsDoneFor(t, assignees[0]!)
                  : null
            const names = multi
              ? t.athleteIds.includes('all')
                ? ['Everyone']
                : t.athleteIds.map(
                    (id) => people.find((p) => p.id === id)?.firstName || people.find((p) => p.id === id)?.name || 'Athlete',
                  )
            : []
            return (
            <li
              key={t.id}
              style={rowStyle(i)}
              className="flex items-center gap-1.5 text-sm"
            >
              <DragGrip {...handleProps(i)} />
              <button
                type="button"
                onClick={() => togglePlanTask(plan.id, t.id, multi ? undefined : athlete ? [athlete.id] : undefined)}
                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border ${
                  done
                    ? 'border-[var(--accent)] bg-[var(--accent)] text-[#06281f]'
                    : 'border-white/30'
                }`}
                aria-label={done ? 'Mark not done' : 'Mark done'}
              >
                {done ? '✓' : ''}
              </button>
              <span className={`min-w-0 flex-1 ${done ? 'line-through opacity-50' : ''}`}>
                {multi && (
                  <span className="mr-1.5 rounded bg-white/10 px-1.5 py-0.5 text-xs">
                    {names.slice(0, 3).join(', ')}
                    {names.length > 3 ? ` +${names.length - 3}` : ''}
                  </span>
                )}
                {t.text}
                {t.repsTarget ? ` (${reps === null ? t.repsTarget : reps}/${t.repsTarget})` : ''}
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
            )
          })}
        </ul>
      )}
      {multi && (
        <div className="mb-2 flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => toggleChip('all')}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
              effectiveChips.includes('all')
                ? 'bg-[var(--accent)] text-[var(--on-accent)]'
                : 'border border-[var(--panel-border)] text-[var(--muted)]'
            }`}
          >
            Everyone
          </button>
          {people.map((p) => {
            const on = effectiveChips.includes(p.id)
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => toggleChip(p.id)}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                  on
                    ? 'bg-[var(--accent)] text-[var(--on-accent)]'
                    : 'border border-[var(--panel-border)] text-[var(--muted)]'
                }`}
              >
                {p.firstName || p.name}
              </button>
            )
          })}
        </div>
      )}
      {people.map((p) => (
        <QuizResultBlock key={p.id} athlete={p} showName={multi} />
      ))}
      <div className="flex min-w-0 gap-2">
        <input
          type="text"
          value={taskInput}
          onChange={(e) => onTaskInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') addTask()
          }}
          placeholder={`What will ${multi ? 'they' : athlete?.firstName || 'they'} work on?`}
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
      {!multi && athlete && (
        <ReuseChecklist
          athlete={athlete}
          beforeDate={dateKey}
          target={plan}
          refreshKey={plansTick}
          className="mt-2"
          onPick={(src) => copyChecklistForAthlete(src.id, plan.id, athlete.id)}
        />
      )}
      {multi && soloAthlete && (
        <ReuseChecklist
          athlete={soloAthlete}
          beforeDate={dateKey}
          target={plan}
          refreshKey={plansTick}
          className="mt-2"
          onPick={(src) => copyChecklistForAthlete(src.id, plan.id, soloAthlete.id)}
        />
      )}
    </>
  )

  if (hideHeader) {
    return <div className="mt-2 border-t border-white/10 pt-2">{body}</div>
  }

  return (
    <div className="min-w-0 rounded-lg bg-[#121820] px-3 py-2">
      <div className="flex w-full min-w-0 items-center gap-2">
        {athlete && onViewProfile && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onViewProfile(athlete.id)
            }}
            className="shrink-0 rounded-full"
            aria-label={`View ${athlete.firstName || athlete.name}'s profile`}
          >
            <AthleteAvatar athlete={athlete} size="sm" />
          </button>
        )}
        {athlete && !onViewProfile && <AthleteAvatar athlete={athlete} size="sm" />}
        <button
          type="button"
          className="flex min-w-0 flex-1 items-center justify-between gap-2 text-left"
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
      </div>
      {open && <div className="mt-2 min-w-0 border-t border-white/10 pt-2">{body}</div>}
    </div>
  )
}
