import { createId } from './storage'

/**
 * Class plans: the coach's morning prep for each class.
 *
 * For each class on a date, the coach can write class-level notes and
 * per-athlete tasks ("focus on..."). Tasks show up as checklists: on the
 * coach's checklist iPad during class, and on the athlete's own view
 * before class.
 */

export type ClassPlanTask = {
  id: string
  /** Athlete ids this task is for, or ['all'] for a whole-class task. */
  athleteIds: string[]
  text: string
  done: boolean
  /** Optional rep target. Athletes tap through repsDone toward it. */
  repsTarget?: number
  repsDone?: number
  /** Plan id this task was carried over from, if any. */
  carriedFromPlanId?: string
  createdAt: string
}

export type ClassPlan = {
  id: string
  /** YYYY-MM-DD */
  date: string
  offeringId: string
  coachId: string
  notes: string
  tasks: ClassPlanTask[]
  createdAt: string
  updatedAt: string
}

const PLANS_KEY = 'shapelab:class-plans'

const listeners = new Set<() => void>()
function emit() {
  for (const cb of listeners) cb()
}
export function subscribeClassPlans(cb: () => void): () => void {
  listeners.add(cb)
  return () => listeners.delete(cb)
}

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return fallback
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

function writeJson(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    /* quota */
  }
}

export function loadClassPlans(): ClassPlan[] {
  const list = readJson<ClassPlan[]>(PLANS_KEY, [])
  if (!Array.isArray(list)) return []
  // Migrate tasks from the single-athleteId shape.
  let dirty = false
  for (const plan of list) {
    for (const task of plan.tasks) {
      const t = task as ClassPlanTask & { athleteId?: string }
      if (!Array.isArray(t.athleteIds) && typeof t.athleteId === 'string') {
        t.athleteIds = [t.athleteId]
        delete t.athleteId
        dirty = true
      }
      if (!Array.isArray(t.athleteIds)) {
        t.athleteIds = ['all']
        dirty = true
      }
    }
  }
  if (dirty) writeJson(PLANS_KEY, list)
  return list
}

function savePlans(plans: ClassPlan[]) {
  writeJson(PLANS_KEY, plans)
  emit()
}

/** Get or create the plan for an offering on a date. */
export function getOrCreateClassPlan(
  date: string,
  offeringId: string,
  coachId: string,
): ClassPlan {
  const plans = loadClassPlans()
  const existing = plans.find((p) => p.date === date && p.offeringId === offeringId)
  if (existing) return existing
  const now = new Date().toISOString()
  const plan: ClassPlan = {
    id: createId('cplan'),
    date,
    offeringId,
    coachId,
    notes: '',
    tasks: [],
    createdAt: now,
    updatedAt: now,
  }
  savePlans([...plans, plan])
  return plan
}

export function getClassPlan(date: string, offeringId: string): ClassPlan | null {
  return loadClassPlans().find((p) => p.date === date && p.offeringId === offeringId) ?? null
}

export function plansForDate(date: string): ClassPlan[] {
  return loadClassPlans().filter((p) => p.date === date)
}

function updatePlan(planId: string, fn: (p: ClassPlan) => ClassPlan): ClassPlan | null {
  const plans = loadClassPlans()
  const idx = plans.findIndex((p) => p.id === planId)
  if (idx < 0) return null
  const updated = { ...fn(plans[idx]), updatedAt: new Date().toISOString() }
  plans[idx] = updated
  savePlans(plans)
  return updated
}

export function setPlanNotes(planId: string, notes: string): ClassPlan | null {
  return updatePlan(planId, (p) => ({ ...p, notes }))
}

export function addPlanTask(
  planId: string,
  athleteIds: string[],
  text: string,
  repsTarget?: number,
): ClassPlan | null {
  const trimmed = text.trim()
  if (!trimmed) return null
  const ids = athleteIds.length > 0 ? [...new Set(athleteIds)] : ['all']
  const target = repsTarget && repsTarget > 0 ? Math.floor(repsTarget) : undefined
  return updatePlan(planId, (p) => ({
    ...p,
    tasks: [
      ...p.tasks,
      {
        id: createId('ctask'),
        athleteIds: ids,
        text: trimmed,
        done: false,
        ...(target ? { repsTarget: target, repsDone: 0 } : {}),
        createdAt: new Date().toISOString(),
      },
    ],
  }))
}

export function togglePlanTask(planId: string, taskId: string): ClassPlan | null {
  return updatePlan(planId, (p) => ({
    ...p,
    tasks: p.tasks.map((t) => (t.id === taskId ? { ...t, done: !t.done } : t)),
  }))
}

/** Bump repsDone on a task. Auto-marks done when the target is reached. */
export function bumpTaskReps(planId: string, taskId: string, delta: number): ClassPlan | null {
  return updatePlan(planId, (p) => ({
    ...p,
    tasks: p.tasks.map((t) => {
      if (t.id !== taskId || !t.repsTarget) return t
      const repsDone = Math.max(0, Math.min(t.repsTarget, (t.repsDone ?? 0) + delta))
      return { ...t, repsDone, done: repsDone >= t.repsTarget }
    }),
  }))
}

export function removePlanTask(planId: string, taskId: string): ClassPlan | null {
  return updatePlan(planId, (p) => ({
    ...p,
    tasks: p.tasks.filter((t) => t.id !== taskId),
  }))
}

/** All tasks for an athlete on a date, across all class plans. For the athlete view. */
export function tasksForAthleteOnDate(
  athleteId: string,
  date: string,
): { plan: ClassPlan; task: ClassPlanTask }[] {
  const out: { plan: ClassPlan; task: ClassPlanTask }[] = []
  for (const plan of plansForDate(date)) {
    for (const task of plan.tasks) {
      if (task.athleteIds.includes(athleteId) || task.athleteIds.includes('all')) {
        out.push({ plan, task })
      }
    }
  }
  return out
}

/**
 * Carry incomplete tasks forward from an earlier class plan to a later one.
 * Only tasks touching the given athlete ids are carried. Rep progress comes
 * along so athletes pick up where they left off.
 */
export function carryOverTasks(
  fromPlanId: string,
  toPlanId: string,
  athleteIds: string[],
): ClassPlan | null {
  const plans = loadClassPlans()
  const from = plans.find((p) => p.id === fromPlanId)
  if (!from) return null
  const wanted = new Set(athleteIds)
  const carried: ClassPlanTask[] = []
  for (const task of from.tasks) {
    if (task.done) continue
    const overlap = task.athleteIds.filter(
      (id) => id === 'all' || wanted.has(id),
    )
    if (overlap.length === 0) continue
    // Skip if this exact task was already carried over.
    const toPlan = plans.find((p) => p.id === toPlanId)
    if (toPlan?.tasks.some((t) => t.carriedFromPlanId === from.id && t.text === task.text)) {
      continue
    }
    carried.push({
      id: createId('ctask'),
      athleteIds: task.athleteIds.includes('all') ? ['all'] : overlap,
      text: task.text,
      done: false,
      ...(task.repsTarget
        ? { repsTarget: task.repsTarget, repsDone: task.repsDone ?? 0 }
        : {}),
      carriedFromPlanId: from.id,
      createdAt: new Date().toISOString(),
    })
  }
  if (carried.length === 0) return null
  return updatePlan(toPlanId, (p) => ({ ...p, tasks: [...p.tasks, ...carried] }))
}

/** Today as YYYY-MM-DD in local time. */
export function todayKey(d: Date = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/**
 * Tasks previously written for an athlete, most recent first, deduped by
 * text. For quick re-assignment next week.
 */
export function pastTasksForAthlete(
  athleteId: string,
  limit = 12,
): { text: string; repsTarget?: number }[] {
  const seen = new Set<string>()
  const out: { text: string; repsTarget?: number }[] = []
  const plans = loadClassPlans().sort((a, b) => b.date.localeCompare(a.date))
  for (const plan of plans) {
    for (const task of plan.tasks) {
      if (!task.athleteIds.includes(athleteId) && !task.athleteIds.includes('all')) continue
      const key = task.text.trim().toLowerCase()
      if (!key || seen.has(key)) continue
      seen.add(key)
      out.push({ text: task.text.trim(), ...(task.repsTarget ? { repsTarget: task.repsTarget } : {}) })
      if (out.length >= limit) return out
    }
  }
  return out
}
