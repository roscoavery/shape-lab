import { useEffect, useMemo, useState } from 'react'
import type { Athlete } from '../../types'
import type { CoachClassOffering } from '../../lib/coachClasses'
import { loadOfferingsForCoach, WEEKDAYS } from '../../lib/coachClasses'
import { fetchTodayEvents, hasCalendarApiToken, authorizeCalendarFromSession, type TodayCalendarEvent } from '../../lib/calendarClient'
import { classifySessionEvent } from '../../lib/sessionGlow'
import {
  getOrCreateClassPlan,
  setPlanNotes,
  addPlanTask,
  togglePlanTask,
  removePlanTask,
  subscribeClassPlans,
  todayKey,
  type ClassPlan,
} from '../../lib/classPlans'

type Props = {
  coach: Athlete
  athletes: Athlete[]
  onOpenChecklist: () => void
}

function athleteById(athletes: Athlete[], id: string): Athlete | undefined {
  return athletes.find((a) => a.id === id)
}

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
 * Morning brief: what the coach is working with today, and a place to plan.
 *
 * Shows each class scheduled today with its predicted roster (standing
 * roster), plus today's lessons. The coach writes class notes and
 * per-athlete focus tasks. Tasks feed the athlete checklist and each
 * athlete's own view.
 */
export function MorningBrief({ coach, athletes, onOpenChecklist }: Props) {
  const [events, setEvents] = useState<TodayCalendarEvent[]>([])
  const [plansTick, setPlansTick] = useState(0)
  const [openOfferingId, setOpenOfferingId] = useState<string | null>(null)
  const [taskInputs, setTaskInputs] = useState<Record<string, string>>({})
  const [taskAthlete, setTaskAthlete] = useState<Record<string, string>>({})
  const dateKey = todayKey()

  useEffect(() => subscribeClassPlans(() => setPlansTick((n) => n + 1)), [])

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        if (!hasCalendarApiToken()) await authorizeCalendarFromSession()
        const { events } = await fetchTodayEvents()
        if (!cancelled) setEvents(events)
      } catch {
        /* calendar optional */
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [])

  const offerings = useMemo(() => {
    const weekday = WEEKDAYS[new Date().getDay()]
    return loadOfferingsForCoach(coach.id)
      .filter((o) => o.weekday === weekday)
      .sort((a, b) => a.time.localeCompare(b.time))
  }, [coach.id])

  const lessons = useMemo(() => {
    return events
      .filter((ev) => classifySessionEvent(ev) === 'lesson')
      .sort((a, b) => a.startAt.localeCompare(b.startAt))
  }, [events])

  const totalAthletes = useMemo(() => {
    const ids = new Set<string>()
    for (const o of offerings) {
      for (const id of o.rosterIds) ids.add(id)
    }
    for (const l of lessons) {
      if (l.matchedAthleteId) ids.add(l.matchedAthleteId)
    }
    return ids.size
  }, [offerings, lessons])

  if (offerings.length === 0 && lessons.length === 0) return null

  return (
    <section className="rounded-2xl border border-[var(--accent)]/30 bg-[var(--panel)] p-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--accent)]">
            Morning brief
          </p>
          <h2 className="mt-0.5 text-xl font-semibold text-[var(--text)]">
            Today you're coaching {totalAthletes} athlete{totalAthletes === 1 ? '' : 's'}
          </h2>
          <p className="mt-1 text-sm text-[var(--muted)]">
            {offerings.length > 0 &&
              `${offerings.length} class${offerings.length === 1 ? '' : 'es'}`}
            {offerings.length > 0 && lessons.length > 0 && ' · '}
            {lessons.length > 0 &&
              `${lessons.length} lesson${lessons.length === 1 ? '' : 's'}`}
            . Tap a class to plan what each athlete should focus on.
          </p>
        </div>
        <button
          type="button"
          onClick={onOpenChecklist}
          className="rounded-xl bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-[var(--on-accent)]"
        >
          Athlete checklist
        </button>
      </div>

      <div className="mt-4 grid gap-3">
        {offerings.map((offering) => (
          <ClassPlanCard
            key={offering.id}
            offering={offering}
            athletes={athletes}
            coachId={coach.id}
            dateKey={dateKey}
            open={openOfferingId === offering.id}
            onToggle={() =>
              setOpenOfferingId((id) => (id === offering.id ? null : offering.id))
            }
            taskInput={taskInputs[offering.id] ?? ''}
            onTaskInput={(v) => setTaskInputs((s) => ({ ...s, [offering.id]: v }))}
            taskAthleteId={taskAthlete[offering.id] ?? 'all'}
            onTaskAthlete={(v) => setTaskAthlete((s) => ({ ...s, [offering.id]: v }))}
            plansTick={plansTick}
          />
        ))}

        {lessons.length > 0 && (
          <div className="rounded-xl border border-[var(--panel-border)] p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
              Lessons today
            </p>
            <ul className="mt-2 space-y-1.5">
              {lessons.map((ev, i) => {
                const athlete = ev.matchedAthleteId
                  ? athleteById(athletes, ev.matchedAthleteId)
                  : null
                return (
                  <li key={i} className="flex items-center justify-between gap-2 text-sm">
                    <span className="text-[var(--text)]">
                      {formatTime(ev.startAt)} · {athlete?.firstName || athlete?.name || ev.title}
                    </span>
                    {ev.title && (
                      <span className="truncate text-xs text-[var(--muted)]">{ev.title}</span>
                    )}
                  </li>
                )
              })}
            </ul>
          </div>
        )}
      </div>
    </section>
  )
}

function ClassPlanCard({
  offering,
  athletes,
  coachId,
  dateKey,
  open,
  onToggle,
  taskInput,
  onTaskInput,
  taskAthleteId,
  onTaskAthlete,
  plansTick,
}: {
  offering: CoachClassOffering
  athletes: Athlete[]
  coachId: string
  dateKey: string
  open: boolean
  onToggle: () => void
  taskInput: string
  onTaskInput: (v: string) => void
  taskAthleteId: string
  onTaskAthlete: (v: string) => void
  plansTick: number
}) {
  // Re-read the plan when plans change.
  const plan: ClassPlan = useMemo(
    () => getOrCreateClassPlan(dateKey, offering.id, coachId),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [dateKey, offering.id, coachId, plansTick],
  )
  const roster = useMemo(
    () =>
      offering.rosterIds
        .map((id) => athleteById(athletes, id))
        .filter((a): a is Athlete => Boolean(a)),
    [offering.rosterIds, athletes],
  )

  const addTask = () => {
    if (!taskInput.trim()) return
    addPlanTask(plan.id, taskAthleteId, taskInput)
    onTaskInput('')
  }

  return (
    <div className="rounded-xl border border-[var(--panel-border)]">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between gap-2 p-4 text-left"
      >
        <div>
          <p className="font-semibold text-[var(--text)]">
            {offering.time} · {offering.name}
          </p>
          <p className="mt-0.5 text-sm text-[var(--muted)]">
            {roster.length > 0
              ? roster
                  .slice(0, 6)
                  .map((a) => a.firstName || a.name)
                  .join(', ') + (roster.length > 6 ? ` +${roster.length - 6} more` : '')
              : 'No roster yet'}
            {plan.tasks.length > 0 && ` · ${plan.tasks.filter((t) => !t.done).length} tasks open`}
          </p>
        </div>
        <span className="text-[var(--muted)]">{open ? '▾' : '▸'}</span>
      </button>

      {open && (
        <div className="border-t border-[var(--panel-border)] p-4">
          <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
            Class notes
            <textarea
              value={plan.notes}
              onChange={(e) => setPlanNotes(plan.id, e.target.value)}
              rows={2}
              placeholder="What should this class focus on overall?"
              className="mt-1.5 block w-full rounded-lg border border-[var(--panel-border)] bg-[#0d1218] px-3 py-2 text-sm text-[var(--text)]"
            />
          </label>

          <p className="mt-4 text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
            Athlete tasks
          </p>
          {plan.tasks.length > 0 && (
            <ul className="mt-2 space-y-1.5">
              {plan.tasks.map((task) => {
                const athlete =
                  task.athleteId === 'all'
                    ? null
                    : athleteById(athletes, task.athleteId)
                return (
                  <li
                    key={task.id}
                    className="flex items-center gap-2 rounded-lg border border-[var(--panel-border)] px-3 py-2"
                  >
                    <button
                      type="button"
                      onClick={() => togglePlanTask(plan.id, task.id)}
                      className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md border ${
                        task.done
                          ? 'border-[var(--accent)] bg-[var(--accent)] text-[var(--on-accent)]'
                          : 'border-[var(--panel-border)]'
                      }`}
                      aria-label={task.done ? 'Mark not done' : 'Mark done'}
                    >
                      {task.done ? '✓' : ''}
                    </button>
                    <span
                      className={`min-w-0 flex-1 text-sm ${
                        task.done ? 'text-[var(--muted)] line-through' : 'text-[var(--text)]'
                      }`}
                    >
                      {task.athleteId === 'all' ? (
                        <span className="mr-1.5 rounded bg-white/10 px-1.5 py-0.5 text-xs">
                          Everyone
                        </span>
                      ) : (
                        <span className="mr-1.5 rounded bg-white/10 px-1.5 py-0.5 text-xs">
                          {athlete?.firstName || athlete?.name || 'Athlete'}
                        </span>
                      )}
                      {task.text}
                    </span>
                    <button
                      type="button"
                      onClick={() => removePlanTask(plan.id, task.id)}
                      className="shrink-0 text-xs text-[var(--muted)] hover:text-[var(--bad)]"
                      aria-label="Remove task"
                    >
                      ✕
                    </button>
                  </li>
                )
              })}
            </ul>
          )}

          <div className="mt-2 flex gap-2">
            <select
              value={taskAthleteId}
              onChange={(e) => onTaskAthlete(e.target.value)}
              className="shrink-0 rounded-lg border border-[var(--panel-border)] bg-[#0d1218] px-2 py-2 text-sm text-[var(--text)]"
            >
              <option value="all">Everyone</option>
              {roster.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.firstName || a.name}
                </option>
              ))}
            </select>
            <input
              value={taskInput}
              onChange={(e) => onTaskInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') addTask()
              }}
              placeholder="Add a focus task, e.g. 10 hollow holds"
              className="min-w-0 flex-1 rounded-lg border border-[var(--panel-border)] bg-[#0d1218] px-3 py-2 text-sm text-[var(--text)]"
            />
            <button
              type="button"
              onClick={addTask}
              className="shrink-0 rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-[var(--on-accent)]"
            >
              Add
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
