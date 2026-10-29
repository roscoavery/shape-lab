/**
 * Public shape study library.
 *
 * Rendered standalone at /studylib/<token> with NO sign-in. Fullscreen
 * swipe/tap viewer: one shape per screen, just the picture and the name.
 * No descriptions, no arm positions, no edit paths, no athlete data.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { stillCropLookupIds } from '../../lib/shippedRefs'
import { buildPublicLibraryShapes } from '../../lib/publicLibraryShapes'
import { SHIPPED_STILL_CROPS, mergeStillCrops } from '../../lib/shippedStillCrops'
import { cropSourcePixels, type StillCropRect } from '../../lib/stillCrop'
import PublicShapeTest from './PublicShapeTest'

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
  const [valid, setValid] = useState<boolean | null>(null)
  const [crops, setCrops] = useState<Record<string, StillCropRect>>(() => ({
    ...SHIPPED_STILL_CROPS,
  }))
  const [removedStillIds, setRemovedStillIds] = useState<Set<string>>(new Set())
  const [mainStills, setMainStills] = useState<Record<string, string>>({})
  const [coachStills, setCoachStills] = useState<{ shapeId: string; stillId: string; file: string }[]>([])
  const [igStills, setIgStills] = useState<{ shapeId: string; stillId: string; file: string }[]>([])
  const [removedCoachStillIds, setRemovedCoachStillIds] = useState<Set<string>>(new Set())
  const [gymShapes, setGymShapes] = useState<{ id: string; name: string }[]>([])
  const [index, setIndex] = useState(0)
  const [stillIdx, setStillIdx] = useState(0)
  const touchX = useRef<number | null>(null)
  const swiped = useRef(false)
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
        if (data?.mainStills && typeof data.mainStills === 'object') {
          setMainStills(data.mainStills)
        }
        if (Array.isArray(data?.coachStills)) {
          setCoachStills(data.coachStills)
        }
        if (Array.isArray(data?.igStills)) {
          setIgStills(data.igStills)
        }
        if (Array.isArray(data?.removedCoachStillIds)) {
          setRemovedCoachStillIds(new Set(data.removedCoachStillIds))
        }
        if (Array.isArray(data?.gymShapes)) {
          setGymShapes(data.gymShapes)
        }
        setValid(true)
      })
      .catch(() => setValid(false))
  }, [token])

  // Apply Ryan's deletions and main-still ordering.
  // Matches the in-app Shape Library exactly: same shapes, same order, same pictures.
  // Uses learnLibraryShapes() for the exact in-app order, then gym shapes in gymLibrary order.
  // Includes IG stills (Ryan: "allow any ig stills that show inside of any shapes").
  const shapes = useMemo(
    () =>
      buildPublicLibraryShapes({
        removedStillIds,
        removedCoachStillIds,
        mainStills,
        coachStills,
        igStills,
        gymShapes,
      }),
    [removedStillIds, removedCoachStillIds, mainStills, coachStills, igStills, gymShapes],
  )

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
    swiped.current = false
  }
  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchX.current == null) return
    const dx = (e.changedTouches[0]?.clientX ?? touchX.current) - touchX.current
    touchX.current = null
    if (dx < -40) {
      swiped.current = true
      go(index + 1)
    } else if (dx > 40) {
      swiped.current = true
      go(index - 1)
    }
  }

  // Show the shape test instead of the library (after all hooks).
  if (showTest) {
    return <PublicShapeTest token={token} onExit={() => setShowTest(false)} libraryShapes={shapes} crops={crops} />
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
          // Clamp: if the still list shrank (deletions loaded), don't go blank.
          const sIdx = active ? Math.min(stillIdx, Math.max(0, urls.length - 1)) : 0
          const hasMany = urls.length > 1
          return (
            <div
              key={s.id}
              data-shape-slide={i}
              className="flex h-full w-full shrink-0 snap-start flex-col items-center justify-center px-6"
            >
              <div className="relative flex max-h-[70%] w-full items-center justify-center">
                <CroppedImage
                  src={urls[sIdx]}
                  stillId={s.stillIds[sIdx] ?? stillIdFor(s.id, sIdx)}
                  crops={crops}
                  alt={s.name}
                />
                {hasMany && active && (
                  <>
                    {/* Tap zones: left third = previous still, right third = next still.
                        Swipe anywhere = change shape. Touch events stopped so swipe doesn't hijack. */}
                    <button
                      type="button"
                      aria-label="Previous picture"
                      onTouchStart={(e) => e.stopPropagation()}
                      onTouchEnd={(e) => e.stopPropagation()}
                      onClick={(e) => {
                        e.stopPropagation()
                        setStillIdx((sIdx - 1 + urls.length) % urls.length)
                      }}
                      className="absolute left-0 top-0 flex h-full w-1/3 items-center justify-start pl-2"
                    >
                      <span className="flex h-16 w-16 items-center justify-center rounded-full bg-black/70 text-3xl text-white">
                        ‹
                      </span>
                    </button>
                    <button
                      type="button"
                      aria-label="Next picture"
                      onTouchStart={(e) => e.stopPropagation()}
                      onTouchEnd={(e) => e.stopPropagation()}
                      onClick={(e) => {
                        e.stopPropagation()
                        setStillIdx((sIdx + 1) % urls.length)
                      }}
                      className="absolute right-0 top-0 flex h-full w-1/3 items-center justify-end pr-2"
                    >
                      <span className="flex h-16 w-16 items-center justify-center rounded-full bg-black/70 text-3xl text-white">
                        ›
                      </span>
                    </button>
                    <div className="absolute bottom-2 flex items-center gap-1.5 rounded-full bg-black/70 px-3 py-1.5">
                      <span className="text-xs font-semibold text-white">
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
                          className={`h-2.5 w-2.5 rounded-full ${
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

      {/* Bottom nav: swipe-only for shapes per Ryan's rule. */}
      <div className="flex items-center justify-center gap-6 px-4 pb-6 pt-2">
        <p className="min-w-32 text-center text-sm text-white/60">
          Swipe to move between shapes · Tap picture to see more
        </p>
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
