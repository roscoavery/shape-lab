/**
 * Inline player for gym-hosted video files, with A/B loop support.
 * Plays when mostly on screen, pauses when scrolled away.
 * The chrome (play, skip, scrubber) stays hidden so the video is fully visible
 * while swiping; tapping the video toggles play/pause and reveals it, and it
 * auto-hides a few seconds after the last touch while the video is playing.
 */
import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'

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
  const hideTimer = useRef<number | null>(null)
  const tapRef = useRef<{ x: number; y: number; t: number } | null>(null)

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

  /** A tap (not a swipe) on the video toggles play/pause and shows the chrome. */
  const onTapDown = (e: ReactPointerEvent) => {
    tapRef.current = { x: e.clientX, y: e.clientY, t: Date.now() }
  }
  const onTapUp = (e: ReactPointerEvent) => {
    const start = tapRef.current
    tapRef.current = null
    if (!start) return
    const moved = Math.hypot(e.clientX - start.x, e.clientY - start.y)
    if (moved < 12 && Date.now() - start.t < 500) togglePlay()
  }

  const fmtClock = (s: number) => {
    if (!Number.isFinite(s) || s < 0) s = 0
    const m = Math.floor(s / 60)
    const sec = Math.floor(s % 60)
    return `${m}:${sec.toString().padStart(2, '0')}`
  }

  return (
    <div
      className="relative h-full w-full overflow-hidden bg-black"
      onPointerDown={onTapDown}
      onPointerUp={onTapUp}
    >
      <video
        ref={ref}
        src={url}
        playsInline
        muted
        loop={loopA == null && loopB == null}
        preload="metadata"
        className="h-full w-full object-contain"
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
        <div className="absolute inset-0 z-10 flex flex-col justify-between bg-black/25">
          <div className="flex flex-1 items-center justify-center gap-6">
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
              className="flex h-12 w-12 items-center justify-center gap-0.5 rounded-full bg-black/55 text-lg font-bold text-white"
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
              className="flex h-16 w-16 items-center justify-center rounded-full bg-white/90 text-2xl text-black"
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
              className="flex h-12 w-12 items-center justify-center gap-0.5 rounded-full bg-black/55 text-lg font-bold text-white"
            >
              <span className="text-[10px]">10</span>
              <span aria-hidden="true">↻</span>
            </button>
          </div>
          <div
            className="bg-gradient-to-t from-black/85 via-black/60 to-transparent px-3 pb-2 pt-6"
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
              className="w-full accent-emerald-400"
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
