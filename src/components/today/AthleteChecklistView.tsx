import { useEffect, useMemo, useState } from 'react'
import type { Athlete } from '../../types'
import type { CoachClassOffering } from '../../lib/coachClasses'
import { loadOfferingsForCoach, WEEKDAYS } from '../../lib/coachClasses'
import {
  plansForDate,
  togglePlanTask,
  bumpTaskReps,
  subscribeClassPlans,
  todayKey,
  type ClassPlan,
  type ClassPlanTask,
} from '../../lib/classPlans'

type Props = {
  coach: Athlete
  athletes: Athlete[]
  onBack: () => void
}

function athleteById(athletes: Athlete[], id: string): Athlete | undefined {
  return athletes.find((a) => a.id === id)
}

type TaskRow = { plan: ClassPlan; task: ClassPlanTask; offeringName: string; time: string }

/**
 * Athlete checklist: the iPad the coach leaves out during class.
 *
 * Athletes tap their name, see only their own tasks for today, and check
 * them off as they go. 'Everyone' tasks show under each athlete too.
 * Coaches can switch to the all-athletes view.
 */
export function AthleteChecklistView({ coach, athletes, onBack }: Props) {
  const [tick, setTick] = useState(0)
  const [selectedId, setSelectedId] = useState<string | 'all' | null>(null)
  const dateKey = todayKey()

  useEffect(() => subscribeClassPlans(() => setTick((n) => n + 1)), [])

  const offerings = useMemo(() => {
    const weekday = WEEKDAYS[new Date().getDay()]
    const map = new Map<string, CoachClassOffering>()
    for (const o of loadOfferingsForCoach(coach.id)) {
      if (o.weekday === weekday) map.set(o.id, o)
    }
    return map
  }, [coach.id])

  const plans: ClassPlan[] = useMemo(
    () => plansForDate(dateKey),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [dateKey, tick],
  )

  // All task rows, tagged with their class.
  const rows: TaskRow[] = useMemo(() => {
    const out: TaskRow[] = []
    for (const plan of plans) {
      const offering = offerings.get(plan.offeringId)
      if (!offering) continue
      for (const task of plan.tasks) {
        out.push({
          plan,
          task,
          offeringName: offering.name,
          time: offering.time,
        })
      }
    }
    return out
  }, [plans, offerings])

  // Athletes who have tasks today (plus 'Everyone' tasks apply to all).
  const athletesWithTasks = useMemo(() => {
    const ids = new Set<string>()
    for (const { task } of rows) {
      for (const aid of task.athleteIds) {
        if (aid !== 'all') ids.add(aid)
      }
    }
    return [...ids]
      .map((id) => athleteById(athletes, id))
      .filter((a): a is Athlete => Boolean(a))
      .sort((a, b) => (a.firstName || a.name).localeCompare(b.firstName || b.name))
  }, [rows, athletes])

  // Rows visible for the current selection.
  const visible: TaskRow[] = useMemo(() => {
    if (selectedId === null || selectedId === 'all') return rows
    return rows.filter(
      (r) => r.task.athleteIds.includes(selectedId) || r.task.athleteIds.includes('all'),
    )
  }, [rows, selectedId])

  const doneCount = visible.filter((r) => r.task.done).length

  const selectedAthlete =
    selectedId && selectedId !== 'all' ? athleteById(athletes, selectedId) : null

  return (
    <div className="mx-auto flex min-h-screen max-w-3xl flex-col gap-4 bg-black px-4 py-6">
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => (selectedId === null ? onBack() : setSelectedId(null))}
          className="rounded-xl border border-white/15 px-4 py-2.5 text-sm text-white/70"
        >
          ← {selectedId === null ? 'Back' : 'Names'}
        </button>
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white">
            {selectedAthlete
              ? selectedAthlete.firstName || selectedAthlete.name
              : selectedId === 'all'
                ? 'Everyone today'
                : "Today's checklist"}
          </h1>
          {selectedId !== null && (
            <p className="text-sm text-white/60">
              {doneCount} of {visible.length} done
            </p>
          )}
        </div>
        <div className="w-20" />
      </div>

      {selectedId === null ? (
        <div className="grid gap-3">
          <p className="text-center text-lg text-white/70">Tap your name</p>
          {athletesWithTasks.map((a) => {
            const myRows = rows.filter(
              (r) => r.task.athleteIds.includes(a.id) || r.task.athleteIds.includes('all'),
            )
            const myDone = myRows.filter((r) => r.task.done).length
            return (
              <button
                key={a.id}
                type="button"
                onClick={() => setSelectedId(a.id)}
                className="flex items-center justify-between rounded-2xl border border-white/15 bg-[#111418] p-5 text-left active:bg-white/10"
              >
                <span className="text-2xl font-bold text-white">
                  {a.firstName || a.name}
                </span>
                <span className="text-sm text-white/50">
                  {myDone}/{myRows.length} done
                </span>
              </button>
            )
          })}
          {athletesWithTasks.length === 0 && (
            <div className="rounded-2xl border border-white/10 p-8 text-center">
              <p className="text-white/70">
                No tasks planned yet. Your coach adds them in the morning brief.
              </p>
            </div>
          )}
          <button
            type="button"
            onClick={() => setSelectedId('all')}
            className="mt-2 rounded-xl border border-white/10 px-4 py-2.5 text-sm text-white/50"
          >
            Coach view: show everyone
          </button>
        </div>
      ) : (
        <div className="grid gap-4">
          {visible.length === 0 ? (
            <div className="rounded-2xl border border-white/10 p-8 text-center">
              <p className="text-white/70">No tasks for you today. Ask your coach.</p>
            </div>
          ) : (
            visible.map(({ plan, task, offeringName, time }) => (
              <div
                key={`${plan.id}:${task.id}`}
                className={`rounded-2xl border p-5 ${
                  task.done
                    ? 'border-green-500/40 bg-green-500/10'
                    : 'border-white/10 bg-[#111418]'
                }`}
              >
                <p className="text-sm text-white/50">
                  {time} · {offeringName}
                </p>
                {task.repsTarget ? (
                  <div className="mt-2 flex items-center gap-4">
                    <span
                      className={`min-w-0 flex-1 text-xl ${
                        task.done ? 'text-white/40 line-through' : 'text-white'
                      }`}
                    >
                      {task.text}
                    </span>
                    <div className="flex shrink-0 items-center gap-2">
                      <button
                        type="button"
                        onClick={() => bumpTaskReps(plan.id, task.id, -1)}
                        className="flex h-12 w-12 items-center justify-center rounded-xl border border-white/20 text-2xl text-white"
                        aria-label="Remove a rep"
                      >
                        −
                      </button>
                      <span className="min-w-[4rem] text-center text-xl font-bold tabular-nums text-white">
                        {task.repsDone ?? 0}
                        <span className="text-white/50">/{task.repsTarget}</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => bumpTaskReps(plan.id, task.id, 1)}
                        className="flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--accent)] text-2xl font-bold text-[var(--on-accent)]"
                        aria-label="Add a rep"
                      >
                        +
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => togglePlanTask(plan.id, task.id)}
                    className="mt-2 flex w-full items-center gap-4 text-left"
                  >
                    <span
                      className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border-2 text-3xl ${
                        task.done
                          ? 'border-green-400 bg-green-400 text-black'
                          : 'border-white/30 text-transparent'
                      }`}
                    >
                      ✓
                    </span>
                    <span
                      className={`text-xl ${
                        task.done ? 'text-white/40 line-through' : 'text-white'
                      }`}
                    >
                      {task.text}
                    </span>
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}
