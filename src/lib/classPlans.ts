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
  /** Athlete id, or 'all' for a whole-class task. */
  athleteId: string
  text: string
  done: boolean
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
  return Array.isArray(list) ? list : []
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

export function addPlanTask(planId: string, athleteId: string, text: string): ClassPlan | null {
  const trimmed = text.trim()
  if (!trimmed) return null
  return updatePlan(planId, (p) => ({
    ...p,
    tasks: [
      ...p.tasks,
      { id: createId('ctask'), athleteId, text: trimmed, done: false, createdAt: new Date().toISOString() },
    ],
  }))
}

export function togglePlanTask(planId: string, taskId: string): ClassPlan | null {
  return updatePlan(planId, (p) => ({
    ...p,
    tasks: p.tasks.map((t) => (t.id === taskId ? { ...t, done: !t.done } : t)),
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
      if (task.athleteId === athleteId || task.athleteId === 'all') {
        out.push({ plan, task })
      }
    }
  }
  return out
}

/** Today as YYYY-MM-DD in local time. */
export function todayKey(d: Date = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
