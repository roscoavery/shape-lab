/**
 * On-disk athlete roster so a new tunnel / Preview origin still has profiles.
 */

import fs from 'node:fs'
import path from 'node:path'

const FILE = path.join(process.cwd(), 'data', 'roster.json')

export type DiskRoster = {
  kind: 'shape-lab-roster'
  version: 1
  exportedAt: string
  athletes: unknown[]
  activeAthleteId: string | null
  homework: unknown[]
  homeworkLogs: unknown[]
  taskProgress: Record<string, unknown>
  flowProgress: Record<string, unknown>
  attempts?: unknown[]
  compareLibraries?: Record<string, unknown>
}

const EMPTY: DiskRoster = {
  kind: 'shape-lab-roster',
  version: 1,
  exportedAt: '',
  athletes: [],
  activeAthleteId: null,
  homework: [],
  homeworkLogs: [],
  taskProgress: {},
  flowProgress: {},
}

export function readRosterFile(): DiskRoster {
  try {
    const data = JSON.parse(fs.readFileSync(FILE, 'utf8')) as DiskRoster
    if (!data || data.kind !== 'shape-lab-roster' || !Array.isArray(data.athletes)) {
      return { ...EMPTY }
    }
    return {
      ...EMPTY,
      ...data,
      athletes: Array.isArray(data.athletes) ? data.athletes : [],
      homework: Array.isArray(data.homework) ? data.homework : [],
    homeworkLogs: Array.isArray(data.homeworkLogs) ? data.homeworkLogs : [],
    taskProgress: data.taskProgress && typeof data.taskProgress === 'object' ? data.taskProgress : {},
    flowProgress: data.flowProgress && typeof data.flowProgress === 'object' ? data.flowProgress : {},
    attempts: Array.isArray(data.attempts) ? data.attempts : [],
    compareLibraries:
      data.compareLibraries && typeof data.compareLibraries === 'object' ? data.compareLibraries : {},
    }
  } catch {
    return { ...EMPTY }
  }
}

export function writeRosterFile(data: unknown): DiskRoster {
  const parsed = data as DiskRoster
  if (!parsed || parsed.kind !== 'shape-lab-roster' || !Array.isArray(parsed.athletes)) {
    throw new Error('Invalid roster payload')
  }
  const next: DiskRoster = {
    kind: 'shape-lab-roster',
    version: 1,
    exportedAt: new Date().toISOString(),
    athletes: parsed.athletes,
    activeAthleteId: parsed.activeAthleteId ?? null,
    homework: Array.isArray(parsed.homework) ? parsed.homework : [],
    homeworkLogs: Array.isArray(parsed.homeworkLogs) ? parsed.homeworkLogs.slice(0, 1000) : [],
    taskProgress: parsed.taskProgress && typeof parsed.taskProgress === 'object' ? parsed.taskProgress : {},
    flowProgress: parsed.flowProgress && typeof parsed.flowProgress === 'object' ? parsed.flowProgress : {},
    attempts: Array.isArray(parsed.attempts) ? parsed.attempts.slice(0, 2000) : [],
    compareLibraries:
      parsed.compareLibraries && typeof parsed.compareLibraries === 'object'
        ? parsed.compareLibraries
        : {},
  }
  fs.mkdirSync(path.dirname(FILE), { recursive: true })
  fs.writeFileSync(FILE, JSON.stringify(next, null, 2) + '\n')
  return next
}
