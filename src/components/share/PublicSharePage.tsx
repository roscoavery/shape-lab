/**
 * Public shareable skill card (build 682).
 *
 * Rendered standalone at /share/:cardId with NO sign-in, no app nav, no
 * edit controls. Data comes from the public GET /api/share/card endpoint
 * (guide prose + pre-resolved video playback URLs). Phones are the primary
 * audience, so the layout is a single mobile-first column.
 */

import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react'
import type { ShareCard, ShareVideo } from '../../../server/shareCard'

type LoadState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; card: ShareCard }

function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <div className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-white/50">
      {children}
    </div>
  )
}

/**
 * Inline player with hidden-by-default chrome: tapping the video toggles
 * play/pause and reveals the controls; they auto-hide a few seconds after
 * the last touch while playing. Autoplays muted when mostly on screen.
 */
function SharePlayer({
  video,
  large,
}: {
  video: ShareVideo
  large?: boolean
}) {
  const ref = useRef<HTMLVideoElement>(null)
  const [chromeOpen, setChromeOpen] = useState(false)
  const [playing, setPlaying] = useState(false)
  const [time, setTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const hideTimer = useRef<number | null>(null)
  const tapRef = useRef<{ x: number; y: number; t: number } | null>(null)

  const src = video.playUrl ?? ''
  const loopA = video.startAt ?? null
  const loopB = video.endAt ?? null

  useEffect(() => {
    const v = ref.current
    if (!v || !src) return
    setChromeOpen(false)
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
    }
  }, [src])

  useEffect(() => {
    const v = ref.current
    if (!v) return
    if (loopA != null && Number.isFinite(loopA)) {
      const apply = () => {
        try {
          v.currentTime = Math.min(loopA, Math.max(0, (v.duration || loopA + 1) - 0.1))
        } catch {
          /* ignore */
        }
      }
      if (v.readyState >= 1) apply()
      else v.addEventListener('loadedmetadata', apply, { once: true })
    }
  }, [src, loopA])

  if (!src) {
    return (
      <a
        href={video.url}
        target="_blank"
        rel="noreferrer"
        className="flex aspect-[9/16] w-full flex-col items-center justify-center gap-2 rounded-xl bg-black p-4 text-center"
      >
        <span className="text-2xl">▶</span>
        <span className="text-sm font-bold text-white">Watch the video</span>
        <span className="text-[11px] text-white/60">{video.who}</span>
      </a>
    )
  }

  const armHide = () => {
    if (hideTimer.current !== null) window.clearTimeout(hideTimer.current)
    hideTimer.current = window.setTimeout(() => {
      const v = ref.current
      if (v && !v.paused) setChromeOpen(false)
    }, 3000)
  }

  const onPointerDown = (e: ReactPointerEvent) => {
    tapRef.current = { x: e.clientX, y: e.clientY, t: Date.now() }
  }
  const onPointerUp = (e: ReactPointerEvent) => {
    const start = tapRef.current
    tapRef.current = null
    if (!start) return
    const moved = Math.hypot(e.clientX - start.x, e.clientY - start.y)
    if (moved > 12 || Date.now() - start.t > 500) return
    const v = ref.current
    if (!v) return
    if (v.paused) {
      v.play().catch(() => {})
      setChromeOpen(true)
      armHide()
    } else {
      v.pause()
      setChromeOpen(true)
    }
  }

  const skip = (delta: number) => {
    const v = ref.current
    if (!v) return
    try {
      v.currentTime = Math.min(Math.max(0, v.currentTime + delta), v.duration || 0)
    } catch {
      /* ignore */
    }
    armHide()
  }

  const fmt = (s: number) => {
    if (!Number.isFinite(s) || s < 0) return '0:00'
    const m = Math.floor(s / 60)
    return `${m}:${String(Math.floor(s % 60)).padStart(2, '0')}`
  }

  return (
    <div
      className="relative aspect-[9/16] w-full select-none overflow-hidden rounded-xl bg-black"
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
    >
      <video
        ref={ref}
        src={src}
        className="h-full w-full object-contain"
        muted
        loop={loopB == null}
        playsInline
        preload="metadata"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onTimeUpdate={(e) => {
          const v = e.currentTarget
          if (loopB != null && v.currentTime >= loopB) {
            try {
              v.currentTime = loopA ?? 0
            } catch {
              /* ignore */
            }
          }
          setTime(v.currentTime)
        }}
        onLoadedMetadata={(e) => setDuration(e.currentTarget.duration || 0)}
      />
      {chromeOpen && (
        <div className="absolute inset-0 flex flex-col justify-between bg-gradient-to-b from-black/50 via-transparent to-black/60 p-2">
          <div className="flex justify-end">
            <span className="rounded-full bg-black/60 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-white/80">
              {video.platform === 'local' ? 'Video' : video.platform}
            </span>
          </div>
          <div>
            <div className="mb-1 flex items-center justify-center gap-6">
              <button
                type="button"
                aria-label="Back 10 seconds"
                onClick={(e) => {
                  e.stopPropagation()
                  skip(-10)
                }}
                onPointerDown={(e) => e.stopPropagation()}
                onPointerUp={(e) => e.stopPropagation()}
                className="rounded-full bg-black/60 p-2 text-lg text-white"
              >
                ↺<span className="text-[10px]">10</span>
              </button>
              <button
                type="button"
                aria-label={playing ? 'Pause' : 'Play'}
                onClick={(e) => {
                  e.stopPropagation()
                  const v = ref.current
                  if (!v) return
                  if (v.paused) {
                    v.play().catch(() => {})
                    armHide()
                  } else v.pause()
                }}
                onPointerDown={(e) => e.stopPropagation()}
                onPointerUp={(e) => e.stopPropagation()}
                className="rounded-full bg-black/60 p-3 text-xl text-white"
              >
                {playing ? '⏸' : '▶'}
              </button>
              <button
                type="button"
                aria-label="Forward 10 seconds"
                onClick={(e) => {
                  e.stopPropagation()
                  skip(10)
                }}
                onPointerDown={(e) => e.stopPropagation()}
                onPointerUp={(e) => e.stopPropagation()}
                className="rounded-full bg-black/60 p-2 text-lg text-white"
              >
                <span className="text-[10px]">10</span>↻
              </button>
            </div>
            <div className="flex items-center gap-2 text-[10px] text-white/80">
              <span>{fmt(time)}</span>
              <input
                type="range"
                min={0}
                max={duration || 0}
                step={0.1}
                value={Math.min(time, duration || 0)}
                aria-label="Seek"
                onChange={(e) => {
                  const v = ref.current
                  if (!v) return
                  try {
                    v.currentTime = Number(e.target.value)
                  } catch {
                    /* ignore */
                  }
                  armHide()
                }}
                onPointerDown={(e) => e.stopPropagation()}
                onPointerUp={(e) => e.stopPropagation()}
                onClick={(e) => e.stopPropagation()}
                className="w-full accent-white"
              />
              <span>-{fmt((duration || 0) - time)}</span>
            </div>
          </div>
        </div>
      )}
      {!large && !chromeOpen && !playing && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <span className="rounded-full bg-black/55 p-4 text-2xl text-white">▶</span>
        </div>
      )}
    </div>
  )
}

function VideoCard({ video, large }: { video: ShareVideo; large?: boolean }) {
  return (
    <div className={large ? 'w-full' : 'w-full'}>
      {video.platform === 'youtube' && video.playUrl ? (
        <div className="aspect-video w-full overflow-hidden rounded-xl bg-black">
          <iframe
            src={video.playUrl}
            title={video.who}
            className="h-full w-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      ) : (
        <SharePlayer video={video} large={large} />
      )}
      <div className="mt-1.5 text-sm font-bold text-white">{video.who}</div>
      {video.watchFor ? (
        <div className="text-xs text-white/60">{video.watchFor}</div>
      ) : null}
    </div>
  )
}

export default function PublicSharePage({ cardId }: { cardId: string }) {
  const [state, setState] = useState<LoadState>({ status: 'loading' })

  useEffect(() => {
    let cancelled = false
    setState({ status: 'loading' })
    fetch(`/api/share/card?id=${encodeURIComponent(cardId)}`)
      .then(async (r) => {
        if (!r.ok) {
          const body = await r.json().catch(() => null)
          throw new Error(
            (body && body.error) || 'This shared card could not be found.',
          )
        }
        return r.json() as Promise<ShareCard>
      })
      .then((card) => {
        if (!cancelled) setState({ status: 'ready', card })
      })
      .catch((err) => {
        if (!cancelled)
          setState({
            status: 'error',
            message: err instanceof Error ? err.message : 'Could not load this card.',
          })
      })
    return () => {
      cancelled = true
    }
  }, [cardId])

  return (
    <div className="min-h-dvh bg-[#0b0f14] text-white">
      <header className="border-b border-white/10 px-4 py-3">
        <div className="mx-auto flex max-w-xl items-center justify-between">
          <span className="text-sm font-extrabold tracking-wide">Shape Lab</span>
          <span className="text-[11px] font-semibold uppercase tracking-wider text-white/50">
            Shared skill card
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-xl px-4 pb-16 pt-5">
        {state.status === 'loading' && (
          <p className="py-16 text-center text-sm text-white/60">Loading the card…</p>
        )}
        {state.status === 'error' && (
          <div className="py-16 text-center">
            <p className="text-sm font-bold">{state.message}</p>
            <p className="mt-2 text-xs text-white/60">
              The link may be old, or the gym may be offline right now.
            </p>
          </div>
        )}
        {state.status === 'ready' && (
          <article className="space-y-6">
            <div>
              <h1 className="text-2xl font-extrabold">{state.card.name}</h1>
              <div className="mt-2 flex gap-2">
                <span className="rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-white/70">
                  {state.card.track}
                </span>
                <span className="rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-white/70">
                  Coach Ryan Williams
                </span>
              </div>
            </div>

            {state.card.featured && (
              <section>
                <SectionLabel>Featured</SectionLabel>
                <div className="mt-2 max-w-[420px]">
                  <VideoCard video={state.card.featured} large />
                </div>
              </section>
            )}

            {state.card.guideNeeds.length > 0 && (
              <section>
                <SectionLabel>Needs</SectionLabel>
                <ul className="mt-2 list-disc space-y-1.5 pl-5 text-[15px] leading-relaxed">
                  {state.card.guideNeeds.map((n) => (
                    <li key={n}>{n}</li>
                  ))}
                </ul>
              </section>
            )}

            {state.card.canBend.length > 0 && (
              <section>
                <SectionLabel>Can bend the rules</SectionLabel>
                <ul className="mt-2 list-disc space-y-1.5 pl-5 text-[15px] leading-relaxed">
                  {state.card.canBend.map((n) => (
                    <li key={n}>{n}</li>
                  ))}
                </ul>
              </section>
            )}

            {state.card.ask && (
              <section>
                <SectionLabel>Ask your coach</SectionLabel>
                <p className="mt-2 whitespace-pre-line text-[15px] leading-relaxed text-white/90">
                  {state.card.ask}
                </p>
              </section>
            )}

            {state.card.noteBlocks.length > 0 && (
              <section>
                <SectionLabel>Coach Ryan's notes</SectionLabel>
                <div className="mt-2 space-y-2.5">
                  {state.card.noteBlocks.map((b, i) =>
                    b.kind === 'quote' ? (
                      <blockquote
                        key={i}
                        className="rounded-lg border-l-4 border-amber-400/70 bg-amber-300/10 px-3 py-2.5 text-sm italic"
                      >
                        &ldquo;{b.text}&rdquo;
                        {b.source && (
                          <div className="mt-1 text-xs not-italic text-white/60">
                            — {b.source}
                          </div>
                        )}
                      </blockquote>
                    ) : (
                      <div key={i} className="rounded-lg bg-sky-300/10 px-3 py-2.5 text-sm">
                        <span className="font-bold text-sky-300">Ryan: </span>
                        <span className="whitespace-pre-line">{b.text}</span>
                      </div>
                    ),
                  )}
                </div>
              </section>
            )}

            {state.card.videos.length > 0 && (
              <section>
                <SectionLabel>References</SectionLabel>
                <p className="mt-1 text-xs text-white/60">Watch it taught and done.</p>
                <div className="mt-3 grid grid-cols-2 gap-3">
                  {state.card.videos.map((v) => (
                    <VideoCard key={v.url} video={v} />
                  ))}
                </div>
              </section>
            )}

            {state.card.ryanNote && (
              <section>
                <SectionLabel>In Ryan's words</SectionLabel>
                <p className="mt-2 whitespace-pre-line text-[15px] leading-relaxed text-white/90">
                  {state.card.ryanNote}
                </p>
              </section>
            )}
          </article>
        )}
      </main>

      <footer className="border-t border-white/10 px-4 py-6">
        <p className="mx-auto max-w-xl text-center text-xs text-white/50">
          Shared from Shape Lab · This link works while Coach Ryan's gym is online.
        </p>
      </footer>
    </div>
  )
}
