/**
 * Fullscreen proof player for skill cards.
 *
 * Any video in a card's "The proof" section can be opened here: the player
 * goes (near-)fullscreen, arrows and swipe move through the other videos on
 * the card, and every video gets the same analysis controls as the reference
 * scroll player — scrub, slow motion, flip (mirror), A/B loop.
 *
 * Social videos (Instagram/TikTok) are downloaded into the app cache and play
 * through the same workbench as local videos. YouTube plays in its official
 * iframe with YouTube's own controls.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { InstagramEmbed } from '../compare/InstagramEmbed'
import { youtubeEmbedSrc } from '../../lib/socialUrls'
import type { ProofVideo } from '../../config/techniqueEvidence'

/** True for local video files (public/videos/...) vs social embeds. */
function isLocalVideo(url: string): boolean {
  return /\.(mp4|mov|webm)(\?|#|$)/i.test(url)
}

const SPEEDS = [0.25, 0.5, 1] as const

function fmt(t: number): string {
  if (!Number.isFinite(t)) return '0:00'
  const m = Math.floor(t / 60)
  const s = Math.floor(t % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

/** Analysis player for a local video: play/pause, scrub, speed, flip, A/B loop. */
function LocalAnalysisPlayer({ url }: { url: string }) {
  const ref = useRef<HTMLVideoElement>(null)
  const [playing, setPlaying] = useState(false)
  const [now, setNow] = useState(0)
  const [dur, setDur] = useState(0)
  const [speed, setSpeed] = useState<(typeof SPEEDS)[number]>(1)
  const [flipped, setFlipped] = useState(false)
  const [loopA, setLoopA] = useState<number | null>(null)
  const [loopB, setLoopB] = useState<number | null>(null)

  const toggle = useCallback(() => {
    const v = ref.current
    if (!v) return
    if (v.paused) void v.play().catch(() => {})
    else v.pause()
  }, [])

  useEffect(() => {
    const v = ref.current
    if (v) v.playbackRate = speed
  }, [speed])

  // A/B loop while playing.
  useEffect(() => {
    const v = ref.current
    if (!v) return
    const onTick = () => {
      if (loopA != null && v.currentTime < loopA) v.currentTime = loopA
      if (loopB != null && v.currentTime >= loopB) {
        v.currentTime = loopA ?? 0
        void v.play().catch(() => {})
      }
    }
    v.addEventListener('timeupdate', onTick)
    return () => v.removeEventListener('timeupdate', onTick)
  }, [loopA, loopB])

  const scrubTo = (t: number) => {
    const v = ref.current
    if (!v) return
    v.currentTime = t
    setNow(t)
  }

  const cycleSpeed = () => {
    setSpeed((s) => SPEEDS[(SPEEDS.indexOf(s) + 1) % SPEEDS.length])
  }

  const btn =
    'rounded-full bg-white/10 px-3 py-1.5 text-xs font-bold text-white hover:bg-white/20'

  return (
    <div className="flex h-full w-full flex-col">
      <div className="relative min-h-0 flex-1 bg-black">
        {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
        <video
          ref={ref}
          src={url}
          playsInline
          preload="auto"
          className="h-full w-full object-contain"
          style={flipped ? { transform: 'scaleX(-1)' } : undefined}
          onClick={toggle}
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          onLoadedMetadata={(e) => setDur(e.currentTarget.duration)}
          onTimeUpdate={(e) => setNow(e.currentTarget.currentTime)}
        />
      </div>
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
          {(loopA != null || loopB != null) && (
            <span className="text-[11px] text-white/60">
              Loops {loopA != null ? fmt(loopA) : '0:00'}–{loopB != null ? fmt(loopB) : 'end'}
            </span>
          )}
        </div>
      </div>
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
