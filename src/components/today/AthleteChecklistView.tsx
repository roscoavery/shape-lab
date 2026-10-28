import { useEffect, useMemo, useState } from 'react'
import type { Athlete } from '../../types'
import type { CoachClassOffering } from '../../lib/coachClasses'
import { AthleteAvatar } from '../AthleteAvatar'
import { loadOfferingsForCoach, WEEKDAYS } from '../../lib/coachClasses'
import {
  plansForDate,
  togglePlanTask,
  bumpTaskReps,
  taskDoneFor,
  taskDoneForAll,
  taskRepsDoneFor,
  subscribeClassPlans,
  pullClassPlans,
  loadClassPlans,
  todayKey,
  getOrCreateClassPlan,
  checklistSourcesForAthlete,
  checklistCopyCount,
  copyChecklistForAthlete,
  type ClassPlan,
  type ClassPlanTask,
} from '../../lib/classPlans'
import { ReuseChecklist, fmtPlanDay } from './ReuseChecklist'
import { classMemberIds, listLiveMeetings, resolveAttendeeAthletes, subscribeCoachClasses } from '../../lib/coachClasses'

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
  // Refresh when class attendance changes (athlete marked present during live class).
  useEffect(() => subscribeCoachClasses(() => setTick((n) => n + 1)), [])
  // Pull fresh plans when the checklist opens so tasks written on another
  // device show up immediately. Skip if we already have plans (iPad perf).
  useEffect(() => {
    if (loadClassPlans().length === 0) {
      void pullClassPlans()
    }
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

  // When a class is live, only show athletes marked present in the name picker.
  // (Coach can still use "Coach view: show everyone" to see all.)
  const liveMeeting = useMemo(() => listLiveMeetings()[0] ?? null, [tick])
  const presentIds = useMemo(() => {
    if (!liveMeeting) return null
    return new Set(resolveAttendeeAthletes(liveMeeting, athletes).map((a) => a.id))
  }, [liveMeeting, athletes])
  const visibleAthletes = useMemo(() => {
    if (!presentIds) return athletesWithTasks
    return athletesWithTasks.filter((a) => presentIds.has(a.id))
  }, [athletesWithTasks, presentIds])

  // Present athletes with nothing planned today, but with a checklist
  // from a previous day (any class or lesson). They still get a name
  // row, so a Thursday regular who shows up on Tuesday can pull up
  // her last checklist and copy it onto today's class plan.
  const targetPlan = useMemo(
    () =>
      liveMeeting
        ? plans.find((p) => p.offeringId === liveMeeting.offeringId) ?? null
        : null,
    [plans, liveMeeting],
  )
  const presentNoTasks = useMemo(() => {
    if (!liveMeeting || !presentIds) return []
    const have = new Set(athletesWithTasks.map((a) => a.id))
    const out: { athlete: Athlete; prev: ClassPlan; count: number }[] = []
    for (const id of presentIds) {
      if (have.has(id)) continue
      const a = athleteById(athletes, id)
      if (!a) continue
      const prev = checklistSourcesForAthlete(id, dateKey, targetPlan?.id)[0]
      if (!prev) continue
      const count = checklistCopyCount(prev.plan, targetPlan, id)
      if (count > 0) out.push({ athlete: a, prev: prev.plan, count })
    }
    return out.sort((x, y) =>
      (x.athlete.firstName || x.athlete.name).localeCompare(
        y.athlete.firstName || y.athlete.name,
      ),
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [liveMeeting, presentIds, athletesWithTasks, athletes, dateKey, targetPlan, tick])
  const selectedHasSources = selectedId
    ? checklistSourcesForAthlete(selectedId, dateKey, targetPlan?.id).length > 0
    : false

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

  // In an athlete's own view, done means done for her. In the coach's
  // everyone view, done means done for every athlete the task applies
  // to. A check under one name never counts for anyone else.
  const rowDone = (r: TaskRow): boolean =>
    selectedId === 'all'
      ? taskDoneForAll(r.task, r.plan, athletes)
      : selectedId
        ? taskDoneFor(r.task, selectedId)
        : false

  const doneCount = visible.filter(rowDone).length

  const selectedAthlete =
    selectedId && selectedId !== 'all' ? athleteById(athletes, selectedId) : null

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black md:left-[76px] xl:left-60">
      <div className="mx-auto flex min-h-full max-w-3xl flex-col gap-4 px-4 py-6">
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
          {liveMeeting && presentIds && (
            <p className="text-center text-sm text-white/50">
              Showing athletes marked present in the live class
            </p>
          )}
          {visibleAthletes.map((a) => {
            const myRows = rows.filter(
              (r) =>
                r.task.athleteIds.includes(a.id) ||
                (r.task.athleteIds.includes('all') &&
                  classMemberIds(r.plan.offeringId, athletes).has(a.id)),
            )
            const myDone = myRows.filter((r) => taskDoneFor(r.task, a.id)).length
            return (
              <button
                key={a.id}
                type="button"
                onClick={() => setSelectedId(a.id)}
                className="flex items-center justify-between rounded-2xl border border-white/15 bg-[#111418] p-5 text-left active:bg-white/10"
              >
                <span className="flex min-w-0 items-center gap-3">
                  <AthleteAvatar athlete={a} size="md" />
                  <span className="truncate text-2xl font-bold text-white">
                    {a.firstName || a.name}
                  </span>
                </span>
                <span className="shrink-0 text-sm text-white/50">
                  {myDone}/{myRows.length} done
                </span>
              </button>
            )
          })}
          {presentNoTasks.map(({ athlete: a, prev, count }) => (
            <button
              key={a.id}
              type="button"
              onClick={() => setSelectedId(a.id)}
              className="flex items-center justify-between rounded-2xl border border-white/15 bg-[#111418] p-5 text-left active:bg-white/10"
            >
              <span className="flex min-w-0 items-center gap-3">
                <AthleteAvatar athlete={a} size="md" />
                <span className="truncate text-2xl font-bold text-white">
                  {a.firstName || a.name}
                </span>
              </span>
              <span className="shrink-0 text-sm text-white/50">
                Last checklist {fmtPlanDay(prev.date)} · {count} task{count === 1 ? '' : 's'}
              </span>
            </button>
          ))}
          {visibleAthletes.length === 0 && presentNoTasks.length === 0 && (
            <div className="rounded-2xl border border-white/10 p-8 text-center">
              <p className="text-white/70">
                {liveMeeting
                  ? 'No present athletes have tasks yet.'
                  : 'No tasks planned yet. Your coach adds them in the morning brief.'}
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
              {selectedAthlete && liveMeeting && selectedHasSources ? (
                <>
                  <p className="text-white/70">No tasks for you today yet.</p>
                  <ReuseChecklist
                    tone="overlay"
                    className="mx-auto mt-4 max-w-md text-left"
                    athlete={selectedAthlete}
                    beforeDate={dateKey}
                    target={targetPlan}
                    refreshKey={tick}
                    onPick={(src) => {
                      const target = getOrCreateClassPlan(
                        dateKey,
                        liveMeeting.offeringId,
                        coach.id,
                      )
                      copyChecklistForAthlete(src.id, target.id, selectedAthlete.id)
                    }}
                  />
                </>
              ) : (
                <p className="text-white/70">No tasks for you today. Ask your coach.</p>
              )}
            </div>
          ) : (
            visible.map(({ plan, task, offeringName, time }) => {
              const done = rowDone({ plan, task, offeringName, time })
              // Reps are hers in her own view. In the coach's everyone
              // view there is no single count, so only the target shows.
              const reps =
                selectedId && selectedId !== 'all' ? taskRepsDoneFor(task, selectedId) : null
              const actingAthlete =
                selectedId && selectedId !== 'all' ? [selectedId] : undefined
              return (
              <div
                key={`${plan.id}:${task.id}`}
                className={`rounded-2xl border p-5 ${
                  done
                    ? 'border-green-500/40 bg-green-500/10'
                    : 'border-white/10 bg-[#111418]'
                }`}
              >
                <p className="text-sm text-white/50">
                  {time} · {offeringName}
                </p>
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
                        done ? 'text-white/40 line-through' : 'text-white'
                      }`}
                    >
                      {task.text}
                    </span>
                    <div className="flex shrink-0 items-center gap-2">
                      <button
                        type="button"
                        onClick={() => bumpTaskReps(plan.id, task.id, -1, actingAthlete)}
                        className="flex h-12 w-12 items-center justify-center rounded-xl border border-white/20 text-2xl text-white"
                        aria-label="Remove a rep"
                      >
                        −
                      </button>
                      <span className="min-w-[4rem] text-center text-xl font-bold tabular-nums text-white">
                        {reps === null ? (
                          <span className="text-white/50">{task.repsTarget} reps</span>
                        ) : (
                          <>
                            {reps}
                            <span className="text-white/50">/{task.repsTarget}</span>
                          </>
                        )}
                      </span>
                      <button
                        type="button"
                        onClick={() => bumpTaskReps(plan.id, task.id, 1, actingAthlete)}
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
                    onClick={() => togglePlanTask(plan.id, task.id, actingAthlete)}
                    className="mt-2 flex w-full items-center gap-4 text-left"
                  >
                    <span
                      className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border-2 text-3xl ${
                        done
                          ? 'border-green-400 bg-green-400 text-black'
                          : 'border-white/30 text-transparent'
                      }`}
                    >
                      ✓
                    </span>
                    <span
                      className={`text-xl ${
                        done ? 'text-white/40 line-through' : 'text-white'
                      }`}
                    >
                      {task.text}
                    </span>
                  </button>
                )}
              </div>
              )
            })
          )}
        </div>
      )}
      </div>
    </div>
  )
}
