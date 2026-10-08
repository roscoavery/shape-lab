import { useEffect, useMemo, useState } from 'react'
import type { Athlete } from '../../types'
import type { CoachClassOffering } from '../../lib/coachClasses'
import { loadOfferingsForCoach, WEEKDAYS } from '../../lib/coachClasses'
import {
  plansForDate,
  togglePlanTask,
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

/**
 * Athlete checklist: the iPad the coach leaves out during class.
 *
 * Today's tasks grouped by athlete. Big tap targets. Athletes check off
 * their own tasks as they finish and see what's next.
 */
export function AthleteChecklistView({ coach, athletes, onBack }: Props) {
  const [tick, setTick] = useState(0)
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

  type AthleteGroup = {
    athlete: Athlete | null
    offeringName: string
    time: string
    tasks: { plan: ClassPlan; task: ClassPlanTask }[]
  }

  const groups: AthleteGroup[] = useMemo(() => {
    const byKey = new Map<string, AthleteGroup>()
    for (const plan of plans) {
      const offering = offerings.get(plan.offeringId)
      if (!offering) continue
      for (const task of plan.tasks) {
        const key = `${plan.id}:${task.athleteId}`
        let group = byKey.get(key)
        if (!group) {
          group = {
            athlete:
              task.athleteId === 'all'
                ? null
                : (athleteById(athletes, task.athleteId) ?? null),
            offeringName: offering.name,
            time: offering.time,
            tasks: [],
          }
          byKey.set(key, group)
        }
        group.tasks.push({ plan, task })
      }
    }
    return [...byKey.values()].sort((a, b) => {
      const an = a.athlete ? a.athlete.firstName || a.athlete.name : 'zzz'
      const bn = b.athlete ? b.athlete.firstName || b.athlete.name : 'zzz'
      return an.localeCompare(bn)
    })
  }, [plans, offerings, athletes])

  const doneCount = groups.reduce(
    (n, g) => n + g.tasks.filter((t) => t.task.done).length,
    0,
  )
  const totalCount = groups.reduce((n, g) => n + g.tasks.length, 0)

  return (
    <div className="mx-auto flex min-h-screen max-w-3xl flex-col gap-4 bg-black px-4 py-6">
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={onBack}
          className="rounded-xl border border-white/15 px-4 py-2.5 text-sm text-white/70"
        >
          ← Back
        </button>
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white">Today's checklist</h1>
          <p className="text-sm text-white/60">
            {doneCount} of {totalCount} done · Check off your tasks as you finish
          </p>
        </div>
        <div className="w-20" />
      </div>

      {groups.length === 0 ? (
        <div className="rounded-2xl border border-white/10 p-8 text-center">
          <p className="text-white/70">
            No tasks planned yet. Your coach adds them in the morning brief.
          </p>
        </div>
      ) : (
        groups.map((group, i) => (
          <section
            key={i}
            className="rounded-2xl border border-white/10 bg-[#111418] p-5"
          >
            <div className="flex items-baseline justify-between gap-2">
              <h2 className="text-xl font-bold text-white">
                {group.athlete
                  ? group.athlete.firstName || group.athlete.name
                  : 'Everyone'}
              </h2>
              <p className="text-sm text-white/50">
                {group.time} · {group.offeringName}
              </p>
            </div>
            <ul className="mt-3 space-y-2.5">
              {group.tasks.map(({ plan, task }) => (
                <li key={task.id}>
                  <button
                    type="button"
                    onClick={() => togglePlanTask(plan.id, task.id)}
                    className={`flex w-full items-center gap-4 rounded-xl border p-4 text-left ${
                      task.done
                        ? 'border-green-500/40 bg-green-500/10'
                        : 'border-white/15 bg-white/5 active:bg-white/10'
                    }`}
                  >
                    <span
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border-2 text-2xl ${
                        task.done
                          ? 'border-green-400 bg-green-400 text-black'
                          : 'border-white/30 text-transparent'
                      }`}
                    >
                      ✓
                    </span>
                    <span
                      className={`text-lg ${
                        task.done ? 'text-white/40 line-through' : 'text-white'
                      }`}
                    >
                      {task.text}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        ))
      )}
    </div>
  )
}
