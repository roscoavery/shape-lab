/**
 * Learn → Reference scroll — vertical snap through the gym Compare URL library.
 */

import { useEffect, useRef, useState } from 'react'
import { GymClipPlayer } from '../GymClipPlayer'
import { useGymLibrary } from '../../lib/gymLibrary'

export function ReferenceFeed() {
  const { clips, loading } = useGymLibrary()
  const [active, setActive] = useState(0)
  const rootRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const root = rootRef.current
    if (!root) return
    const cards = [...root.querySelectorAll<HTMLElement>('[data-feed-index]')]
    const io = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0]
        if (!visible) return
        const idx = Number((visible.target as HTMLElement).dataset.feedIndex)
        if (Number.isFinite(idx)) setActive(idx)
      },
      { root, threshold: [0.55, 0.75] },
    )
    for (const card of cards) io.observe(card)
    return () => io.disconnect()
  }, [clips.length])

  if (loading && clips.length === 0) {
    return (
      <p className="rounded-xl border border-[var(--panel-border)] bg-[var(--panel)] px-4 py-6 text-sm text-[var(--muted)]">
        Loading the gym reference library…
      </p>
    )
  }

  if (clips.length === 0) {
    return (
      <p className="rounded-xl border border-[var(--panel-border)] bg-[var(--panel)] px-4 py-6 text-sm text-[var(--muted)]">
        No gym URLs yet. Unlock Ryan, paste clips in Compare, then Save into the app.
      </p>
    )
  }

  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-[var(--panel-border)] bg-[var(--panel)] px-4 py-3 text-sm leading-relaxed text-[var(--muted)]">
        <strong className="text-[var(--text)]">Reference scroll.</strong> Same Instagram
        library as Compare — a rename there shows here. Swipe or scroll. Set{' '}
        <strong className="text-[var(--text)]">A</strong> and{' '}
        <strong className="text-[var(--text)]">B</strong> on a clip to loop just that
        piece; it saves for Classes and Compare too.
      </div>
      <div
        ref={rootRef}
        className="h-[min(78dvh,760px)] snap-y snap-mandatory overflow-y-auto rounded-2xl border border-[var(--panel-border)] bg-black"
      >
        {clips.map((clip, i) => (
          <article
            key={clip.id}
            data-feed-index={i}
            className="flex h-full snap-start flex-col"
          >
            <div className="min-h-0 flex-1">
              {Math.abs(i - active) <= 1 ? (
                <GymClipPlayer
                  url={clip.url}
                  itemId={clip.id}
                  fill
                  active={i === active}
                  persistUrl={clip.url}
                  compact
                  quiet
                />
              ) : (
                <div className="flex h-full items-center justify-center text-sm text-white/40">
                  {clip.name}
                </div>
              )}
            </div>
            <div className="shrink-0 bg-black/90 px-4 py-3">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--accent)]">
                {clip.collectionName}
              </p>
              <h3 className="text-base font-semibold text-white">{clip.name}</h3>
              {clip.keywords && clip.keywords.length > 0 && (
                <p className="mt-1 text-xs text-white/60">{clip.keywords.join(' · ')}</p>
              )}
              <p className="mt-1 text-[11px] text-white/40">
                {i + 1} / {clips.length}
              </p>
            </div>
          </article>
        ))}
      </div>
    </div>
  )
}
