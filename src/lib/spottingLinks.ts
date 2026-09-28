/**
 * Manually link a reference-library clip to spotting cards.
 *
 * Ryan's flow: open a video in the reference library → share → "Link to
 * spotting card" → pick spotted skills and/or spotting methods. This writes
 * the same `spotting` / `spot-skill:<id>` / `spotting-method:<id>` keywords
 * the SpottingPanel reads, so a manual link and a typed tag are the same
 * thing — no duplicates possible.
 */

import {
  getCollections,
  putCollection,
  isSameReferenceUrl,
  mergeKeywords,
  type RefCollection,
} from './clipStore'
import { isGymCollection } from './coachLibrary'
import { persistLibraryMeta, pushServerLibrary } from './libraryBackup'
import { dispatchLibraryChanged } from './libraryEvents'

export type SpottingLinkTarget =
  | { kind: 'skill'; id: string }
  | { kind: 'method'; id: string }

export function spottingTagsFor(targets: SpottingLinkTarget[]): string[] {
  const tags = ['spotting']
  for (const t of targets) {
    tags.push(t.kind === 'skill' ? `spot-skill:${t.id}` : `spotting-method:${t.id}`)
  }
  return tags
}

/**
 * Add spotting tags to the library clip matching `clipId` (falling back to
 * URL match). Returns the names of the cards it was linked to, or null when
 * the clip could not be found.
 */
export async function linkClipToSpottingCards(
  clipId: string,
  clipUrl: string,
  targets: SpottingLinkTarget[],
): Promise<boolean> {
  if (targets.length === 0) return false
  const tags = spottingTagsFor(targets)
  const cols = await getCollections()
  let matched = false
  let gymDirty = false
  for (const col of cols) {
    let dirty = false
    const items = col.items.map((item) => {
      const same =
        (clipId && item.id === clipId) ||
        (clipUrl && item.url && isSameReferenceUrl(item.url, clipUrl))
      if (!same) return item
      const next = mergeKeywords(item.keywords, tags)
      if (next.length === (item.keywords ?? []).length) return item
      dirty = true
      matched = true
      return { ...item, keywords: next }
    })
    if (!dirty) continue
    const next: RefCollection = { ...col, items }
    await putCollection(next)
    if (isGymCollection(col)) gymDirty = true
  }
  if (!matched) return false
  if (gymDirty) {
    const gym = (await getCollections()).filter(isGymCollection)
    persistLibraryMeta(gym)
    await pushServerLibrary(gym)
  } else {
    dispatchLibraryChanged()
  }
  return true
}
