/**
 * Inline player for gym-hosted video files, with A/B loop support.
 * Plays when mostly on screen, pauses when scrolled away.
 * The chrome (play, skip, scrubber) stays hidden so the video is fully visible
 * while swiping; tapping the video toggles play/pause and reveals it, and it
 * auto-hides a few seconds after the last touch while the video is playing.
 *
 * Touch model: the chrome overlay itself is pointer-transparent, so it can
 * never swallow touches meant for the scrub bar — only the buttons and the
 * scrub strip take touches. Pinch the video to zoom (zoom sticks while paused
 * and while scrubbing); double-tap toggles between 1x and 2x.
 */
import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'

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
  const hideTimer = useRef<number | null>(null)
  const tapRef = useRef<{ x: number; y: number; t: number } | null>(null)
  const lastTapRef = useRef<{ x: number; y: number; t: number } | null>(null)
  const pointersRef = useRef(new Map<number, { x: number; y: number }>())
  const pinchRef = useRef<{ startDist: number; startScale: number } | null>(null)
  const pinchedRef = useRef(false)

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
    return () => {
      io.disconnect()
      v.removeEventListener('canplay', tryPlay)
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
      v.play().catch(() => {})
      showChrome()
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
      className="relative h-full w-full overflow-hidden bg-black"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerEnd}
    >
      <video
        ref={ref}
        src={url}
        playsInline
        muted
        loop={loopA == null && loopB == null}
        preload="metadata"
        className="h-full w-full object-contain [touch-action:none]"
        style={{ transform: `scale(${scale})` }}
        onPlay={() => {
          setPlaying(true)
          armHideTimer()
        }}
        onPause={() => {
          setPlaying(false)
          clearHideTimer()
          setChromeOpen(true)
        }}
        onLoadedMetadata={(e) => setDuration(e.currentTarget.duration || 0)}
        onTimeUpdate={(e) => {
          const v = e.currentTarget
          if (loopA != null && v.currentTime < loopA) v.currentTime = loopA
          if (loopB != null && v.currentTime >= loopB) {
            v.currentTime = loopA ?? 0
            v.play().catch(() => {})
          }
          setTime(v.currentTime)
        }}
      />
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
          <div className="pointer-events-none flex flex-1 items-center justify-center gap-6">
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
              aria-label={playing ? 'Pause' : 'Play'}
              onPointerDown={(e) => e.stopPropagation()}
              onPointerUp={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation()
                togglePlay()
              }}
              className="pointer-events-auto flex h-16 w-16 items-center justify-center rounded-full bg-white/90 text-2xl text-black"
            >
              {playing ? '❚❚' : '▶'}
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
    </div>
  )
}
