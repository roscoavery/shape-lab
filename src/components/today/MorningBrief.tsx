import { useEffect, useMemo, useState } from 'react'
import type { Athlete } from '../../types'
import type { CoachClassOffering } from '../../lib/coachClasses'
import { loadOfferingsForCoach, summarizeAttendance, WEEKDAYS } from '../../lib/coachClasses'
import { fetchTodayEvents, hasCalendarApiToken, authorizeCalendarFromSession, type TodayCalendarEvent } from '../../lib/calendarClient'
import { classifySessionEvent } from '../../lib/sessionGlow'
import { LessonPlanCard } from './LessonPlanCard'
import {
  getOrCreateClassPlan,
  setPlanNotes,
  addPlanTask,
  togglePlanTask,
  removePlanTask,
  movePlanTask,
  carryOverTasks,
  pastTasksForAthlete,
  subscribeClassPlans,
  pullClassPlans,
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
  const [taskAthlete, setTaskAthlete] = useState<Record<string, string[]>>({})
  const dateKey = todayKey()

  useEffect(() => subscribeClassPlans(() => setPlansTick((n) => n + 1)), [])
  // Pull fresh plans when the brief opens.
  useEffect(() => {
    void pullClassPlans()
  }, [])

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
      const { lastWeek, regulars } = summarizeAttendance(o.id, athletes)
      for (const a of [...lastWeek, ...regulars]) ids.add(a.id)
    }
    let unmatchedLessons = 0
    for (const l of lessons) {
      if (l.matchedAthleteId) ids.add(l.matchedAthleteId)
      else unmatchedLessons += 1
    }
    // An unmatched lesson still means someone is coming — count them even
    // though we don't know who yet.
    return ids.size + unmatchedLessons
  }, [offerings, lessons, athletes])

  // After the last class/lesson ends, the day is done and the brief goes away.
  // Re-check every minute so it disappears on its own without a refresh.
  const [nowTick, setNowTick] = useState(0)
  useEffect(() => {
    const id = window.setInterval(() => setNowTick((n) => n + 1), 60000)
    return () => window.clearInterval(id)
  }, [])
  const dayDone = useMemo(() => {
    void nowTick
    const now = new Date()
    let lastEnd: Date | null = null
    for (const o of offerings) {
      // Offering times look like "5pm", "4pm", "6:30pm".
      const match = o.time.match(/(\d+)(?::(\d+))?\s*(am|pm)/i)
      if (!match) continue
      let h = Number(match[1])
      const m = match[2] ? Number(match[2]) : 0
      const ampm = match[3].toLowerCase()
      if (ampm === 'pm' && h < 12) h += 12
      if (ampm === 'am' && h === 12) h = 0
      // Classes run an hour.
      const end = new Date(now)
      end.setHours(h + 1, m, 0, 0)
      if (!lastEnd || end > lastEnd) lastEnd = end
    }
    for (const l of lessons) {
      const end = new Date(l.endAt)
      if (!Number.isNaN(end.getTime()) && (!lastEnd || end > lastEnd)) lastEnd = end
    }
    return lastEnd !== null && now > lastEnd
  }, [offerings, lessons, nowTick])

  if (offerings.length === 0 && lessons.length === 0) return null
  if (dayDone) return null

  return (
    <section className="min-w-0 overflow-x-clip rounded-2xl border border-[var(--accent)]/30 bg-[var(--panel)] p-5">
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
        {offerings.map((offering) => {
          const earlierPlans = offerings
            .filter((o) => o.time < offering.time)
            .map((o) => {
              const p = getOrCreateClassPlan(dateKey, o.id, coach.id)
              return { plan: p, offering: o }
            })
            .filter(({ plan }) => plan.tasks.some((t) => !t.done))
          return (
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
              taskAthleteIds={taskAthlete[offering.id] ?? ['all']}
              onTaskAthletes={(v) => setTaskAthlete((s) => ({ ...s, [offering.id]: v }))}
              plansTick={plansTick}
              earlierPlans={earlierPlans}
            />
          )
        })}

        {lessons.length > 0 && (
          <div className="min-w-0 rounded-xl border border-[var(--panel-border)] p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
              Lessons today
            </p>
            <div className="mt-2 min-w-0 space-y-2">
              {lessons.map((ev, i) => {
                const athlete = ev.matchedAthleteId
                  ? athleteById(athletes, ev.matchedAthleteId)
                  : null
                const planKey = `lesson:${ev.id}`
                return (
                  <LessonPlanCard
                    key={ev.id || i}
                    event={ev}
                    athlete={athlete ?? null}
                    coachId={coach.id}
                    dateKey={dateKey}
                    open={openOfferingId === planKey}
                    onToggle={() =>
                      setOpenOfferingId((id) => (id === planKey ? null : planKey))
                    }
                    taskInput={taskInputs[planKey] ?? ''}
                    onTaskInput={(v) => setTaskInputs((s) => ({ ...s, [planKey]: v }))}
                    plansTick={plansTick}
                  />
                )
              })}
            </div>
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
  taskAthleteIds,
  onTaskAthletes,
  plansTick,
  earlierPlans,
}: {
  offering: CoachClassOffering
  athletes: Athlete[]
  coachId: string
  dateKey: string
  open: boolean
  onToggle: () => void
  taskInput: string
  onTaskInput: (v: string) => void
  taskAthleteIds: string[]
  onTaskAthletes: (v: string[]) => void
  plansTick: number
  earlierPlans: { plan: ClassPlan; offering: CoachClassOffering }[]
}) {
  // Re-read the plan when plans change.
  const plan: ClassPlan = useMemo(
    () => getOrCreateClassPlan(dateKey, offering.id, coachId),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [dateKey, offering.id, coachId, plansTick],
  )
  const { lastWeek, regulars } = useMemo(
    () => summarizeAttendance(offering.id, athletes),
    [offering.id, athletes],
  )
  // Task picker options: last week's crew plus regulars, no duplicates.
  const expected = useMemo(() => {
    const seen = new Set<string>()
    const out: Athlete[] = []
    for (const a of [...lastWeek, ...regulars]) {
      if (!seen.has(a.id)) {
        seen.add(a.id)
        out.push(a)
      }
    }
    return out
  }, [lastWeek, regulars])

  const [repsInput, setRepsInput] = useState('')

  const addTask = () => {
    if (!taskInput.trim()) return
    const reps = parseInt(repsInput, 10)
    addPlanTask(plan.id, taskAthleteIds, taskInput, Number.isFinite(reps) && reps > 0 ? reps : undefined)
    onTaskInput('')
    setRepsInput('')
    onTaskAthletes(['all'])
  }

  const toggleAthleteChip = (id: string) => {
    if (id === 'all') {
      onTaskAthletes(['all'])
      return
    }
    const withoutAll = taskAthleteIds.filter((x) => x !== 'all')
    if (withoutAll.includes(id)) {
      const next = withoutAll.filter((x) => x !== id)
      onTaskAthletes(next.length > 0 ? next : ['all'])
    } else {
      onTaskAthletes([...withoutAll, id])
    }
  }

  // Incomplete tasks in earlier classes today that touch athletes expected here.
  const carryable = useMemo(() => {
    const expectedIds = new Set(expected.map((a) => a.id))
    const out: { plan: ClassPlan; offering: CoachClassOffering; count: number }[] = []
    for (const { plan: ep, offering: eo } of earlierPlans) {
      const n = ep.tasks.filter(
        (t) =>
          !t.done &&
          t.athleteIds.some((id) => id === 'all' || expectedIds.has(id)) &&
          !plan.tasks.some((mine) => mine.carriedFromPlanId === ep.id && mine.text === t.text),
      ).length
      if (n > 0) out.push({ plan: ep, offering: eo, count: n })
    }
    return out
  }, [earlierPlans, expected, plan.tasks])

  const nameList = (list: Athlete[]) =>
    list
      .slice(0, 6)
      .map((a) => a.firstName || a.name)
      .join(', ') + (list.length > 6 ? ` +${list.length - 6} more` : '')

  return (
    <div className="min-w-0 rounded-xl border border-[var(--panel-border)]">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between gap-2 p-4 text-left"
      >
        <div className="min-w-0">
          <p className="font-semibold text-[var(--text)]">
            {offering.time} · {offering.name}
          </p>
          {lastWeek.length > 0 && (
            <p className="mt-1 text-sm text-[var(--text)]">
              <span className="text-[var(--muted)]">Last week: </span>
              {nameList(lastWeek)}
            </p>
          )}
          {regulars.length > 0 && (
            <p className="mt-0.5 text-sm text-[var(--text)]">
              <span className="text-[var(--muted)]">Usually here: </span>
              {nameList(regulars)}
            </p>
          )}
          {lastWeek.length === 0 && regulars.length === 0 && (
            <p className="mt-1 text-sm text-[var(--muted)]">
              No attendance history yet
            </p>
          )}
          {plan.tasks.length > 0 && (
            <p className="mt-0.5 text-xs text-[var(--muted)]">
              {plan.tasks.filter((t) => !t.done).length} tasks open
            </p>
          )}
        </div>
        <span className="shrink-0 text-[var(--muted)]">{open ? '▾' : '▸'}</span>
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
          {carryable.length > 0 && (
            <div className="mt-2 space-y-1.5">
              {carryable.map(({ plan: ep, offering: eo, count }) => (
                <button
                  key={ep.id}
                  type="button"
                  onClick={() => {
                    carryOverTasks(ep.id, plan.id, expected.map((a) => a.id))
                  }}
                  className="w-full rounded-xl border border-amber-300/30 bg-amber-300/5 px-3 py-2 text-left text-sm text-[var(--text)]"
                >
                  <span className="font-semibold text-amber-200">
                    Carry over {count} task{count === 1 ? '' : 's'}
                  </span>{' '}
                  from {eo.time} · {eo.name}
                </button>
              ))}
            </div>
          )}
          {plan.tasks.length > 0 && (
            <ul className="mt-2 space-y-1.5">
              {plan.tasks.map((task, i) => {
                const names = task.athleteIds.includes('all')
                  ? ['Everyone']
                  : task.athleteIds.map(
                      (id) => athleteById(athletes, id)?.firstName || athleteById(athletes, id)?.name || 'Athlete',
                    )
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
                      className={`min-w-0 flex-1 break-words text-sm ${
                        task.done ? 'text-[var(--muted)] line-through' : 'text-[var(--text)]'
                      }`}
                    >
                      <span className="mr-1.5 rounded bg-white/10 px-1.5 py-0.5 text-xs">
                        {names.slice(0, 3).join(', ')}
                        {names.length > 3 ? ` +${names.length - 3}` : ''}
                      </span>
                      {task.text}
                      {task.repsTarget ? (
                        <span className="ml-1.5 text-xs text-[var(--muted)]">
                          {task.repsDone ?? 0}/{task.repsTarget} reps
                        </span>
                      ) : null}
                      {task.carriedFromPlanId && (
                        <span className="ml-1.5 text-xs italic text-[var(--muted)]">
                          carried over
                        </span>
                      )}
                    </span>
                    <span className="flex shrink-0 items-center">
                      <button
                        type="button"
                        onClick={() => movePlanTask(plan.id, task.id, 'up')}
                        disabled={i === 0}
                        className="px-1 text-xs text-[var(--muted)] disabled:opacity-20"
                        aria-label="Move up"
                      >
                        ▲
                      </button>
                      <button
                        type="button"
                        onClick={() => movePlanTask(plan.id, task.id, 'down')}
                        disabled={i === plan.tasks.length - 1}
                        className="px-1 text-xs text-[var(--muted)] disabled:opacity-20"
                        aria-label="Move down"
                      >
                        ▼
                      </button>
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

          <div className="mt-2 flex flex-col gap-2">
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => toggleAthleteChip('all')}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                  taskAthleteIds.includes('all')
                    ? 'bg-[var(--accent)] text-[var(--on-accent)]'
                    : 'border border-[var(--panel-border)] text-[var(--muted)]'
                }`}
              >
                Everyone
              </button>
              {expected.map((a) => {
                const on = taskAthleteIds.includes(a.id)
                return (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => toggleAthleteChip(a.id)}
                    className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                      on
                        ? 'bg-[var(--accent)] text-[var(--on-accent)]'
                        : 'border border-[var(--panel-border)] text-[var(--muted)]'
                    }`}
                  >
                    {a.firstName || a.name}
                  </button>
                )
              })}
            </div>
            <div className="flex min-w-0 gap-2">
              <input
                value={taskInput}
                onChange={(e) => onTaskInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') addTask()
                }}
                placeholder="Add a focus task, e.g. hollow holds"
                className="min-w-0 flex-1 rounded-lg border border-[var(--panel-border)] bg-[#0d1218] px-3 py-2 text-sm text-[var(--text)]"
              />
              <input
                value={repsInput}
                onChange={(e) => setRepsInput(e.target.value.replace(/[^0-9]/g, ''))}
                placeholder="Reps"
                inputMode="numeric"
                className="w-16 shrink-0 rounded-lg border border-[var(--panel-border)] bg-[#0d1218] px-2 py-2 text-center text-sm text-[var(--text)]"
                aria-label="Rep count (optional)"
              />
              <button
                type="button"
                onClick={addTask}
                className="shrink-0 rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-[var(--on-accent)]"
              >
                Add
              </button>
            </div>
            <PastTaskChips
              athleteIds={taskAthleteIds}
              onPick={(text, reps) => {
                onTaskInput(text)
                setRepsInput(reps ? String(reps) : '')
              }}
            />
          </div>
        </div>
      )}
    </div>
  )
}

/**
 * Previously-written tasks for the selected athletes, for quick re-assignment.
 * Tapping one fills the text and reps inputs so the coach can edit before adding.
 */
function PastTaskChips({
  athleteIds,
  onPick,
}: {
  athleteIds: string[]
  onPick: (text: string, repsTarget?: number) => void
}) {
  const past = useMemo(() => {
    const ids = athleteIds.filter((id) => id !== 'all')
    if (ids.length === 0) return []
    const seen = new Map<string, { text: string; repsTarget?: number }>()
    for (const id of ids) {
      for (const t of pastTasksForAthlete(id, 8)) {
        const key = t.text.toLowerCase()
        if (!seen.has(key)) seen.set(key, t)
      }
    }
    return [...seen.values()].slice(0, 8)
  }, [athleteIds])

  if (past.length === 0) return null

  return (
    <div className="mt-1.5">
      <p className="text-[11px] text-[var(--muted)]">Used before, tap to reuse:</p>
      <div className="mt-1 flex flex-wrap gap-1.5">
        {past.map((t, i) => (
          <button
            key={i}
            type="button"
            onClick={() => onPick(t.text, t.repsTarget)}
            className="rounded-full border border-[var(--panel-border)] px-2.5 py-1 text-xs text-[var(--muted)] hover:text-[var(--text)]"
          >
            {t.text}
            {t.repsTarget ? ` · ${t.repsTarget}` : ''}
          </button>
        ))}
      </div>
    </div>
  )
}
