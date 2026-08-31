/**
 * Public Instagram / TikTok / Facebook video → looping in-app player.
 * Prefers a blob already saved in IndexedDB. Otherwise resolves a playable
 * mp4 through /api/ig-resolve, stores the bytes, and plays that copy.
 * Instagram carousels expose every slide so you can swipe between them.
 */

import { useEffect, useRef, useState, type PointerEvent, type ReactNode } from 'react'
import {
  instagramSlideIndex,
  postedByFromUrl,
  socialOpenLabel,
  socialPlatform,
  socialProfileUrl,
  urlWithIgSlide,
} from '../../lib/socialUrls'
import {
  fetchIgMediaBlob,
  fetchInstagramManifest,
  isQuotaError,
  loadCachedInstagramBlob,
  slideCacheId,
  type IgSlide,
} from '../../lib/igCache'
import { deleteBlob, putBlob } from '../../lib/clipStore'
import { VideoWorkbench } from './VideoWorkbench'

/** Keep carousel chevrons out of the left markup stack / right Show HUD. */
const HUD_LEFT_CLEAR = 52
const HUD_RIGHT_CLEAR = 10
const EDGE_BTN = 40

function mediaContainBox(media: HTMLVideoElement | HTMLImageElement, host: HTMLElement) {
  const hr = host.getBoundingClientRect()
  const nw =
    'videoWidth' in media && media.videoWidth
      ? media.videoWidth
      : (media as HTMLImageElement).naturalWidth || 0
  const nh =
    'videoHeight' in media && media.videoHeight
      ? media.videoHeight
      : (media as HTMLImageElement).naturalHeight || 0
  if (!nw || !nh || hr.width < 2 || hr.height < 2) {
    return { left: 0, top: 0, width: hr.width, height: hr.height, hostW: hr.width }
  }
  const scale = Math.min(hr.width / nw, hr.height / nh)
  const width = nw * scale
  const height = nh * scale
  return {
    left: (hr.width - width) / 2,
    top: (hr.height - height) / 2,
    width,
    height,
    hostW: hr.width,
  }
}

function CarouselEdgeNav({
  index,
  count,
  onPrev,
  onNext,
}: {
  index: number
  count: number
  onPrev: () => void
  onNext: () => void
}) {
  const hostRef = useRef<HTMLDivElement | null>(null)
  const [pos, setPos] = useState<{ left: number; right: number; y: number; cx: number; top: number } | null>(
    null,
  )

  useEffect(() => {
    const overlay = hostRef.current
    if (!overlay) return
    const parent = overlay.parentElement
    const frame =
      parent?.querySelector('video, img') ? parent : parent?.parentElement
    if (!frame) return

    const measure = () => {
      const media = frame.querySelector('video, img') as HTMLVideoElement | HTMLImageElement | null
      if (!media) return
      const box = mediaContainBox(media, frame)
      const y = box.top + box.height / 2
      let left = box.left - EDGE_BTN / 2
      if (left < HUD_LEFT_CLEAR) left = HUD_LEFT_CLEAR
      let right = box.hostW - (box.left + box.width) - EDGE_BTN / 2
      if (right < HUD_RIGHT_CLEAR) right = HUD_RIGHT_CLEAR
      setPos({
        left,
        right,
        y,
        cx: box.left + box.width / 2,
        top: box.top + 8,
      })
    }

    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(frame)
    const media = frame.querySelector('video, img')
    media?.addEventListener('loadedmetadata', measure)
    media?.addEventListener('load', measure)
    window.addEventListener('resize', measure)
    return () => {
      ro.disconnect()
      media?.removeEventListener('loadedmetadata', measure)
      media?.removeEventListener('load', measure)
      window.removeEventListener('resize', measure)
    }
  }, [index, count])

  const btnCls =
    'pointer-events-auto absolute flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-white/75 bg-black/20 text-xl leading-none text-white backdrop-blur-[1px]'

  return (
    <div ref={hostRef} className="pointer-events-none absolute inset-0">
      {pos ? (
        <>
          <button
            type="button"
            aria-label="Previous slide"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={onPrev}
            style={{ left: pos.left, top: pos.y }}
            className={btnCls}
          >
            ‹
          </button>
          <button
            type="button"
            aria-label="Next slide"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={onNext}
            style={{ right: pos.right, top: pos.y }}
            className={btnCls}
          >
            ›
          </button>
          <p
            className="pointer-events-none absolute -translate-x-1/2 rounded-full bg-black/55 px-2 py-0.5 text-[11px] font-semibold tabular-nums text-white"
            style={{ left: pos.cx, top: pos.top }}
          >
            {index + 1}/{count}
          </p>
        </>
      ) : null}
    </div>
  )
}

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
  hudCorner?: ReactNode
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
  hudCorner,
}: Props) {
  const platform = socialPlatform(url)
  const onCachedRef = useRef(onCached)
  onCachedRef.current = onCached
  const [slides, setSlides] = useState<IgSlide[]>([])
  const [slide, setSlide] = useState(() => instagramSlideIndex(url))
  const [src, setSrc] = useState<string | null>(null)
  const [kind, setKind] = useState<IgSlide['kind']>('video')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [fromCache, setFromCache] = useState(false)
  const [saved, setSaved] = useState(false)
  const [quotaWarn, setQuotaWarn] = useState(false)
  const [retry, setRetry] = useState(0)
  const [resolvedBy, setResolvedBy] = useState<string | null>(null)
  const onPostedByRef = useRef(onPostedBy)
  onPostedByRef.current = onPostedBy
  const objectUrlRef = useRef<string | null>(null)
  const dragRef = useRef<{ id: number; x: number; y: number } | null>(null)

  const slideCount = slides.length
  const safeSlide = slideCount > 0 ? Math.min(slide, slideCount - 1) : 0

  useEffect(() => {
    setSlide(instagramSlideIndex(url))
  }, [url])

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
    setLoading(true)
    setError(null)
    setSlides([])
    setFromCache(false)
    setSaved(false)
    setQuotaWarn(false)
    setResolvedBy(null)

    const revoke = () => {
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current)
        objectUrlRef.current = null
      }
    }

    const showBlob = (blob: Blob, slideKind: IgSlide['kind'], cached: boolean) => {
      revoke()
      const objectUrl = URL.createObjectURL(blob)
      objectUrlRef.current = objectUrl
      setSrc(objectUrl)
      setKind(slideKind)
      setFromCache(cached)
      setLoading(false)
    }

    void (async () => {
      try {
        const manifest = await fetchInstagramManifest(url)
        if (cancelled) return
        setSlides(manifest.slides)
        setSlide((prev) => Math.min(prev, Math.max(0, manifest.slides.length - 1)))
        if (manifest.postedBy) {
          setResolvedBy(manifest.postedBy)
          onPostedByRef.current?.(manifest.postedBy)
        }
      } catch (err) {
        if (cancelled) return
        if (itemId && retry === 0) {
          const cached = await loadCachedInstagramBlob(itemId)
          if (cached) {
            setSlides([{ url: '', kind: 'video' }])
            showBlob(cached, 'video', true)
            return
          }
        }
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
      revoke()
    }
  }, [url, itemId, retry])

  useEffect(() => {
    if (slides.length === 0) return
    const index = Math.min(Math.max(safeSlide, 0), slides.length - 1)
    const current = slides[index]
    if (!current) return
    let cancelled = false

    const revoke = () => {
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current)
        objectUrlRef.current = null
      }
    }

    void (async () => {
      setLoading(true)
      setError(null)
      try {
        const cacheKey = itemId ? slideCacheId(itemId, index) : null
        if (cacheKey) {
          const cached = await loadCachedInstagramBlob(cacheKey)
          if (cancelled) return
          if (cached) {
            revoke()
            const objectUrl = URL.createObjectURL(cached)
            objectUrlRef.current = objectUrl
            setSrc(objectUrl)
            setKind(current.kind)
            setFromCache(true)
            setLoading(false)
            return
          }
        }
        if (!current.url) {
          setLoading(false)
          return
        }
        const blob = await fetchIgMediaBlob(current.url)
        if (cancelled) return
        if (cacheKey) {
          try {
            await putBlob(cacheKey, blob)
            if (!cancelled && cacheKey === itemId) onCachedRef.current?.(itemId)
          } catch (err) {
            if (isQuotaError(err)) setQuotaWarn(true)
          }
        }
        revoke()
        const objectUrl = URL.createObjectURL(blob)
        objectUrlRef.current = objectUrl
        setSrc(objectUrl)
        setKind(current.kind)
        setFromCache(false)
        setLoading(false)
      } catch (err) {
        if (cancelled) return
        setError(err instanceof Error ? err.message : 'Could not open that slide.')
        setLoading(false)
      }
    })()

    const neighbor = slides[index + 1] ?? slides[index - 1]
    if (neighbor?.url && itemId) {
      const nextKey = slideCacheId(itemId, index + 1 < slides.length ? index + 1 : index - 1)
      void loadCachedInstagramBlob(nextKey).then((cached) => {
        if (cached || !neighbor.url) return
        void fetchIgMediaBlob(neighbor.url)
          .then((blob) => putBlob(nextKey, blob))
          .catch(() => {})
      })
    }

    return () => {
      cancelled = true
    }
  }, [safeSlide, slides, itemId])

  const go = (next: number) => {
    if (slideCount < 2) return
    setSlide((next + slideCount) % slideCount)
  }

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if (slideCount < 2) return
    const el = e.target as HTMLElement
    if (el.closest('button, input, textarea, select, a, [role="slider"]')) return
    dragRef.current = { id: e.pointerId, x: e.clientX, y: e.clientY }
  }

  const onPointerUp = (e: PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current
    dragRef.current = null
    if (!drag || drag.id !== e.pointerId || slideCount < 2) return
    const dx = e.clientX - drag.x
    const dy = e.clientY - drag.y
    if (Math.abs(dx) < 48 || Math.abs(dx) < Math.abs(dy) * 1.15) return
    go(safeSlide + (dx < 0 ? 1 : -1))
  }

  if (!platform) {
    return (
      <p className="rounded-lg border border-[var(--bad)]/40 bg-[#2a1518] px-3 py-2 text-sm text-[var(--bad)]">
        {error}
      </p>
    )
  }

  if (loading && !src) {
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

  if ((error || !src) && !src) {
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

  const credit = postedBy || resolvedBy || postedByFromUrl(url)
  const slidePersist = urlWithIgSlide(persistUrl ?? url, safeSlide)
  const carousel = slideCount > 1

  const carouselChrome = carousel ? (
    <CarouselEdgeNav
      index={safeSlide}
      count={slideCount}
      onPrev={() => go(safeSlide - 1)}
      onNext={() => go(safeSlide + 1)}
    />
  ) : null

  const player =
    kind === 'image' && src ? (
      <div className={fill ? 'relative h-full min-h-0 bg-black' : 'relative'}>
        <img
          src={src}
          alt=""
          className={
            fill
              ? 'h-full w-full object-contain'
              : 'max-h-[420px] w-full rounded-lg object-contain'
          }
        />
        {hudCorner ? (
          <div className="pointer-events-auto absolute right-2 top-2 z-[35] flex flex-col items-center gap-3">
            {hudCorner}
          </div>
        ) : null}
        {carouselChrome}
      </div>
    ) : src ? (
      <VideoWorkbench
        src={src}
        allowAbLoop
        autoPlay={active !== false}
        fill={fill}
        persistUrl={slidePersist}
        credit={credit}
        creditHref={socialProfileUrl(credit || '', platform)}
        loopA={safeSlide === instagramSlideIndex(url) ? loopA : null}
        loopB={safeSlide === instagramSlideIndex(url) ? loopB : null}
        onAbChange={onAbChange}
        markup={!compact && !bare}
        compact={compact}
        bare={bare}
        active={active}
        hudCorner={hudCorner}
        pictureChrome={carouselChrome}
      />
    ) : null

  return (
    <div className={fill ? 'flex h-full min-h-0 w-full flex-col gap-0' : 'flex flex-col gap-2'}>
      <div
        className={fill ? 'relative min-h-0 flex-1' : 'relative'}
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
        onPointerCancel={() => {
          dragRef.current = null
        }}
      >
        {player}
      </div>
      {!fill && !quiet && (
        <p className="text-xs text-[var(--muted)]">
          {carousel ? 'Swipe or use the arrows for the other slides in this post. ' : ''}
          {footer}
        </p>
      )}
    </div>
  )
}
