/**
 * Sync athlete profiles (and homework) to the Shape Lab server so a new
 * trycloudflare / Preview origin still has Ryan's roster.
 */

import type { Athlete, AthleteTaskProgress, FlowProgress, HomeworkItem, HomeworkLog } from '../types'
import {
  loadActiveAthleteId,
  loadAllHomework,
  loadAllTaskProgress,
  loadAthletes,
  loadHomeworkLogs,
  saveActiveAthleteId,
  saveAllHomework,
  saveAllTaskProgress,
  saveAthletes,
  saveFlowProgress,
  loadFlowProgress,
} from './storage'

export type RosterBackup = {
  kind: 'shape-lab-roster'
  version: 1
  exportedAt: string
  athletes: Athlete[]
  activeAthleteId: string | null
  homework: HomeworkItem[]
  homeworkLogs: HomeworkLog[]
  taskProgress: Record<string, AthleteTaskProgress>
  flowProgress: Record<string, FlowProgress>
}

function isAthlete(x: unknown): x is Athlete {
  if (!x || typeof x !== 'object') return false
  const a = x as Athlete
  return typeof a.id === 'string' && typeof a.name === 'string' && a.name.trim().length > 0
}

function mergeAthletes(local: Athlete[], remote: Athlete[]): Athlete[] {
  const byId = new Map<string, Athlete>()
  const byName = new Map<string, Athlete>()
  const put = (a: Athlete) => {
    const existingId = byId.get(a.id)
    const nameKey = a.name.trim().toLowerCase()
    const existingName = byName.get(nameKey)
    const keep = existingId ?? existingName
    if (!keep) {
      byId.set(a.id, a)
      byName.set(nameKey, a)
      return
    }
    const newer =
      (a.createdAt || '') >= (keep.createdAt || '')
        ? { ...keep, ...a, id: keep.id }
        : { ...a, ...keep, id: keep.id }
    byId.delete(keep.id)
    byId.set(newer.id, newer)
    byName.set(nameKey, newer)
  }
  for (const a of local) put(a)
  for (const a of remote) put(a)
  return [...byId.values()].sort((a, b) => a.name.localeCompare(b.name))
}

function mergeById<T extends { id: string }>(local: T[], remote: T[]): T[] {
  const map = new Map<string, T>()
  for (const row of [...remote, ...local]) map.set(row.id, row)
  return [...map.values()]
}

export function localRosterSnapshot(): RosterBackup {
  const athletes = mergeAthletes([], loadAthletes())
  if (athletes.length !== loadAthletes().length) saveAthletes(athletes)
  const flowProgress: Record<string, FlowProgress> = {}
  for (const a of athletes) flowProgress[a.id] = loadFlowProgress(a.id)
  return {
    kind: 'shape-lab-roster',
    version: 1,
    exportedAt: new Date().toISOString(),
    athletes,
    activeAthleteId: loadActiveAthleteId(),
    homework: loadAllHomework(),
    homeworkLogs: loadHomeworkLogs(),
    taskProgress: loadAllTaskProgress(),
    flowProgress,
  }
}

export function applyRosterSnapshot(data: RosterBackup): {
  athletes: Athlete[]
  activeAthleteId: string | null
} {
  const athletes = mergeAthletes(loadAthletes(), data.athletes.filter(isAthlete))
  saveAthletes(athletes)
  const homework = mergeById(loadAllHomework(), Array.isArray(data.homework) ? data.homework : [])
  saveAllHomework(homework)
  const logs = mergeById(
    loadHomeworkLogs(),
    Array.isArray(data.homeworkLogs) ? data.homeworkLogs : [],
  )
  try {
    localStorage.setItem('shape-lab.homeworkLogs.v1', JSON.stringify(logs.slice(0, 1000)))
  } catch {
    /* quota */
  }
  const taskProgress = { ...data.taskProgress, ...loadAllTaskProgress() }
  saveAllTaskProgress(taskProgress)
  const flow = { ...data.flowProgress }
  for (const p of Object.values(flow)) {
    if (p && typeof p === 'object' && 'athleteId' in p) saveFlowProgress(p as FlowProgress)
  }
  const active =
    (data.activeAthleteId && athletes.some((a) => a.id === data.activeAthleteId)
      ? data.activeAthleteId
      : loadActiveAthleteId()) ??
    athletes[0]?.id ??
    null
  if (active) saveActiveAthleteId(active)
  return { athletes, activeAthleteId: active }
}

export async function pullServerRoster(): Promise<RosterBackup | null> {
  try {
    const res = await fetch('/api/roster')
    if (!res.ok) return null
    const data = (await res.json()) as RosterBackup
    if (!data || data.kind !== 'shape-lab-roster' || !Array.isArray(data.athletes)) return null
    return data
  } catch {
    return null
  }
}

export async function pushServerRoster(snapshot?: RosterBackup): Promise<void> {
  try {
    await fetch('/api/roster', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(snapshot ?? localRosterSnapshot()),
    })
  } catch {
    /* server down — localStorage still holds a copy on this origin */
  }
}

export async function syncRosterWithServer(): Promise<{
  athletes: Athlete[]
  activeAthleteId: string | null
}> {
  const server = await pullServerRoster()
  const local = localRosterSnapshot()
  if (server && server.athletes.length > 0) {
    const applied = applyRosterSnapshot(server)
    const merged = localRosterSnapshot()
    if (merged.athletes.length > 0) await pushServerRoster(merged)
    return applied
  }
  if (local.athletes.length > 0) await pushServerRoster(local)
  return { athletes: local.athletes, activeAthleteId: local.activeAthleteId }
}
