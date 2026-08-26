/**
 * Download a public Instagram reel into IndexedDB so Compare can replay it
 * without hitting Instagram again (CDN URLs expire; blobs do not).
 */

import { getBlob, hasBlob, putBlob } from './clipStore'

export function isQuotaError(err: unknown): boolean {
  return (
    err instanceof DOMException &&
    (err.name === 'QuotaExceededError' || err.code === 22)
  )
}

export async function fetchInstagramVideoBlob(igUrl: string): Promise<Blob> {
  const res = await fetch(`/api/ig-resolve?url=${encodeURIComponent(igUrl)}`)
  const data = (await res.json()) as { videoUrl?: string; error?: string }
  if (!res.ok || !data.videoUrl) {
    throw new Error(
      data.error ??
        'Could not load that reel here. Private and some region-blocked clips will not play.',
    )
  }
  const videoRes = await fetch(data.videoUrl)
  if (!videoRes.ok) {
    throw new Error('Could not download the Instagram video.')
  }
  return videoRes.blob()
}

/** Resolve + download + store. No-ops if this item is already cached. */
export async function saveInstagramInApp(
  itemId: string,
  igUrl: string,
): Promise<'cached' | 'saved'> {
  if (await hasBlob(itemId)) return 'cached'
  const blob = await fetchInstagramVideoBlob(igUrl)
  await putBlob(itemId, blob)
  return 'saved'
}

export async function loadCachedInstagramBlob(itemId: string): Promise<Blob | null> {
  return getBlob(itemId)
}
