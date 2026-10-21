import { createId, loadAthletes } from './storage'
import { classMemberIds, loadMeetings } from './coachClasses'
import { loadLessonSessions } from './lessonStore'
import { markedFetch } from './authSession'
import type { Athlete } from '../types'

/**
 * Athletes a lesson plan belongs to, from every signal available: the
 * stamp left by surfaces that opened it knowing the athlete, the
 * athletes tagged on its tasks, and the live session that ran this
 * lesson (matched by the calendar event id in the offering id).
 */
export function lessonPlanAthleteIds(plan: ClassPlan): Set<string> {
  const out = new Set<string>(plan.athleteIds ?? [])
  for (const t of plan.tasks) {
    for (const id of t.athleteIds) if (id !== 'all') out.add(id)
  }
  if (plan.offeringId.startsWith('lesson:')) {
    const eventId = plan.offeringId.slice('lesson:'.length)
    const session = loadLessonSessions().find((s) => s.calendarEventId === eventId)
    if (session) {
      for (const id of session.athleteIds ?? [session.athleteId]) {
        if (id) out.add(id)
      }
    }
  }
  return out
}

/** Record that a plan was made for this athlete, so its checklist can be
 * found as hers later even when its tasks carry no athlete tags. */
export function stampPlanAthlete(planId: string, athleteId: string) {
  const plans = loadClassPlans()
  const plan = plans.find((p) => p.id === planId)
  if (!plan || (plan.athleteIds ?? []).includes(athleteId)) return
  plan.athleteIds = [...(plan.athleteIds ?? []), athleteId]
  plan.updatedAt = new Date().toISOString()
  savePlans(plans)
}

/**
 * Class plans: the coach's morning prep for each class.
 *
 * For each class on a date, the coach can write class-level notes and
 * per-athlete tasks ("focus on..."). Tasks show up as checklists: on the
 * coach's checklist iPad during class, and on the athlete's own view
 * before class.
 *
 * Plans sync across devices through /api/class-plans (last-write-wins
 * per plan by updatedAt), so the morning brief on one device feeds the
 * checklist on another.
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
  /** Athletes this plan was made for, stamped when a surface that knows
   * the athlete opens it. Lesson plans rely on this when their tasks were
   * written before the lesson was linked to an athlete. */
  athleteIds?: string[]
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
  let dirty = false
  for (const plan of list) {
    for (const task of plan.tasks) {
      const t = task as ClassPlanTask & { athleteId?: string }
      // Migrate tasks from the single-athleteId shape.
      if (!Array.isArray(t.athleteIds) && typeof t.athleteId === 'string') {
        t.athleteIds = [t.athleteId]
        delete t.athleteId
        dirty = true
      }
      if (!Array.isArray(t.athleteIds)) {
        t.athleteIds = ['all']
        dirty = true
      }
      // Pull rep counts out of titles the coach already wrote ("5 ro hs tuck reps").
      if (t.repsTarget === undefined) {
        const parsed = parseLeadingReps(t.text)
        if (parsed.reps !== undefined && parsed.text !== t.text) {
          t.text = parsed.text
          t.repsTarget = parsed.reps
          t.repsDone = 0
          dirty = true
        }
      }
    }
  }
  if (dirty) writeJson(PLANS_KEY, list)
  return list
}

function savePlans(plans: ClassPlan[]) {
  writeJson(PLANS_KEY, plans)
  emit()
  schedulePush()
}

// --- Cross-device sync -------------------------------------------------

let pushTimer: ReturnType<typeof setTimeout> | null = null
let syncStarted = false

function mergePlans(local: ClassPlan[], remote: ClassPlan[]): ClassPlan[] {
  const byId = new Map<string, ClassPlan>()
  for (const p of local) byId.set(p.id, p)
  for (const p of remote) {
    const existing = byId.get(p.id)
    if (!existing || (p.updatedAt || '') >= (existing.updatedAt || '')) {
      byId.set(p.id, p)
    }
  }
  return [...byId.values()]
}

/** Pull server plans and merge with local. Safe to call repeatedly. */
export async function pullClassPlans(): Promise<void> {
  try {
    const res = await markedFetch('/api/class-plans')
    if (!res.ok) return
    const data = (await res.json()) as { plans?: ClassPlan[] }
    const remote = Array.isArray(data.plans) ? data.plans : []
    const local = loadClassPlans()
    const merged = mergePlans(local, remote)
    const localIds = new Set(local.map((p) => p.id))
    const changed =
      merged.length !== local.length ||
      remote.some((p) => !localIds.has(p.id)) ||
      merged.some((m) => {
        const l = local.find((x) => x.id === m.id)
        return l && l.updatedAt !== m.updatedAt
      })
    if (changed) {
      writeJson(PLANS_KEY, merged)
      emit()
    }
  } catch {
    /* offline */
  }
}

/** Pull server plans and merge with local. Runs once per session. */
export async function syncClassPlans(): Promise<void> {
  if (syncStarted) return
  syncStarted = true
  await pullClassPlans()
  // Push merged state so the server converges too.
  await pushClassPlansNow()
}

/** Push local plans to the server immediately. */
export async function pushClassPlansNow(): Promise<void> {
  try {
    const res = await markedFetch('/api/class-plans', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ plans: loadClassPlans() }),
    })
    if (!res.ok) return
    const data = (await res.json()) as { plans?: ClassPlan[] }
    if (Array.isArray(data.plans)) {
      writeJson(PLANS_KEY, data.plans)
      emit()
    }
  } catch {
    /* offline */
  }
}

function schedulePush() {
  if (pushTimer) clearTimeout(pushTimer)
  pushTimer = setTimeout(() => {
    pushTimer = null
    void pushClassPlansNow()
  }, 1500)
}

/** Flush any pending debounced push immediately. Call on pagehide. */
export function flushPendingPlanPush(): void {
  if (pushTimer) {
    clearTimeout(pushTimer)
    pushTimer = null
    void pushClassPlansNow()
  }
}

// Flush pending pushes when the app goes to background so tasks added
// right before switching devices still reach the server.
if (typeof window !== 'undefined') {
  window.addEventListener('pagehide', () => flushPendingPlanPush())
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flushPendingPlanPush()
  })
}

/**
 * Date key a lesson's plan lives under. Lesson plans are keyed by the
 * calendar event's date, not "today": a lesson planned on Saturday for a
 * Sunday event must still be there when Sunday's live lesson looks it up.
 */
export function lessonPlanDateKey(event: { startAt: string }): string {
  const d = (event.startAt ?? '').slice(0, 10)
  return /^\d{4}-\d{2}-\d{2}$/.test(d) ? d : todayKey()
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
  // If the coach typed the reps into the title ("5 ro hs tuck reps"),
  // pull the number out automatically unless they set it explicitly.
  let finalText = trimmed
  let target = repsTarget && repsTarget > 0 ? Math.floor(repsTarget) : undefined
  if (target === undefined) {
    const parsed = parseLeadingReps(trimmed)
    if (parsed.reps !== undefined) {
      finalText = parsed.text
      target = parsed.reps
    }
  }
  return updatePlan(planId, (p) => ({
    ...p,
    tasks: [
      ...p.tasks,
      {
        id: createId('ctask'),
        athleteIds: ids,
        text: finalText,
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

/** Move a task up or down in the plan's task order. */
export function movePlanTask(
  planId: string,
  taskId: string,
  direction: 'up' | 'down',
): ClassPlan | null {
  return updatePlan(planId, (p) => {
    const idx = p.tasks.findIndex((t) => t.id === taskId)
    if (idx < 0) return p
    const next = idx + (direction === 'up' ? -1 : 1)
    if (next < 0 || next >= p.tasks.length) return p
    const tasks = [...p.tasks]
    const [task] = tasks.splice(idx, 1)
    tasks.splice(next, 0, task)
    return { ...p, tasks }
  })
}

/** Move a task to a specific index in the plan's task order (for drag reorder). */
export function reorderPlanTask(
  planId: string,
  taskId: string,
  toIndex: number,
): ClassPlan | null {
  return updatePlan(planId, (p) => {
    const from = p.tasks.findIndex((t) => t.id === taskId)
    if (from < 0) return p
    const clamped = Math.max(0, Math.min(toIndex, p.tasks.length - 1))
    if (clamped === from) return p
    const tasks = [...p.tasks]
    const [task] = tasks.splice(from, 1)
    tasks.splice(clamped, 0, task)
    return { ...p, tasks }
  })
}

/** All tasks for an athlete on a date, across all class plans. For the athlete view.
 * 'Everyone' tasks only apply to athletes in that task's class, not every
 * athlete the coach sees that day. */
export function tasksForAthleteOnDate(
  athleteId: string,
  date: string,
  athletes?: Athlete[],
): { plan: ClassPlan; task: ClassPlanTask }[] {
  const roster = athletes ?? loadAthletes()
  const out: { plan: ClassPlan; task: ClassPlanTask }[] = []
  const memberCache = new Map<string, Set<string>>()
  const membersOf = (offeringId: string): Set<string> => {
    let s = memberCache.get(offeringId)
    if (!s) {
      s = classMemberIds(offeringId, roster)
      memberCache.set(offeringId, s)
    }
    return s
  }
  for (const plan of plansForDate(date)) {
    for (const task of plan.tasks) {
      if (task.athleteIds.includes(athleteId)) {
        out.push({ plan, task })
      } else if (task.athleteIds.includes('all') && membersOf(plan.offeringId).has(athleteId)) {
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

/**
 * The most recent plan for an offering before the given date that has at
 * least one task. For a weekly class this is last week's checklist.
 */
export function previousPlanForOffering(
  offeringId: string,
  beforeDate: string,
): ClassPlan | null {
  const earlier = loadClassPlans()
    .filter((p) => p.offeringId === offeringId && p.date < beforeDate && p.tasks.length > 0)
    .sort((a, b) => b.date.localeCompare(a.date))
  return earlier[0] ?? null
}

/**
 * The tasks that appeared under an athlete's name in a plan: tasks
 * written for her, plus "everyone" tasks she actually had — for a class
 * she was a member of, or in a lesson plan that was hers (it holds at
 * least one of her tasks). This is her checklist from that session,
 * exactly as it showed under her name that day.
 */
export function effectiveChecklistTasks(
  plan: ClassPlan,
  athleteId: string,
  roster?: Athlete[],
): ClassPlanTask[] {
  if (plan.offeringId.startsWith('lesson:')) {
    // A lesson plan's tasks all showed under its athletes' names (the
    // lesson card renders the whole list). When tasks carry athlete
    // tags, her checklist is her tagged tasks plus the everyone tasks.
    // When no task is tagged (written before the lesson was linked to
    // her), the whole list is hers as long as the lesson itself was.
    if (!lessonPlanAthleteIds(plan).has(athleteId)) return []
    const anyTagged = plan.tasks.some((t) => t.athleteIds.some((id) => id !== 'all'))
    if (!anyTagged) return [...plan.tasks]
    return plan.tasks.filter(
      (t) => t.athleteIds.includes(athleteId) || t.athleteIds.includes('all'),
    )
  }
  const members = classMemberIds(plan.offeringId, roster ?? loadAthletes())
  if (!members.has(athleteId)) {
    // One-time drop-ins sit in no roster or regulars list; that day's
    // meeting attendance is the record that she was in this class.
    for (const m of loadMeetings()) {
      if (m.offeringId !== plan.offeringId) continue
      const started = new Date(m.startedAt)
      const key = `${started.getFullYear()}-${String(started.getMonth() + 1).padStart(2, '0')}-${String(started.getDate()).padStart(2, '0')}`
      if (key !== plan.date) continue
      if (m.attendees.some((a) => a.athleteId === athleteId)) {
        members.add(athleteId)
        break
      }
    }
  }
  const everyoneApplies = members.has(athleteId)
  return plan.tasks.filter(
    (t) =>
      t.athleteIds.includes(athleteId) ||
      (everyoneApplies && t.athleteIds.includes('all')),
  )
}

/**
 * Past sessions whose checklist can be reused for this athlete: every
 * earlier plan (any class or lesson) where she had a checklist, most
 * recent first. Same-day plans count (a lesson this morning can seed
 * tonight's class); the target plan itself is excluded.
 */
export function checklistSourcesForAthlete(
  athleteId: string,
  beforeDate: string,
  excludePlanId?: string,
  limit = 6,
): { plan: ClassPlan; tasks: ClassPlanTask[] }[] {
  const plans = loadClassPlans()
    .filter((p) => p.id !== excludePlanId && p.date <= beforeDate)
    .sort(
      (a, b) =>
        b.date.localeCompare(a.date) || b.updatedAt.localeCompare(a.updatedAt),
    )
  const out: { plan: ClassPlan; tasks: ClassPlanTask[] }[] = []
  for (const plan of plans) {
    const tasks = effectiveChecklistTasks(plan, athleteId)
    if (tasks.length > 0) out.push({ plan, tasks })
    if (out.length >= limit) break
  }
  return out
}

/** How many of a source checklist's tasks are not already the athlete's in the target. */
export function checklistCopyCount(
  from: ClassPlan,
  to: ClassPlan | null,
  athleteId: string,
): number {
  const seen = new Set<string>()
  let n = 0
  for (const task of effectiveChecklistTasks(from, athleteId)) {
    const key = task.text.trim().toLowerCase()
    if (!key || seen.has(key)) continue
    seen.add(key)
    if (
      to?.tasks.some(
        (t) => t.athleteIds.includes(athleteId) && t.text.trim().toLowerCase() === key,
      )
    )
      continue
    n += 1
  }
  return n
}

/**
 * Copy an athlete's checklist from a past session into the target plan
 * as her personal checklist: every task lands under her name alone
 * (including ones that were "everyone" tasks in the source), done flags
 * and rep progress reset, rep targets kept, duplicates skipped.
 */
export function copyChecklistForAthlete(
  fromPlanId: string,
  toPlanId: string,
  athleteId: string,
): ClassPlan | null {
  const plans = loadClassPlans()
  const from = plans.find((p) => p.id === fromPlanId)
  const to = plans.find((p) => p.id === toPlanId)
  if (!from || !to || from.id === to.id) return null
  const seen = new Set<string>()
  const fresh: ClassPlanTask[] = []
  for (const task of effectiveChecklistTasks(from, athleteId)) {
    const key = task.text.trim().toLowerCase()
    if (!key || seen.has(key)) continue
    seen.add(key)
    if (
      to.tasks.some(
        (t) => t.athleteIds.includes(athleteId) && t.text.trim().toLowerCase() === key,
      )
    )
      continue
    fresh.push({
      id: createId('ctask'),
      athleteIds: [athleteId],
      text: task.text,
      done: false,
      ...(task.repsTarget ? { repsTarget: task.repsTarget, repsDone: 0 } : {}),
      carriedFromPlanId: from.id,
      createdAt: new Date().toISOString(),
    })
  }
  if (fresh.length === 0) return null
  return updatePlan(toPlanId, (p) => ({ ...p, tasks: [...p.tasks, ...fresh] }))
}

function sameTask(a: ClassPlanTask, b: ClassPlanTask): boolean {
  if (a.text.trim().toLowerCase() !== b.text.trim().toLowerCase()) return false
  const as = [...a.athleteIds].sort().join(',')
  const bs = [...b.athleteIds].sort().join(',')
  return as === bs
}

/** How many of the source plan's tasks are not already in the target plan. */
export function tasksNotYetIn(
  from: ClassPlan,
  to: ClassPlan,
  onlyAthleteId?: string,
): number {
  return from.tasks.filter(
    (t) =>
      (!onlyAthleteId || t.athleteIds.includes(onlyAthleteId)) &&
      !to.tasks.some((m) => sameTask(m, t)),
  ).length
}

/**
 * Copy every task from one plan into another as a fresh checklist: done
 * flags and rep progress reset, rep targets kept. Tasks already present in
 * the target (same text and athletes) are skipped, so tapping twice is
 * harmless. Unlike carryOverTasks this copies completed tasks too — it is a
 * starting template the coach then trims, not a carry-forward of leftovers.
 */
export function copyPlanTasksFresh(
  fromPlanId: string,
  toPlanId: string,
  onlyAthleteId?: string,
): ClassPlan | null {
  const plans = loadClassPlans()
  const from = plans.find((p) => p.id === fromPlanId)
  const to = plans.find((p) => p.id === toPlanId)
  if (!from || !to) return null
  const fresh: ClassPlanTask[] = []
  for (const task of from.tasks) {
    if (onlyAthleteId && !task.athleteIds.includes(onlyAthleteId)) continue
    if (to.tasks.some((t) => sameTask(t, task))) continue
    fresh.push({
      id: createId('ctask'),
      athleteIds: [...task.athleteIds],
      text: task.text,
      done: false,
      ...(task.repsTarget ? { repsTarget: task.repsTarget, repsDone: 0 } : {}),
      carriedFromPlanId: from.id,
      createdAt: new Date().toISOString(),
    })
  }
  if (fresh.length === 0) return null
  return updatePlan(toPlanId, (p) => ({ ...p, tasks: [...p.tasks, ...fresh] }))
}

/** Today as YYYY-MM-DD in local time. */
export function todayKey(d: Date = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/**
 * Pull a leading rep count out of task text.
 * "5 ro hs tuck reps on spring floor" -> { text: "ro hs tuck reps on spring floor", reps: 5 }
 * "10x hollow holds" -> { text: "hollow holds", reps: 10 }
 * Returns the text unchanged when no leading number is found.
 */
export function parseLeadingReps(raw: string): { text: string; reps?: number } {
  const m = raw.trim().match(/^(\d+)\s*[x×]?\s+(.+)$/)
  if (!m) return { text: raw.trim() }
  const reps = parseInt(m[1], 10)
  if (!Number.isFinite(reps) || reps <= 0 || reps > 1000) return { text: raw.trim() }
  return { text: m[2].trim(), reps }
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
