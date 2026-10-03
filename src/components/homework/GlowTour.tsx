import { useCallback, useEffect, useRef, useState } from 'react'

export type TourStep = {
  /** DOM id of the element to spotlight. */
  target: string
  title: string
  text: string
  /** When true, tapping the card also lets its own action fire (e.g. navigating to the next screen) instead of being swallowed. */
  tapThrough?: boolean
  /** When true, the video player's chrome (controls) is forced open for this step. */
  needsChrome?: boolean
  /**
   * When true, the spotlight ring doesn't capture touches — the user can
   * interact with the underlying UI (e.g. try the hold-drag gesture) and
   * advances via the card's Next button.
   */
  passthrough?: boolean
}

/** Event fired when the tour needs the video chrome forced open/closed. */
export const TOUR_CHROME_EVENT = 'sl-tour-chrome'
/** Global flag — true while any tour step needs video chrome open. */
export const tourChromeNeeded = { current: false }

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
  const [waiting, setWaiting] = useState(false)
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
    // Don't flash the waiting dialog on every step change — the next
    // target is usually already in the DOM and just needs a frame.
    // Only show "Getting the tour ready…" if it's still missing after
    // a grace period.
    setWaiting(false)
    if (!step) return
    const onScroll = () => measure()
    window.addEventListener('scroll', onScroll, true)
    window.addEventListener('resize', onScroll)
    if (measure()) return () => {
      window.removeEventListener('scroll', onScroll, true)
      window.removeEventListener('resize', onScroll)
    }
    // The target may render late (async list). Keep polling until it shows —
    // the card stays visible with the step content meanwhile, so the flow
    // never breaks. No auto-skip: every step shows.
    const waitTimer = window.setTimeout(() => setWaiting(true), 800)
    const iv = window.setInterval(() => {
      if (measure()) {
        window.clearInterval(iv)
        window.clearTimeout(waitTimer)
      }
    }, 250)
    return () => {
      window.clearInterval(iv)
      window.clearTimeout(waitTimer)
      window.removeEventListener('scroll', onScroll, true)
      window.removeEventListener('resize', onScroll)
    }
  }, [step, measure, steps.length, idx, onDone])

  // Force the video chrome open for steps that spotlight chrome controls.
  // Without this, a tap that closes chrome mid-tour orphans every later
  // chrome-dependent target and the tour stalls on "Getting the tour ready…".
  useEffect(() => {
    const need = !!step?.needsChrome
    tourChromeNeeded.current = need
    window.dispatchEvent(new CustomEvent(TOUR_CHROME_EVENT, { detail: need }))
    return () => {
      tourChromeNeeded.current = false
      window.dispatchEvent(new CustomEvent(TOUR_CHROME_EVENT, { detail: false }))
    }
  }, [step])

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
  // Fullscreen targets (the video itself): no room above or below, so the
  // card overlays centered instead of getting pushed off-screen.
  const tooltipOverlay = !!r && r.bottom - r.top > window.innerHeight * 0.6

  return (
    <div className="fixed inset-0 z-[400]" role="dialog" aria-label="Guided tour">
      {r ? (
        <>
          {/* Dim everything except the spotlight box */}
          <div
            className={`absolute left-0 right-0 top-0 bg-black/70 ${step.passthrough ? 'pointer-events-none' : ''}`}
            style={{ height: r.top }}
          />
          <div
            className={`absolute left-0 right-0 bg-black/70 ${step.passthrough ? 'pointer-events-none' : ''}`}
            style={{ top: r.bottom, bottom: 0 }}
          />
          <div
            className={`absolute bg-black/70 ${step.passthrough ? 'pointer-events-none' : ''}`}
            style={{ top: r.top, bottom: window.innerHeight - r.bottom, left: 0, width: r.left }}
          />
          <div
            className={`absolute bg-black/70 ${step.passthrough ? 'pointer-events-none' : ''}`}
            style={{
              top: r.top,
              bottom: window.innerHeight - r.bottom,
              left: r.right,
              right: 0,
            }}
          />
          {/* The glow ring — also the tap target that advances the tour.
              In passthrough mode it doesn't capture touches, so the user can
              interact with the highlighted UI (e.g. try the hold-drag gesture). */}
          <div
            role={step.passthrough ? undefined : 'button'}
            aria-label={step.passthrough ? undefined : 'Continue the guided tour'}
            onClick={step.passthrough ? undefined : (e) => {
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
            className={`absolute rounded-2xl ${step.passthrough ? 'pointer-events-none' : 'cursor-pointer'}`}
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
            ? tooltipOverlay
              ? { top: '50%', transform: 'translateY(-50%)' }
              : tooltipBelow
                ? { top: Math.min(r.bottom + 12, window.innerHeight - 190) }
                : { bottom: window.innerHeight - r.top + 12 }
            : { top: '30%' }
        }
      >
        <p className="text-[10px] font-black uppercase tracking-widest text-[var(--accent)]">
          Step {idx + 1} of {steps.length}
          {waiting && !r && <span className="ml-2 inline-block h-2 w-2 animate-pulse rounded-full bg-[var(--accent)]" />}
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
