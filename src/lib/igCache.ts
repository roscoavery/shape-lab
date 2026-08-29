/**
 * Download a public Instagram / TikTok / Facebook video into IndexedDB so
 * Compare can replay it without hitting the original site again (CDN URLs
 * expire; blobs do not).
 */

import { getBlob, hasBlob, putBlob } from './clipStore'

export function isQuotaError(err: unknown): boolean {
  return (
    err instanceof DOMException &&
    (err.name === 'QuotaExceededError' || err.code === 22)
  )
}

export async function fetchInstagramVideo(
  pageUrl: string,
): Promise<{ blob: Blob; postedBy?: string }> {
  const res = await fetch(`/api/ig-resolve?url=${encodeURIComponent(pageUrl)}`)
  const data = (await res.json()) as { videoUrl?: string; error?: string; postedBy?: string }
  if (!res.ok || !data.videoUrl) {
    throw new Error(
      data.error ??
        'Could not load that video here. Private and some region-blocked clips will not play.',
    )
  }
  const videoRes = await fetch(data.videoUrl)
  if (!videoRes.ok) {
    throw new Error('Could not download that video.')
  }
  return { blob: await videoRes.blob(), postedBy: data.postedBy }
}

export async function fetchInstagramVideoBlob(pageUrl: string): Promise<Blob> {
  return (await fetchInstagramVideo(pageUrl)).blob
}

/** Resolve + download + store. No-ops if this item is already cached. */
export async function saveInstagramInApp(
  itemId: string,
  pageUrl: string,
): Promise<'cached' | 'saved'> {
  if (await hasBlob(itemId)) return 'cached'
  const blob = await fetchInstagramVideoBlob(pageUrl)
  await putBlob(itemId, blob)
  return 'saved'
}

export async function loadCachedInstagramBlob(itemId: string): Promise<Blob | null> {
  return getBlob(itemId)
}
