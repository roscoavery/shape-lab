/**
 * Rename a reel URL / add tags from anywhere a clip is being watched.
 */

import {
  getCollections,
  isSameReferenceUrl,
  parseKeywords,
  putCollection,
  type RefCollection,
} from './clipStore'
import { persistLibraryMeta, pushServerLibrary } from './libraryBackup'
import { isGymCollection, pushCoachLibrary } from './coachLibrary'
import { dispatchLibraryChanged } from './libraryEvents'
import type { OrganizeEditor } from './organizeLibrary'
import { canWriteCollection } from './organizeLibrary'

export async function saveClipMeta(
  url: string,
  patch: { name?: string; keywords?: string[] | string },
  opts: OrganizeEditor,
): Promise<{ ok: true; name: string } | { ok: false; reason: string }> {
  const name = (patch.name ?? '').trim()
  const keywords =
    typeof patch.keywords === 'string' ? parseKeywords(patch.keywords) : patch.keywords ?? []
  if (!url) return { ok: false, reason: 'No clip selected.' }
  const all = await getCollections()
  const writable = all.filter((c) => canWriteCollection(c, opts))
  let touched = 0
  let savedName = name
  const nextCols: RefCollection[] = []
  for (const col of writable) {
    let changed = false
    const items = col.items.map((item) => {
      if (!item.url || !isSameReferenceUrl(item.url, url)) return item
      changed = true
      touched += 1
      const nextName = name || item.name
      savedName = nextName
      return {
        ...item,
        name: nextName,
        keywords: keywords.length ? keywords : item.keywords,
      }
    })
    if (changed) nextCols.push({ ...col, items })
  }
  if (touched === 0) {
    return {
      ok: false,
      reason: opts.gymEditor
        ? 'That URL is not in the gym library yet. Add it on Compare, then rename it.'
        : 'You can rename clips you uploaded on your profile. Ryan can rename gym reels.',
    }
  }
  for (const col of nextCols) {
    await putCollection(col)
  }
  const gym = (await getCollections()).filter(isGymCollection)
  if (opts.gymEditor) {
    persistLibraryMeta(gym)
    await pushServerLibrary(gym)
  }
  if (opts.personalEditor && opts.profileId) {
    const mine = (await getCollections()).filter((c) => c.athleteId === opts.profileId)
    await pushCoachLibrary(opts.profileId, mine)
  }
  dispatchLibraryChanged()
  return { ok: true, name: savedName }
}
