/**
 * Download a public Instagram / TikTok / Facebook video into IndexedDB so
 * Compare can replay it without hitting the original site again (CDN URLs
 * expire; blobs do not).
 *
 * Memory caches sit in front of IndexedDB so a clip that already played
 * (or a neighbor we prefetched) opens on the next swipe the way IG / TikTok
 * do — no 10-second spinner.
 */

import { getBlob, hasBlob, putBlob } from './clipStore'
import { socialPlatform, socialVideoKey } from './socialUrls'

export type IgSlide = {
  url: string
  kind: 'video' | 'image'
}

const manifestMem = new Map<string, { slides: IgSlide[]; postedBy?: string }>()
const blobMem = new Map<string, Blob>()
const inflightManifest = new Map<string, Promise<{ slides: IgSlide[]; postedBy?: string }>>()
const inflightBlob = new Map<string, Promise<Blob>>()

export function isQuotaError(err: unknown): boolean {
  return (
    err instanceof DOMException &&
    (err.name === 'QuotaExceededError' || err.code === 22)
  )
}

export function slideCacheId(itemId: string, index: number): string {
  return index <= 0 ? itemId : `${itemId}::s${index}`
}

/** Cache key scoped to this library item AND the social clip, so a race cannot store the wrong reel under this id. */
export function mediaCacheId(itemId: string, pageUrl: string, index = 0): string {
  const key = socialVideoKey(pageUrl) || pageUrl
  const base = `${itemId}::${key}`
  return index <= 0 ? base : `${base}::s${index}`
}

export function forgetInstagramManifest(pageUrl: string) {
  manifestMem.delete(pageUrl)
  inflightManifest.delete(pageUrl)
}

export function peekCachedInstagramBlob(itemId: string): Blob | null {
  return blobMem.get(itemId) ?? null
}

export function rememberInstagramBlob(itemId: string, blob: Blob) {
  blobMem.set(itemId, blob)
}

export async function fetchInstagramManifest(
  pageUrl: string,
): Promise<{ slides: IgSlide[]; postedBy?: string }> {
  const cached = manifestMem.get(pageUrl)
  if (cached) return cached
  const pending = inflightManifest.get(pageUrl)
  if (pending) return pending

  const work = (async () => {
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
    const result = { slides, postedBy: data.postedBy }
    manifestMem.set(pageUrl, result)
    return result
  })()

  inflightManifest.set(pageUrl, work)
  try {
    return await work
  } finally {
    inflightManifest.delete(pageUrl)
  }
}

export async function fetchIgMediaBlob(proxyUrl: string): Promise<Blob> {
  const mem = blobMem.get(`url:${proxyUrl}`)
  if (mem) return mem
  const pending = inflightBlob.get(proxyUrl)
  if (pending) return pending

  const work = (async () => {
    const videoRes = await fetch(proxyUrl)
    if (!videoRes.ok) {
      blobMem.delete(`url:${proxyUrl}`)
      throw new Error('Could not download that video.')
    }
    const blob = await videoRes.blob()
    if (blob.size < 800) {
      throw new Error('Could not download that video.')
    }
    blobMem.set(`url:${proxyUrl}`, blob)
    return blob
  })()

  inflightBlob.set(proxyUrl, work)
  try {
    return await work
  } finally {
    inflightBlob.delete(proxyUrl)
  }
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
  const scoped = mediaCacheId(itemId, pageUrl)
  if (blobMem.has(scoped) || (await hasBlob(scoped))) return 'cached'
  if (blobMem.has(itemId) || (await hasBlob(itemId))) return 'cached'
  const blob = await fetchInstagramVideoBlob(pageUrl)
  rememberInstagramBlob(scoped, blob)
  rememberInstagramBlob(itemId, blob)
  await putBlob(scoped, blob)
  await putBlob(itemId, blob)
  return 'saved'
}

export async function loadCachedInstagramBlob(itemId: string): Promise<Blob | null> {
  const mem = blobMem.get(itemId)
  if (mem) return mem
  const blob = await getBlob(itemId)
  if (blob) rememberInstagramBlob(itemId, blob)
  return blob
}

/** Every key this clip may have been stored under, newest and oldest. */
export function instagramCacheKeys(itemId: string | undefined, pageUrl: string, index = 0): string[] {
  const keys: string[] = []
  if (itemId) {
    keys.push(mediaCacheId(itemId, pageUrl, index))
    if (index <= 0) keys.push(itemId)
    keys.push(slideCacheId(itemId, index))
  }
  return [...new Set(keys.filter(Boolean))]
}

export function peekAnyCachedInstagramBlob(
  itemId: string | undefined,
  pageUrl: string,
  index = 0,
): Blob | null {
  for (const key of instagramCacheKeys(itemId, pageUrl, index)) {
    const hit = blobMem.get(key)
    if (hit) return hit
  }
  return null
}

export async function loadAnyCachedInstagramBlob(
  itemId: string | undefined,
  pageUrl: string,
  index = 0,
): Promise<Blob | null> {
  const peek = peekAnyCachedInstagramBlob(itemId, pageUrl, index)
  if (peek) return peek
  for (const key of instagramCacheKeys(itemId, pageUrl, index)) {
    const blob = await loadCachedInstagramBlob(key)
    if (blob) return blob
  }
  return null
}

/** Warm the next slide so a swipe does not wait on the network. */
export function prefetchIgSlide(itemId: string, index: number, url?: string) {
  const key = slideCacheId(itemId, index)
  if (blobMem.has(key)) return
  void loadCachedInstagramBlob(key).then((cached) => {
    if (cached || !url) return
    void fetchIgMediaBlob(url)
      .then((blob) => {
        rememberInstagramBlob(key, blob)
        return putBlob(key, blob)
      })
      .catch(() => {})
  })
}

/** Resolve + download the first playable slide so a swipe feels instant. */
export async function prefetchInstagram(pageUrl: string, itemId: string): Promise<void> {
  if (!socialPlatform(pageUrl)) return
  const scoped = mediaCacheId(itemId, pageUrl)
  if (blobMem.has(scoped) || blobMem.has(itemId)) return
  try {
    const cached = (await loadCachedInstagramBlob(scoped)) ?? (await loadCachedInstagramBlob(itemId))
    if (cached) {
      rememberInstagramBlob(scoped, cached)
      return
    }
    const manifest = await fetchInstagramManifest(pageUrl)
    const first = manifest.slides.find((s) => s.kind === 'video') ?? manifest.slides[0]
    if (!first?.url) return
    const blob = await fetchIgMediaBlob(first.url)
    rememberInstagramBlob(scoped, blob)
    rememberInstagramBlob(itemId, blob)
    rememberInstagramBlob(slideCacheId(itemId, 0), blob)
    await putBlob(scoped, blob).catch(() => {})
    await putBlob(itemId, blob).catch(() => {})
    manifest.slides.forEach((slide, i) => {
      if (i === 0) return
      prefetchIgSlide(itemId, i, slide.url)
    })
  } catch {
    /* warmup — the player will show the real error if this clip is opened */
  }
}

export function prefetchNeighborClips(
  clips: { id: string; url: string }[],
  active: number,
  radius = 2,
) {
  const start = Math.max(0, active)
  const end = Math.min(clips.length - 1, active + radius)
  for (let i = start; i <= end; i++) {
    const clip = clips[i]
    if (!clip) continue
    void prefetchInstagram(clip.url, clip.id)
  }
}
