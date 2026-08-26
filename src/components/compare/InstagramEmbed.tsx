/**
 * Public Instagram reel/post → looping in-app player.
 * Resolves a real mp4 through the local /api/ig-resolve helper (not Instagram's
 * embed iframe, which often refuses to play and sends you out to Instagram).
 */

import { useEffect, useState } from 'react'
import { parseInstagramUrl } from '../../lib/clipStore'
import { VideoWorkbench } from './VideoWorkbench'

const resolvedCache = new Map<string, string>()

export function InstagramEmbed({ url }: { url: string }) {
  const parsed = parseInstagramUrl(url)
  const [src, setSrc] = useState<string | null>(() => resolvedCache.get(url) ?? null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(!resolvedCache.has(url))

  useEffect(() => {
    const parsedUrl = parseInstagramUrl(url)
    if (!parsedUrl) {
      setError(
        "Couldn't parse that Instagram link. Expected a post/reel URL like https://www.instagram.com/reel/ABC123/",
      )
      setLoading(false)
      setSrc(null)
      return
    }
    const cached = resolvedCache.get(url)
    if (cached) {
      setSrc(cached)
      setError(null)
      setLoading(false)
      return
    }
    let cancelled = false
    setLoading(true)
    setError(null)
    setSrc(null)
    void (async () => {
      try {
        const res = await fetch(`/api/ig-resolve?url=${encodeURIComponent(url)}`)
        const data = (await res.json()) as { videoUrl?: string; error?: string }
        if (cancelled) return
        if (!res.ok || !data.videoUrl) {
          setError(
            data.error ??
              'Could not load that reel here. Private and some region-blocked clips will not play.',
          )
          setLoading(false)
          return
        }
        resolvedCache.set(url, data.videoUrl)
        setSrc(data.videoUrl)
        setLoading(false)
      } catch {
        if (cancelled) return
        setError(
          'Could not reach the local reel helper. Keep the Shape Lab dev server running (npm run dev).',
        )
        setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [url])

  if (!parsed) {
    return (
      <p className="rounded-lg border border-[var(--bad)]/40 bg-[#2a1518] px-3 py-2 text-sm text-[var(--bad)]">
        {error}
      </p>
    )
  }

  if (loading) {
    return (
      <div className="flex h-48 items-center justify-center rounded-lg border border-dashed border-[var(--panel-border)] text-sm text-[var(--muted)]">
        Fetching reel so it can play and loop here…
      </div>
    )
  }

  if (error || !src) {
    return (
      <div className="flex flex-col gap-2">
        <p className="rounded-lg border border-[var(--bad)]/40 bg-[#2a1518] px-3 py-2 text-sm text-[var(--bad)]">
          {error ?? 'No playable video for that URL.'}
        </p>
        <a
          href={url}
          target="_blank"
          rel="noreferrer"
          className="text-xs text-[var(--accent)] underline"
        >
          Open on Instagram
        </a>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      <VideoWorkbench src={src} allowAbLoop autoPlay />
      <p className="text-xs text-[var(--muted)]">
        Playing in this app, looping. Pause, scrub, and slow-mo work on this copy.
        Public reels only.
      </p>
    </div>
  )
}
