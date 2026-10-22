import {
  canonicalReferenceUrl,
  isSameReferenceUrl,
  kindFromUrl,
  type RefCollection,
  type RefItem,
} from './clipStore'
import { coerceHttpUrl, defaultSocialName, postedByFromUrl } from './socialUrls'
import { pullServerLibrary, pushServerLibrary } from './libraryBackup'
import { pullCoachLibrary, pushCoachLibrary } from './coachLibrary'
import { noteRestoredLibraryItem } from './libraryRemovals'
import { createId } from './storage'

export type ShareSaveResult = {
  status: 'saved' | 'duplicate' | 'error'
  collectionName?: string
}

function buildSharedItem(url: string): RefItem {
  const kind = kindFromUrl(url)
  const postedBy = postedByFromUrl(url)
  return {
    id: createId('ref'),
    kind,
    name:
      kind === 'url'
        ? (() => {
            try {
              const path = new URL(url).pathname.split('/').filter(Boolean)
              return path[path.length - 1] || url
            } catch {
              return url
            }
          })()
        : defaultSocialName(url),
    url,
    ...(postedBy ? { postedBy } : {}),
    createdAt: new Date().toISOString(),
  }
}

function findIn(collections: RefCollection[], url: string): RefCollection | null {
  return (
    collections.find((c) => c.items.some((i) => i.url && isSameReferenceUrl(i.url, url))) ?? null
  )
}

/**
 * File a shared URL into the reference library the same way the
 * reference pane's Add URL does. Admins file into the gym library
 * (the References collection when there is one, otherwise the first
 * gym collection); coaches file into their own collection. Duplicates
 * are detected across the whole library, by canonical URL.
 */
export async function saveSharedUrlToLibrary(
  rawUrl: string,
  opts: { canEditGym: boolean; profileId: string | null },
): Promise<ShareSaveResult> {
  const url = canonicalReferenceUrl(coerceHttpUrl(rawUrl))
  if (!/^https?:\/\//i.test(url)) return { status: 'error' }

  if (opts.canEditGym) {
    const backup = await pullServerLibrary()
    const collections = backup?.collections ?? []
    const gym = collections.filter((c) => !c.athleteId)
    const dup = findIn(gym, url)
    if (dup) return { status: 'duplicate', collectionName: dup.name }
    let target = gym.find((c) => /reference/i.test(c.name)) ?? gym[0]
    const item = buildSharedItem(url)
    noteRestoredLibraryItem(item.id, url)
    let next: RefCollection[]
    if (target) {
      next = collections.map((c) =>
        c.id === target!.id ? { ...c, items: [item, ...c.items] } : c,
      )
    } else {
      target = {
        id: createId('col'),
        name: 'References',
        items: [item],
        createdAt: new Date().toISOString(),
      }
      next = [...collections, target]
    }
    const ok = await pushServerLibrary(next)
    return ok ? { status: 'saved', collectionName: target.name } : { status: 'error' }
  }

  if (opts.profileId) {
    const profileId = opts.profileId
    const backup = await pullCoachLibrary(profileId)
    const mine = (backup?.collections ?? []).filter((c) => c.athleteId === profileId)
    const dup = findIn(mine, url)
    if (dup) return { status: 'duplicate', collectionName: dup.name }
    const item = buildSharedItem(url)
    noteRestoredLibraryItem(item.id, url)
    let next: RefCollection[]
    const target = mine[0]
    if (target) {
      next = mine.map((c) => (c.id === target.id ? { ...c, items: [item, ...c.items] } : c))
    } else {
      next = [
        {
          id: createId('col'),
          name: 'My references',
          items: [item],
          createdAt: new Date().toISOString(),
          athleteId: profileId,
        },
      ]
    }
    const ok = await pushCoachLibrary(profileId, next)
    return ok
      ? { status: 'saved', collectionName: next[0]?.name ?? 'My references' }
      : { status: 'error' }
  }

  return { status: 'error' }
}
