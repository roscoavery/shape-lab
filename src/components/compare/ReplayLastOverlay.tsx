/**
 * Replay Last overlay — matches the phone player: back, save, hide,
 * filmstrip scrub with a gold playhead, then play / frame / A / B / slo-mo.
 */

import { useEffect, useRef, useState, type PointerEvent, type ReactNode } from 'react'
import { IconDots, IconEye, IconEyeOff, IconSwap } from './CompareHud'
import { hudAvoidPipRightClass, useCompareLayout } from './compareLayout'

export function IconBack() {
  return (
    <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M15.5 5 8 12l7.5 7" />
    </svg>
  )
}

export function IconDownload() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M12 4v12" />
      <path d="m7 12 5 5 5-5" />
      <path d="M5 20h14" />
    </svg>
  )
}

export function IconCollapse() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M9 9 4.5 4.5M9 9H5m4 0V5" />
      <path d="m15 15 4.5 4.5M15 15h4m-4 0v4" />
    </svg>
  )
}

export function IconExpand() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M9 9 4.5 4.5M4.5 4.5H8.5M4.5 4.5V8.5" />
      <path d="m15 15 4.5 4.5M19.5 19.5H15.5M19.5 19.5V15.5" />
    </svg>
  )
}

function IconSkipBack() {
  return (
    <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M5 6v12" />
      <path d="M19 6v12L8 12z" fill="currentColor" stroke="none" />
    </svg>
  )
}

function IconSkipFwd() {
  return (
    <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M5 6v12L16 12z" fill="currentColor" stroke="none" />
      <path d="M19 6v12" />
    </svg>
  )
}

function IconPlay() {
  return (
    <svg viewBox="0 0 24 24" className="h-8 w-8" fill="currentColor" aria-hidden>
      <path d="M8 5.5v13L19 12z" />
    </svg>
  )
}

function IconPause() {
  return (
    <svg viewBox="0 0 24 24" className="h-8 w-8" fill="currentColor" aria-hidden>
      <rect x="6.5" y="5.5" width="3.4" height="13" rx="0.5" />
      <rect x="14.1" y="5.5" width="3.4" height="13" rx="0.5" />
    </svg>
  )
}

const FRAME = 1 / 30
const GOLD = '#f0c400'
const FRAMES = 28

function seekEl(video: HTMLVideoElement, t: number): Promise<void> {
  return new Promise((resolve) => {
    const done = () => {
      video.removeEventListener('seeked', done)
      resolve()
    }
    video.addEventListener('seeked', done)
    video.currentTime = t
  })
}

function ReplayFilmstrip({
  src,
  duration,
  windowStart = 0,
  windowLen,
  time,
  onSeek,
}: {
  src: string
  duration: number
  windowStart?: number
  windowLen?: number
  time: number
  onSeek: (t: number) => void
}) {
  const span = windowLen && windowLen > 0.05 ? windowLen : duration
  const origin = windowStart > 0 ? windowStart : 0
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const hostRef = useRef<HTMLDivElement | null>(null)
  const [ready, setReady] = useState(false)
  const drag = useRef(false)

  useEffect(() => {
    if (!src || !(duration > 0.2)) return
    let cancelled = false
    const video = document.createElement('video')
    video.muted = true
    video.playsInline = true
    video.preload = 'auto'
    const canvas = canvasRef.current
    if (!canvas) return

    const run = async () => {
      await new Promise<void>((resolve, reject) => {
        video.onloadedmetadata = () => resolve()
        video.onerror = () => reject(new Error('filmstrip'))
        video.src = src
      })
      if (cancelled) return
      const d = Number.isFinite(video.duration) && video.duration < 1e6 ? video.duration : duration
      const start = Math.max(0, Math.min(origin, Math.max(0, d - 0.05)))
      const len = Math.max(0.05, Math.min(span, d - start))
      const n = FRAMES
      const fw = 48
      const fh = 72
      canvas.width = n * fw
      canvas.height = fh
      const ctx = canvas.getContext('2d')
      if (!ctx) return
      ctx.fillStyle = '#111'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      for (let i = 0; i < n; i++) {
        if (cancelled) return
        const t = Math.min(d - 0.04, start + ((i + 0.5) / n) * len)
        await seekEl(video, Math.max(0, t))
        if (cancelled) return
        ctx.drawImage(video, i * fw, 0, fw, fh)
      }
      if (!cancelled) setReady(true)
    }

    void run().catch(() => {})
    return () => {
      cancelled = true
      video.src = ''
    }
  }, [src, duration, origin, span])

  const at = span > 0 ? Math.min(1, Math.max(0, (time - origin) / span)) : 0

  const fromEvent = (e: PointerEvent<HTMLDivElement>) => {
    const host = hostRef.current
    if (!host || span <= 0) return
    const rect = host.getBoundingClientRect()
    const x = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width))
    onSeek(origin + x * span)
  }

  const [grabbing, setGrabbing] = useState(false)

  return (
    <div
      ref={hostRef}
      className="relative h-9 w-full overflow-hidden rounded-md bg-black touch-none"
      onPointerDown={(e) => {
        drag.current = true
        setGrabbing(true)
        e.currentTarget.setPointerCapture(e.pointerId)
        fromEvent(e)
      }}
      onPointerMove={(e) => {
        if (drag.current) fromEvent(e)
      }}
      onPointerUp={() => {
        drag.current = false
        setGrabbing(false)
      }}
      onPointerCancel={() => {
        drag.current = false
        setGrabbing(false)
      }}
      role="slider"
      aria-label="Scrub replay"
      aria-valuemin={origin}
      aria-valuemax={origin + span}
      aria-valuenow={time}
    >
      <canvas
        ref={canvasRef}
        className={`h-full w-full ${ready ? 'opacity-100' : 'opacity-50'}`}
        style={{ objectFit: 'fill' }}
      />
      {/* Grabbable playhead knob: a visible handle that rides the scrub position. */}
      <div className="pointer-events-none absolute top-0 z-10 h-full" style={{ left: `${at * 100}%` }}>
        <div className="absolute inset-y-0 -translate-x-1/2" style={{ width: 2, background: GOLD }} />
        <div
          className={`absolute top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 bg-black/85 transition-transform ${
            grabbing ? 'scale-125 cursor-grabbing' : 'cursor-grab'
          }`}
          style={{ width: 22, height: 22, borderColor: GOLD, boxShadow: '0 1px 6px rgba(0,0,0,0.65)' }}
        >
          <span className="absolute inset-0 flex items-center justify-center gap-[3px]">
            <span className="h-2 w-[2px] rounded-full" style={{ background: GOLD }} />
            <span className="h-2 w-[2px] rounded-full" style={{ background: GOLD }} />
            <span className="h-2 w-[2px] rounded-full" style={{ background: GOLD }} />
          </span>
        </div>
      </div>
    </div>
  )
}

function Tile({
  active,
  onClick,
  label,
  children,
}: {
  active?: boolean
  onClick: () => void
  label: string
  children: ReactNode
}) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={active}
      onClick={onClick}
      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-[13px] font-semibold ${
        active ? 'bg-white text-black' : 'bg-white/12 text-white'
      }`}
    >
      {children}
    </button>
  )
}

type Props = {
  src: string
  duration: number
  windowStart?: number
  windowLen?: number
  time: number
  playing: boolean
  speed: number
  pointA: number | null
  pointB: number | null
  chromeOpen: boolean
  saving?: boolean
  onSeek: (t: number) => void
  onTogglePlay: () => void
  onMarkA: () => void
  onMarkB: () => void
  onSpeed: (s: number) => void
  onBack: () => void
  onSave: () => void
  onSaveInApp?: () => void
  onToggleChrome: () => void
  onMinimize?: () => void
  libraryBusy?: boolean
  libraryNotice?: string | null
  libraryError?: string | null
  onUseAsReference?: () => void
  onSaveToDrill?: () => void
  onSaveToCollection?: () => void
}

export function ReplayLastOverlay({
  src,
  duration,
  windowStart = 0,
  windowLen,
  time,
  playing,
  speed,
  pointA,
  pointB,
  chromeOpen,
  saving = false,
  onSeek,
  onTogglePlay,
  onMarkA,
  onMarkB,
  onSpeed,
  onBack,
  onSave,
  onSaveInApp,
  onToggleChrome,
  onMinimize,
  libraryBusy = false,
  libraryNotice = null,
  libraryError = null,
  onUseAsReference,
  onSaveToDrill,
  onSaveToCollection,
}: Props) {
  const { focus, fullscreen, pipCorner } = useCompareLayout()
  const chipRight = hudAvoidPipRightClass(fullscreen, focus, pipCorner, 'cam')
  const step = (dir: -1 | 1) => onSeek(time + dir * FRAME)
  const [menuOpen, setMenuOpen] = useState(false)
  const [filmstripHidden, setFilmstripHidden] = useState(() => {
    try {
      return window.localStorage.getItem('sl-compare-filmstrip-hidden') === '1'
    } catch {
      return false
    }
  })
  const toggleFilmstrip = () => {
    setFilmstripHidden((h) => {
      const next = !h
      try {
        window.localStorage.setItem('sl-compare-filmstrip-hidden', next ? '1' : '0')
      } catch {}
      return next
    })
  }
  const hasLibraryActions = Boolean(onUseAsReference || onSaveToDrill || onSaveToCollection)
  const runLibraryAction = (fn?: () => void) => {
    setMenuOpen(false)
    if (fn) fn()
  }

  return (
    <>
      <button
        type="button"
        onClick={onBack}
        className="absolute left-2 top-2 z-[40] text-white"
        aria-label="Back to delay cam"
      >
        <IconBack />
      </button>

      <div className={`absolute z-[40] flex flex-col items-center gap-4 text-white ${chromeOpen ? 'bottom-[12.5rem]' : 'bottom-4'} ${chipRight}`}>
        {onMinimize && (
          <button type="button" onClick={onMinimize} aria-label="Swap replay with the reference still">
            <IconSwap />
          </button>
        )}
        <button
          type="button"
          onClick={onSave}
          onContextMenu={(e) => {
            if (!onSaveInApp) return
            e.preventDefault()
            onSaveInApp()
          }}
          disabled={saving}
          className="disabled:opacity-40"
          aria-label="Save to Photos"
          title="Save to Photos"
        >
          <IconDownload />
        </button>
        <button type="button" onClick={onToggleChrome} aria-label={chromeOpen ? 'Hide bar' : 'Show bar'}>
          {chromeOpen ? <IconCollapse /> : <IconExpand />}
        </button>
      </div>

      {chromeOpen && (
        <div
          className="pointer-events-auto absolute inset-x-0 bottom-0 z-[30] bg-gradient-to-t from-black via-black/85 to-transparent px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-6 text-white"
          onPointerDown={(e) => e.stopPropagation()}
        >
          <div className="relative mb-1 flex h-7 items-center">
            <span
              className="absolute -translate-x-1/2 text-[11px] font-medium tabular-nums text-white"
              style={{
                left: `clamp(1.7rem, ${
                  (windowLen ?? duration) > 0
                    ? ((time - windowStart) / (windowLen ?? duration)) * 100
                    : 0
                }%, calc(100% - 4.25rem))`,
              }}
            >
              {time.toFixed(3)}s
            </span>
            <div className="absolute right-0 top-1/2 flex -translate-y-1/2 items-center gap-0.5">
              <button
                type="button"
                onClick={toggleFilmstrip}
                className="flex h-7 w-7 items-center justify-center rounded-full text-white/75 hover:bg-white/10"
                aria-label={filmstripHidden ? 'Show scrub bar' : 'Hide scrub bar'}
                title={filmstripHidden ? 'Show scrub bar' : 'Hide scrub bar'}
              >
                {filmstripHidden ? <IconEyeOff /> : <IconEye />}
              </button>
              {hasLibraryActions && (
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setMenuOpen((o) => !o)}
                    className="flex h-7 w-7 items-center justify-center rounded-full text-white/75 hover:bg-white/10"
                    aria-label="More actions"
                    aria-expanded={menuOpen}
                    title="More actions"
                  >
                    <IconDots />
                  </button>
                  {menuOpen && (
                    <>
                      <button
                        type="button"
                        aria-label="Close menu"
                        className="fixed inset-0 z-[44] cursor-default"
                        onClick={() => setMenuOpen(false)}
                      />
                      <div className="absolute bottom-full right-0 z-[45] mb-2 w-56 overflow-hidden rounded-xl bg-[#1e1e20] shadow-2xl ring-1 ring-white/15">
                        {onUseAsReference ? (
                          <button
                            type="button"
                            disabled={libraryBusy}
                            onClick={() => runLibraryAction(onUseAsReference)}
                            className="flex w-full items-center px-4 py-3 text-left text-[13px] font-semibold text-[var(--accent)] active:bg-white/10 disabled:opacity-40"
                          >
                            Use as reference
                          </button>
                        ) : null}
                        {onSaveToDrill ? (
                          <button
                            type="button"
                            disabled={libraryBusy}
                            onClick={() => runLibraryAction(onSaveToDrill)}
                            className="flex w-full items-center border-t border-white/10 px-4 py-3 text-left text-[13px] font-medium text-white active:bg-white/10 disabled:opacity-40"
                          >
                            Save to drill library
                          </button>
                        ) : null}
                        {onSaveToCollection ? (
                          <button
                            type="button"
                            disabled={libraryBusy}
                            onClick={() => runLibraryAction(onSaveToCollection)}
                            className="flex w-full items-center border-t border-white/10 px-4 py-3 text-left text-[13px] font-medium text-white active:bg-white/10 disabled:opacity-40"
                          >
                            Save to collection
                          </button>
                        ) : null}
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
          {libraryError ? (
            <p className="mb-1 rounded-md bg-[#2a1518] px-2 py-1 text-[11px] text-[#ff8a8a]">{libraryError}</p>
          ) : libraryNotice ? (
            <p className="mb-1 rounded-md bg-[#102820] px-2 py-1 text-[11px] text-[var(--accent)]">{libraryNotice}</p>
          ) : null}
          {!filmstripHidden && (
            <ReplayFilmstrip
              src={src}
              duration={duration}
              windowStart={windowStart}
              windowLen={windowLen}
              time={time}
              onSeek={onSeek}
            />
          )}
          <div className="mt-2 flex items-center justify-evenly">
            <button type="button" onClick={() => step(-1)} aria-label="Previous frame" className="text-white">
              <IconSkipBack />
            </button>
            <button type="button" onClick={onTogglePlay} aria-label={playing ? 'Pause' : 'Play'} className="text-white">
              {playing ? <IconPause /> : <IconPlay />}
            </button>
            <button type="button" onClick={() => step(1)} aria-label="Next frame" className="text-white">
              <IconSkipFwd />
            </button>
            <Tile active={pointA !== null} onClick={onMarkA} label="Mark A">
              A
            </Tile>
            <Tile active={pointB !== null} onClick={onMarkB} label="Mark B">
              B
            </Tile>
            <Tile active={speed === 0.25} onClick={() => onSpeed(speed === 0.25 ? 1 : 0.25)} label="Slow motion 0.25x">
              .25
            </Tile>
            <Tile active={speed === 0.5} onClick={() => onSpeed(speed === 0.5 ? 1 : 0.5)} label="Slow motion 0.5x">
              .5
            </Tile>
          </div>
        </div>
      )}
    </>
  )
}
