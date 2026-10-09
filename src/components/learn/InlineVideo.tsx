/**
 * Inline player for gym-hosted video files, with A/B loop support.
 * Plays when mostly on screen, pauses when scrolled away.
 * The chrome (play, skip, scrubber) hides the moment playback starts — the
 * buttons and the scrub bar vanish together — leaving only a slim progress
 * line at the bottom edge. Tapping the video toggles play/pause; pausing
 * reveals the chrome with the scrub bar pinned to the bottom.
 *
 * Touch model: the chrome overlay itself is pointer-transparent, so it can
 * never swallow touches meant for the scrub bar — only the buttons and the
 * scrub strip take touches. Pinch the video to zoom (zoom sticks while paused
 * and while scrubbing); double-tap toggles between 1x and 2x.
 */
import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { useAdjustment } from '../../lib/videoAdjustments'

const MIN_ZOOM = 1
const MAX_ZOOM = 4
const DOUBLE_TAP_ZOOM = 2
const DOUBLE_TAP_MS = 300
const DOUBLE_TAP_PX = 32
const TAP_MOVE_PX = 12
const TAP_TIME_MS = 500

export function InlineVideo({
  url,
  loopA = null,
  loopB = null,
}: {
  url: string
  loopA?: number | null
  loopB?: number | null
}) {
  const ref = useRef<HTMLVideoElement>(null)
  const [chromeOpen, setChromeOpen] = useState(false)
  const [playing, setPlaying] = useState(false)
  const [time, setTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [scale, setScale] = useState(1)
  const adj = useAdjustment(url)
  const trimStart = adj?.trimStart ?? null
  const trimEnd = adj?.trimEnd ?? null
  // Effective loop window: session A/B loop intersected with the saved trim.
  const lo = Math.max(loopA ?? 0, trimStart ?? 0)
  const hiRaw = Math.min(loopB ?? Infinity, trimEnd ?? Infinity)
  const hi = Number.isFinite(hiRaw) ? hiRaw : null
  const crop = adj?.crop ?? null
  const mirrored = adj?.mirrored === true
  const cropStyle: React.CSSProperties | undefined = crop
    ? {
        transformOrigin: '0 0',
        transform: `scale(${1 / crop.w}, ${1 / crop.h}) translate(${-crop.x * 100}%, ${-crop.y * 100}%)`,
      }
    : undefined
  const visibleOverlays = (adj?.textOverlays ?? []).filter((o) => time >= o.start && time < o.end)
  const hideTimer = useRef<number | null>(null)
  const tapRef = useRef<{ x: number; y: number; t: number } | null>(null)
  const lastTapRef = useRef<{ x: number; y: number; t: number } | null>(null)
  const pointersRef = useRef(new Map<number, { x: number; y: number }>())
  const pinchRef = useRef<{ startDist: number; startScale: number } | null>(null)
  const pinchedRef = useRef(false)
  const containerRef = useRef<HTMLDivElement>(null)
  /**
   * Mount the <video> element only when near the viewport. On 2GB devices
   * (iPad Air 2) a card full of mounted videos exhausts memory; gating on
   * proximity keeps behavior identical everywhere while cutting the peak.
   */
  const [nearViewport, setNearViewport] = useState(false)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    if (nearViewport) return
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setNearViewport(true)
          io.disconnect()
        }
      },
      { rootMargin: '600px' },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [nearViewport])

  // When the video mounts (nearViewport), explicitly call load() — iOS
  // Safari ignores preload hints and won't fetch data until load() or
  // play() is called.
  useEffect(() => {
    if (!nearViewport) return
    const v = ref.current
    if (v) {
      v.muted = true
      try {
        v.load()
      } catch {
        /* noop */
      }
    }
  }, [nearViewport])

  const clearHideTimer = () => {
    if (hideTimer.current !== null) {
      window.clearTimeout(hideTimer.current)
      hideTimer.current = null
    }
  }

  const armHideTimer = () => {
    clearHideTimer()
    hideTimer.current = window.setTimeout(() => {
      const v = ref.current
      if (v && !v.paused) setChromeOpen(false)
    }, 3000)
  }

  const showChrome = () => {
    setChromeOpen(true)
    armHideTimer()
  }

  useEffect(() => {
    const v = ref.current
    if (!v) return
    // React's `muted` prop doesn't always set the DOM property — iOS
    // requires the property for autoplay. Set it explicitly.
    v.muted = true
    v.defaultMuted = true
    setChromeOpen(false)
    setTime(0)
    setDuration(0)
    setScale(1)
    tapRef.current = null
    lastTapRef.current = null
    pointersRef.current.clear()
    pinchRef.current = null
    pinchedRef.current = false
    clearHideTimer()
    const wantPlayRef = { current: false }
    const tryPlay = () => {
      if (wantPlayRef.current && v.paused) v.play().catch(() => {})
    }
    const io = new IntersectionObserver(
      ([entry]) => {
        wantPlayRef.current = entry.isIntersecting && entry.intersectionRatio >= 0.6
        if (wantPlayRef.current) tryPlay()
        else if (!v.paused) v.pause()
      },
      { threshold: [0, 0.6, 1] },
    )
    io.observe(v)
    v.addEventListener('canplay', tryPlay)
    v.addEventListener('canplaythrough', tryPlay)
    return () => {
      io.disconnect()
      v.removeEventListener('canplay', tryPlay)
      v.removeEventListener('canplaythrough', tryPlay)
      clearHideTimer()
    }
  }, [url])

  const seek = (t: number) => {
    const v = ref.current
    if (!v) return
    const d = Number.isFinite(v.duration) ? v.duration : 0
    v.currentTime = Math.min(Math.max(0, t), d || 0)
    setTime(v.currentTime)
  }

  const togglePlay = () => {
    const v = ref.current
    if (!v) return
    if (v.paused) {
      // onPlay closes the chrome when playback actually starts; if play()
      // rejects, the chrome simply stays open, which is correct.
      v.play().catch(() => {})
    } else {
      v.pause()
      clearHideTimer()
      setChromeOpen(true)
    }
  }

  const clampZoom = (s: number) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, s))

  /** Pointer down on the video area: start tracking a tap, or a pinch when a second finger lands. */
  const onPointerDown = (e: ReactPointerEvent) => {
    pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    if (pointersRef.current.size === 2) {
      const it = pointersRef.current.values()
      const a = it.next().value
      const b = it.next().value
      if (a && b) {
        pinchRef.current = {
          startDist: Math.hypot(a.x - b.x, a.y - b.y),
          startScale: scale,
        }
      }
      pinchedRef.current = true
      tapRef.current = null
      lastTapRef.current = null
      return
    }
    tapRef.current = { x: e.clientX, y: e.clientY, t: Date.now() }
  }

  /** Pointer move: drive the pinch zoom while two fingers are down. */
  const onPointerMove = (e: ReactPointerEvent) => {
    const p = pointersRef.current.get(e.pointerId)
    if (p) {
      p.x = e.clientX
      p.y = e.clientY
    }
    const pr = pinchRef.current
    if (pr && pointersRef.current.size === 2 && pr.startDist > 0) {
      const it = pointersRef.current.values()
      const a = it.next().value
      const b = it.next().value
      if (a && b) {
        const d = Math.hypot(a.x - b.x, a.y - b.y)
        if (d > 0) setScale(clampZoom(pr.startScale * (d / pr.startDist)))
      }
    }
  }

  /** Pointer up/cancel: forget the pointer. A finished pinch is never a tap. */
  const onPointerEnd = (e: ReactPointerEvent) => {
    pointersRef.current.delete(e.pointerId)
    if (pointersRef.current.size < 2) pinchRef.current = null
    if (pointersRef.current.size === 0) {
      const wasPinch = pinchedRef.current
      pinchedRef.current = false
      if (wasPinch) {
        tapRef.current = null
        lastTapRef.current = null
      }
    }
  }

  /**
   * A tap (not a swipe, not a pinch) on the video toggles play/pause and shows
   * the chrome. A double-tap toggles zoom instead, undoing the first tap's play
   * toggle so the video keeps its play state.
   */
  const onPointerUp = (e: ReactPointerEvent) => {
    onPointerEnd(e)
    const start = tapRef.current
    tapRef.current = null
    if (!start) return
    const moved = Math.hypot(e.clientX - start.x, e.clientY - start.y)
    if (moved >= TAP_MOVE_PX || Date.now() - start.t >= TAP_TIME_MS) {
      lastTapRef.current = null
      return
    }
    const now = Date.now()
    const last = lastTapRef.current
    if (
      last &&
      now - last.t < DOUBLE_TAP_MS &&
      Math.hypot(e.clientX - last.x, e.clientY - last.y) < DOUBLE_TAP_PX
    ) {
      lastTapRef.current = null
      togglePlay() // undo the play toggle from the first tap of the double-tap
      setScale((s) => (s > MIN_ZOOM ? MIN_ZOOM : DOUBLE_TAP_ZOOM))
      showChrome()
      return
    }
    lastTapRef.current = { x: e.clientX, y: e.clientY, t: now }
    togglePlay()
  }

  const fmtClock = (s: number) => {
    if (!Number.isFinite(s) || s < 0) s = 0
    const m = Math.floor(s / 60)
    const sec = Math.floor(s % 60)
    return `${m}:${sec.toString().padStart(2, '0')}`
  }

  const zoomLabel = (s: number) => {
    const r = Math.round(s * 10) / 10
    return Number.isInteger(r) ? String(r) : r.toFixed(1)
  }

  return (
    <div
      ref={containerRef}
      className="relative h-full w-full overflow-hidden bg-black"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerEnd}
    >
      <div className="h-full w-full" style={mirrored ? { transform: 'scaleX(-1)' } : undefined}>
        <div className="h-full w-full" style={cropStyle}>
          {nearViewport && (
          <video
            ref={ref}
            src={url}
            playsInline
            muted
            loop={hi == null}
            preload="auto"
            // pan-x AND pan-y: a swipe that starts on the video must still drive
            // the surrounding scroller (skill-card reference carousel, card
            // vertical scroll). Taps still reach the pointer handlers below, and
            // the scrub strip is its own element, so play/pause and scrubbing
            // are unaffected.
            className="h-full w-full object-contain [touch-action:pan-x_pan-y]"
            style={{ transform: `scale(${scale})` }}
            onPlay={() => {
              setPlaying(true)
              // Hide the whole chrome the moment playback starts: buttons and
              // scrub bar vanish together, leaving only the slim progress line.
              setChromeOpen(false)
              clearHideTimer()
            }}
            onPause={() => {
              setPlaying(false)
              clearHideTimer()
              setChromeOpen(true)
            }}
            onLoadedMetadata={(e) => {
              const v = e.currentTarget
              const d = v.duration || 0
              setDuration(d)
              // Start inside the trim window when one is saved.
              if (trimStart != null && trimStart > 0 && trimStart < d) {
                v.currentTime = trimStart
                setTime(trimStart)
              }
            }}
            onTimeUpdate={(e) => {
              const v = e.currentTarget
              const t = v.currentTime
              // Saved trim + session A/B loop share one effective window.
              if (trimStart != null && t < trimStart - 0.05) {
                v.currentTime = trimStart
                setTime(trimStart)
                return
              }
              if (hi != null && t >= hi - 0.03) {
                v.currentTime = lo
                setTime(lo)
                if (v.paused) v.play().catch(() => {})
                return
              }
              if (t < lo) {
                v.currentTime = lo
                setTime(lo)
                return
              }
              // Saved slow-motion segments drive the rate while inside one.
              const seg = adj?.slowMo.find((s) => t >= s.start && t < s.end)
              const target = seg ? seg.rate : 1
              if (v.playbackRate !== target) v.playbackRate = target
              setTime(t)
            }}
          />
          )}
        </div>
      </div>
      {/* Text overlays: above mirror/crop so they always read normally. */}
      {visibleOverlays.length > 0 && (
        <div className="pointer-events-none absolute inset-x-0 bottom-6 z-10 flex flex-col items-center gap-1 px-4">
          {visibleOverlays.map((o, i) => (
            <div
              key={i}
              className="rounded-lg bg-black/65 px-3 py-1 text-center text-xs font-bold text-white"
            >
              {o.text}
            </div>
          ))}
        </div>
      )}
      {chromeOpen && (
        <div className="pointer-events-none absolute inset-0 z-10 flex flex-col justify-between bg-black/25">
          {scale > MIN_ZOOM && (
            <button
              type="button"
              aria-label="Reset zoom"
              onPointerDown={(e) => e.stopPropagation()}
              onPointerUp={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation()
                setScale(MIN_ZOOM)
                showChrome()
              }}
              className="pointer-events-auto absolute right-2 top-2 z-20 rounded-full bg-black/55 px-3 py-1 text-xs font-bold text-white"
            >
              {zoomLabel(scale)}x · reset
            </button>
          )}
          {/* Centered transport buttons: paused only, so a playing video is
              never covered. This spacer always renders so the scrub bar
              below stays pinned to the bottom in both states. */}
          <div className="pointer-events-none flex flex-1 items-center justify-center gap-6">
            {!playing && (
              <>
              <button
                type="button"
                aria-label="Back 10 seconds"
                onPointerDown={(e) => e.stopPropagation()}
                onPointerUp={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation()
                  seek(time - 10)
                  showChrome()
                }}
                className="pointer-events-auto flex h-12 w-12 items-center justify-center gap-0.5 rounded-full bg-black/55 text-lg font-bold text-white"
              >
                <span aria-hidden="true">↺</span>
                <span className="text-[10px]">10</span>
              </button>
              <button
                type="button"
                aria-label="Play"
                onPointerDown={(e) => e.stopPropagation()}
                onPointerUp={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation()
                  togglePlay()
                }}
                className="pointer-events-auto flex h-16 w-16 items-center justify-center rounded-full bg-white/90 text-2xl text-black"
              >
                ▶
              </button>
              <button
                type="button"
                aria-label="Forward 10 seconds"
                onPointerDown={(e) => e.stopPropagation()}
                onPointerUp={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation()
                  seek(time + 10)
                  showChrome()
                }}
                className="pointer-events-auto flex h-12 w-12 items-center justify-center gap-0.5 rounded-full bg-black/55 text-lg font-bold text-white"
              >
                <span className="text-[10px]">10</span>
                <span aria-hidden="true">↻</span>
              </button>
              </>
            )}
          </div>
          <div
            className="pointer-events-auto bg-gradient-to-t from-black/85 via-black/60 to-transparent px-3 pb-2 pt-6"
            onPointerDown={(e) => e.stopPropagation()}
            onPointerUp={(e) => e.stopPropagation()}
          >
            <input
              type="range"
              min={0}
              max={Math.max(0.01, duration)}
              step={0.01}
              value={Math.min(time, duration)}
              onChange={(e) => {
                seek(Number(e.target.value))
                showChrome()
              }}
              className="w-full py-2 accent-emerald-400"
              aria-label="Scrub video"
            />
            <div className="mt-0.5 flex justify-between text-[11px] tabular-nums text-white/80">
              <span>{fmtClock(time)}</span>
              <span>-{fmtClock(Math.max(0, duration - time))}</span>
            </div>
          </div>
        </div>
      )}
      {/* Slim progress line while playing with the chrome hidden: bottom edge
          only, purely indicative, tapping the video pauses it and brings the
          full scrub bar back. */}
      {!chromeOpen && playing && duration > 0 && (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-[3px] bg-white/15" aria-hidden>
          <div
            className="h-full bg-emerald-400"
            style={{ width: `${Math.min(100, (time / duration) * 100)}%` }}
          />
        </div>
      )}
    </div>
  )
}
