/**
 * Public shape study library.
 *
 * Rendered standalone at /studylib/<token> with NO sign-in. Fullscreen
 * swipe/tap viewer: one shape per screen, just the picture and the name.
 * No descriptions, no arm positions, no edit paths, no athlete data.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { SHAPES } from '../../config/shapes'
import { shippedFileList } from '../../lib/shippedRefs'

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

export default function PublicLibraryPage({ token }: { token: string }) {
  const [valid, setValid] = useState<boolean | null>(null)
  const [index, setIndex] = useState(0)
  const [stillIdx, setStillIdx] = useState(0)
  const touchX = useRef<number | null>(null)
  const scrollerRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    fetch(`/api/share/library?token=${encodeURIComponent(token)}`)
      .then((r) => setValid(r.ok))
      .catch(() => setValid(false))
  }, [token])

  const shapes = useMemo(
    () =>
      SHAPES.filter(
        (s) => !STUDY_EXCLUDE.has(s.id) && stillUrls(s.id).length > 0,
      ),
    [],
  )

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
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-300/80">
          Shape library
        </p>
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
          const urls = stillUrls(s.id)
          const active = i === index
          const sIdx = active ? stillIdx : 0
          return (
            <div
              key={s.id}
              data-shape-slide={i}
              className="flex h-full w-full shrink-0 snap-start flex-col items-center justify-center px-6"
            >
              <div className="relative flex max-h-[70%] w-full items-center justify-center">
                <img
                  src={urls[sIdx]}
                  alt={s.name}
                  className="max-h-full max-w-full rounded-2xl object-contain"
                  draggable={false}
                />
                {urls.length > 1 && (
                  <div className="absolute bottom-2 flex gap-1.5">
                    {urls.map((_, d) => (
                      <button
                        key={d}
                        type="button"
                        aria-label={`Still ${d + 1}`}
                        onClick={() => active && setStillIdx(d)}
                        className={`h-2 w-2 rounded-full ${
                          d === sIdx ? 'bg-white' : 'bg-white/30'
                        }`}
                      />
                    ))}
                  </div>
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
    </div>
  )
}
