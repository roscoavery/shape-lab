/**
 * Full-screen shape study: swipe carousel, tap-through stories, or a slideshow.
 * Description sits under the still and can hide so the picture stays clean.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import type { ReferencePhoto, ShapeDef } from '../../types'
import { useShapeCopy } from '../ShapeCopyContext'
import { CoachStillGallery } from '../ReferenceStill'
import { ShareReference } from '../share/ShareReference'
import { shapeStillDraft } from '../../lib/shareReference'

type Mode = 'carousel' | 'story' | 'slideshow'

type Props = {
  shapes: ShapeDef[]
  startId?: string
  photos: ReferencePhoto[]
  onClose: () => void
}

const SLIDE_MS = 4500

export function ShapeExplorer({ shapes, startId, photos, onClose }: Props) {
  const { copyFor } = useShapeCopy()
  const start = Math.max(
    0,
    startId ? shapes.findIndex((s) => s.id === startId) : 0,
  )
  const [index, setIndex] = useState(start >= 0 ? start : 0)
  const [mode, setMode] = useState<Mode>('carousel')
  const [showCopy, setShowCopy] = useState(true)
  const [paused, setPaused] = useState(false)
  const scrollerRef = useRef<HTMLDivElement | null>(null)
  const ignoreScroll = useRef(false)

  const go = useCallback(
    (next: number) => {
      if (shapes.length === 0) return
      const i = ((next % shapes.length) + shapes.length) % shapes.length
      setIndex(i)
      if (mode === 'carousel') {
        ignoreScroll.current = true
        const card = scrollerRef.current?.querySelector<HTMLElement>(`[data-shape-slide="${i}"]`)
        card?.scrollIntoView({ inline: 'start', behavior: 'smooth' })
        window.setTimeout(() => {
          ignoreScroll.current = false
        }, 420)
      }
    },
    [mode, shapes.length],
  )

  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowRight') go(index + 1)
      if (e.key === 'ArrowLeft') go(index - 1)
      if (e.key === ' ') {
        e.preventDefault()
        setPaused((p) => !p)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [go, index, onClose])

  useEffect(() => {
    if (mode !== 'carousel') return
    const root = scrollerRef.current
    if (!root) return
    const startCard = root.querySelector<HTMLElement>(`[data-shape-slide="${start}"]`)
    startCard?.scrollIntoView({ inline: 'start' })
  }, [mode, start])

  useEffect(() => {
    if (mode !== 'carousel') return
    const root = scrollerRef.current
    if (!root) return
    const cards = [...root.querySelectorAll<HTMLElement>('[data-shape-slide]')]
    const io = new IntersectionObserver(
      (entries) => {
        if (ignoreScroll.current) return
        const top = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0]
        if (!top) return
        const i = Number((top.target as HTMLElement).dataset.shapeSlide)
        if (Number.isFinite(i)) setIndex(i)
      },
      { root, threshold: 0.6 },
    )
    for (const card of cards) io.observe(card)
    return () => io.disconnect()
  }, [mode, shapes.length])

  useEffect(() => {
    if ((mode !== 'slideshow' && mode !== 'story') || paused || shapes.length < 2) return
    const id = window.setTimeout(() => go(index + 1), SLIDE_MS)
    return () => window.clearTimeout(id)
  }, [go, index, mode, paused, shapes.length])

  const shape = shapes[index]
  const athlete = shape ? copyFor(shape.id).athlete : ''

  const chrome = (
    <header className="pointer-events-none absolute inset-x-0 top-0 z-30 flex flex-col gap-2 px-3 pt-[max(0.6rem,env(safe-area-inset-top))]">
      {mode === 'story' && shapes.length > 1 && (
        <div className="flex gap-1">
          {shapes.map((s, i) => (
            <span
              key={s.id}
              className="h-0.5 flex-1 overflow-hidden rounded-full bg-white/25"
            >
              <span
                className="block h-full origin-left bg-white"
                style={{
                  width: i < index ? '100%' : i === index ? '100%' : '0%',
                  transform: i === index ? undefined : undefined,
                  animation:
                    i === index ? `storybar ${SLIDE_MS}ms linear forwards` : undefined,
                  animationPlayState: i === index && paused ? 'paused' : undefined,
                }}
              />
            </span>
          ))}
        </div>
      )}
      <div className="flex items-start justify-between gap-2">
        <button
          type="button"
          onClick={onClose}
          className="pointer-events-auto rounded-full bg-[#e03131] px-3.5 py-1.5 text-sm font-semibold text-white"
        >
          Done
        </button>
        <div className="pointer-events-auto flex flex-wrap justify-end gap-1">
          {(
            [
              ['carousel', 'Swipe'],
              ['story', 'Tap through'],
              ['slideshow', 'Slideshow'],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => {
                setMode(id)
                setPaused(false)
              }}
              className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                mode === id ? 'bg-white text-black' : 'bg-white/15 text-white'
              }`}
            >
              {label}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setShowCopy((v) => !v)}
            className="rounded-full bg-white/15 px-2.5 py-1 text-[11px] font-semibold text-white"
          >
            {showCopy ? 'Hide notes' : 'Show notes'}
          </button>
        </div>
      </div>
    </header>
  )

  const still = (s: ShapeDef) => (
    <div className="flex h-full min-h-0 w-full items-center justify-center bg-black px-2">
      <CoachStillGallery
        shapeId={s.id}
        photos={photos}
        alt={s.name}
        emptyLabel={`No still for ${s.name} yet`}
        imgClass="max-h-[78dvh] w-full object-contain"
      />
    </div>
  )

  const notes = shape && showCopy && (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 bg-gradient-to-t from-black via-black/80 to-transparent px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-16">
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/55">
        {index + 1} / {shapes.length}
      </p>
      <h3 className="text-xl font-semibold text-white">{shape.name}</h3>
      {athlete ? (
        <p className="mt-1 max-h-[22dvh] overflow-y-auto text-sm leading-relaxed text-white/85">
          {athlete}
        </p>
      ) : (
        <p className="mt-1 text-sm text-white/55">{shape.description}</p>
      )}
      <div className="pointer-events-auto mt-3">
        <ShareReference
          variant="reel"
          draft={shapeStillDraft(shape.id, photos, shape.name)}
        />
      </div>
    </div>
  )

  const body = (
    <div className="fixed inset-0 z-[380] bg-black text-white">
      <style>{`@keyframes storybar { from { transform: scaleX(0); } to { transform: scaleX(1); } }`}</style>
      {chrome}
      {mode === 'carousel' ? (
        <div
          ref={scrollerRef}
          className="flex h-full snap-x snap-mandatory overflow-x-auto overscroll-contain"
          style={{ WebkitOverflowScrolling: 'touch', touchAction: 'pan-x' }}
        >
          {shapes.map((s, i) => (
            <section
              key={s.id}
              data-shape-slide={i}
              className="relative h-full w-screen shrink-0 snap-start"
            >
              {still(s)}
            </section>
          ))}
        </div>
      ) : (
        <div className="relative h-full w-full">
          {shape ? still(shape) : null}
          {mode === 'story' && (
            <div className="absolute inset-0 z-10 flex">
              <button
                type="button"
                aria-label="Previous shape"
                className="h-full w-1/3"
                onClick={() => go(index - 1)}
              />
              <button
                type="button"
                aria-label={paused ? 'Play' : 'Pause'}
                className="h-full w-1/3"
                onClick={() => setPaused((p) => !p)}
              />
              <button
                type="button"
                aria-label="Next shape"
                className="h-full w-1/3"
                onClick={() => go(index + 1)}
              />
            </div>
          )}
        </div>
      )}
      {notes}
      {mode === 'slideshow' && (
        <button
          type="button"
          onClick={() => setPaused((p) => !p)}
          className="absolute bottom-[max(5.5rem,env(safe-area-inset-bottom))] right-3 z-30 rounded-full bg-white/20 px-3 py-1.5 text-xs font-semibold"
        >
          {paused ? 'Play' : 'Pause'}
        </button>
      )}
    </div>
  )

  return createPortal(body, document.body)
}
