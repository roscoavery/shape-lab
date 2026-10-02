import { useCallback, useEffect, useState } from 'react'

export type TourStep = {
  /** DOM id of the element to spotlight. */
  target: string
  title: string
  text: string
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
 * Tapping the highlighted element advances the tour; Next/Back/Skip also work.
 * Steps whose target isn't on screen are skipped silently.
 */
export function GlowTour({ steps, onDone }: { steps: TourStep[]; onDone: () => void }) {
  const [idx, setIdx] = useState(0)
  const [rect, setRect] = useState<DOMRect | null>(null)

  const step = steps[idx]

  const measure = useCallback(() => {
    if (!step) return
    const el = document.getElementById(step.target)
    setRect(el ? el.getBoundingClientRect() : null)
  }, [step])

  useEffect(() => {
    measure()
    window.addEventListener('scroll', measure, true)
    window.addEventListener('resize', measure)
    // Re-measure shortly after mount — the list may still be rendering.
    const t = window.setTimeout(measure, 400)
    return () => {
      window.removeEventListener('scroll', measure, true)
      window.removeEventListener('resize', measure)
      window.clearTimeout(t)
    }
  }, [measure])

  // Skip steps whose target isn't rendered.
  useEffect(() => {
    if (step && !rect) {
      const t = window.setTimeout(() => {
        const el = document.getElementById(step.target)
        if (!el) setIdx((i) => (i + 1 < steps.length ? i + 1 : i))
      }, 600)
      return () => window.clearTimeout(t)
    }
  }, [step, rect, steps.length])

  const next = useCallback(() => {
    if (idx + 1 >= steps.length) {
      markTourSeen()
      onDone()
    } else {
      setIdx((i) => i + 1)
    }
  }, [idx, steps.length, onDone])

  const back = useCallback(() => setIdx((i) => Math.max(0, i - 1)), [])

  // Tapping the spotlighted element advances the tour.
  useEffect(() => {
    if (!step) return
    const onClick = (e: MouseEvent) => {
      const el = document.getElementById(step.target)
      if (el && el.contains(e.target as Node)) {
        // Let the tap's own handler run first, then advance.
        window.setTimeout(next, 350)
      }
    }
    document.addEventListener('click', onClick, true)
    return () => document.removeEventListener('click', onClick, true)
  }, [step, next])

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
    <div className="fixed inset-0 z-[90]" role="dialog" aria-label="Guided tour">
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
          {/* The glow ring */}
          <div
            className="pointer-events-none absolute rounded-2xl"
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
          {idx > 0 && (
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
