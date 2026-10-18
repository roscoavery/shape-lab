/**
 * Public shape study library.
 *
 * Rendered standalone at /studylib/<token> with NO sign-in. Fullscreen
 * swipe/tap viewer: one shape per screen, just the picture and the name.
 * No descriptions, no arm positions, no edit paths, no athlete data.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { SHAPES } from '../../config/shapes'
import { shippedFileList, stillCropLookupIds } from '../../lib/shippedRefs'
import { SHIPPED_STILL_CROPS, mergeStillCrops } from '../../lib/shippedStillCrops'
import { cropSourcePixels, type StillCropRect } from '../../lib/stillCrop'
import PublicShapeTest from './PublicShapeTest'

/** Shapes kept out of the athlete study view. */
const STUDY_EXCLUDE = new Set([
  'arms_down',
  'arms_forward',
  'arms_vertical',
  'zombie_arms',
  'bridge', // rainbow bridge + long bridge already cover it, and this one has no still
])

function stillUrls(shapeId: string): string[] {
  return shippedFileList(shapeId).map((f) => `/references/${f}`)
}

/** Still ID for crop lookup (matches the in-app convention). */
function stillIdFor(shapeId: string, fileIndex: number): string {
  return `default_${shapeId}_${fileIndex}`
}

/**
 * Image with Ryan's saved crop applied (canvas clip). Falls back to the
 * plain image if there's no crop or the crop fails.
 */
function CroppedImage({
  src,
  stillId,
  crops,
  alt,
  className,
}: {
  src: string
  stillId: string
  crops: Record<string, StillCropRect>
  alt: string
  className?: string
}) {
  const [clipped, setClipped] = useState<string | null>(null)

  const crop = useMemo(() => {
    for (const id of stillCropLookupIds(stillId)) {
      const c = crops[id]
      if (c) return c
    }
    return null
  }, [crops, stillId])

  useEffect(() => {
    if (!crop) {
      setClipped(null)
      return
    }
    let cancelled = false
    const img = new Image()
    img.onload = () => {
      if (cancelled) return
      try {
        const { sx, sy, sw, sh } = cropSourcePixels(crop, img.naturalWidth, img.naturalHeight)
        const canvas = document.createElement('canvas')
        canvas.width = sw
        canvas.height = sh
        const ctx = canvas.getContext('2d')
        if (!ctx) return
        ctx.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh)
        canvas.toBlob(
          (blob) => {
            if (!cancelled && blob) setClipped(URL.createObjectURL(blob))
          },
          'image/jpeg',
          0.92,
        )
      } catch {
        // fall back to the plain image
      }
    }
    img.src = src
    return () => {
      cancelled = true
    }
  }, [src, crop])

  return (
    <img
      src={clipped ?? src}
      alt={alt}
      className={className ?? 'max-h-full max-w-full rounded-2xl object-contain'}
      draggable={false}
    />
  )
}

export default function PublicLibraryPage({
  token,
  onExit,
  hideTestButton,
}: {
  token: string
  onExit?: () => void
  hideTestButton?: boolean
}) {
  const [showTest, setShowTest] = useState(false)

  if (showTest) {
    return <PublicShapeTest token={token} onExit={() => setShowTest(false)} />
  }
  const [valid, setValid] = useState<boolean | null>(null)
  const [crops, setCrops] = useState<Record<string, StillCropRect>>(() => ({
    ...SHIPPED_STILL_CROPS,
  }))
  const [removedStillIds, setRemovedStillIds] = useState<Set<string>>(new Set())
  const [index, setIndex] = useState(0)
  const [stillIdx, setStillIdx] = useState(0)
  const touchX = useRef<number | null>(null)
  const scrollerRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    fetch(`/api/share/library?token=${encodeURIComponent(token)}`)
      .then(async (r) => {
        if (!r.ok) {
          setValid(false)
          return
        }
        const data = await r.json().catch(() => ({}))
        if (data?.crops && typeof data.crops === 'object') {
          setCrops(mergeStillCrops(SHIPPED_STILL_CROPS, data.crops))
        }
        if (Array.isArray(data?.removedStillIds)) {
          setRemovedStillIds(new Set(data.removedStillIds))
        }
        setValid(true)
      })
      .catch(() => setValid(false))
  }, [token])

  // Apply Ryan's deletions: filter out removed stills, keep the rest.
  const shapes = useMemo(() => {
    return SHAPES.filter((s) => {
      if (STUDY_EXCLUDE.has(s.id)) return false
      return true
    }).map((s) => {
      const urls = stillUrls(s.id).filter((_, i) => {
        const stillId = stillIdFor(s.id, i)
        return !removedStillIds.has(stillId)
      })
      return { ...s, urls }
    }).filter((s) => s.urls.length > 0)
  }, [removedStillIds])

  // shapes with deletions applied is defined above

  const go = useCallback(
    (next: number) => {
      if (shapes.length === 0) return
      const i = ((next % shapes.length) + shapes.length) % shapes.length
      setIndex(i)
      setStillIdx(0)
      const card = scrollerRef.current?.querySelector<HTMLElement>(
        `[data-shape-slide="${i}"]`,
      )
      card?.scrollIntoView({ inline: 'start', behavior: 'smooth' })
    },
    [shapes.length],
  )

  // Keep index in sync when the user swipes the scroll-snap track.
  useEffect(() => {
    const el = scrollerRef.current
    if (!el) return
    let raf = 0
    const onScroll = () => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => {
        const w = el.clientWidth || 1
        const i = Math.round(el.scrollLeft / w)
        if (i !== index && i >= 0 && i < shapes.length) {
          setIndex(i)
          setStillIdx(0)
        }
      })
    }
    el.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      el.removeEventListener('scroll', onScroll)
      cancelAnimationFrame(raf)
    }
  }, [index, shapes.length])

  if (valid === false) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-[#0a1014] p-6">
        <p className="text-center text-white/70">This link is invalid or expired.</p>
      </div>
    )
  }
  if (valid === null || shapes.length === 0) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-[#0a1014] p-6">
        <p className="text-center text-white/70">Loading…</p>
      </div>
    )
  }

  const onTouchStart = (e: React.TouchEvent) => {
    touchX.current = e.touches[0]?.clientX ?? null
  }
  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchX.current == null) return
    const dx = (e.changedTouches[0]?.clientX ?? touchX.current) - touchX.current
    touchX.current = null
    if (dx < -40) go(index + 1)
    else if (dx > 40) go(index - 1)
  }

  return (
    <div className="fixed inset-0 flex flex-col bg-[#0a1014]">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        <div className="flex items-center gap-2">
          {onExit && (
            <button
              type="button"
              onClick={onExit}
              className="text-sm text-white/60"
            >
              ‹ Back
            </button>
          )}
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-300/80">
            Shape library
          </p>
        </div>
        <p className="text-xs text-white/50">
          {index + 1} / {shapes.length}
        </p>
      </div>

      {/* Swipe track */}
      <div
        ref={scrollerRef}
        className="flex flex-1 snap-x snap-mandatory overflow-x-auto"
        style={{ scrollbarWidth: 'none' }}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        {shapes.map((s, i) => {
          const urls = s.urls
          const active = i === index
          const sIdx = active ? stillIdx : 0
          return (
            <div
              key={s.id}
              data-shape-slide={i}
              className="flex h-full w-full shrink-0 snap-start flex-col items-center justify-center px-6"
            >
              <div className="relative flex max-h-[70%] w-full items-center justify-center">
                <CroppedImage
                  src={urls[sIdx]}
                  stillId={stillIdFor(s.id, sIdx)}
                  crops={crops}
                  alt={s.name}
                />
                {urls.length > 1 && active && (
                  <>
                    <button
                      type="button"
                      aria-label="Previous picture"
                      onClick={(e) => {
                        e.stopPropagation()
                        setStillIdx((sIdx - 1 + urls.length) % urls.length)
                      }}
                      className="absolute left-1 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/60 text-lg text-white"
                    >
                      ‹
                    </button>
                    <button
                      type="button"
                      aria-label="Next picture"
                      onClick={(e) => {
                        e.stopPropagation()
                        setStillIdx((sIdx + 1) % urls.length)
                      }}
                      className="absolute right-1 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/60 text-lg text-white"
                    >
                      ›
                    </button>
                    <div className="absolute bottom-2 flex items-center gap-1.5 rounded-full bg-black/60 px-2.5 py-1">
                      <span className="text-[11px] font-semibold text-white">
                        {sIdx + 1} / {urls.length}
                      </span>
                      {urls.map((_, d) => (
                        <button
                          key={d}
                          type="button"
                          aria-label={`Picture ${d + 1}`}
                          onClick={(e) => {
                            e.stopPropagation()
                            setStillIdx(d)
                          }}
                          className={`h-2 w-2 rounded-full ${
                            d === sIdx ? 'bg-white' : 'bg-white/30'
                          }`}
                        />
                      ))}
                    </div>
                  </>
                )}
              </div>
              <h1 className="mt-4 text-center text-2xl font-bold text-white">
                {s.name}
              </h1>
            </div>
          )
        })}
      </div>

      {/* Tap zones */}
      <button
        type="button"
        aria-label="Previous shape"
        onClick={() => go(index - 1)}
        className="absolute left-0 top-0 h-full w-1/4"
      />
      <button
        type="button"
        aria-label="Next shape"
        onClick={() => go(index + 1)}
        className="absolute right-0 top-0 h-full w-1/4"
      />

      {/* Bottom nav */}
      <div className="flex items-center justify-center gap-6 px-4 pb-6 pt-2">
        <button
          type="button"
          onClick={() => go(index - 1)}
          className="h-12 w-12 rounded-full border border-white/20 text-xl text-white"
          aria-label="Previous"
        >
          ←
        </button>
        <p className="min-w-32 text-center text-sm text-white/60">
          Swipe or tap to move
        </p>
        <button
          type="button"
          onClick={() => go(index + 1)}
          className="h-12 w-12 rounded-full border border-white/20 text-xl text-white"
          aria-label="Next"
        >
          →
        </button>
      </div>

      {/* Shape test button */}
      {!hideTestButton && (
        <div className="px-6 pb-6">
          <button
            type="button"
            onClick={() => setShowTest(true)}
            className="h-12 w-full rounded-xl bg-sky-500 text-base font-bold text-white"
          >
            Take the shape test
          </button>
        </div>
      )}
    </div>
  )
}
