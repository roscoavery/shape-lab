/**
 * Full-screen vertical reel for reference clips — library, Learn scroll,
 * and class collages. Only the on-screen clip (plus neighbors) mount so
 * phones stay fast. Shot / Line stay idle until tapped so swipe still works.
 */

import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { GymClipPlayer } from './GymClipPlayer'
import { FavoriteStar } from './FavoriteStar'
import { ClipOrganizeMenu } from './library/ClipOrganizeMenu'
import { ShareReference } from './share/ShareReference'
import { clipShareDraft } from '../lib/shareReference'
import { useFavorites } from '../lib/favorites'
import { kindFromUrl, type RefItemKind } from '../lib/clipStore'
import type { OrganizeEditor } from '../lib/organizeLibrary'
import { prefetchNeighborClips } from '../lib/igCache'
import { postedByFromUrl } from '../lib/socialUrls'
import { useGymLibrary } from '../lib/gymLibrary'
import { TOUR_CHROME_EVENT, tourChromeNeeded } from './homework/GlowTour'

export type PhoneReelClip = {
  id: string
  name: string
  url: string
  kind?: RefItemKind
  keywords?: string[]
  collectionName?: string
  postedBy?: string
  loopA?: number | null
  loopB?: number | null
}

type Props = {
  items: PhoneReelClip[]
  startIndex?: number
  onClose: () => void
  editor: OrganizeEditor
  gymAdmin?: boolean
  title?: string
  onCopied?: (message: string) => void
  /** When set, the share sheet on each reel offers "Add to skill card". */
  onAddToSkillCard?: (clip: PhoneReelClip) => void
  /** When set, the share sheet on each reel offers "Link to spotting card". */
  onLinkToSpottingCard?: (clip: PhoneReelClip) => void
}

type ReelSectionProps = {
  clip: PhoneReelClip
  index: number
  near: boolean
  on: boolean
  handle: string | null | undefined
  favOn: boolean
  flash: string | null
  gymEditor: boolean
  personalEditor: boolean
  profileId: string | null
  gymAdmin: boolean
  onPostedBy: (id: string, url: string, next: string) => void
  onToggleFavorite: (url: string) => void
  onCopied: (message: string) => void
  onAddToSkillCard?: (clip: PhoneReelClip) => void
  onLinkToSpottingCard?: (clip: PhoneReelClip) => void
}

/**
 * One reel, memoized: while the active index moves during a scroll, only the
 * reels whose near/on state actually changed re-render, instead of the whole
 * list (each GymClipPlayer subtree is expensive to reconcile, and that was
 * the scroll jank). Props are primitives or stable callbacks so memo holds.
 */
const ReelSection = memo(function ReelSection({
  clip,
  index,
  near,
  on,
  handle,
  favOn,
  flash,
  gymEditor,
  personalEditor,
  profileId,
  gymAdmin,
  onPostedBy,
  onToggleFavorite,
  onCopied,
  onAddToSkillCard,
  onLinkToSpottingCard,
}: ReelSectionProps) {
  const editor = useMemo(
    () => ({ gymEditor, personalEditor, profileId }),
    [gymEditor, personalEditor, profileId],
  )
  // IG-style chrome: hidden while scrolling, tap the video to show/hide.
  const [chrome, setChrome] = useState(false)
  const toggleChrome = useCallback(() => setChrome((c) => !c), [])
  // The guided tour can pin chrome open for steps that spotlight controls —
  // otherwise a stray tap closes chrome mid-tour and orphans every later target.
  const [chromePinned, setChromePinned] = useState(false)
  useEffect(() => {
    const onTourChrome = (e: Event) => setChromePinned(!!(e as CustomEvent).detail)
    window.addEventListener(TOUR_CHROME_EVENT, onTourChrome)
    // Catch the case where the event fired before this mounted.
    if (tourChromeNeeded.current) setChromePinned(true)
    return () => window.removeEventListener(TOUR_CHROME_EVENT, onTourChrome)
  }, [])
  const chromeOpen = chrome || chromePinned || tourChromeNeeded.current
  const clipForCard = useMemo(() => ({ ...clip, postedBy: handle || clip.postedBy }), [clip, handle])
  return (
    <section
      data-reel-index={index}
      className="relative h-full snap-start snap-always overflow-hidden bg-black"
    >
      {/* The video fills the whole card, like IG — no caption bar shrinking it. */}
      <div id="tour-player-video" className="absolute inset-0">
        {near ? (
          <GymClipPlayer
            url={clip.url}
            itemId={clip.id}
            fill
            fit="contain"
            active={on}
            persistUrl={clip.url}
            loopA={clip.loopA}
            loopB={clip.loopB}
            compact
            quiet
            shareChrome={false}
            markup
            markupSwipeSafe
            postedBy={handle}
            onPostedBy={(next) => onPostedBy(clip.id, clip.url, next)}
            chromeOpen={chromeOpen}
            onToggleChrome={toggleChrome}
            tapTogglesChrome
          />
        ) : (
          <div className="flex h-full items-center justify-center bg-black text-sm text-white/35">
            {clip.name}
          </div>
        )}
      </div>
      {chromeOpen && near ? (
        <>
          {/* Caption overlays the bottom of the video, above the scrub bar. */}
          <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 bg-gradient-to-t from-black/85 via-black/40 to-transparent px-4 pb-36 pt-14">
            <div className="max-w-[72%]">
              {clip.collectionName ? (
                <p className="text-[10px] font-semibold uppercase tracking-wider text-[#6ee7f0]/85">
                  {clip.collectionName}
                </p>
              ) : null}
              <h2 className="text-lg font-semibold leading-tight text-white [text-shadow:0_1px_8px_rgba(0,0,0,0.8)]">
                {clip.name}
              </h2>
              {handle ? (
                <p className="mt-1 text-sm font-semibold text-white/85 [text-shadow:0_1px_6px_rgba(0,0,0,0.8)]">
                  @{handle.replace(/^@/, '')}
                </p>
              ) : null}
              {clip.keywords && clip.keywords.length > 0 ? (
                <p className="mt-1 text-xs text-white/60">{clip.keywords.join(' · ')}</p>
              ) : null}
              <p className="mt-2 text-[11px] text-white/45">
                Tap the video to hide · swipe for the next clip
              </p>
              {flash ? <p className="mt-1 text-xs text-[#6ee7f0]">{flash}</p> : null}
            </div>
          </div>
          {/* Action rail floats above the scrub bar. Collect / Collage live in Share. */}
          <div className="absolute bottom-40 right-2 z-20 flex flex-col items-center gap-3">
            <div id="tour-player-share">
            <ShareReference
              variant="story"
              draft={clipShareDraft(clip.name, clip.url, clip.loopA, clip.loopB)}
              onAddToSkillCard={
                onAddToSkillCard ? () => onAddToSkillCard(clipForCard) : undefined
              }
              onLinkToSpottingCard={
                onLinkToSpottingCard ? () => onLinkToSpottingCard(clipForCard) : undefined
              }
              extraActions={
                <ClipOrganizeMenu
                  variant="feed"
                  clip={{
                    name: clip.name,
                    url: clip.url,
                    kind: clip.kind ?? kindFromUrl(clip.url),
                    keywords: clip.keywords,
                    sourceId: clip.id,
                    postedBy: handle ?? clip.postedBy,
                  }}
                  editor={editor}
                  gymAdmin={gymAdmin}
                  onCopied={onCopied}
                />
              }
            />
            </div>
            <FavoriteStar
              fill
              on={favOn}
              onClick={() => onToggleFavorite(clip.url)}
              label={favOn ? `Unfavorite ${clip.name}` : `Favorite ${clip.name}`}
              className="rounded-full bg-white/12 px-2 py-1 text-xl"
            />
          </div>
        </>
      ) : null}
    </section>
  )
})

export function PhoneReelViewer({
  items,
  startIndex = 0,
  onClose,
  editor,
  gymAdmin = editor.gymEditor,
  title = 'Reels',
  onCopied,
  onAddToSkillCard,
  onLinkToSpottingCard,
}: Props) {
  const favorites = useFavorites()
  const { rememberHandle } = useGymLibrary()
  const scrollerRef = useRef<HTMLDivElement | null>(null)
  const [active, setActive] = useState(() =>
    Math.min(Math.max(startIndex, 0), Math.max(0, items.length - 1)),
  )
  const [flash, setFlash] = useState<string | null>(null)
  const [handles, setHandles] = useState<Record<string, string>>({})

  // Stable callbacks so the memoized ReelSection only re-renders when its
  // own near/on/fav state changes.
  const rememberHandleRef = useRef(rememberHandle)
  rememberHandleRef.current = rememberHandle
  const handlePostedBy = useCallback((id: string, url: string, next: string) => {
    rememberHandleRef.current(url, next)
    setHandles((prev) => (prev[id] === next ? prev : { ...prev, [id]: next }))
  }, [])
  const handleToggleFavorite = useCallback(
    (url: string) => favorites.toggleUrlFavorite(url),
    [favorites],
  )
  const handleCopied = useCallback(
    (message: string) => {
      setFlash(message)
      onCopied?.(message)
    },
    [onCopied],
  )

  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  useEffect(() => {
    const root = scrollerRef.current
    if (!root) return
    const start = root.querySelector<HTMLElement>(`[data-reel-index="${startIndex}"]`)
    start?.scrollIntoView({ block: 'start' })
  }, [startIndex])

  useEffect(() => {
    const root = scrollerRef.current
    if (!root) return
    const cards = [...root.querySelectorAll<HTMLElement>('[data-reel-index]')]
    const io = new IntersectionObserver(
      (entries) => {
        const top = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0]
        if (!top) return
        const idx = Number((top.target as HTMLElement).dataset.reelIndex)
        if (Number.isFinite(idx)) setActive(idx)
      },
      { root, threshold: [0.55, 0.75] },
    )
    for (const card of cards) io.observe(card)
    return () => io.disconnect()
  }, [items.length])

  useEffect(() => {
    prefetchNeighborClips(items, active, 2)
  }, [items, active])

  const body = (
    <div
      className="fixed inset-0 z-[380] h-[100dvh] w-screen bg-black text-white"
      style={{ touchAction: 'manipulation' }}
    >
      {/* Header floats over the video (IG-style) so the footage centers in the
          full screen instead of in the space below the header. Taps pass
          through to the video except on Done. */}
      <header className="pointer-events-none absolute inset-x-0 top-0 z-30 bg-gradient-to-b from-black/75 via-black/35 to-transparent">
        <div className="flex items-center gap-1 px-2 pb-8 pt-[max(0.5rem,env(safe-area-inset-top))]">
          <button
            type="button"
            onClick={onClose}
            aria-label="Back"
            className="pointer-events-auto rounded-full p-2 text-white drop-shadow-[0_1px_4px_rgba(0,0,0,0.7)] transition active:scale-90"
          >
            <svg
              width="26"
              height="26"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2.5}
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>
          <p className="min-w-0 truncate text-[11px] font-semibold uppercase tracking-[0.16em] text-white/55">
            {title}
          </p>
        </div>
      </header>
      {items.length === 0 ? (
        <div className="flex h-full items-center justify-center px-6 text-center text-sm text-white/60">
          No clips to play in full screen.
        </div>
      ) : (
        <div
          ref={scrollerRef}
          className="h-full snap-y snap-mandatory overflow-y-auto overscroll-contain"
          style={{ WebkitOverflowScrolling: 'touch', touchAction: 'pan-y' }}
        >
          {items.map((clip, i) => (
            <ReelSection
              key={clip.id}
              clip={clip}
              index={i}
              near={Math.abs(i - active) <= 1}
              on={i === active}
              handle={handles[clip.id] || clip.postedBy || postedByFromUrl(clip.url)}
              favOn={favorites.isUrlFavorite(clip.url)}
              flash={flash}
              gymEditor={editor.gymEditor}
              personalEditor={editor.personalEditor}
              profileId={editor.profileId}
              gymAdmin={gymAdmin}
              onPostedBy={handlePostedBy}
              onToggleFavorite={handleToggleFavorite}
              onCopied={handleCopied}
              onAddToSkillCard={onAddToSkillCard}
              onLinkToSpottingCard={onLinkToSpottingCard}
            />
          ))}
        </div>
      )}
    </div>
  )

  if (typeof document === 'undefined') return body
  return createPortal(body, document.body)
}
