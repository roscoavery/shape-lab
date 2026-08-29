/**
 * On-disk athlete roster so a new tunnel / Preview origin still has profiles.
 * PUT merges with the file on disk — a browser that only has Ryan cannot
 * wipe everyone else.
 */

import fs from 'node:fs'
import path from 'node:path'
import {
  mergeRosterLists,
  rosterListsFromUnknown,
  type ProfileHint,
  type RosterLists,
} from './rosterMerge.ts'

const FILE = path.join(process.cwd(), 'data', 'roster.json')
const COACH_LIBS = path.join(process.cwd(), 'data', 'coach-libraries.json')
const DISCUSS = path.join(process.cwd(), 'data', 'discuss.json')

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
  removedAthleteIds?: string[]
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
  attempts: [],
  compareLibraries: {},
  removedAthleteIds: [],
}

function listsToDisk(lists: RosterLists, exportedAt = new Date().toISOString()): DiskRoster {
  return {
    kind: 'shape-lab-roster',
    version: 1,
    exportedAt,
    athletes: lists.athletes,
    activeAthleteId: lists.activeAthleteId,
    homework: lists.homework,
    homeworkLogs: lists.homeworkLogs.slice(-1000),
    taskProgress: lists.taskProgress,
    flowProgress: lists.flowProgress,
    attempts: lists.attempts.slice(-2000),
    compareLibraries: lists.compareLibraries,
    removedAthleteIds: lists.removedAthleteIds,
  }
}

function nameFromCollection(title: string): string | null {
  const trimmed = title.trim()
  if (!trimmed) return null
  const cut = trimmed.replace(/\s+(floor|drills?|ig|references?|collection).*$/i, '').trim()
  if (!cut || /^my$/i.test(cut) || /^new$/i.test(cut)) return null
  return cut
}

function profileHints(): Record<string, ProfileHint> {
  const hints: Record<string, ProfileHint> = {}
  try {
    const data = JSON.parse(fs.readFileSync(COACH_LIBS, 'utf8')) as {
      byAthleteId?: Record<string, { collections?: { name?: string }[] }>
    }
    for (const [id, lib] of Object.entries(data.byAthleteId ?? {})) {
      const title = lib.collections?.find((c) => c.name)?.name ?? ''
      const name = nameFromCollection(title)
      if (name) hints[id] = { name, role: 'coach' }
    }
  } catch {
    /* optional file */
  }
  try {
    const data = JSON.parse(fs.readFileSync(DISCUSS, 'utf8')) as {
      threads?: { authorId?: string }[]
    }
    for (const thread of data.threads ?? []) {
      const id = thread.authorId
      if (!id) continue
      hints[id] = { name: hints[id]?.name ?? '', role: 'coach' }
    }
  } catch {
    /* optional file */
  }
  if (!hints.ath_mtdrh90l_rhmvsa?.name) hints.ath_mtdrh90l_rhmvsa = { name: 'Jordan', role: 'coach' }
  if (!hints.ath_maya_test?.name) hints.ath_maya_test = { name: 'Maya', role: 'coach' }
  return hints
}

function readRawRoster(): DiskRoster {
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
      taskProgress:
        data.taskProgress && typeof data.taskProgress === 'object' ? data.taskProgress : {},
      flowProgress:
        data.flowProgress && typeof data.flowProgress === 'object' ? data.flowProgress : {},
      attempts: Array.isArray(data.attempts) ? data.attempts : [],
      compareLibraries:
        data.compareLibraries && typeof data.compareLibraries === 'object'
          ? data.compareLibraries
          : {},
      removedAthleteIds: Array.isArray(data.removedAthleteIds) ? data.removedAthleteIds : [],
    }
  } catch {
    return { ...EMPTY }
  }
}

function persistMerged(lists: RosterLists): DiskRoster {
  const next = listsToDisk(lists)
  fs.mkdirSync(path.dirname(FILE), { recursive: true })
  fs.writeFileSync(FILE, JSON.stringify(next, null, 2) + '\n')
  return next
}

export function readRosterFile(): DiskRoster {
  const onDisk = readRawRoster()
  const merged = mergeRosterLists(rosterListsFromUnknown(EMPTY), rosterListsFromUnknown(onDisk), profileHints())
  const sameAthletes = JSON.stringify(onDisk.athletes) === JSON.stringify(merged.athletes)
  const sameRemoved =
    JSON.stringify(onDisk.removedAthleteIds ?? []) === JSON.stringify(merged.removedAthleteIds)
  if (!sameAthletes || !sameRemoved) {
    return persistMerged(merged)
  }
  return listsToDisk(merged, onDisk.exportedAt)
}

export function writeRosterFile(data: unknown): DiskRoster {
  const parsed = data as DiskRoster
  if (!parsed || parsed.kind !== 'shape-lab-roster' || !Array.isArray(parsed.athletes)) {
    throw new Error('Invalid roster payload')
  }
  const merged = mergeRosterLists(
    rosterListsFromUnknown(readRawRoster()),
    rosterListsFromUnknown(parsed),
    profileHints(),
  )
  return persistMerged(merged)
}
