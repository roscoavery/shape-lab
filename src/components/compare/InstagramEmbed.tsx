/**
 * Public Instagram / TikTok / Facebook video → looping in-app player.
 * Prefers a blob already saved in IndexedDB. Otherwise resolves a playable
 * mp4 through /api/ig-resolve, stores the bytes, and plays that copy.
 */

import { useEffect, useRef, useState } from 'react'
import {
  postedByFromUrl,
  socialOpenLabel,
  socialPlatform,
  socialProfileUrl,
} from '../../lib/socialUrls'
import { fetchInstagramVideo, isQuotaError, loadCachedInstagramBlob } from '../../lib/igCache'
import { deleteBlob, putBlob } from '../../lib/clipStore'
import { VideoWorkbench } from './VideoWorkbench'

type Props = {
  url: string
  itemId?: string
  onCached?: (itemId: string) => void
  fill?: boolean
  persistUrl?: string
  /** Instagram / TikTok handle of the original poster. */
  postedBy?: string | null
  onPostedBy?: (handle: string) => void
  loopA?: number | null
  loopB?: number | null
  onAbChange?: (a: number | null, b: number | null) => void
  compact?: boolean
  quiet?: boolean
  active?: boolean
  bare?: boolean
}

export function InstagramEmbed({
  url,
  itemId,
  onCached,
  fill = false,
  persistUrl,
  postedBy,
  onPostedBy,
  loopA,
  loopB,
  onAbChange,
  compact = false,
  quiet = false,
  active,
  bare = false,
}: Props) {
  const platform = socialPlatform(url)
  const onCachedRef = useRef(onCached)
  onCachedRef.current = onCached
  const [src, setSrc] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [fromCache, setFromCache] = useState(false)
  const [saved, setSaved] = useState(false)
  const [quotaWarn, setQuotaWarn] = useState(false)
  const [retry, setRetry] = useState(0)
  const [resolvedBy, setResolvedBy] = useState<string | null>(null)
  const onPostedByRef = useRef(onPostedBy)
  onPostedByRef.current = onPostedBy

  useEffect(() => {
    if (!socialPlatform(url)) {
      setError(
        "Couldn't parse that link. Paste a public Instagram, TikTok, or Facebook video URL.",
      )
      setLoading(false)
      setSrc(null)
      return
    }

    let cancelled = false
    let objectUrl: string | null = null
    setLoading(true)
    setError(null)
    setSrc(null)
    setFromCache(false)
    setSaved(false)
    setQuotaWarn(false)
    setResolvedBy(null)

    void (async () => {
      try {
        if (itemId && retry === 0) {
          const cached = await loadCachedInstagramBlob(itemId)
          if (cancelled) return
          if (cached) {
            objectUrl = URL.createObjectURL(cached)
            if (cancelled) {
              URL.revokeObjectURL(objectUrl)
              return
            }
            setSrc(objectUrl)
            setFromCache(true)
            setLoading(false)
            if (!postedBy && !postedByFromUrl(url)) {
              void fetch(`/api/ig-resolve?url=${encodeURIComponent(url)}&meta=1`)
                .then((r) => r.json() as Promise<{ postedBy?: string }>)
                .then((data) => {
                  if (cancelled || !data.postedBy) return
                  setResolvedBy(data.postedBy)
                  onPostedByRef.current?.(data.postedBy)
                })
                .catch(() => {})
            }
            return
          }
        }

        const { blob, postedBy: found } = await fetchInstagramVideo(url)
        if (cancelled) {
          return
        }
        if (found) {
          setResolvedBy(found)
          onPostedByRef.current?.(found)
        }
        if (itemId) {
          try {
            await putBlob(itemId, blob)
            if (!cancelled) {
              setSaved(true)
              onCachedRef.current?.(itemId)
            }
          } catch (err) {
            if (isQuotaError(err)) setQuotaWarn(true)
          }
        }
        objectUrl = URL.createObjectURL(blob)
        if (cancelled) {
          URL.revokeObjectURL(objectUrl)
          return
        }
        setSrc(objectUrl)
        setLoading(false)
      } catch (err) {
        if (cancelled) return
        setError(
          err instanceof Error
            ? err.message
            : 'Could not reach the local video helper. Keep the Shape Lab dev server running (npm run dev).',
        )
        setLoading(false)
      }
    })()

    return () => {
      cancelled = true
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [url, itemId, retry])

  if (!platform) {
    return (
      <p className="rounded-lg border border-[var(--bad)]/40 bg-[#2a1518] px-3 py-2 text-sm text-[var(--bad)]">
        {error}
      </p>
    )
  }

  if (loading) {
    return (
      <div
        className={`flex items-center justify-center text-sm text-[var(--muted)] ${
          fill
            ? 'h-full min-h-0 bg-black'
            : 'h-48 rounded-lg border border-dashed border-[var(--panel-border)]'
        }`}
      >
        Opening video…
      </div>
    )
  }

  if (error || !src) {
    return (
      <div className="flex flex-col gap-2">
        <p className="rounded-lg border border-[var(--bad)]/40 bg-[#2a1518] px-3 py-2 text-sm text-[var(--bad)]">
          {error ?? 'No playable video for that URL.'}
        </p>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => {
              if (itemId) void deleteBlob(itemId)
              setRetry((n) => n + 1)
            }}
            className="text-xs font-semibold text-[var(--accent)] hover:underline"
          >
            Try again
          </button>
          <a
            href={url}
            target="_blank"
            rel="noreferrer"
            className="text-xs text-[var(--accent)] underline"
          >
            {socialOpenLabel(platform)}
          </a>
        </div>
      </div>
    )
  }

  const footer = fromCache
    ? 'Saved in this app — plays without re-fetching the original site.'
    : quotaWarn
      ? 'Playing this copy, but it could not be saved (device storage may be full).'
      : saved
        ? 'Saved in this app. Pause, scrub, and slow-mo work on this copy. Public videos only.'
        : 'Playing in this app, looping. Pause, scrub, and slow-mo work on this copy. Public videos only.'

  return (
    <div className={fill ? 'flex h-full min-h-0 w-full flex-col gap-0' : 'flex flex-col gap-2'}>
      <VideoWorkbench
        src={src}
        allowAbLoop
        autoPlay={active !== false}
        fill={fill}
        persistUrl={persistUrl ?? url}
        credit={postedBy || resolvedBy || postedByFromUrl(url)}
        creditHref={socialProfileUrl(
          postedBy || resolvedBy || postedByFromUrl(url) || '',
          platform,
        )}
        loopA={loopA}
        loopB={loopB}
        onAbChange={onAbChange}
        markup={!compact && !bare}
        compact={compact}
        bare={bare}
        active={active}
      />
      {!fill && !quiet && <p className="text-xs text-[var(--muted)]">{footer}</p>}
    </div>
  )
}
