/**
 * Scrubbable video player used on both sides of the Compare tab:
 * loop, A/B loop points, slow-motion, optional mirroring.
 * Line / Draw / Arrow stay on the picture; pause, scrub, speed, and A/B
 * sit in a separate bar so markup never steals those taps.
 */

import { useEffect, useRef, useState } from 'react'
import { VideoMarkOverlay } from './VideoMarkOverlay'
import { DraggableStillOverlay } from '../DraggableStillOverlay'
import { FavoriteStar } from '../FavoriteStar'
import { useClipLoopsOptional, MAX_LOOP_PRESETS } from '../../lib/clipLoops'
import { useFavoritesOptional } from '../../lib/favorites'

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
  /** Video only — no transport, markup, or padding. Used for collage cinema mode. */
  bare?: boolean
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
  bare = false,
  active,
}: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const fixingDurationRef = useRef(false)
  const clipLoops = useClipLoopsOptional()
  const favorites = useFavoritesOptional()
  const loopSet = persistUrl && clipLoops ? clipLoops.getSet(persistUrl) : null
  const stored = persistUrl && clipLoops ? clipLoops.getActive(persistUrl) : null
  const presets = loopSet?.presets ?? []
  const orderedPresets = persistUrl && favorites
    ? [...presets].sort((a, b) => {
        const af = favorites.isLoopFavorite(persistUrl, a.id) ? 0 : 1
        const bf = favorites.isLoopFavorite(persistUrl, b.id) ? 0 : 1
        return af - bf
      })
    : presets
  const activeLoopId = loopSet?.activeId ?? null
  const [duration, setDuration] = useState(0)
  const [time, setTime] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [speed, setSpeed] = useState<number>(1)
  const [loop, setLoop] = useState(true)
  const [pointA, setPointA] = useState<number | null>(() => loopA ?? stored?.a ?? null)
  const [pointB, setPointB] = useState<number | null>(() => loopB ?? stored?.b ?? null)
  const [renameId, setRenameId] = useState<string | null>(null)
  const [renameDraft, setRenameDraft] = useState('')
  const [loopNotice, setLoopNotice] = useState<string | null>(null)

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
  }

  const markA = () => publishAb(videoRef.current?.currentTime ?? null, pointB)
  const markB = () => publishAb(pointA, videoRef.current?.currentTime ?? null)
  const clearAb = () => {
    setPointA(null)
    setPointB(null)
    onAbChange?.(null, null)
    if (persistUrl && clipLoops) clipLoops.selectPreset(persistUrl, null)
  }

  const applyPreset = (id: string) => {
    if (!persistUrl || !clipLoops) return
    const preset = presets.find((p) => p.id === id)
    if (!preset) return
    clipLoops.selectPreset(persistUrl, id)
    setPointA(preset.a)
    setPointB(preset.b)
    onAbChange?.(preset.a, preset.b)
    const v = videoRef.current
    if (v) {
      v.currentTime = preset.a
      setTime(preset.a)
    }
  }

  const saveLoop = () => {
    if (!persistUrl || !clipLoops) return
    if (pointA === null || pointB === null || !(pointB > pointA)) {
      setLoopNotice('Set A then B first, then save that section.')
      return
    }
    if (presets.length >= MAX_LOOP_PRESETS) {
      setLoopNotice(`This clip already has ${MAX_LOOP_PRESETS} saved loops. Delete one to add another.`)
      return
    }
    const saved = clipLoops.saveNewPreset(persistUrl, pointA, pointB)
    setLoopNotice(
      saved
        ? `Saved ${saved.name}. Tap a name to switch loops.`
        : `This clip already has ${MAX_LOOP_PRESETS} saved loops.`,
    )
  }

  const commitRename = () => {
    if (!persistUrl || !clipLoops || !renameId) return
    clipLoops.renamePreset(persistUrl, renameId, renameDraft)
    setRenameId(null)
  }

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
            {persistUrl && (
              <button
                type="button"
                onClick={saveLoop}
                className={btn}
                title="Keep this A/B as another saved loop on this clip"
              >
                Save loop
              </button>
            )}
            {persistUrl && activeLoopId && loopingAb && (
              <button
                type="button"
                onClick={() => {
                  if (pointA === null || pointB === null || !(pointB > pointA)) return
                  clipLoops?.updateActive(persistUrl, pointA, pointB)
                  setLoopNotice('Updated the selected loop. Other saved loops are unchanged.')
                }}
                className={btn}
                title="Write the current A/B into the selected saved loop"
              >
                Update loop
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
      {persistUrl && allowAbLoop && presets.length > 0 && (
        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
          <span className={`text-[10px] font-semibold uppercase tracking-wider ${fill ? 'text-white/50' : 'text-[var(--muted)]'}`}>
            Saved loops
          </span>
          {orderedPresets.map((p) =>
            renameId === p.id ? (
              <input
                key={p.id}
                value={renameDraft}
                autoFocus
                onChange={(e) => setRenameDraft(e.target.value)}
                onBlur={commitRename}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') commitRename()
                  if (e.key === 'Escape') setRenameId(null)
                }}
                className={`w-28 rounded-md px-1.5 py-0.5 text-xs ${
                  fill
                    ? 'border border-white/30 bg-white/10 text-white'
                    : 'border border-[var(--panel-border)] bg-[#0d1218]'
                }`}
                aria-label="Rename loop"
              />
            ) : (
              <span
                key={p.id}
                className={`inline-flex items-center overflow-hidden rounded-md ${
                  activeLoopId === p.id
                    ? fill
                      ? 'bg-[var(--accent)] text-[#06281f]'
                      : 'bg-[var(--accent-dim)] text-white'
                    : fill
                      ? 'border border-white/30 text-white/80'
                      : 'border border-[var(--panel-border)] text-[var(--muted)]'
                }`}
              >
                {persistUrl && favorites && (
                  <FavoriteStar
                    compact
                    fill={fill && activeLoopId !== p.id}
                    on={favorites.isLoopFavorite(persistUrl, p.id)}
                    onClick={() => favorites.toggleLoopFavorite(persistUrl, p.id)}
                    className={activeLoopId === p.id ? 'text-[#06281f]' : ''}
                    label={
                      favorites.isLoopFavorite(persistUrl, p.id)
                        ? `Unfavorite loop ${p.name}`
                        : `Favorite loop ${p.name}`
                    }
                  />
                )}
                <button
                  type="button"
                  onClick={() => applyPreset(p.id)}
                  className={`px-2 py-0.5 text-xs ${
                    activeLoopId === p.id
                      ? 'font-semibold'
                      : fill
                        ? 'hover:text-white'
                        : 'hover:text-[var(--text)]'
                  }`}
                  title={`${fmt(p.a)}s–${fmt(p.b)}s`}
                >
                  {p.name}
                </button>
              </span>
            ),
          )}
          {activeLoopId && persistUrl && (
            <>
              <button
                type="button"
                onClick={() => {
                  const p = presets.find((x) => x.id === activeLoopId)
                  if (!p) return
                  setRenameId(p.id)
                  setRenameDraft(p.name)
                }}
                className={`text-[11px] ${fill ? 'text-white/50 hover:text-white' : 'text-[var(--muted)] hover:text-[var(--text)]'}`}
              >
                Rename
              </button>
              <button
                type="button"
                onClick={() => {
                  const next = presets.find((p) => p.id !== activeLoopId)
                  if (persistUrl && activeLoopId) {
                    favorites?.unfavoriteLoop(persistUrl, activeLoopId)
                    clipLoops?.removePreset(persistUrl, activeLoopId)
                  }
                  if (next) {
                    setPointA(next.a)
                    setPointB(next.b)
                    onAbChange?.(next.a, next.b)
                  } else {
                    setPointA(null)
                    setPointB(null)
                    onAbChange?.(null, null)
                  }
                }}
                className={`text-[11px] ${fill ? 'text-white/50 hover:text-white' : 'text-[var(--muted)] hover:text-[var(--bad)]'}`}
                title="Delete the selected saved loop. Other loops stay."
              >
                Delete loop
              </button>
            </>
          )}
        </div>
      )}
      {loopNotice && (
        <p className={`mt-1 text-[11px] ${fill ? 'text-white/70' : 'text-[var(--muted)]'}`}>{loopNotice}</p>
      )}
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
        {markup && !bare && <VideoMarkOverlay videoRef={videoRef} mirror={mirror} />}
      </div>

      {!bare && (
        <div className={fill ? 'shrink-0 bg-black px-2 py-1.5 text-white' : ''}>
          {transport}
        </div>
      )}

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
