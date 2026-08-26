/**
 * Scrubbable video player used on both sides of the Compare tab:
 * loop, frame-by-frame stepping, slow-motion, optional A/B loop region,
 * optional mirroring. Works for uploaded blobs, direct URLs, and
 * MediaRecorder clips (fixes the webm Infinity-duration quirk).
 */

import { useEffect, useRef, useState } from 'react'

const FRAME_STEP = 1 / 30
const SPEEDS = [0.25, 0.5, 1] as const

type Props = {
  src: string
  mirror?: boolean
  allowAbLoop?: boolean
  /** Start playback as soon as duration is known. */
  autoPlay?: boolean
  /** Loop/scrub only the last N seconds of the file (delay-cam buffer). */
  tailSeconds?: number
}

function fmt(t: number): string {
  if (!Number.isFinite(t)) return '0.00'
  return t.toFixed(2)
}

export function VideoWorkbench(props: Props) {
  // Remount on source change so all per-video state resets cleanly
  return <VideoWorkbenchInner key={props.src} {...props} />
}

function VideoWorkbenchInner({
  src,
  mirror = false,
  allowAbLoop = false,
  autoPlay = false,
  tailSeconds,
}: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const fixingDurationRef = useRef(false)
  const [duration, setDuration] = useState(0)
  const [time, setTime] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [speed, setSpeed] = useState<number>(1)
  const [loop, setLoop] = useState(true)
  const [pointA, setPointA] = useState<number | null>(null)
  const [pointB, setPointB] = useState<number | null>(null)

  useEffect(() => {
    const v = videoRef.current
    if (v) v.playbackRate = speed
  }, [speed])

  // Smooth slider + A/B loop enforcement via rAF
  useEffect(() => {
    let raf = 0
    const tick = () => {
      const v = videoRef.current
      if (v && !fixingDurationRef.current) {
        if (pointA !== null && pointB !== null && pointB > pointA && v.currentTime >= pointB) {
          v.currentTime = pointA
        }
        setTime(v.currentTime)
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [pointA, pointB])

  const onLoadedMetadata = () => {
    const v = videoRef.current
    if (!v) return
    if (Number.isFinite(v.duration)) {
      setDuration(v.duration)
      return
    }
    // MediaRecorder webm blobs report Infinity until seeked past the end
    fixingDurationRef.current = true
    v.currentTime = 1e7
  }

  const onDurationChange = () => {
    const v = videoRef.current
    if (!v || !Number.isFinite(v.duration)) return
    setDuration(v.duration)
    if (fixingDurationRef.current) {
      fixingDurationRef.current = false
      const start =
        tailSeconds && v.duration > tailSeconds ? v.duration - tailSeconds : 0
      v.currentTime = start
    }
  }

  // Jump to the last N seconds once we know duration (MediaRecorder webm).
  useEffect(() => {
    const v = videoRef.current
    if (!v || duration <= 0) return
    const start =
      tailSeconds && duration > tailSeconds + 0.05 ? duration - tailSeconds : 0
    if (tailSeconds && duration > tailSeconds + 0.05) {
      setPointA(start)
      setPointB(duration)
    }
    v.currentTime = start
    setTime(start)
    if (autoPlay) {
      void v.play().catch(() => {})
    }
  }, [duration, tailSeconds, autoPlay])

  const seek = (t: number) => {
    const v = videoRef.current
    if (!v) return
    v.currentTime = Math.min(Math.max(t, 0), duration || 0)
    setTime(v.currentTime)
  }

  const step = (dir: 1 | -1) => {
    const v = videoRef.current
    if (!v) return
    v.pause()
    setPlaying(false)
    seek(v.currentTime + dir * FRAME_STEP)
  }

  const togglePlay = () => {
    const v = videoRef.current
    if (!v) return
    if (v.paused) {
      void v.play()
      setPlaying(true)
    } else {
      v.pause()
      setPlaying(false)
    }
  }

  const btn =
    'rounded-md border border-[var(--panel-border)] px-2.5 py-1 text-sm hover:bg-[#243040]'

  return (
    <div className="flex flex-col gap-2">
      <div className="overflow-hidden rounded-lg border border-[var(--panel-border)] bg-black">
        <video
          ref={videoRef}
          src={src}
          loop={loop && pointB === null}
          muted
          playsInline
          preload="auto"
          onLoadedMetadata={onLoadedMetadata}
          onDurationChange={onDurationChange}
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          className={`max-h-[420px] w-full object-contain ${mirror ? 'scale-x-[-1]' : ''}`}
        />
      </div>

      <input
        type="range"
        min={0}
        max={duration || 0.01}
        step={0.01}
        value={Math.min(time, duration || 0)}
        onChange={(e) => seek(Number(e.target.value))}
        className="w-full accent-[var(--accent)]"
        aria-label="Scrub video"
      />

      <div className="flex flex-wrap items-center gap-2 text-sm">
        <button type="button" onClick={togglePlay} className={btn}>
          {playing ? 'Pause' : 'Play'}
        </button>
        <button type="button" onClick={() => step(-1)} className={btn} title="Back one frame (~1/30s)">
          ⟨ frame
        </button>
        <button type="button" onClick={() => step(1)} className={btn} title="Forward one frame (~1/30s)">
          frame ⟩
        </button>
        <span className="tabular-nums text-xs text-[var(--muted)]">
          {fmt(time)}s / {fmt(duration)}s
        </span>
        <span className="ml-auto flex items-center gap-1">
          {SPEEDS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setSpeed(s)}
              className={`rounded-md px-2 py-1 text-xs ${
                speed === s
                  ? 'bg-[var(--accent-dim)] font-semibold text-white'
                  : 'border border-[var(--panel-border)] text-[var(--muted)] hover:text-[var(--text)]'
              }`}
            >
              {s}x
            </button>
          ))}
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-3 text-xs text-[var(--muted)]">
        <label className="flex items-center gap-1.5">
          <input type="checkbox" checked={loop} onChange={(e) => setLoop(e.target.checked)} />
          Loop
        </label>
        {allowAbLoop && (
          <span className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setPointA(videoRef.current?.currentTime ?? null)}
              className="rounded border border-[var(--panel-border)] px-2 py-0.5 hover:bg-[#243040]"
            >
              Set A {pointA !== null ? `(${fmt(pointA)}s)` : ''}
            </button>
            <button
              type="button"
              onClick={() => setPointB(videoRef.current?.currentTime ?? null)}
              className="rounded border border-[var(--panel-border)] px-2 py-0.5 hover:bg-[#243040]"
            >
              Set B {pointB !== null ? `(${fmt(pointB)}s)` : ''}
            </button>
            {(pointA !== null || pointB !== null) && (
              <button
                type="button"
                onClick={() => {
                  setPointA(null)
                  setPointB(null)
                }}
                className="rounded border border-[var(--panel-border)] px-2 py-0.5 hover:bg-[#243040]"
              >
                Clear A/B
              </button>
            )}
            {pointA !== null && pointB !== null && pointB > pointA && (
              <span className="text-[var(--accent)]">looping {fmt(pointA)}–{fmt(pointB)}s</span>
            )}
          </span>
        )}
      </div>
    </div>
  )
}
