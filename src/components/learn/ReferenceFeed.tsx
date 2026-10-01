/**
 * Learn → Reference scroll — vertical snap through the gym Compare URL library.
 */

import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { GymClipPlayer } from '../GymClipPlayer'
import { FavoriteStar } from '../FavoriteStar'
import { ClipOrganizeMenu } from '../library/ClipOrganizeMenu'
import { PhoneReelViewer } from '../PhoneReelViewer'
import { ShareReference } from '../share/ShareReference'
import { clipShareDraft } from '../../lib/shareReference'
import { CollapsibleSection } from '../CollapsibleSection'
import { useGymLibrary, type GymClip } from '../../lib/gymLibrary'
import { useFavorites } from '../../lib/favorites'
import { isCoachProfile, isGymAdmin } from '../../lib/profileRole'
import { itemMatchesQuery } from '../../lib/clipStore'
import type { Athlete } from '../../types'
import { prefetchNeighborClips } from '../../lib/igCache'
import { postedByFromUrl } from '../../lib/socialUrls'
import { StoryRail } from '../stories/StoryRail'
import { takeMobileSearchJump } from '../../lib/mobileSearchNav'
import { isSameReferenceUrl } from '../../lib/clipStore'
import { AddToSkillCardModal } from './CardVideoManager'
import { LinkToSpottingCardModal } from './LinkToSpottingCardModal'
import type { OrganizeEditor } from '../../lib/organizeLibrary'
import { GUIDELESS_EVIDENCE_KEY, TECHNIQUE_EVIDENCE } from '../../config/techniqueEvidence'
import { getRegistrySkill, getRegistrySkillByGuideId } from '../../lib/skillRegistry'

type SortKey = 'default' | 'added' | 'creator' | 'skill'
type SortDir = 'asc' | 'desc'

const SORT_STORE_KEY = 'shapelab:refscroll:sort'
/** Natural direction when a sort is first picked: newest first, A to Z. */
const SORT_DEFAULT_DIR: Record<Exclude<SortKey, 'default'>, SortDir> = {
  added: 'desc',
  creator: 'asc',
  skill: 'asc',
}

function loadSort(): { key: SortKey; dir: SortDir } {
  try {
    const raw = localStorage.getItem(SORT_STORE_KEY)
    if (raw) {
      const p = JSON.parse(raw) as { key?: unknown; dir?: unknown }
      const key: SortKey =
        p.key === 'added' || p.key === 'creator' || p.key === 'skill' ? p.key : 'default'
      const dir: SortDir = p.dir === 'asc' || p.dir === 'desc' ? p.dir : SORT_DEFAULT_DIR[key === 'default' ? 'added' : key]
      return { key, dir }
    }
  } catch {
    /* storage unavailable */
  }
  return { key: 'default', dir: 'desc' }
}

/** Creator handle for sorting — same fallback the cards already show. */
function clipSortCreator(c: GymClip): string | null {
  const h = (c.postedBy || postedByFromUrl(c.url) || '').trim().toLowerCase()
  return h || null
}

/** Skill tag for sorting — first keyword, else the collection name. */
function clipSortSkill(c: GymClip): string | null {
  const kw = (c.keywords ?? []).map((k) => k.trim()).filter(Boolean)[0]
  const s = (kw || c.collectionName || '').trim().toLowerCase()
  return s || null
}

/** Added timestamp for sorting — missing dates sink to the bottom. */
function clipSortAdded(c: GymClip): number {
  const t = c.createdAt ? Date.parse(c.createdAt) : NaN
  return Number.isFinite(t) ? (t as number) : -Infinity
}

function compareNullableText(a: string | null, b: string | null, dirMul: number): number {
  if (a == null && b == null) return 0
  if (a == null) return 1
  if (b == null) return -1
  return dirMul * a.localeCompare(b)
}

/** Human-readable skill name for an evidence key, for "on cards" displays. */
function skillNameForEvidenceKey(key: string): string | null {
  const guided = getRegistrySkillByGuideId(key)
  if (guided) return guided.name
  for (const [id, k] of Object.entries(GUIDELESS_EVIDENCE_KEY)) {
    if (k === key) return getRegistrySkill(id)?.name ?? null
  }
  return getRegistrySkill(key)?.name ?? null
}

/** Map a video URL to the skill-card names it appears on (seed + admin-added). */
function useCardAttachments(refreshKey: number): Record<string, string[]> {
  const [map, setMap] = useState<Record<string, string[]>>({})
  useEffect(() => {
    const out: Record<string, string[]> = {}
    const add = (url: string, key: string) => {
      const name = skillNameForEvidenceKey(key)
      if (!name) return
      const list = out[url] ?? (out[url] = [])
      if (!list.includes(name)) list.push(name)
    }
    for (const [key, videos] of Object.entries(TECHNIQUE_EVIDENCE)) {
      for (const v of videos ?? []) if (v?.url) add(v.url, key)
    }
    fetch('/api/skill-card-videos')
      .then((r) => (r.ok ? r.json() : {}))
      .then((data) => {
        if (data && typeof data === 'object') {
          for (const [key, videos] of Object.entries(data as Record<string, { url?: string }[]>)) {
            for (const v of videos ?? []) if (v?.url) add(v.url, key)
          }
        }
        setMap(out)
      })
      .catch(() => setMap(out))
  }, [refreshKey])
  return map
}

type Props = {
  athlete?: Athlete | null
  athletes?: Athlete[]
}

type FeedArticleProps = {
  clip: GymClip
  index: number
  total: number
  near: boolean
  on: boolean
  favOn: boolean
  isAdmin: boolean
  editor: OrganizeEditor
  cardNames: string[] | undefined
  onOpenReel: (index: number) => void
  onPostedBy: (url: string, handle: string) => void
  onToggleFavorite: (url: string) => void
  onAddToSkillCard: (clip: GymClip) => void
  onLinkToSpottingCard: (clip: GymClip) => void
  onCopied: (message: string) => void
}

/**
 * One inline feed card, memoized: while the active index moves during a
 * scroll, only the cards whose near/on/fav state changed re-render instead
 * of the whole list. Props are primitives or stable callbacks so memo holds.
 */
const FeedArticle = memo(function FeedArticle({
  clip,
  index,
  total,
  near,
  on,
  favOn,
  isAdmin,
  editor,
  cardNames,
  onOpenReel,
  onPostedBy,
  onToggleFavorite,
  onAddToSkillCard,
  onLinkToSpottingCard,
  onCopied,
}: FeedArticleProps) {
  const handle = clip.postedBy || postedByFromUrl(clip.url)
  return (
    <article data-feed-index={index} className="relative h-full snap-start overflow-hidden bg-black">
      {/* Full-bleed video: no dead panel below, IG-style. */}
      <div className="absolute inset-0">
        {near ? (
          <GymClipPlayer
            url={clip.url}
            itemId={clip.id}
            fill
            active={on}
            persistUrl={clip.url}
            compact
            quiet
            shareChrome={false}
            markup
            markupSwipeSafe
            postedBy={handle}
            onPostedBy={(next) => onPostedBy(clip.url, next)}
          />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-white/40">
            {clip.name}
          </div>
        )}
      </div>
      {/* Compact caption overlay, bottom-left: gradient only, so the bottom
          of the footage stays visible. */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 bg-gradient-to-t from-black/85 via-black/35 to-transparent px-4 pb-3 pt-12">
        <div className="max-w-[72%]">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--accent)]">
            {clip.collectionName}
          </p>
          <h3 className="truncate text-base font-semibold leading-tight text-white">{clip.name}</h3>
          {handle && (
            <p className="mt-0.5 truncate text-xs font-semibold text-white/80">
              @{handle.replace(/^@/, '')}
            </p>
          )}
          {clip.keywords && clip.keywords.length > 0 && (
            <p className="mt-0.5 truncate text-[11px] text-white/55">{clip.keywords.join(' · ')}</p>
          )}
          {isAdmin && cardNames?.length ? (
            <p className="mt-0.5 truncate text-[10px] font-bold text-emerald-300/80">
              On cards: {cardNames.join(', ')}
            </p>
          ) : null}
          <div className="mt-1 flex items-center gap-2">
            <p className="text-[10px] text-white/40">
              {index + 1} / {total}
            </p>
            <button
              type="button"
              onClick={() => onOpenReel(index)}
              className="pointer-events-auto rounded-full bg-white/15 px-2.5 py-1 text-[10px] font-semibold text-white backdrop-blur-sm"
            >
              Full screen
            </button>
          </div>
          <p className="mt-1 text-[10px] text-white/35">
            Swipe for the next clip · tap Shot to crop a shape
          </p>
        </div>
      </div>
      {/* Action rail, bottom-right over the video, IG-style. */}
      <div className="absolute bottom-3 right-3 z-20 flex flex-col items-center gap-2.5">
        <ShareReference
          variant="story"
          draft={clipShareDraft(clip.name, clip.url)}
          onAddToSkillCard={editor.profileId ? () => onAddToSkillCard(clip) : undefined}
          onLinkToSpottingCard={isAdmin ? () => onLinkToSpottingCard(clip) : undefined}
        />
        <FavoriteStar
          fill
          on={favOn}
          onClick={() => onToggleFavorite(clip.url)}
          label={favOn ? `Unfavorite ${clip.name}` : `Favorite ${clip.name}`}
          className="rounded-full bg-white/12 px-2 py-1 text-xl"
        />
        <ClipOrganizeMenu
          variant="reel"
          clip={{
            name: clip.name,
            url: clip.url,
            kind: clip.kind,
            keywords: clip.keywords,
            sourceId: clip.id,
          }}
          editor={editor}
          gymAdmin={isAdmin}
          onCopied={onCopied}
        />
      </div>
    </article>
  )
})

export function ReferenceFeed({ athlete = null, athletes = [] }: Props) {
  const { clips, loading, rememberHandle } = useGymLibrary()
  const favorites = useFavorites()
  const [active, setActive] = useState(0)
  const [onlyFavorites, setOnlyFavorites] = useState(false)
  const [query, setQuery] = useState('')
  const [flash, setFlash] = useState<string | null>(null)
  const [reelOpen, setReelOpen] = useState(false)
  const [reelIndex, setReelIndex] = useState(0)
  const [addToCardClip, setAddToCardClip] = useState<{ url: string; who: string; watchFor: string } | null>(null)
  const [linkSpottingClip, setLinkSpottingClip] = useState<{ id: string; url: string; name: string } | null>(null)
  const [cardRefresh, setCardRefresh] = useState(0)
  const [sortState, setSortState] = useState(loadSort)
  const sortKey = sortState.key
  const sortDir = sortState.dir
  /** Pick a sort — re-tapping the active one flips its direction. */
  const pickSort = (key: SortKey) => {
    setSortState((prev) => {
      const next =
        key === 'default'
          ? { key, dir: prev.dir }
          : key === prev.key
            ? { key, dir: (prev.dir === 'asc' ? 'desc' : 'asc') as SortDir }
            : { key, dir: SORT_DEFAULT_DIR[key] }
      try {
        localStorage.setItem(SORT_STORE_KEY, JSON.stringify(next))
      } catch {
        /* storage unavailable */
      }
      return next
    })
  }
  const cardAttachments = useCardAttachments(cardRefresh)
  const rootRef = useRef<HTMLDivElement | null>(null)

  const editor = useMemo(
    () => ({
      gymEditor: isGymAdmin(athlete),
      personalEditor: isCoachProfile(athlete) && !isGymAdmin(athlete),
      profileId: athlete?.id ?? null,
    }),
    [athlete],
  )
  const isAdmin = editor.gymEditor

  // Stable callbacks so the memoized feed cards only re-render when their
  // own near/on/fav state changes.
  const rememberHandleRef = useRef(rememberHandle)
  rememberHandleRef.current = rememberHandle
  const handlePostedBy = useCallback(
    (url: string, next: string) => rememberHandleRef.current(url, next),
    [],
  )
  const handleToggleFavorite = useCallback(
    (url: string) => favorites.toggleUrlFavorite(url),
    [favorites],
  )
  const handleOpenReel = useCallback((i: number) => {
    setReelIndex(i)
    setReelOpen(true)
  }, [])
  const handleAddToCard = useCallback(
    (clip: { url: string; name: string; postedBy?: string }) =>
      setAddToCardClip({
        url: clip.url,
        who: clip.postedBy || 'Reference library',
        watchFor: clip.name,
      }),
    [],
  )
  const handleLinkSpotting = useCallback(
    (clip: { id: string; url: string; name: string }) =>
      setLinkSpottingClip({ id: clip.id, url: clip.url, name: clip.name }),
    [],
  )

  const visible = useMemo(() => {
    const q = query.trim()
    const filtered = clips.filter((c) => {
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
    if (sortKey === 'default') return filtered
    const dirMul = sortDir === 'asc' ? 1 : -1
    const sorted = [...filtered]
    if (sortKey === 'added') {
      sorted.sort((a, b) => {
        const ta = clipSortAdded(a)
        const tb = clipSortAdded(b)
        if (ta === -Infinity && tb === -Infinity) return 0
        if (ta === -Infinity) return 1
        if (tb === -Infinity) return -1
        return dirMul * (ta - tb)
      })
    } else if (sortKey === 'creator') {
      sorted.sort((a, b) => compareNullableText(clipSortCreator(a), clipSortCreator(b), dirMul))
    } else {
      sorted.sort((a, b) => compareNullableText(clipSortSkill(a), clipSortSkill(b), dirMul))
    }
    return sorted
  }, [clips, onlyFavorites, favorites, query, sortKey, sortDir])

  useEffect(() => {
    setActive(0)
  }, [query, onlyFavorites, visible.length])

  // Deep link from search (or Ask): after the feed re-renders with the
  // jumped clip visible, scroll the snap container straight to its card.
  const [jumpUrl, setJumpUrl] = useState<string | null>(null)
  useEffect(() => {
    if (!jumpUrl) return
    const idx = visible.findIndex((c) => isSameReferenceUrl(c.url, jumpUrl))
    if (idx < 0) return
    setJumpUrl(null)
    setActive(idx)
    requestAnimationFrame(() => {
      const root = rootRef.current
      const el = root?.querySelector<HTMLElement>(`[data-feed-index="${idx}"]`)
      if (root && el) {
        const rootRect = root.getBoundingClientRect()
        const elRect = el.getBoundingClientRect()
        root.scrollTo({ top: root.scrollTop + (elRect.top - rootRect.top), behavior: 'smooth' })
      }
    })
  }, [visible, jumpUrl])

  // Stable item objects for the fullscreen reel: without this, every parent
  // re-render hands the reel fresh objects and defeats its memoization.
  const reelItems = useMemo(
    () =>
      visible.map((clip) => ({
        id: clip.id,
        name: clip.name,
        url: clip.url,
        kind: clip.kind,
        keywords: clip.keywords,
        collectionName: clip.collectionName,
        postedBy: clip.postedBy || postedByFromUrl(clip.url) || undefined,
      })),
    [visible],
  )

  useEffect(() => {
    const jump = takeMobileSearchJump('clip')
    if (!jump || jump.kind !== 'clip') return
    setOnlyFavorites(false)
    setQuery('')
    if (clips.some((c) => isSameReferenceUrl(c.url, jump.url))) {
      // Stash the URL — the scroll happens once `visible` recomputes below,
      // resolved against the visible (possibly sorted) order.
      setJumpUrl(jump.url)
      return
    }
    if (jump.label) setQuery(jump.label)
  }, [clips])

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

  const rail = (
    <StoryRail athlete={athlete} athletes={athletes.length ? athletes : athlete ? [athlete] : []} />
  )

  if (loading && clips.length === 0) {
    return (
      <div className="space-y-3">
        {rail}
        <p className="rounded-xl border border-[var(--panel-border)] bg-[var(--panel)] px-4 py-6 text-sm text-[var(--muted)]">
          Loading the gym reference library…
        </p>
      </div>
    )
  }

  if (clips.length === 0) {
    return (
      <div className="space-y-3">
        {rail}
        <p className="rounded-xl border border-[var(--panel-border)] bg-[var(--panel)] px-4 py-6 text-sm text-[var(--muted)]">
          No gym URLs yet. Unlock Ryan to paste clips into the gym library, or unlock a coach profile to add URLs in your own collections.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {rail}
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
              ? 'rounded-lg bg-[#f5d76e] px-3 py-1.5 text-sm font-semibold text-[var(--on-accent)]'
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
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-xs text-[var(--muted)]">Sort</span>
        {(
          [
            { key: 'added', label: 'Last added' },
            { key: 'creator', label: 'Creator' },
            { key: 'skill', label: 'Skill' },
            { key: 'default', label: 'Default' },
          ] as const
        ).map((opt) => {
          const on = sortKey === opt.key
          return (
            <button
              key={opt.key}
              type="button"
              aria-pressed={on}
              title={on && opt.key !== 'default' ? 'Tap again to flip the order' : undefined}
              onClick={() => pickSort(opt.key)}
              className={
                on
                  ? 'rounded-lg bg-[var(--accent-dim)] px-3 py-1.5 text-sm font-semibold text-white'
                  : 'rounded-lg border border-[var(--panel-border)] px-3 py-1.5 text-sm text-[var(--muted)]'
              }
            >
              {opt.label}
              {on && opt.key !== 'default' ? (sortDir === 'desc' ? ' ↓' : ' ↑') : null}
            </button>
          )
        })}
        {sortKey !== 'default' ? (
          <button
            type="button"
            onClick={() => pickSort(sortKey)}
            aria-label="Flip sort order"
            title="Flip order"
            className="rounded-lg border border-[var(--panel-border)] px-3 py-1.5 text-sm text-[var(--muted)]"
          >
            ⇅
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
          className="h-[min(78dvh,760px)] snap-y snap-mandatory overflow-y-auto overscroll-contain rounded-2xl border border-[var(--panel-border)] bg-black"
        >
          {visible.map((clip, i) => (
            <FeedArticle
              key={clip.id}
              clip={clip}
              index={i}
              total={visible.length}
              near={Math.abs(i - active) <= 1}
              on={i === active}
              favOn={favorites.isUrlFavorite(clip.url)}
              isAdmin={isAdmin}
              editor={editor}
              cardNames={isAdmin ? cardAttachments[clip.url] : undefined}
              onOpenReel={handleOpenReel}
              onPostedBy={handlePostedBy}
              onToggleFavorite={handleToggleFavorite}
              onAddToSkillCard={handleAddToCard}
              onLinkToSpottingCard={handleLinkSpotting}
              onCopied={setFlash}
            />
          ))}
        </div>
      )}
      {reelOpen ? (
        <PhoneReelViewer
          items={reelItems}
          startIndex={reelIndex}
          onClose={() => setReelOpen(false)}
          editor={editor}
          gymAdmin={isAdmin}
          title="Reference scroll"
          onCopied={setFlash}
          onAddToSkillCard={editor.profileId ? handleAddToCard : undefined}
          onLinkToSpottingCard={isAdmin ? handleLinkSpotting : undefined}
        />
      ) : null}
      {addToCardClip && (
        <AddToSkillCardModal
          video={addToCardClip}
          coachId={editor.profileId}
          isAdmin={isAdmin}
          onClose={() => {
            setAddToCardClip(null)
            setCardRefresh((n) => n + 1)
          }}
        />
      )}
      {linkSpottingClip && (
        <LinkToSpottingCardModal clip={linkSpottingClip} coachId={editor.profileId} isAdmin={isAdmin} onClose={() => setLinkSpottingClip(null)} />
      )}
    </div>
  )
}
