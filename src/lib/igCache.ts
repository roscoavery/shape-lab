/**
 * Download a public Instagram / TikTok / Facebook video into IndexedDB so
 * Compare can replay it without hitting the original site again (CDN URLs
 * expire; blobs do not).
 */

import { getBlob, hasBlob, putBlob } from './clipStore'

export type IgSlide = {
  url: string
  kind: 'video' | 'image'
}

export function isQuotaError(err: unknown): boolean {
  return (
    err instanceof DOMException &&
    (err.name === 'QuotaExceededError' || err.code === 22)
  )
}

export function slideCacheId(itemId: string, index: number): string {
  return index <= 0 ? itemId : `${itemId}::s${index}`
}

export async function fetchInstagramManifest(
  pageUrl: string,
): Promise<{ slides: IgSlide[]; postedBy?: string }> {
  const res = await fetch(`/api/ig-resolve?url=${encodeURIComponent(pageUrl)}`)
  const data = (await res.json()) as {
    videoUrl?: string
    slides?: IgSlide[]
    error?: string
    postedBy?: string
  }
  if (!res.ok) {
    throw new Error(
      data.error ??
        'Could not load that video here. Private and some region-blocked clips will not play.',
    )
  }
  const slides =
    Array.isArray(data.slides) && data.slides.length > 0
      ? data.slides.filter((s) => s && typeof s.url === 'string')
      : data.videoUrl
        ? [{ url: data.videoUrl, kind: 'video' as const }]
        : []
  if (slides.length === 0) {
    throw new Error(
      data.error ??
        'Could not load that video here. Private and some region-blocked clips will not play.',
    )
  }
  return { slides, postedBy: data.postedBy }
}

export async function fetchIgMediaBlob(proxyUrl: string): Promise<Blob> {
  const videoRes = await fetch(proxyUrl)
  if (!videoRes.ok) {
    throw new Error('Could not download that video.')
  }
  return videoRes.blob()
}

export async function fetchInstagramVideo(
  pageUrl: string,
): Promise<{ blob: Blob; postedBy?: string }> {
  const manifest = await fetchInstagramManifest(pageUrl)
  const first = manifest.slides.find((s) => s.kind === 'video') ?? manifest.slides[0]!
  return { blob: await fetchIgMediaBlob(first.url), postedBy: manifest.postedBy }
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
