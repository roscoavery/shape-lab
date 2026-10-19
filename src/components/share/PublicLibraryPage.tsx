/**
 * Public shape study library.
 *
 * Rendered standalone at /studylib/<token> with NO sign-in. Fullscreen
 * swipe/tap viewer: one shape per screen, just the picture and the name.
 * No descriptions, no arm positions, no edit paths, no athlete data.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { learnLibraryShapes } from '../../lib/educationCopy'
import { shippedFileList, stillCropLookupIds } from '../../lib/shippedRefs'
import { SHIPPED_STILL_CROPS, mergeStillCrops } from '../../lib/shippedStillCrops'
import { cropSourcePixels, type StillCropRect } from '../../lib/stillCrop'
import PublicShapeTest from './PublicShapeTest'

/** Shapes kept out of the athlete study view. */
// Arm positions, scaffolding, and unmatched are separate from the shape library.
const STUDY_EXCLUDE = new Set([
  'arms_down',
  'arms_forward',
  'arms_vertical',
  'zombie_arms',
  'bridge', // rainbow bridge + long bridge already cover it, and this one has no still
  // Arm position shapes (from ARM_POSITION_SHAPE_IDS in educationCopy.ts)
  'arms_low_v_back',
  'arms_front_middle',
  'arms_open_shoulders',
  'arms_t',
  'arms_high_v_chest',
  'lunge_arms_low_v',
  'lunge_arms_front',
  'lunge_arms_open',
  'lunge_arms_t',
  'lunge_arms_high_v',
  // Scaffold shapes (from SCAFFOLD_SHAPE_IDS in educationCopy.ts)
  'lunge',
  'tucked_handstand',
  'piked_handstand',
  'l_handstand',
  // Unmatched coach stills (not assigned to a shape)
  'unmatched',
])

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
  const shapes = useMemo(() => {
    // Group coach and IG stills by shape.
    const extraByShape = new Map<string, { shapeId: string; stillId: string; file: string }[]>()
    for (const c of [...coachStills, ...igStills]) {
      const list = extraByShape.get(c.shapeId) ?? []
      list.push(c)
      extraByShape.set(c.shapeId, list)
    }

    const isRemoved = (stillId: string, fileName: string) =>
      removedStillIds.has(stillId) ||
      removedCoachStillIds.has(stillId) ||
      removedCoachStillIds.has(fileName)

    // Build the shape list in in-app order.
    const result: { id: string; name: string; urls: string[]; stillIds: string[] }[] = []

    // 1. Main shapes in learnLibraryShapes() order (exact in-app order).
    // This already excludes arm positions, scaffold, etc.
    const inAppOrder = learnLibraryShapes()
    for (const s of inAppOrder) {
      if (STUDY_EXCLUDE.has(s.id)) continue
      const files = shippedFileList(s.id)
      const pairs = files
        .map((f, i) => ({ stillId: stillIdFor(s.id, i), url: `/references/${f}`, file: f }))
        .filter((p) => !isRemoved(p.stillId, p.file))
      // Add coach-uploaded stills (now served as static files from /references/).
      for (const c of extraByShape.get(s.id) ?? []) {
        if (!removedStillIds.has(c.stillId) && !removedCoachStillIds.has(c.stillId)) {
          pairs.push({
            stillId: c.stillId,
            url: `/references/${c.file}`,
            file: c.file,
          })
        }
      }
      if (pairs.length === 0) continue
      // Main-still first.
      const mainId = mainStills[s.id]
      if (mainId) {
        const idx = pairs.findIndex((p) => p.stillId === mainId)
        if (idx > 0) {
          const [main] = pairs.splice(idx, 1)
          pairs.unshift(main!)
        }
      }
      result.push({ id: s.id, name: s.name, urls: pairs.map((p) => p.url), stillIds: pairs.map((p) => p.stillId) })
    }

    // 2. Gym shapes with stills, in gymLibrary order.
    for (const g of gymShapes) {
      if (STUDY_EXCLUDE.has(g.id)) continue
      const pairs: { stillId: string; url: string; file: string }[] = []
      // Gym shapes have no shipped files, only coach-uploaded (now in /references/).
      for (const c of extraByShape.get(g.id) ?? []) {
        if (!removedStillIds.has(c.stillId) && !removedCoachStillIds.has(c.stillId)) {
          pairs.push({
            stillId: c.stillId,
            url: `/references/${c.file}`,
            file: c.file,
          })
        }
      }
      if (pairs.length === 0) continue
      const mainId = mainStills[g.id]
      if (mainId) {
        const idx = pairs.findIndex((p) => p.stillId === mainId)
        if (idx > 0) {
          const [main] = pairs.splice(idx, 1)
          pairs.unshift(main!)
        }
      }
      result.push({ id: g.id, name: g.name, urls: pairs.map((p) => p.url), stillIds: pairs.map((p) => p.stillId) })
    }

    // Fix order: match Ryan's in-app order for the first shapes.
    // 1. stand clean, 2. ftos, 3. passe, 4. starting lunge, 5. lever,
    // 6. handstand, 7. landing lunge, 8. mountain climber. The rest stays as-is.
    const orderNames = [
      'clean',
      'stand clean',
      'ftos',
      'passe',
      'passé',
      'starting lunge',
      'lever',
      'handstand',
      'landing lunge',
      'mountain climber',
    ]
    const ordered: typeof result = []
    const remaining = [...result]
    for (const want of orderNames) {
      const idx = remaining.findIndex(
        (s) => s.id === want || s.name.toLowerCase() === want,
      )
      if (idx !== -1) {
        ordered.push(remaining[idx]!)
        remaining.splice(idx, 1)
      }
    }
    // Dedupe: 'passe' and 'passé' are the same shape; only the first match was taken.
    const final = [...ordered, ...remaining]

    return final
  }, [removedStillIds, removedCoachStillIds, mainStills, coachStills, igStills, gymShapes, token])

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
    return <PublicShapeTest token={token} onExit={() => setShowTest(false)} libraryShapes={shapes} />
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
