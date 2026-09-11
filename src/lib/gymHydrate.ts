/**
 * Pull every gym store from this origin before the UI treats the roster as ready.
 * A new phone has empty localStorage — without this it looks like only Ryan exists.
 */

import { hydrateChalkboards } from './chalkboard'
import { hydrateCoachClasses } from './coachClasses'
import { hydrateCoachContent } from './coachContentStore'
import { listCollages } from './collages'
import { listFeedPosts } from './feedPosts'
import { gymUrlForHumans, isLastingGymOrigin } from './gymLink'
import { rememberGymRevision, type GymRevisionStores } from './gymLive'
import { hydrateIgStills } from './igStillStore'
import { hydrateLessons } from './lessonStore'
import { pullServerLibrary } from './libraryBackup'
import { loadNotices } from './notify'
import { loadResearch } from './research'
import {
  localHasGymRoster,
  syncRosterWithServer,
  type RosterSyncResult,
} from './rosterSync'
import { ensureRyanInAthletes } from './ryanProfile'
import { loadActiveAthleteId, loadAthletes } from './storage'
import { loadSocial } from './social'
import { loadStories } from './stories'
import { hydrateTrainingEvents } from './trainingEvents'

export type PersistInfo = {
  mode: 'blob' | 'disk' | 'tmp'
  lasting: boolean
  revision?: { stores?: GymRevisionStores }
}

export type GymHydrateResult = RosterSyncResult & {
  persist: PersistInfo | null
  lasting: boolean
  wrongOrigin: boolean
  gymUrl: string
}

async function pullPersist(): Promise<PersistInfo | null> {
  try {
    const init: RequestInit = { cache: 'no-store', credentials: 'same-origin' }
    if (typeof AbortSignal !== 'undefined' && typeof AbortSignal.timeout === 'function') {
      init.signal = AbortSignal.timeout(12_000)
    }
    const res = await fetch('/api/persist', init)
    if (!res.ok) return null
    const data = (await res.json()) as PersistInfo
    if (data?.mode !== 'blob' && data?.mode !== 'disk' && data?.mode !== 'tmp') return null
    if (data.revision?.stores) rememberGymRevision(data.revision.stores)
    return data
  } catch {
    return null
  }
}

/** Warm stores that panels fetch lazily so Feed / stories / research are not empty. */
function prefetchGymPanels(): void {
  void Promise.allSettled([
    hydrateLessons(),
    hydrateCoachClasses(),
    hydrateChalkboards(),
    hydrateCoachContent(),
    hydrateIgStills(),
    listFeedPosts(),
    loadStories(),
    loadSocial(),
    loadResearch(),
    listCollages(),
    loadNotices(),
    pullServerLibrary(),
    hydrateTrainingEvents(),
  ])
}

export async function hydrateGymAtBoot(): Promise<GymHydrateResult> {
  try {
    const [persist, roster] = await Promise.all([pullPersist(), syncRosterWithServer()])
    prefetchGymPanels()
    return {
      ...roster,
      persist,
      lasting: persist?.lasting ?? roster.fromServer,
      wrongOrigin: !isLastingGymOrigin(),
      gymUrl: gymUrlForHumans(),
    }
  } catch {
    return {
      athletes: ensureRyanInAthletes(loadAthletes()),
      activeAthleteId: loadActiveAthleteId(),
      fromServer: false,
      error: 'Could not load the gym file from this URL.',
      persist: null,
      lasting: false,
      wrongOrigin: !isLastingGymOrigin(),
      gymUrl: gymUrlForHumans(),
    }
  }
}

export { localHasGymRoster }
