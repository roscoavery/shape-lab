/**
 * Fullscreen proof player for skill cards (and spotting cards).
 *
 * Any video in a card's "References" section can be opened here: the player
 * goes (near-)fullscreen, arrows and swipe move through the other videos on
 * the card, and every video gets the same analysis controls — scrub, slow
 * motion, flip (mirror), A/B loop. Local videos autoplay and loop on open.
 *
 * The Adjust mode lets a coach set per-video playback adjustments that are
 * saved gym-wide (trim start/end, crop rectangle, slow-motion segments).
 * Adjustments apply at playback time; original files are never modified.
 *
 * Social videos (Instagram/TikTok) are downloaded into the app cache and play
 * through the same workbench as local videos. YouTube plays in its official
 * iframe with YouTube's own controls.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { InstagramEmbed } from '../compare/InstagramEmbed'
import { youtubeEmbedSrc } from '../../lib/socialUrls'
import {
  useAdjustment,
  useVideoAdjustmentsOptional,
  type SlowMoSegment,
  type VideoAdjustment,
  type VideoCrop,
} from '../../lib/videoAdjustments'
import type { ProofVideo } from '../../config/techniqueEvidence'

/** True for local video files (public/videos/...) vs social embeds. */
function isLocalVideo(url: string): boolean {
  return /\.(mp4|mov|webm)(\?|#|$)/i.test(url)
}

const SPEEDS = [0.25, 0.5, 1] as const
const SM_RATES = [0.25, 0.5] as const

function fmt(t: number): string {
  if (!Number.isFinite(t)) return '0:00'
  const m = Math.floor(t / 60)
  const s = Math.floor(t % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

/** Working copy of a video's adjustments while in Adjust mode. */
type DraftAdj = {
  trimStart: number | null
  trimEnd: number | null
  crop: VideoCrop | null
  slowMo: SlowMoSegment[]
}

function draftFrom(saved: VideoAdjustment | null): DraftAdj {
  return {
    trimStart: saved?.trimStart ?? null,
    trimEnd: saved?.trimEnd ?? null,
    crop: saved?.crop ? { ...saved.crop } : null,
    slowMo: (saved?.slowMo ?? []).map((s) => ({ ...s })),
  }
}

function isEmptyDraft(d: DraftAdj): boolean {
  return d.trimStart == null && d.trimEnd == null && d.crop == null && d.slowMo.length === 0
}

/**
 * Crop drawing overlay for Adjust mode. Drag on the video to draw a crop
 * rectangle; drag inside an existing rectangle to move it.
 */
function CropOverlay({
  boxRef,
  crop,
  onCrop,
}: {
  boxRef: React.RefObject<HTMLDivElement | null>
  crop: VideoCrop | null
  onCrop: (c: VideoCrop | null) => void
}) {
  const [drawing, setDrawing] = useState<{ x0: number; y0: number; x1: number; y1: number } | null>(null)
  const [moving, setMoving] = useState<{ orig: VideoCrop; sx: number; sy: number } | null>(null)

  const toFrac = (clientX: number, clientY: number) => {
    const r = boxRef.current?.getBoundingClientRect()
    if (!r || r.width <= 0 || r.height <= 0) return null
    return {
      x: Math.min(1, Math.max(0, (clientX - r.left) / r.width)),
      y: Math.min(1, Math.max(0, (clientY - r.top) / r.height)),
    }
  }

  const shown = drawing
    ? {
        x: Math.min(drawing.x0, drawing.x1),
        y: Math.min(drawing.y0, drawing.y1),
        w: Math.abs(drawing.x1 - drawing.x0),
        h: Math.abs(drawing.y1 - drawing.y0),
      }
    : crop

  return (
    <div
      className="absolute inset-0 z-20 cursor-crosshair touch-none"
      onPointerDown={(e) => {
        const p = toFrac(e.clientX, e.clientY)
        if (!p) return
        ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
        if (crop && p.x >= crop.x && p.x <= crop.x + crop.w && p.y >= crop.y && p.y <= crop.y + crop.h) {
          setMoving({ orig: crop, sx: p.x, sy: p.y })
        } else {
          setDrawing({ x0: p.x, y0: p.y, x1: p.x, y1: p.y })
        }
      }}
      onPointerMove={(e) => {
        const p = toFrac(e.clientX, e.clientY)
        if (!p) return
        if (drawing) {
          setDrawing({ ...drawing, x1: p.x, y1: p.y })
        } else if (moving) {
          const w = moving.orig.w
          const h = moving.orig.h
          const nx = Math.min(1 - w, Math.max(0, moving.orig.x + (p.x - moving.sx)))
          const ny = Math.min(1 - h, Math.max(0, moving.orig.y + (p.y - moving.sy)))
          onCrop({ x: nx, y: ny, w, h })
        }
      }}
      onPointerUp={() => {
        if (drawing) {
          const w = Math.abs(drawing.x1 - drawing.x0)
          const h = Math.abs(drawing.y1 - drawing.y0)
          if (w > 0.02 && h > 0.02) {
            onCrop({
              x: Math.min(drawing.x0, drawing.x1),
              y: Math.min(drawing.y0, drawing.y1),
              w,
              h,
            })
          }
          setDrawing(null)
        }
        setMoving(null)
      }}
    >
      {shown && shown.w > 0 && shown.h > 0 && (
        <div
          className="absolute border-2 border-emerald-400 bg-emerald-400/10"
          style={{
            left: `${shown.x * 100}%`,
            top: `${shown.y * 100}%`,
            width: `${shown.w * 100}%`,
            height: `${shown.h * 100}%`,
          }}
        />
      )}
      {!shown && (
        <div className="pointer-events-none absolute inset-x-0 top-2 text-center text-xs font-bold text-white/80">
          Drag on the video to draw the crop area
        </div>
      )}
    </div>
  )
}

/** Adjust panel: trim, crop, and slow-motion segments for one video. */
function AdjustPanel({
  draft,
  onDraft,
  duration,
  now,
  scrubTo,
  onSave,
  onReset,
  onCancel,
  hasSaved,
  tab,
  onTab,
}: {
  draft: DraftAdj
  onDraft: (d: DraftAdj) => void
  duration: number
  now: number
  scrubTo: (t: number) => void
  onSave: () => void
  onReset: () => void
  onCancel: () => void
  hasSaved: boolean
  tab: 'trim' | 'crop' | 'slowmo'
  onTab: (t: 'trim' | 'crop' | 'slowmo') => void
}) {
  const [smRate, setSmRate] = useState<(typeof SM_RATES)[number]>(0.5)
  const [smStart, setSmStart] = useState<number | null>(null)
  const adjApi = useVideoAdjustmentsOptional()

  const btn = 'rounded-full bg-white/10 px-3 py-1.5 text-xs font-bold text-white'
  const tabBtn = (active: boolean) =>
    active
      ? 'rounded-full bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white'
      : btn

  const setTrimStart = () => {
    const t = Math.round(now * 100) / 100
    if (draft.trimEnd != null && t >= draft.trimEnd) return
    onDraft({ ...draft, trimStart: t })
  }
  const setTrimEnd = () => {
    const t = Math.round(now * 100) / 100
    if (draft.trimStart != null && t <= draft.trimStart) return
    onDraft({ ...draft, trimEnd: t })
  }

  const addSlowMo = () => {
    if (smStart == null) return
    const end = Math.round(now * 100) / 100
    if (end <= smStart) return
    onDraft({
      ...draft,
      slowMo: [...draft.slowMo, { start: smStart, end, rate: smRate }].sort((a, b) => a.start - b.start),
    })
    setSmStart(null)
  }

  return (
    <div className="space-y-2 bg-black/90 px-4 py-3" onPointerDown={(e) => e.stopPropagation()}>
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          <button type="button" onClick={() => onTab('trim')} className={tabBtn(tab === 'trim')}>
            Trim
          </button>
          <button type="button" onClick={() => onTab('crop')} className={tabBtn(tab === 'crop')}>
            Crop
          </button>
          <button type="button" onClick={() => onTab('slowmo')} className={tabBtn(tab === 'slowmo')}>
            Slow-mo
          </button>
        </div>
        <button type="button" onClick={onCancel} className="rounded-full px-2 py-1.5 text-xs font-bold text-white/60">
          ✕
        </button>
      </div>

      <div className="flex items-center gap-3">
        <span className="w-24 shrink-0 text-right text-xs text-white/70 tabular-nums">{fmt(now)}</span>
        <input
          type="range"
          min={0}
          max={duration || 0}
          step={0.01}
          value={Math.min(now, duration || 0)}
          onChange={(e) => scrubTo(Number(e.target.value))}
          className="h-1.5 flex-1 accent-emerald-400"
          aria-label="Scrub video"
        />
        <span className="w-12 shrink-0 text-xs text-white/50 tabular-nums">{fmt(duration)}</span>
      </div>

      {tab === 'trim' && (
        <div className="space-y-2">
          <p className="text-[11px] text-white/60">
            Scrub to a frame, then mark it. Playback starts at the in-point and loops at the out-point.
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" onClick={setTrimStart} className={btn}>
              Set start {draft.trimStart != null ? `(${fmt(draft.trimStart)})` : ''}
            </button>
            <button type="button" onClick={setTrimEnd} className={btn}>
              Set end {draft.trimEnd != null ? `(${fmt(draft.trimEnd)})` : ''}
            </button>
            {(draft.trimStart != null || draft.trimEnd != null) && (
              <button
                type="button"
                onClick={() => onDraft({ ...draft, trimStart: null, trimEnd: null })}
                className="rounded-full px-2 py-1.5 text-xs font-bold text-red-400"
              >
                Clear trim
              </button>
            )}
          </div>
        </div>
      )}

      {tab === 'crop' && (
        <div className="space-y-2">
          <p className="text-[11px] text-white/60">
            Drag on the video to draw the crop area. Drag inside it to move it.
          </p>
          <div className="flex items-center gap-2">
            {draft.crop ? (
              <span className="text-xs text-emerald-300">Crop set ✓</span>
            ) : (
              <span className="text-xs text-white/50">No crop — full frame shows</span>
            )}
            {draft.crop && (
              <button
                type="button"
                onClick={() => onDraft({ ...draft, crop: null })}
                className="rounded-full px-2 py-1.5 text-xs font-bold text-red-400"
              >
                Clear crop
              </button>
            )}
          </div>
        </div>
      )}

      {tab === 'slowmo' && (
        <div className="space-y-2">
          <p className="text-[11px] text-white/60">
            Mark a range to auto-play in slow motion. Scrub, mark start, scrub, mark end.
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex gap-1">
              {SM_RATES.map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setSmRate(r)}
                  className={r === smRate ? 'rounded-full bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white' : btn}
                >
                  {r}x
                </button>
              ))}
            </div>
            <button type="button" onClick={() => setSmStart(Math.round(now * 100) / 100)} className={btn}>
              Mark start {smStart != null ? `(${fmt(smStart)})` : ''}
            </button>
            <button type="button" onClick={addSlowMo} disabled={smStart == null} className={`${btn} disabled:opacity-40`}>
              Mark end
            </button>
          </div>
          {draft.slowMo.length > 0 && (
            <div className="space-y-1">
              {draft.slowMo.map((s, i) => (
                <div key={i} className="flex items-center justify-between rounded-lg bg-white/5 px-2 py-1">
                  <span className="text-xs text-white/80 tabular-nums">
                    {fmt(s.start)} – {fmt(s.end)} · {s.rate}x
                  </span>
                  <button
                    type="button"
                    onClick={() => onDraft({ ...draft, slowMo: draft.slowMo.filter((_, j) => j !== i) })}
                    className="px-2 py-0.5 text-xs font-bold text-red-400"
                    aria-label="Remove slow motion segment"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="flex items-center gap-2 pt-1">
        <button
          type="button"
          onClick={onSave}
          disabled={!adjApi || isEmptyDraft(draft)}
          className="flex-1 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-40"
        >
          Save adjustments
        </button>
        {hasSaved && (
          <button type="button" onClick={onReset} className="rounded-xl bg-white/10 px-4 py-2 text-sm font-bold text-red-300">
            Reset
          </button>
        )}
      </div>
      <p className="text-[10px] text-white/40">
        Saved per video. Applies everywhere this video plays. Original file untouched.
      </p>
    </div>
  )
}

/**
 * Analysis player for a local video: play/pause, scrub, speed, flip, A/B loop.
 * Autoplays and loops on open. Applies the video's saved adjustments
 * (trim, crop, slow-motion) and offers an Adjust mode to change them.
 */
function LocalAnalysisPlayer({ url }: { url: string }) {
  const ref = useRef<HTMLVideoElement>(null)
  const boxRef = useRef<HTMLDivElement>(null)
  const adjApi = useVideoAdjustmentsOptional()
  const savedAdj = useAdjustment(url)
  const [playing, setPlaying] = useState(false)
  const [now, setNow] = useState(0)
  const [dur, setDur] = useState(0)
  const [speed, setSpeed] = useState<(typeof SPEEDS)[number]>(1)
  const [flipped, setFlipped] = useState(false)
  const [loopA, setLoopA] = useState<number | null>(null)
  const [loopB, setLoopB] = useState<number | null>(null)
  const [adjusting, setAdjusting] = useState(false)
  const [adjustTab, setAdjustTab] = useState<'trim' | 'crop' | 'slowmo'>('trim')
  const [draft, setDraft] = useState<DraftAdj | null>(null)

  // The adjustments in effect: the working draft while adjusting, else saved.
  const active: DraftAdj = useMemo(
    () => (adjusting && draft ? draft : draftFrom(savedAdj)),
    [adjusting, draft, savedAdj],
  )
  const trimStart = active.trimStart
  const trimEnd = active.trimEnd

  // Effective loop window: session A/B loop intersected with the saved trim.
  const lo = Math.max(loopA ?? 0, trimStart ?? 0)
  const hiRaw = Math.min(loopB ?? Infinity, trimEnd ?? Infinity)
  const hi = Number.isFinite(hiRaw) ? hiRaw : null

  const toggle = useCallback(() => {
    const v = ref.current
    if (!v) return
    if (v.paused) void v.play().catch(() => {})
    else v.pause()
  }, [])

  // Keep the element's rate in sync with the chosen speed when no slow-mo
  // segment is driving it (the timeupdate handler owns segment switching).
  useEffect(() => {
    const v = ref.current
    if (v && !adjusting) v.playbackRate = speed
  }, [speed, adjusting])

  const scrubTo = useCallback((t: number) => {
    const v = ref.current
    if (!v) return
    v.currentTime = t
    setNow(t)
  }, [])

  const handleTimeUpdate = useCallback(() => {
    const v = ref.current
    if (!v) return
    const t = v.currentTime
    // Never show trimmed-away footage (also covers adjustments that load
    // after playback has started).
    if (trimStart != null && t < trimStart - 0.05) {
      v.currentTime = trimStart
      setNow(trimStart)
      return
    }
    if (hi != null && t >= hi - 0.03) {
      v.currentTime = lo
      setNow(lo)
      if (v.paused) void v.play().catch(() => {})
      return
    }
    if (t < lo) {
      v.currentTime = lo
      setNow(lo)
      return
    }
    // Slow-motion segments drive the rate while inside one.
    const seg = active.slowMo.find((s) => t >= s.start && t < s.end)
    const target = seg ? seg.rate : speed
    if (v.playbackRate !== target) v.playbackRate = target
    setNow(t)
  }, [trimStart, hi, lo, active.slowMo, speed])

  const handleLoadedMetadata = useCallback(() => {
    const v = ref.current
    if (!v) return
    const d = v.duration || 0
    setDur(d)
    if (trimStart != null && trimStart > 0 && trimStart < d) {
      v.currentTime = trimStart
      setNow(trimStart)
    }
  }, [trimStart])

  const handleEnded = useCallback(() => {
    const v = ref.current
    if (!v) return
    v.currentTime = lo
    void v.play().catch(() => {})
  }, [lo])

  const cycleSpeed = () => {
    setSpeed((s) => SPEEDS[(SPEEDS.indexOf(s) + 1) % SPEEDS.length])
  }

  const enterAdjust = () => {
    ref.current?.pause()
    setDraft(draftFrom(savedAdj))
    setAdjustTab('trim')
    setAdjusting(true)
  }
  const cancelAdjust = () => {
    setDraft(null)
    setAdjusting(false)
  }
  const saveAdjust = () => {
    if (draft && adjApi) adjApi.save(url, draft)
    setDraft(null)
    setAdjusting(false)
  }
  const resetAdjust = () => {
    adjApi?.clear(url)
    setDraft({ trimStart: null, trimEnd: null, crop: null, slowMo: [] })
    setAdjusting(false)
  }

  const crop = active.crop
  const cropStyle: React.CSSProperties | undefined = crop
    ? {
        transformOrigin: '0 0',
        transform: `scale(${1 / crop.w}, ${1 / crop.h}) translate(${-crop.x * 100}%, ${-crop.y * 100}%)`,
      }
    : undefined

  const btn =
    'rounded-full bg-white/10 px-3 py-1.5 text-xs font-bold text-white hover:bg-white/20'

  return (
    <div className="flex h-full w-full flex-col">
      <div ref={boxRef} className="relative min-h-0 flex-1 overflow-hidden bg-black">
        <div className="h-full w-full" style={flipped ? { transform: 'scaleX(-1)' } : undefined}>
          {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
          <video
            ref={ref}
            src={url}
            autoPlay
            playsInline
            preload="auto"
            className="h-full w-full object-contain"
            style={cropStyle}
            onClick={adjusting ? undefined : toggle}
            onPlay={() => setPlaying(true)}
            onPause={() => setPlaying(false)}
            onLoadedMetadata={handleLoadedMetadata}
            onTimeUpdate={handleTimeUpdate}
            onEnded={handleEnded}
          />
        </div>
        {adjusting && adjustTab === 'crop' && (
          <CropOverlay
            boxRef={boxRef}
            crop={draft?.crop ?? null}
            onCrop={(c) => setDraft((d) => (d ? { ...d, crop: c } : d))}
          />
        )}
        {adjusting && (
          <div className="pointer-events-none absolute inset-x-0 top-2 z-10 text-center">
            <span className="rounded-full bg-emerald-600/90 px-3 py-1 text-xs font-bold text-white">
              Adjust mode
            </span>
          </div>
        )}
      </div>
      {adjusting && draft ? (
        <AdjustPanel
          draft={draft}
          onDraft={setDraft}
          duration={dur}
          now={now}
          scrubTo={scrubTo}
          onSave={saveAdjust}
          onReset={resetAdjust}
          onCancel={cancelAdjust}
          hasSaved={savedAdj != null}
          tab={adjustTab}
          onTab={setAdjustTab}
        />
      ) : (
        <div className="space-y-2 bg-black/80 px-4 py-3">
          <div className="flex items-center gap-3">
            <button type="button" onClick={toggle} className={btn} aria-label={playing ? 'Pause' : 'Play'}>
              {playing ? '⏸' : '▶'}
            </button>
            <input
              type="range"
              min={0}
              max={dur || 0}
              step={0.01}
              value={Math.min(now, dur || 0)}
              onChange={(e) => scrubTo(Number(e.target.value))}
              className="h-1.5 flex-1 accent-white"
              aria-label="Scrub video"
            />
            <span className="w-24 shrink-0 text-right text-xs text-white/70 tabular-nums">
              {fmt(now)} / {fmt(dur)}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button type="button" onClick={cycleSpeed} className={btn} aria-label="Playback speed">
              {speed}x
            </button>
            <button
              type="button"
              onClick={() => setFlipped((f) => !f)}
              className={flipped ? 'rounded-full bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white' : btn}
              aria-pressed={flipped}
              aria-label="Flip video horizontally"
            >
              ⇄ Flip
            </button>
            <button
              type="button"
              onClick={() => {
                const t = ref.current?.currentTime ?? 0
                setLoopA(t)
                if (loopB != null && loopB <= t) setLoopB(null)
              }}
              className={btn}
            >
              Set A
            </button>
            <button
              type="button"
              onClick={() => {
                const t = ref.current?.currentTime ?? 0
                setLoopB(t)
                if (loopA != null && loopA >= t) setLoopA(null)
              }}
              className={btn}
            >
              Set B
            </button>
            {(loopA != null || loopB != null) && (
              <button
                type="button"
                onClick={() => {
                  setLoopA(null)
                  setLoopB(null)
                }}
                className="rounded-full px-2 py-1.5 text-xs font-bold text-red-400"
              >
                Clear loop
              </button>
            )}
            <button type="button" onClick={enterAdjust} className={btn} aria-label="Adjust video">
              ✂ Adjust
            </button>
          </div>
          <div className="flex items-center gap-2 text-[11px] text-white/60">
            {(loopA != null || loopB != null) && (
              <span>
                Loops {loopA != null ? fmt(loopA) : '0:00'}–{loopB != null ? fmt(loopB) : 'end'}
              </span>
            )}
            {savedAdj && (savedAdj.trimStart != null || savedAdj.trimEnd != null || savedAdj.crop || savedAdj.slowMo.length > 0) && (
              <span className="rounded-full bg-emerald-600/25 px-2 py-0.5 font-bold text-emerald-300">
                Adjusted ✓
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export function ProofFullscreenPlayer({
  videos,
  index,
  onIndex,
  onClose,
}: {
  videos: ProofVideo[]
  index: number
  onIndex: (i: number) => void
  onClose: () => void
}) {
  const rootRef = useRef<HTMLDivElement>(null)
  const touchStart = useRef<{ x: number; y: number } | null>(null)
  const [entered, setEntered] = useState(false)
  // Chrome (header, arrows, caption) auto-hides so the video can be watched
  // clean; any tap brings it back for a few seconds.
  const [chromeVisible, setChromeVisible] = useState(true)
  const idleTimer = useRef<number | null>(null)
  const pokeChrome = useCallback(() => {
    setChromeVisible(true)
    if (idleTimer.current) window.clearTimeout(idleTimer.current)
    idleTimer.current = window.setTimeout(() => setChromeVisible(false), 3000)
  }, [])
  useEffect(() => {
    pokeChrome()
    return () => {
      if (idleTimer.current) window.clearTimeout(idleTimer.current)
    }
  }, [pokeChrome, index])

  const video = videos[index]
  const local = video ? isLocalVideo(video.url) : false
  const youTube = video ? !!youtubeEmbedSrc(video.url) : false

  // Try real browser fullscreen on open (needs the tap gesture — we get one).
  useEffect(() => {
    if (entered) return
    setEntered(true)
    const el = rootRef.current
    try {
      if (el && document.fullscreenEnabled && !document.fullscreenElement) {
        void el.requestFullscreen().catch(() => {})
      }
    } catch {
      /* fixed overlay is the fallback */
    }
  }, [entered])

  // Escape closes; arrow keys move through the carousel.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowRight') onIndex((index + 1) % videos.length)
      if (e.key === 'ArrowLeft') onIndex((index - 1 + videos.length) % videos.length)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [index, videos.length, onClose, onIndex])

  const onTouchStart = (e: React.TouchEvent) => {
    const t = e.touches[0]
    touchStart.current = t ? { x: t.clientX, y: t.clientY } : null
  }
  const onTouchEnd = (e: React.TouchEvent) => {
    const st = touchStart.current
    touchStart.current = null
    if (!st) return
    const t = e.changedTouches[0]
    if (!t) return
    const dx = t.clientX - st.x
    const dy = t.clientY - st.y
    // A deliberate downward swipe closes the player.
    if (dy > 90 && Math.abs(dy) > Math.abs(dx) * 1.4) {
      onClose()
      return
    }
    if (dx < -60) onIndex((index + 1) % videos.length)
    else if (dx > 60) onIndex((index - 1 + videos.length) % videos.length)
  }

  if (!video) return null

  const chromeCls = `transition-opacity duration-300 ${
    chromeVisible ? 'opacity-100' : 'pointer-events-none opacity-0'
  }`

  return (
    <div
      ref={rootRef}
      className="fixed inset-0 z-[120] flex flex-col bg-black/95 [touch-action:pan-x]"
      role="dialog"
      aria-modal="true"
      aria-label={`${video.who} video`}
      onPointerDown={pokeChrome}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      <div className={`flex items-center justify-between px-4 py-3 ${chromeCls}`}>
        <button
          type="button"
          onClick={onClose}
          className="rounded-full bg-white/10 px-4 py-2 text-sm font-bold text-white"
          aria-label="Close fullscreen player"
        >
          ✕ Close
        </button>
        <div className="text-xs text-white/60">
          {index + 1} / {videos.length}
        </div>
      </div>

      <div className="relative min-h-0 flex-1 px-2 sm:px-12">
        {videos.length > 1 && (
          <>
            <button
              type="button"
              onClick={() => onIndex((index - 1 + videos.length) % videos.length)}
              className={`absolute left-1 top-1/2 z-10 -translate-y-1/2 rounded-full bg-white/15 px-3 py-3 text-lg font-bold text-white ${chromeCls}`}
              aria-label="Previous video"
            >
              ‹
            </button>
            <button
              type="button"
              onClick={() => onIndex((index + 1) % videos.length)}
              className={`absolute right-1 top-1/2 z-10 -translate-y-1/2 rounded-full bg-white/15 px-3 py-3 text-lg font-bold text-white ${chromeCls}`}
              aria-label="Next video"
            >
              ›
            </button>
          </>
        )}
        <div key={video.url} className="h-full w-full">
          {local ? (
            <LocalAnalysisPlayer url={video.url} />
          ) : (
            <div className="mx-auto h-full max-w-[560px]">
              <InstagramEmbed
                url={video.url}
                compact
                fill
                fit="contain"
                markup
                markupSwipeSafe
              />
            </div>
          )}
        </div>
      </div>

      <div className={`px-4 py-3 text-center ${chromeCls}`}>
        <div className="text-sm font-bold text-white">{video.who}</div>
        {video.watchFor && <div className="mx-auto mt-0.5 max-w-xl text-xs text-white/70">{video.watchFor}</div>}
        {youTube && (
          <div className="mt-1 text-[11px] text-white/40">
            Plays in YouTube's player with YouTube's controls.
          </div>
        )}
      </div>
    </div>
  )
}
