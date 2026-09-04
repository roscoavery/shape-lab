/**
 * One cheap GET tells every phone whether roster / pics / feed / classes
 * changed. Only the store that moved is pulled — like any social app.
 */

import { hydrateChalkboards } from './chalkboard'
import { hydrateCoachClasses } from './coachClasses'
import { hydrateCoachContent } from './coachContentStore'
import { listFeedPosts } from './feedPosts'
import {
  attachPhotosToLocal,
  pullServerRoster,
  pullServerRosterPhotos,
  applyRosterSnapshot,
  enableServerRosterPush,
} from './rosterSync'
import { ensureRyanInAthletes } from './ryanProfile'
import type { Athlete } from '../types'

export type GymRevisionStores = {
  roster: string
  photos: string
  feed: string
  classes: string
  content: string
  chalkboards: string
}

let last: GymRevisionStores | null = null
let pulling = false

export function rememberGymRevision(stores: GymRevisionStores | null | undefined) {
  if (!stores) return
  last = { ...stores }
}

export function lastGymRevision(): GymRevisionStores | null {
  return last
}

function sameStamp(a: GymRevisionStores, b: GymRevisionStores): boolean {
  return (
    a.roster === b.roster &&
    a.photos === b.photos &&
    a.feed === b.feed &&
    a.classes === b.classes &&
    a.content === b.content &&
    a.chalkboards === b.chalkboards
  )
}

export async function pullGymRevision(): Promise<GymRevisionStores | null> {
  try {
    const res = await fetch('/api/revision', {
      cache: 'no-store',
      credentials: 'same-origin',
      headers: { Accept: 'application/json' },
    })
    if (!res.ok) return null
    const data = (await res.json()) as { stores?: GymRevisionStores }
    if (!data?.stores) return null
    return data.stores
  } catch {
    return null
  }
}

export async function syncGymIfChanged(
  onRoster: (athletes: Athlete[]) => void,
): Promise<boolean> {
  if (pulling) return false
  pulling = true
  try {
    const rev = await pullGymRevision()
    if (!rev) return false
    const prev = last
    if (prev && sameStamp(prev, rev)) return false
    last = rev
    const jobs: Promise<unknown>[] = []
    if (!prev || prev.roster !== rev.roster || prev.photos !== rev.photos) {
      jobs.push(
        (async () => {
          if (!prev || prev.roster !== rev.roster) {
            const server = await pullServerRoster()
            if (server) {
              const applied = applyRosterSnapshot(server)
              enableServerRosterPush()
              onRoster(ensureRyanInAthletes(applied.athletes))
            }
          }
          if (!prev || prev.photos !== rev.photos) {
            const photos = await pullServerRosterPhotos()
            if (Object.keys(photos).length > 0) {
              onRoster(ensureRyanInAthletes(attachPhotosToLocal(photos)))
            }
          }
        })(),
      )
    }
    if (!prev || prev.feed !== rev.feed) jobs.push(listFeedPosts())
    if (!prev || prev.classes !== rev.classes) jobs.push(hydrateCoachClasses())
    if (!prev || prev.content !== rev.content) jobs.push(hydrateCoachContent())
    if (!prev || prev.chalkboards !== rev.chalkboards) jobs.push(hydrateChalkboards())
    await Promise.allSettled(jobs)
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('shape-lab-gym-pulled'))
    }
    return true
  } finally {
    pulling = false
  }
}
