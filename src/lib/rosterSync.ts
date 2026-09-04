/**
 * Sync athlete profiles (and homework) to the Shape Lab server so a new
 * browser / tunnel origin still has the gym roster.
 *
 * A new tab used to PUT Ryan-only before GET finished, which wiped Profiles
 * on every other device. Pushes stay off until the first successful GET, and
 * the server unions athletes instead of replacing the file.
 */

import type {
  Athlete,
  AthleteTaskProgress,
  AttemptRecord,
  CoachExercise,
  FlowProgress,
  HomeworkItem,
  HomeworkLog,
  InjuryEntry,
  PainJournalEntry,
} from '../types'
import type { RefCollection } from './clipStore'
import { loadCompareLibraries, saveCompareLibraries, type CompareLibraries } from './compareLibraries'
import {
  isAthleteRecord,
  mergeRosterLists,
  restoreMissingAthletes,
  rosterListsFromUnknown,
  type RosterLists,
} from '../../server/rosterMerge.ts'
import { ensureRyanInAthletes, isRyanAthlete } from './ryanProfile'
import {
  loadActiveAthleteId,
  loadAllHomework,
  loadAllTaskProgress,
  loadAthletes,
  loadAttempts,
  loadFlowProgress,
  loadHomeworkLogs,
  loadRemovedAthleteIds,
  saveActiveAthleteId,
  saveAllHomework,
  saveAllTaskProgress,
  saveAthletes,
  saveAttempts,
  saveFlowProgress,
  saveRemovedAthleteIds,
} from './storage'
import {
  loadCoachExercises,
  loadDismissedHomeworkKeys,
  loadInjuryLogs,
  loadPainJournal,
  saveCoachExercises,
  saveDismissedHomeworkKeys,
  saveInjuryLogs,
  savePainJournal,
} from './careStore'
import { photoBlobPath, uploadGymMedia } from './mediaUpload'
import { compressProfilePhoto, isPhotoUrl } from './profilePhoto'

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
  attempts?: AttemptRecord[]
  compareLibraries?: Record<string, RefCollection[]>
  removedAthleteIds?: string[]
  dismissedHomeworkKeys?: string[]
  injuryLogs?: InjuryEntry[]
  painJournals?: PainJournalEntry[]
  coachExercises?: CoachExercise[]
}

/** False until GET /api/roster succeeds so a Ryan-only tab cannot clobber the gym. */
let serverPushEnabled = false
/** Living profiles on the last successful GET — never PUT a smaller snapshot. */
let lastServerAthleteCount = 0

export function enableServerRosterPush() {
  serverPushEnabled = true
}

export function isServerRosterPushEnabled() {
  return serverPushEnabled
}

export function lastPulledAthleteCount() {
  return lastServerAthleteCount
}

/**
 * After the first successful GET, every change must PUT — including deletes.
 * Removals are explicit tombstones, so a smaller living list cannot wipe
 * people the client never listed as removed.
 */
export function shouldPushRoster(_athleteCount = loadAthletes().length) {
  return serverPushEnabled
}

function localFlowMap(): Record<string, FlowProgress> {
  const flowProgress: Record<string, FlowProgress> = {}
  for (const a of ensureRyanInAthletes(loadAthletes())) {
    flowProgress[a.id] = loadFlowProgress(a.id)
  }
  return flowProgress
}

function listsFromLocal(): RosterLists {
  return rosterListsFromUnknown({
    athletes: ensureRyanInAthletes(loadAthletes()),
    homework: loadAllHomework(),
    homeworkLogs: loadHomeworkLogs(),
    taskProgress: loadAllTaskProgress(),
    flowProgress: localFlowMap(),
    attempts: loadAttempts(),
    compareLibraries: loadCompareLibraries(),
    removedAthleteIds: loadRemovedAthleteIds(),
    activeAthleteId: loadActiveAthleteId(),
    dismissedHomeworkKeys: loadDismissedHomeworkKeys(),
    injuryLogs: loadInjuryLogs(),
    painJournals: loadPainJournal(),
    coachExercises: loadCoachExercises(),
  })
}

export function localRosterSnapshot(): RosterBackup {
  const athletes = ensureRyanInAthletes(loadAthletes())
  return {
    kind: 'shape-lab-roster',
    version: 1,
    exportedAt: new Date().toISOString(),
    athletes,
    activeAthleteId: loadActiveAthleteId(),
    homework: loadAllHomework(),
    homeworkLogs: loadHomeworkLogs(),
    taskProgress: loadAllTaskProgress(),
    flowProgress: localFlowMap(),
    attempts: loadAttempts(),
    compareLibraries: loadCompareLibraries(),
    removedAthleteIds: loadRemovedAthleteIds(),
    dismissedHomeworkKeys: loadDismissedHomeworkKeys(),
    injuryLogs: loadInjuryLogs(),
    painJournals: loadPainJournal(),
    coachExercises: loadCoachExercises(),
  }
}

function trySave(write: () => void) {
  try {
    write()
  } catch {
    /* quota — in-memory roster still applied */
  }
}

function persistLists(lists: RosterLists): Athlete[] {
  const athletes = ensureRyanInAthletes(lists.athletes.filter(isAthleteRecord))
  saveAthletes(athletes)
  const livingIds = new Set(athletes.map((a) => a.id))
  trySave(() =>
    saveRemovedAthleteIds(lists.removedAthleteIds.filter((id) => !livingIds.has(id))),
  )
  trySave(() => saveDismissedHomeworkKeys(lists.dismissedHomeworkKeys))
  trySave(() => saveInjuryLogs(lists.injuryLogs as InjuryEntry[]))
  trySave(() => savePainJournal(lists.painJournals as PainJournalEntry[]))
  trySave(() => saveCoachExercises(lists.coachExercises as CoachExercise[]))
  trySave(() => saveAllHomework(lists.homework as HomeworkItem[]))
  trySave(() => {
    localStorage.setItem(
      'shape-lab.homeworkLogs.v1',
      JSON.stringify(lists.homeworkLogs.slice(0, 1000)),
    )
  })
  trySave(() => saveAllTaskProgress(lists.taskProgress as Record<string, AthleteTaskProgress>))
  for (const p of Object.values(lists.flowProgress)) {
    if (p && typeof p === 'object' && 'athleteId' in (p as object)) {
      trySave(() => saveFlowProgress(p as FlowProgress))
    }
  }
  if (lists.attempts.length > 0) {
    trySave(() =>
      saveAttempts(
        (lists.attempts as AttemptRecord[])
          .filter((a) => a && typeof a.id === 'string')
          .sort((a, b) => (b.savedAt || '').localeCompare(a.savedAt || '')),
      ),
    )
  }
  const mergedLibs: CompareLibraries = { ...loadCompareLibraries() }
  for (const [id, cols] of Object.entries(lists.compareLibraries)) {
    if (!id || !Array.isArray(cols)) continue
    mergedLibs[id] = cols as RefCollection[]
  }
  trySave(() => saveCompareLibraries(mergedLibs))
  return athletes
}

/** True when this browser already has gym profiles besides the Ryan stub. */
export function localHasGymRoster(): boolean {
  return loadAthletes().some((a) => !isRyanAthlete(a))
}

export function applyRosterSnapshot(data: RosterBackup): {
  athletes: Athlete[]
  activeAthleteId: string | null
} {
  const remote = rosterListsFromUnknown(data)
  // Always union with the gym file. A phone that already has 3 names used to
  // treat that as "we have a roster" and keep hiding everyone else.
  const merged = mergeRosterLists(listsFromLocal(), remote)
  merged.athletes = restoreMissingAthletes(merged)
  const athletes = persistLists(merged)
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('shape-lab-roster-applied'))
  }
  const active =
    merged.activeAthleteId && athletes.some((a) => a.id === merged.activeAthleteId)
      ? merged.activeAthleteId
      : loadActiveAthleteId()
  if (active && athletes.some((a) => a.id === active)) saveActiveAthleteId(active)
  return { athletes, activeAthleteId: active }
}

function gymGetInit(timeoutMs = 18_000): RequestInit {
  const init: RequestInit = {
    cache: 'no-store',
    credentials: 'same-origin',
    headers: { Accept: 'application/json' },
  }
  if (typeof AbortSignal !== 'undefined' && typeof AbortSignal.timeout === 'function') {
    init.signal = AbortSignal.timeout(timeoutMs)
  }
  return init
}

export async function pullServerRoster(): Promise<RosterBackup | null> {
  for (let attempt = 0; attempt < 6; attempt += 1) {
    try {
      const res = await fetch('/api/roster', gymGetInit())
      if (!res.ok) {
        await new Promise((resolve) => setTimeout(resolve, 350 * (attempt + 1)))
        continue
      }
      const data = (await res.json()) as RosterBackup
      if (!data || data.kind !== 'shape-lab-roster' || !Array.isArray(data.athletes)) return null
      if (data.athletes.length === 0) {
        await new Promise((resolve) => setTimeout(resolve, 350 * (attempt + 1)))
        continue
      }
      lastServerAthleteCount = Math.max(lastServerAthleteCount, data.athletes.length)
      return data
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 350 * (attempt + 1)))
    }
  }
  return null
}

function photosFromSnapshot(athletes: Athlete[]): Record<string, string> {
  const photos: Record<string, string> = {}
  for (const a of athletes) {
    if (a.photoDataUrl && (a.photoDataUrl.startsWith('data:') || isPhotoUrl(a.photoDataUrl))) {
      photos[a.id] = a.photoDataUrl
    }
  }
  return photos
}

function attachPhotos(athletes: Athlete[], photos: Record<string, string>): Athlete[] {
  if (Object.keys(photos).length === 0) return athletes
  return athletes.map((a) => {
    const incoming = photos[a.id]
    if (!incoming) return a
    if (!a.photoDataUrl) return { ...a, photoDataUrl: incoming }
    if (isPhotoUrl(incoming) && a.photoDataUrl.startsWith('data:')) {
      return { ...a, photoDataUrl: incoming }
    }
    if (incoming.length > a.photoDataUrl.length) return { ...a, photoDataUrl: incoming }
    return a
  })
}

function photoUrlFromRow(id: string, raw: unknown, fallbackAt = ''): string | null {
  if (typeof raw === 'string') {
    if (isPhotoUrl(raw)) return raw
    return null
  }
  if (raw && typeof raw === 'object' && 'url' in raw) {
    const url = (raw as { url?: unknown }).url
    if (typeof url === 'string' && isPhotoUrl(url)) return url
  }
  if (id) return `/api/roster-photo-file?id=${encodeURIComponent(id)}${fallbackAt ? `&v=${encodeURIComponent(fallbackAt)}` : ''}`
  return null
}

/** Index of picture URLs — never downloads the image bytes into JavaScript. */
export async function pullServerRosterPhotos(): Promise<Record<string, string>> {
  const photos: Record<string, string> = {}
  try {
    const res = await fetch('/api/roster-photos', gymGetInit(12_000))
    if (!res.ok) return {}
    const data = (await res.json()) as {
      kind?: string
      exportedAt?: string
      photos?: Record<string, unknown>
      ids?: string[]
    }
    const at = typeof data.exportedAt === 'string' ? data.exportedAt : ''
    if (data?.photos) {
      for (const [id, raw] of Object.entries(data.photos)) {
        const url = photoUrlFromRow(id, raw, at)
        if (id && url) photos[id] = url
      }
    }
    for (const id of Array.isArray(data.ids) ? data.ids : []) {
      if (typeof id === 'string' && id && !photos[id]) {
        photos[id] = `/api/roster-photo-file?id=${encodeURIComponent(id)}${at ? `&v=${encodeURIComponent(at)}` : ''}`
      }
    }
    return photos
  } catch {
    return photos
  }
}

async function pushOnePhoto(id: string, photo: string): Promise<string | null> {
  if (isPhotoUrl(photo)) {
    try {
      await fetch(`/api/roster-photos?id=${encodeURIComponent(id)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store',
        credentials: 'same-origin',
        body: JSON.stringify({
          kind: 'shape-lab-roster-photos',
          version: 2,
          exportedAt: new Date().toISOString(),
          photos: { [id]: photo },
        }),
      })
    } catch {
      /* index already has this URL on another device */
    }
    return photo
  }
  if (!photo.startsWith('data:')) return null
  const blob = await compressProfilePhoto(photo)
  if (!blob) return null
  const uploaded = await uploadGymMedia(photoBlobPath(id), blob, 'image/jpeg')
  if ('url' in uploaded) {
    try {
      await fetch(`/api/roster-photos?id=${encodeURIComponent(id)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store',
        credentials: 'same-origin',
        body: JSON.stringify({
          kind: 'shape-lab-roster-photos',
          version: 2,
          exportedAt: new Date().toISOString(),
          photos: { [id]: uploaded.url },
        }),
      })
    } catch {
      /* URL is already on Blob; index write can retry next push */
    }
    return uploaded.url
  }
  try {
    const res = await fetch(`/api/roster-photos?id=${encodeURIComponent(id)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'image/jpeg' },
      cache: 'no-store',
      credentials: 'same-origin',
      body: blob,
    })
    if (!res.ok) return null
    const row = (await res.json()) as { url?: string }
    return typeof row.url === 'string' ? row.url : `/api/roster-photo-file?id=${encodeURIComponent(id)}`
  } catch {
    return null
  }
}

export async function pushServerRoster(snapshot?: RosterBackup): Promise<boolean> {
  const body = snapshot ?? localRosterSnapshot()
  if (!shouldPushRoster(body.athletes.length)) return false
  const photos = photosFromSnapshot(body.athletes)
  const slim: RosterBackup = {
    ...body,
    athletes: body.athletes.map(({ photoDataUrl: _photo, ...rest }) => rest),
  }
  for (let attempt = 0; attempt < 4; attempt += 1) {
    try {
      const res = await fetch('/api/roster', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store',
        credentials: 'same-origin',
        body: JSON.stringify(slim),
      })
      if (!res.ok) {
        await new Promise((resolve) => setTimeout(resolve, 400 * (attempt + 1)))
        continue
      }
      lastServerAthleteCount = Math.max(lastServerAthleteCount, slim.athletes.length)
      if (Object.keys(photos).length > 0) {
        const uploaded = await Promise.all(
          Object.entries(photos).map(async ([id, photo]) => {
            const url = await pushOnePhoto(id, photo)
            return [id, url] as const
          }),
        )
        const nextUrls: Record<string, string> = {}
        for (const [id, url] of uploaded) {
          if (url) nextUrls[id] = url
        }
        if (Object.keys(nextUrls).length > 0) {
          saveAthletes(attachPhotos(loadAthletes(), nextUrls))
        }
      }
      return true
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 400 * (attempt + 1)))
    }
  }
  return false
}

export type RosterSyncResult = {
  athletes: Athlete[]
  activeAthleteId: string | null
  fromServer: boolean
  error: string | null
}

export function attachPhotosToLocal(photos: Record<string, string>): Athlete[] {
  const athletes = attachPhotos(ensureRyanInAthletes(loadAthletes()), photos)
  saveAthletes(athletes)
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('shape-lab-roster-applied'))
  }
  return athletes
}

export async function syncRosterWithServer(): Promise<RosterSyncResult> {
  const server = await pullServerRoster()
  if (!server) {
    // GET failed. Do not PUT — that is how a Ryan-only tab wiped the gym.
    return {
      athletes: ensureRyanInAthletes(loadAthletes()),
      activeAthleteId: loadActiveAthleteId(),
      fromServer: false,
      error: 'Could not load the gym file from this URL.',
    }
  }
  const photos = await pullServerRosterPhotos()
  const withPics = {
    ...server,
    athletes: attachPhotos(server.athletes, photos),
  }
  const applied = applyRosterSnapshot(withPics)
  enableServerRosterPush()
  lastServerAthleteCount = Math.max(
    lastServerAthleteCount,
    applied.athletes.length,
    server.athletes.length,
  )
  const local = localRosterSnapshot()
  const serverIds = new Set((server.athletes ?? []).map((a) => a.id))
  const hasUnsaved =
    local.athletes.length > (server.athletes?.length ?? 0) ||
    local.athletes.some((a) => !serverIds.has(a.id))
  if (hasUnsaved) {
    await pushServerRoster(local)
  }
  return { ...applied, fromServer: true, error: null }
}
