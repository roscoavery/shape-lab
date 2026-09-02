/**
 * Learn → Reference scroll — vertical snap through the gym Compare URL library.
 */

import { useEffect, useMemo, useRef, useState } from 'react'
import { GymClipPlayer } from '../GymClipPlayer'
import { FavoriteStar } from '../FavoriteStar'
import { ClipOrganizeMenu } from '../library/ClipOrganizeMenu'
import { PhoneReelViewer } from '../PhoneReelViewer'
import { ShareReference } from '../share/ShareReference'
import { clipShareDraft } from '../../lib/shareReference'
import { CollapsibleSection } from '../CollapsibleSection'
import { useGymLibrary } from '../../lib/gymLibrary'
import { useFavorites } from '../../lib/favorites'
import { isCoachProfile, isGymAdmin } from '../../lib/profileRole'
import { itemMatchesQuery } from '../../lib/clipStore'
import type { Athlete } from '../../types'
import { prefetchNeighborClips } from '../../lib/igCache'
import { postedByFromUrl } from '../../lib/socialUrls'

type Props = {
  athlete?: Athlete | null
}

export function ReferenceFeed({ athlete = null }: Props) {
  const { clips, loading } = useGymLibrary()
  const favorites = useFavorites()
  const [active, setActive] = useState(0)
  const [onlyFavorites, setOnlyFavorites] = useState(false)
  const [query, setQuery] = useState('')
  const [flash, setFlash] = useState<string | null>(null)
  const [reelOpen, setReelOpen] = useState(false)
  const [reelIndex, setReelIndex] = useState(0)
  const rootRef = useRef<HTMLDivElement | null>(null)

  const editor = {
    gymEditor: isGymAdmin(athlete),
    personalEditor: isCoachProfile(athlete) && !isGymAdmin(athlete),
    profileId: athlete?.id ?? null,
  }

  const visible = useMemo(() => {
    const q = query.trim()
    return clips.filter((c) => {
      if (onlyFavorites && !favorites.isUrlFavorite(c.url)) return false
      if (!q) return true
      const asItem = {
        id: c.id,
        kind: c.kind,
        name: c.name,
        url: c.url,
        keywords: c.keywords,
        createdAt: '',
      }
      return (
        itemMatchesQuery(asItem, q) || c.collectionName.toLowerCase().includes(q.toLowerCase())
      )
    })
  }, [clips, onlyFavorites, favorites, query])

  useEffect(() => {
    setActive(0)
  }, [query, onlyFavorites, visible.length])

  useEffect(() => {
    const root = rootRef.current
    if (!root) return
    const cards = [...root.querySelectorAll<HTMLElement>('[data-feed-index]')]
    const io = new IntersectionObserver(
      (entries) => {
        const visibleCards = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0]
        if (!visibleCards) return
        const idx = Number((visibleCards.target as HTMLElement).dataset.feedIndex)
        if (Number.isFinite(idx)) setActive(idx)
      },
      { root, threshold: [0.55, 0.75] },
    )
    for (const card of cards) io.observe(card)
    return () => io.disconnect()
  }, [visible.length])

  useEffect(() => {
    prefetchNeighborClips(visible, active, 2)
  }, [visible, active])

  useEffect(() => {
    visible.slice(0, 6).forEach((clip) => {
      void prefetchNeighborClips([clip], 0, 0)
    })
  }, [visible])

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
        No gym URLs yet. Unlock Ryan to paste clips into the gym library, or unlock a coach profile to add URLs in your own collections.
      </p>
    )
  }

  return (
    <div className="space-y-3">
      <CollapsibleSection
        title="Reference scroll"
        hint="Same library as Compare. Search, collect, or add to a collage."
        defaultOpen={false}
      >
        <p className="text-sm leading-relaxed text-[var(--muted)]">
          A rename in Compare shows here. Star a URL or a saved A/B loop. Set A and B
          on a clip to loop that piece — it saves for Classes and Compare too.
        </p>
      </CollapsibleSection>
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search a shape, name, or collection…"
        aria-label="Search reference videos"
        className="w-full rounded-lg border border-[var(--panel-border)] bg-[#0d1218] px-3 py-2 text-sm"
      />
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          aria-pressed={!onlyFavorites}
          onClick={() => setOnlyFavorites(false)}
          className={
            !onlyFavorites
              ? 'rounded-lg bg-[var(--accent-dim)] px-3 py-1.5 text-sm font-semibold text-white'
              : 'rounded-lg border border-[var(--panel-border)] px-3 py-1.5 text-sm text-[var(--muted)]'
          }
        >
          All
        </button>
        <button
          type="button"
          aria-pressed={onlyFavorites}
          onClick={() => setOnlyFavorites(true)}
          className={
            onlyFavorites
              ? 'rounded-lg bg-[#f5d76e] px-3 py-1.5 text-sm font-semibold text-[#06281f]'
              : 'rounded-lg border border-[var(--panel-border)] px-3 py-1.5 text-sm text-[var(--muted)]'
          }
        >
          ★ Favorites
        </button>
        {query ? (
          <button
            type="button"
            onClick={() => setQuery('')}
            className="rounded-lg border border-[var(--panel-border)] px-3 py-1.5 text-sm text-[var(--muted)]"
          >
            Clear
          </button>
        ) : null}
        <span className="text-xs text-[var(--muted)]">
          {visible.length} clip{visible.length === 1 ? '' : 's'}
        </span>
        {visible.length > 0 ? (
          <button
            type="button"
            onClick={() => {
              setReelIndex(active)
              setReelOpen(true)
            }}
            className="rounded-full bg-white px-3 py-1.5 text-sm font-semibold text-black"
          >
            Full screen reels
          </button>
        ) : null}
      </div>
      {flash ? (
        <p className="rounded-lg border border-[var(--panel-border)] bg-[#152018] px-3 py-2 text-sm text-[var(--text)]">
          {flash}
        </p>
      ) : null}
      {onlyFavorites && visible.length === 0 && !query ? (
        <p className="rounded-xl border border-[var(--panel-border)] bg-[var(--panel)] px-4 py-6 text-sm text-[var(--muted)]">
          No favorite URLs yet. Star clips in Compare or here, then open Favorites.
        </p>
      ) : visible.length === 0 ? (
        <p className="rounded-xl border border-[var(--panel-border)] bg-[var(--panel)] px-4 py-6 text-sm text-[var(--muted)]">
          No clips match “{query}”. Try a shape keyword or a collection name.
        </p>
      ) : (
        <div
          ref={rootRef}
          className="h-[min(78dvh,760px)] snap-y snap-mandatory overflow-y-auto rounded-2xl border border-[var(--panel-border)] bg-black"
        >
          {visible.map((clip, i) => (
            <article
              key={clip.id}
              data-feed-index={i}
              className="flex h-full snap-start flex-col"
            >
              <div className="relative min-h-0 flex-1">
                {Math.abs(i - active) <= 1 ? (
                  <GymClipPlayer
                    url={clip.url}
                    itemId={clip.id}
                    fill
                    active={i === active}
                    persistUrl={clip.url}
                    compact
                    quiet
                    shareChrome={false}
                    markup={false}
                    postedBy={clip.postedBy || postedByFromUrl(clip.url)}
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-sm text-white/40">
                    {clip.name}
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setReelIndex(i)
                    setReelOpen(true)
                  }}
                  className="absolute bottom-3 right-3 z-20 rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-black shadow-lg"
                >
                  Full screen
                </button>
              </div>
              <div className="shrink-0 bg-black/90 px-4 py-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--accent)]">
                      {clip.collectionName}
                    </p>
                    <h3 className="text-base font-semibold text-white">{clip.name}</h3>
                    {(clip.postedBy || postedByFromUrl(clip.url)) && (
                      <p className="mt-0.5 text-sm font-semibold text-white/80">
                        @{(clip.postedBy || postedByFromUrl(clip.url) || '').replace(/^@/, '')}
                      </p>
                    )}
                  </div>
                  <FavoriteStar
                    fill
                    on={favorites.isUrlFavorite(clip.url)}
                    onClick={() => favorites.toggleUrlFavorite(clip.url)}
                    label={
                      favorites.isUrlFavorite(clip.url)
                        ? `Unfavorite ${clip.name}`
                        : `Favorite ${clip.name}`
                    }
                  />
                </div>
                {clip.keywords && clip.keywords.length > 0 && (
                  <p className="mt-1 text-xs text-white/60">{clip.keywords.join(' · ')}</p>
                )}
                <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <ShareReference
                      variant="reel"
                      draft={clipShareDraft(clip.name, clip.url)}
                    />
                    <ClipOrganizeMenu
                    variant="feed"
                    clip={{
                      name: clip.name,
                      url: clip.url,
                      kind: clip.kind,
                      keywords: clip.keywords,
                      sourceId: clip.id,
                    }}
                    editor={editor}
                    gymAdmin={isGymAdmin(athlete)}
                    onCopied={setFlash}
                  />
                  </div>
                  <p className="text-[11px] text-white/40">
                    {i + 1} / {visible.length}
                  </p>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
      {reelOpen ? (
        <PhoneReelViewer
          items={visible.map((clip) => ({
            id: clip.id,
            name: clip.name,
            url: clip.url,
            kind: clip.kind,
            keywords: clip.keywords,
            collectionName: clip.collectionName,
            postedBy: clip.postedBy || postedByFromUrl(clip.url) || undefined,
          }))}
          startIndex={reelIndex}
          onClose={() => setReelOpen(false)}
          editor={editor}
          gymAdmin={isGymAdmin(athlete)}
          title="Reference scroll"
          onCopied={setFlash}
        />
      ) : null}
    </div>
  )
}
