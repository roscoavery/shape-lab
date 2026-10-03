import { useCallback, useEffect, useRef, useState } from 'react'

export type TourStep = {
  /** DOM id of the element to spotlight. */
  target: string
  title: string
  text: string
  /** When true, tapping the card also lets its own action fire (e.g. navigating to the next screen) instead of being swallowed. */
  tapThrough?: boolean
}

const TOUR_KEY = 'sl-hw-tour-v1'

export function tourSeen(): boolean {
  try {
    return localStorage.getItem(TOUR_KEY) === 'seen'
  } catch {
    return false
  }
}

export function markTourSeen(): void {
  try {
    localStorage.setItem(TOUR_KEY, 'seen')
  } catch {
    /* ignore */
  }
}

/**
 * Step-by-step spotlight tour. Dims the screen around the target element,
 * rings it with the signature glow pulse, and shows a coach-voiced tooltip.
 *
 * User-paced: nothing auto-advances. Tapping the highlighted element (or
 * Next) moves to the next step — the tap is swallowed so the underlying
 * button doesn't fire mid-tour. Targets that haven't rendered yet are
 * waited for (not skipped): the tour holds on a "getting ready" state
 * until the element appears, so slow lists can't cascade-skip steps.
 */
export function GlowTour({
  steps,
  onDone,
  startIdx = 0,
}: {
  steps: TourStep[]
  onDone: () => void
  /** Start mid-tour (e.g. the stopwatch-screen button starts at the watch steps). */
  startIdx?: number
}) {
  const [idx, setIdx] = useState(startIdx)
  const [rect, setRect] = useState<DOMRect | null>(null)
  const [waiting, setWaiting] = useState(true)
  /** Tracks which step we've already scrolled to, so scroll listeners don't re-scroll. */
  const scrolledFor = useRef<string | null>(null)

  const step = steps[idx]

  const measure = useCallback(() => {
    if (!step) return false
    const el = document.getElementById(step.target)
    if (!el) return false
    setRect(el.getBoundingClientRect())
    setWaiting(false)
    // Bring off-screen targets (foundation above the hub, the watch
    // overlay's form) into view — once per step.
    if (scrolledFor.current !== step.target) {
      scrolledFor.current = step.target
      el.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
    return true
  }, [step])

  useEffect(() => {
    setRect(null)
    setWaiting(true)
    if (!step) return
    const onScroll = () => measure()
    window.addEventListener('scroll', onScroll, true)
    window.addEventListener('resize', onScroll)
    if (measure()) return () => {
      window.removeEventListener('scroll', onScroll, true)
      window.removeEventListener('resize', onScroll)
    }
    // The target may render late (async list). Poll for it; only give up
    // and move on after a long grace period — never rapid-skip.
    let tries = 0
    const iv = window.setInterval(() => {
      tries += 1
      if (measure() || tries > 48) {
        window.clearInterval(iv)
        if (tries > 48) {
          // Target never showed: skip this step silently.
          if (idx + 1 >= steps.length) {
            markTourSeen()
            onDone()
          } else {
            setIdx(idx + 1)
          }
        }
      }
    }, 250)
    return () => {
      window.clearInterval(iv)
      window.removeEventListener('scroll', onScroll, true)
      window.removeEventListener('resize', onScroll)
    }
  }, [step, measure, steps.length, idx, onDone])

  const next = useCallback(() => {
    if (idx + 1 >= steps.length) {
      markTourSeen()
      onDone()
    } else {
      setIdx((i) => i + 1)
    }
  }, [idx, steps.length, onDone])

  const back = useCallback(() => setIdx((i) => Math.max(startIdx, i - 1)), [startIdx])

  // The glow ring doubles as the tap target: tapping the highlighted card
  // advances the tour, and the card underneath never sees the tap (so its
  // own button can't fire mid-tour). Rendered as a real element instead of
  // a document-level capture listener — reliable on iOS.
  const advance = useCallback(() => {
    next()
  }, [next])

  // Escape exits.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        markTourSeen()
        onDone()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onDone])

  if (!step) return null

  if (waiting) {
    return (
      <div className="fixed inset-0 z-[400] bg-black/70" role="dialog" aria-label="Guided tour">
        <div className="absolute left-1/2 top-1/3 -translate-x-1/2 rounded-2xl border border-[var(--accent)]/40 bg-[#0b1512] px-5 py-4 text-center shadow-2xl">
          <p className="text-sm font-bold text-[var(--text)]">Getting the tour ready…</p>
          <p className="mt-1 text-xs text-white/50">The tour starts as soon as this page loads.</p>
          <button
            type="button"
            onClick={() => {
              markTourSeen()
              onDone()
            }}
            className="mt-2 px-2 py-1 text-xs font-semibold text-white/50 underline"
          >
            Skip tour
          </button>
        </div>
      </div>
    )
  }

  const pad = 8
  const r = rect
    ? {
        top: Math.max(0, rect.top - pad),
        left: Math.max(0, rect.left - pad),
        bottom: Math.min(window.innerHeight, rect.bottom + pad),
        right: Math.min(window.innerWidth, rect.right + pad),
      }
    : null

  const tooltipBelow = !r || r.bottom + 190 < window.innerHeight

  return (
    <div className="fixed inset-0 z-[400]" role="dialog" aria-label="Guided tour">
      {r ? (
        <>
          {/* Dim everything except the spotlight box */}
          <div
            className="absolute left-0 right-0 top-0 bg-black/70"
            style={{ height: r.top }}
          />
          <div
            className="absolute left-0 right-0 bg-black/70"
            style={{ top: r.bottom, bottom: 0 }}
          />
          <div
            className="absolute bg-black/70"
            style={{ top: r.top, bottom: window.innerHeight - r.bottom, left: 0, width: r.left }}
          />
          <div
            className="absolute bg-black/70"
            style={{
              top: r.top,
              bottom: window.innerHeight - r.bottom,
              left: r.right,
              right: 0,
            }}
          />
          {/* The glow ring — also the tap target that advances the tour */}
          <div
            role="button"
            aria-label="Continue the guided tour"
            onClick={(e) => {
              if (step.tapThrough) {
                // Let the underlying control fire too (e.g. opening fullscreen):
                // click it programmatically since the ring sits above it.
                const el = document.getElementById(step.target)
                const clickable = el?.querySelector('button') ?? (el as HTMLElement | null)
                ;(clickable as HTMLElement | null)?.click()
              } else {
                e.stopPropagation()
              }
              advance()
            }}
            className="absolute cursor-pointer rounded-2xl"
            style={{
              top: r.top,
              left: r.left,
              width: r.right - r.left,
              height: r.bottom - r.top,
              boxShadow:
                '0 0 0 2px var(--accent), 0 0 18px rgba(52,211,153,0.55), 0 0 44px rgba(52,211,153,0.25)',
              animation: 'sl-skill-pulse 2.4s ease-in-out infinite',
            }}
          />
        </>
      ) : (
        <div className="absolute inset-0 bg-black/70" />
      )}

      {/* Tooltip */}
      <div
        className="absolute left-4 right-4 mx-auto max-w-sm rounded-2xl border border-[var(--accent)]/40 bg-[#0b1512] p-4 shadow-2xl"
        style={
          r
            ? tooltipBelow
              ? { top: Math.min(r.bottom + 12, window.innerHeight - 190) }
              : { bottom: window.innerHeight - r.top + 12 }
            : { top: '30%' }
        }
      >
        <p className="text-[10px] font-black uppercase tracking-widest text-[var(--accent)]">
          Step {idx + 1} of {steps.length}
        </p>
        <p className="mt-1 text-base font-black text-[var(--text)]">{step.title}</p>
        <p className="mt-1 text-sm leading-relaxed text-white/70">{step.text}</p>
        <div className="mt-3 flex items-center gap-2">
          {idx > startIdx && (
            <button
              type="button"
              onClick={back}
              className="rounded-xl bg-white/10 px-4 py-2 text-sm font-bold"
            >
              Back
            </button>
          )}
          <button
            type="button"
            onClick={next}
            className="flex-1 rounded-xl bg-[var(--accent)] px-4 py-2 text-sm font-black text-black"
          >
            {idx + 1 >= steps.length ? 'Done' : 'Next'}
          </button>
          <button
            type="button"
            onClick={() => {
              markTourSeen()
              onDone()
            }}
            className="px-2 py-2 text-xs font-semibold text-white/50 underline"
          >
            Skip
          </button>
        </div>
      </div>
    </div>
  )
}
