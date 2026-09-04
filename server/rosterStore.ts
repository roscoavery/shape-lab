/**
 * On-disk athlete roster so a new tunnel / Preview origin still has profiles.
 * PUT merges with the file on disk — a browser that only has Ryan cannot
 * wipe everyone else.
 */

import {
  mergeRosterLists,
  rosterListsFromUnknown,
  type ProfileHint,
  type RosterLists,
} from './rosterMerge.ts'
import { readDiskJson, readJson, writeJson } from './persist.ts'
import {
  photosFromAthletes,
  stripRosterPhotos,
  writeRosterPhotosFile,
} from './rosterPhotoStore.ts'

const FILE = 'data/roster.json'

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
  dismissedHomeworkKeys?: string[]
  injuryLogs?: unknown[]
  painJournals?: unknown[]
  coachExercises?: unknown[]
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
  dismissedHomeworkKeys: [],
  injuryLogs: [],
  painJournals: [],
  coachExercises: [],
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
    dismissedHomeworkKeys: lists.dismissedHomeworkKeys,
    injuryLogs: lists.injuryLogs.slice(-400),
    painJournals: lists.painJournals.slice(-400),
    coachExercises: lists.coachExercises.slice(-200),
  }
}

function nameFromCollection(title: string): string | null {
  const trimmed = title.trim()
  if (!trimmed) return null
  const cut = trimmed.replace(/\s+(floor|drills?|ig|references?|collection).*$/i, '').trim()
  if (!cut || /^my$/i.test(cut) || /^new$/i.test(cut)) return null
  return cut
}

async function profileHints(): Promise<Record<string, ProfileHint>> {
  const hints: Record<string, ProfileHint> = {}
  const coach = await readJson<{
    byAthleteId?: Record<string, { collections?: { name?: string }[] }>
  }>('data/coach-libraries.json', {})
  for (const [id, lib] of Object.entries(coach.byAthleteId ?? {})) {
    const title = lib.collections?.find((c) => c.name)?.name ?? ''
    const name = nameFromCollection(title)
    if (name) hints[id] = { name, role: 'coach' }
  }
  const discuss = await readJson<{ threads?: { authorId?: string }[] }>('data/discuss.json', {})
  for (const thread of discuss.threads ?? []) {
    const id = thread.authorId
    if (!id) continue
    hints[id] = { name: hints[id]?.name ?? '', role: 'coach' }
  }
  if (!hints.ath_mtdrh90l_rhmvsa?.name) hints.ath_mtdrh90l_rhmvsa = { name: 'Jordan', role: 'coach' }
  if (!hints.ath_maya_test?.name) hints.ath_maya_test = { name: 'Maya', role: 'coach' }
  return hints
}

function normalizeRoster(data: DiskRoster | null | undefined): DiskRoster {
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
    dismissedHomeworkKeys: Array.isArray(data.dismissedHomeworkKeys)
      ? data.dismissedHomeworkKeys
      : [],
    injuryLogs: Array.isArray(data.injuryLogs) ? data.injuryLogs : [],
    painJournals: Array.isArray(data.painJournals) ? data.painJournals : [],
    coachExercises: Array.isArray(data.coachExercises) ? data.coachExercises : [],
  }
}

async function readRawRoster(): Promise<DiskRoster> {
  const stored = normalizeRoster(await readJson<DiskRoster>(FILE, { ...EMPTY }))
  const bundled = normalizeRoster(readDiskJson<DiskRoster>(FILE, { ...EMPTY }))
  if (bundled.athletes.length === 0) return stored
  if (stored.athletes.length === 0) return bundled
  const merged = mergeRosterLists(rosterListsFromUnknown(bundled), rosterListsFromUnknown(stored))
  return listsToDisk(merged, stored.exportedAt || bundled.exportedAt)
}

async function persistMerged(lists: RosterLists): Promise<DiskRoster> {
  const next = listsToDisk(lists)
  await writeJson(FILE, next)
  return next
}

export async function readRosterFile(): Promise<DiskRoster> {
  const onDisk = await readRawRoster()
  const merged = mergeRosterLists(
    rosterListsFromUnknown(EMPTY),
    rosterListsFromUnknown(onDisk),
    await profileHints(),
  )
  const sameAthletes = JSON.stringify(onDisk.athletes) === JSON.stringify(merged.athletes)
  const sameRemoved =
    JSON.stringify(onDisk.removedAthleteIds ?? []) === JSON.stringify(merged.removedAthleteIds)
  const disk = !sameAthletes || !sameRemoved ? await persistMerged(merged) : listsToDisk(merged, onDisk.exportedAt)
  const inline = photosFromAthletes(disk.athletes)
  if (Object.keys(inline).length > 0) {
    await writeRosterPhotosFile({
      kind: 'shape-lab-roster-photos',
      version: 1,
      exportedAt: '',
      photos: inline,
    })
  }
  // Photos live on /api/roster-photos?id=. Inlining them here made the gym
  // file too large for iPhone Safari and the phone never got past boot.
  return {
    ...disk,
    athletes: stripRosterPhotos(disk.athletes as { photoDataUrl?: string }[]),
  }
}

export async function writeRosterFile(data: unknown): Promise<DiskRoster> {
  const parsed = data as DiskRoster
  if (!parsed || parsed.kind !== 'shape-lab-roster' || !Array.isArray(parsed.athletes)) {
    throw new Error('Invalid roster payload')
  }
  const incomingPhotos = photosFromAthletes(parsed.athletes)
  if (Object.keys(incomingPhotos).length > 0) {
    await writeRosterPhotosFile({
      kind: 'shape-lab-roster-photos',
      version: 1,
      exportedAt: '',
      photos: incomingPhotos,
    })
  }
  const slim: DiskRoster = {
    ...parsed,
    athletes: stripRosterPhotos(parsed.athletes as { photoDataUrl?: string }[]),
  }
  const merged = mergeRosterLists(
    rosterListsFromUnknown(await readRawRoster()),
    rosterListsFromUnknown(slim),
    await profileHints(),
  )
  const saved = await persistMerged({
    ...merged,
    athletes: stripRosterPhotos(merged.athletes),
  })
  return saved
}
