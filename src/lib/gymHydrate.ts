/**
 * Pull every gym store from this origin before the UI treats the roster as ready.
 * A new phone has empty localStorage — without this it looks like only Ryan exists.
 */

import { hydrateChalkboards } from './chalkboard'
import { hydrateCoachClasses } from './coachClasses'
import { hydrateCoachContent } from './coachContentStore'
import { listCollages } from './collages'
import { listFeedPosts } from './feedPosts'
import { LASTING_GYM_URL, isLastingGymOrigin } from './gymLink'
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
import { loadSocial } from './social'
import { loadStories } from './stories'
import { hydrateTrainingEvents } from './trainingEvents'

export type PersistInfo = {
  mode: 'blob' | 'disk' | 'tmp'
  lasting: boolean
}

export type GymHydrateResult = RosterSyncResult & {
  persist: PersistInfo | null
  lasting: boolean
  wrongOrigin: boolean
  gymUrl: string
}

async function pullPersist(): Promise<PersistInfo | null> {
  try {
    const res = await fetch('/api/persist')
    if (!res.ok) return null
    const data = (await res.json()) as PersistInfo
    if (data?.mode !== 'blob' && data?.mode !== 'disk' && data?.mode !== 'tmp') return null
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
  const [persist, roster] = await Promise.all([pullPersist(), syncRosterWithServer()])
  prefetchGymPanels()
  return {
    ...roster,
    persist,
    lasting: persist?.lasting ?? roster.fromServer,
    wrongOrigin: !isLastingGymOrigin(),
    gymUrl: LASTING_GYM_URL,
  }
}

export { localHasGymRoster }
