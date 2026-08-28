/**
 * Scrubbable video player used on both sides of the Compare tab:
 * loop, A/B loop points, slow-motion, optional mirroring.
 * Line / Draw / Arrow stay on the picture; pause, scrub, speed, and A/B
 * sit in a separate bar so markup never steals those taps.
 */

import { useEffect, useRef, useState } from 'react'
import { VideoMarkOverlay } from './VideoMarkOverlay'
import { DraggableStillOverlay } from '../DraggableStillOverlay'
import { useClipLoopsOptional } from '../../lib/clipLoops'

const SPEEDS = [0.25, 0.5, 1] as const

type Props = {
  src: string
  mirror?: boolean
  allowAbLoop?: boolean
  /** Start playback as soon as duration is known. */
  autoPlay?: boolean
  /** Loop/scrub only the last N seconds of the file (delay-cam buffer). */
  tailSeconds?: number
  fill?: boolean
  /** Ghost still on this video (delay cam / replay). Off for the reference clip. */
  showStillOverlay?: boolean
  /** Gym URL used to persist A/B points for every section. */
  persistUrl?: string
  loopA?: number | null
  loopB?: number | null
  onAbChange?: (a: number | null, b: number | null) => void
  markup?: boolean
  compact?: boolean
  /** When set, play only while true (doom-scroll / collage). */
  active?: boolean
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
  allowAbLoop = true,
  autoPlay = false,
  tailSeconds,
  fill = false,
  showStillOverlay = false,
  persistUrl,
  loopA,
  loopB,
  onAbChange,
  markup = true,
  compact = false,
  active,
}: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const fixingDurationRef = useRef(false)
  const clipLoops = useClipLoopsOptional()
  const stored = persistUrl && clipLoops ? clipLoops.getLoop(persistUrl) : null
  const [duration, setDuration] = useState(0)
  const [time, setTime] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [speed, setSpeed] = useState<number>(1)
  const [loop, setLoop] = useState(true)
  const [pointA, setPointA] = useState<number | null>(() => loopA ?? stored?.a ?? null)
  const [pointB, setPointB] = useState<number | null>(() => loopB ?? stored?.b ?? null)

  useEffect(() => {
    const v = videoRef.current
    if (v) v.playbackRate = speed
  }, [speed])

  useEffect(() => {
    if (loopA != null) setPointA(loopA)
    if (loopB != null) setPointB(loopB)
  }, [loopA, loopB])

  useEffect(() => {
    if (loopA != null || loopB != null || !stored) return
    setPointA((p) => p ?? stored.a)
    setPointB((p) => p ?? stored.b)
  }, [stored, loopA, loopB])

  useEffect(() => {
    const v = videoRef.current
    if (!v || active === undefined) return
    if (active) void v.play().catch(() => {})
    else v.pause()
  }, [active])

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

  const publishAb = (a: number | null, b: number | null) => {
    setPointA(a)
    setPointB(b)
    onAbChange?.(a, b)
    if (persistUrl && clipLoops) clipLoops.setLoop(persistUrl, a, b)
  }

  const markA = () => publishAb(videoRef.current?.currentTime ?? null, pointB)
  const markB = () => publishAb(pointA, videoRef.current?.currentTime ?? null)
  const clearAb = () => publishAb(null, null)

  const loopingAb = pointA !== null && pointB !== null && pointB > pointA

  const btn = fill
    ? 'rounded-md border border-white/30 bg-white/10 px-2.5 py-1.5 text-sm text-white hover:bg-white/18'
    : 'rounded-md border border-[var(--panel-border)] px-2.5 py-1 text-sm hover:bg-[#243040]'

  const abOn = (on: boolean) =>
    on
      ? fill
        ? 'rounded-md bg-[var(--accent)] px-2.5 py-1.5 text-sm font-semibold text-[#06281f]'
        : 'rounded-md bg-[var(--accent-dim)] px-2.5 py-1 text-sm font-semibold text-white'
      : btn

  const speedBtn = (s: number) =>
    speed === s
      ? fill
        ? 'rounded-md bg-white px-2.5 py-1.5 text-xs font-semibold text-black'
        : 'rounded-md bg-[var(--accent-dim)] px-2 py-1 text-xs font-semibold text-white'
      : fill
        ? 'rounded-md border border-white/30 px-2.5 py-1.5 text-xs text-white/80 hover:text-white'
        : 'rounded-md border border-[var(--panel-border)] px-2 py-1 text-xs text-[var(--muted)] hover:text-[var(--text)]'

  const transport = (
    <div
      className="pointer-events-auto relative z-[30]"
      onPointerDown={(e) => e.stopPropagation()}
      onPointerUp={(e) => e.stopPropagation()}
    >
      <input
        type="range"
        min={0}
        max={duration || 0.01}
        step={0.01}
        value={Math.min(time, duration || 0)}
        onChange={(e) => seek(Number(e.target.value))}
        onPointerDown={(e) => e.stopPropagation()}
        className="w-full accent-[var(--accent)]"
        aria-label="Scrub video"
      />

      <div className="mt-1 flex flex-wrap items-center gap-2 text-sm">
        <button type="button" onClick={togglePlay} className={btn}>
          {playing ? 'Pause' : 'Play'}
        </button>
        {allowAbLoop && (
          <>
            <button
              type="button"
              onClick={markA}
              className={abOn(pointA !== null)}
              title="Loop start — set at the current time"
            >
              A{pointA !== null ? ` ${fmt(pointA)}` : ''}
            </button>
            <button
              type="button"
              onClick={markB}
              className={abOn(pointB !== null)}
              title="Loop end — set at the current time"
            >
              B{pointB !== null ? ` ${fmt(pointB)}` : ''}
            </button>
            {(pointA !== null || pointB !== null) && (
              <button type="button" onClick={clearAb} className={btn}>
                Clear A/B
              </button>
            )}
          </>
        )}
        <span className={`tabular-nums text-xs ${fill ? 'text-white/70' : 'text-[var(--muted)]'}`}>
          {fmt(time)}s / {fmt(duration)}s
          {loopingAb ? ` · loop ${fmt(pointA!)}–${fmt(pointB!)}` : ''}
        </span>
        <span className="ml-auto flex items-center gap-1">
          {SPEEDS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setSpeed(s)}
              className={speedBtn(s)}
            >
              {s}x
            </button>
          ))}
        </span>
      </div>
    </div>
  )

  return (
    <div className={`flex flex-col ${fill ? 'h-full min-h-0 gap-0' : 'gap-2'}`}>
      <div
        className={`relative min-h-0 overflow-hidden bg-black ${
          fill ? 'flex-1' : 'rounded-lg border border-[var(--panel-border)]'
        }`}
      >
        <video
          ref={videoRef}
          src={src}
          loop={loop && !loopingAb}
          muted
          playsInline
          preload="auto"
          onLoadedMetadata={onLoadedMetadata}
          onDurationChange={onDurationChange}
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          className={`${fill ? 'h-full max-h-none' : 'max-h-[420px]'} w-full object-contain ${mirror ? 'scale-x-[-1]' : ''}`}
        />
        {showStillOverlay && !fill && <DraggableStillOverlay />}
        {markup && <VideoMarkOverlay videoRef={videoRef} mirror={mirror} />}
      </div>

      <div className={fill ? 'shrink-0 bg-black px-2 py-1.5 text-white' : ''}>
        {transport}
      </div>

      {!fill && !compact && (
        <div className="flex flex-wrap items-center gap-3 text-xs text-[var(--muted)]">
          <label className="flex items-center gap-1.5">
            <input type="checkbox" checked={loop} onChange={(e) => setLoop(e.target.checked)} />
            Loop
          </label>
        </div>
      )}
    </div>
  )
}
