/**
 * Keep a gym-hosted copy of a Compare clip once Instagram actually plays.
 * Production then uses savedUrl instead of resolving Instagram again.
 */

import { getCollections, putCollection, type RefCollection } from './clipStore'
import { libraryClipBlobPath, uploadGymMedia } from './mediaUpload'
import { persistLibraryMeta, pushServerLibrary } from './libraryBackup'
import { dispatchLibraryChanged } from './libraryEvents'
import { isGymCollection } from './coachLibrary'

const MAX_PERSIST_BYTES = 80 * 1024 * 1024
const inflight = new Map<string, Promise<string | null>>()

export function isGymHostedClipUrl(url: string | undefined): boolean {
  if (!url) return false
  try {
    const host = new URL(url).hostname
    return (
      /(^|\.)vercel-storage\.com$/i.test(host) ||
      /(^|\.)blob\.vercel-storage\.com$/i.test(host) ||
      /\/api\/gym-media\b/i.test(url) ||
      /\/data\/library-blobs\//i.test(url)
    )
  } catch {
    return /\/api\/gym-media\b/i.test(url) || url.startsWith('/data/library-blobs/')
  }
}

export async function persistLibraryClipBlob(
  itemId: string,
  blob: Blob,
): Promise<string | null> {
  if (!itemId || blob.size < 800 || blob.size > MAX_PERSIST_BYTES) return null
  const pending = inflight.get(itemId)
  if (pending) return pending
  const work = (async () => {
    const cols = await getCollections()
    const existing = cols.flatMap((c) => c.items).find((i) => i.id === itemId)
    if (existing?.savedUrl && isGymHostedClipUrl(existing.savedUrl)) return existing.savedUrl
    const mime = blob.type.startsWith('video/')
      ? blob.type
      : blob.type.startsWith('image/')
        ? blob.type
        : 'video/mp4'
    const uploaded = await uploadGymMedia(libraryClipBlobPath(itemId, mime), blob, mime)
    if (!('url' in uploaded) || !uploaded.url) return null
    let gymDirty = false
    for (const col of cols) {
      let dirty = false
      const items = col.items.map((item) => {
        if (item.id !== itemId || item.savedUrl === uploaded.url) return item
        dirty = true
        return { ...item, savedUrl: uploaded.url }
      })
      if (!dirty) continue
      const next: RefCollection = { ...col, items }
      await putCollection(next)
      if (isGymCollection(col)) gymDirty = true
    }
    if (gymDirty) {
      const gym = (await getCollections()).filter(isGymCollection)
      persistLibraryMeta(gym)
      await pushServerLibrary(gym)
    } else {
      dispatchLibraryChanged()
    }
    return uploaded.url
  })()
  inflight.set(itemId, work)
  try {
    return await work
  } finally {
    inflight.delete(itemId)
  }
}
