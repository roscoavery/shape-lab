import { useEffect, useMemo, useState } from 'react'
import type { Athlete } from '../../types'
import type { CoachClassOffering } from '../../lib/coachClasses'
import { loadOfferingsForCoach, WEEKDAYS } from '../../lib/coachClasses'
import {
  plansForDate,
  togglePlanTask,
  movePlanTask,
  bumpTaskReps,
  subscribeClassPlans,
  pullClassPlans,
  todayKey,
  type ClassPlan,
  type ClassPlanTask,
} from '../../lib/classPlans'
import { classMemberIds } from '../../lib/coachClasses'

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
  // Pull fresh plans when the checklist opens so tasks written on another
  // device show up immediately.
  useEffect(() => {
    void pullClassPlans()
  }, [])

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

  // All task rows, tagged with their class (or lesson).
  const rows: TaskRow[] = useMemo(() => {
    const out: TaskRow[] = []
    for (const plan of plans) {
      const isLesson = plan.offeringId.startsWith('lesson:')
      const offering = offerings.get(plan.offeringId)
      if (!offering && !isLesson) continue
      for (const task of plan.tasks) {
        out.push({
          plan,
          task,
          offeringName: isLesson ? 'Private lesson' : offering!.name,
          time: isLesson ? '' : offering!.time,
        })
      }
    }
    return out
  }, [plans, offerings])

  // Athletes who have tasks today: specific assignments plus members of any
  // class with an 'Everyone' task. 'Everyone' tasks apply to class members only.
  // Lesson 'all' tasks (unlinked event) show in the all-athletes view only.
  const athletesWithTasks = useMemo(() => {
    const ids = new Set<string>()
    const memberCache = new Map<string, Set<string>>()
    const membersOf = (offeringId: string): Set<string> => {
      if (offeringId.startsWith('lesson:')) return new Set()
      let s = memberCache.get(offeringId)
      if (!s) {
        s = classMemberIds(offeringId, athletes)
        memberCache.set(offeringId, s)
      }
      return s
    }
    for (const { plan, task } of rows) {
      for (const aid of task.athleteIds) {
        if (aid !== 'all') ids.add(aid)
      }
      if (task.athleteIds.includes('all')) {
        for (const mid of membersOf(plan.offeringId)) ids.add(mid)
      }
    }
    return [...ids]
      .map((id) => athleteById(athletes, id))
      .filter((a): a is Athlete => Boolean(a))
      .sort((a, b) => (a.firstName || a.name).localeCompare(b.firstName || b.name))
  }, [rows, athletes])

  // Rows visible for the current selection. 'Everyone' tasks only apply to
  // athletes in that task's class, not every athlete the coach sees that day.
  const visible: TaskRow[] = useMemo(() => {
    if (selectedId === null || selectedId === 'all') return rows
    const memberCache = new Map<string, Set<string>>()
    const membersOf = (offeringId: string): Set<string> => {
      if (offeringId.startsWith('lesson:')) return new Set()
      let s = memberCache.get(offeringId)
      if (!s) {
        s = classMemberIds(offeringId, athletes)
        memberCache.set(offeringId, s)
      }
      return s
    }
    return rows.filter(
      (r) =>
        r.task.athleteIds.includes(selectedId) ||
        (r.task.athleteIds.includes('all') && membersOf(r.plan.offeringId).has(selectedId)),
    )
  }, [rows, selectedId, athletes])

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
              (r) =>
                r.task.athleteIds.includes(a.id) ||
                (r.task.athleteIds.includes('all') &&
                  classMemberIds(r.plan.offeringId, athletes).has(a.id)),
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
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm text-white/50">
                    {time} · {offeringName}
                  </p>
                  {(() => {
                    const idx = plan.tasks.findIndex((t) => t.id === task.id)
                    if (idx < 0) return null
                    return (
                      <span className="flex shrink-0 items-center">
                        <button
                          type="button"
                          onClick={() => movePlanTask(plan.id, task.id, 'up')}
                          disabled={idx === 0}
                          className="px-2 py-1 text-sm text-white/50 disabled:opacity-20"
                          aria-label="Move up"
                        >
                          ▲
                        </button>
                        <button
                          type="button"
                          onClick={() => movePlanTask(plan.id, task.id, 'down')}
                          disabled={idx === plan.tasks.length - 1}
                          className="px-2 py-1 text-sm text-white/50 disabled:opacity-20"
                          aria-label="Move down"
                        >
                          ▼
                        </button>
                      </span>
                    )
                  })()}
                </div>
                {selectedId === 'all' && (
                  <p className="mt-1 text-sm font-semibold text-[var(--accent)]">
                    {task.athleteIds.includes('all')
                      ? 'Everyone'
                      : task.athleteIds
                          .map((id) => athleteById(athletes, id))
                          .filter((a): a is Athlete => Boolean(a))
                          .map((a) => a.firstName || a.name)
                          .join(', ') || 'Unassigned'}
                  </p>
                )}
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
