/**
 * Full-screen vertical reel for reference clips — library, Learn scroll,
 * and class collages. Only the on-screen clip (plus neighbors) mount so
 * phones stay fast. Shot / Line stay idle until tapped so swipe still works.
 */

import { useEffect, useRef, useState } from 'react'
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
}

export function PhoneReelViewer({
  items,
  startIndex = 0,
  onClose,
  editor,
  gymAdmin = editor.gymEditor,
  title = 'Reels',
  onCopied,
}: Props) {
  const favorites = useFavorites()
  const scrollerRef = useRef<HTMLDivElement | null>(null)
  const [active, setActive] = useState(() =>
    Math.min(Math.max(startIndex, 0), Math.max(0, items.length - 1)),
  )
  const [flash, setFlash] = useState<string | null>(null)
  const [handles, setHandles] = useState<Record<string, string>>({})

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
    <div className="fixed inset-0 z-[380] flex h-[100dvh] w-screen flex-col bg-black text-white">
      <header className="flex shrink-0 items-center justify-between gap-3 px-3 py-2 pt-[max(0.5rem,env(safe-area-inset-top))]">
        <p className="min-w-0 truncate text-[11px] font-semibold uppercase tracking-[0.16em] text-white/55">
          {title}
        </p>
        <button
          type="button"
          onClick={onClose}
          className="rounded-full bg-[#e03131] px-3.5 py-1.5 text-sm font-semibold text-white shadow-[0_4px_14px_rgba(0,0,0,0.45)]"
        >
          Done
        </button>
      </header>
      {items.length === 0 ? (
        <div className="flex flex-1 items-center justify-center px-6 text-center text-sm text-white/60">
          No clips to play in full screen.
        </div>
      ) : (
        <div
          ref={scrollerRef}
          className="min-h-0 flex-1 snap-y snap-mandatory overflow-y-auto overscroll-contain"
          style={{ WebkitOverflowScrolling: 'touch', touchAction: 'pan-y' }}
        >
          {items.map((clip, i) => {
            const near = Math.abs(i - active) <= 1
            const on = i === active
            const favKey = clip.url
            const handle = handles[clip.id] || clip.postedBy || postedByFromUrl(clip.url)
            return (
              <section
                key={clip.id}
                data-reel-index={i}
                className="relative flex h-full snap-start snap-always flex-col"
              >
                <div className="min-h-0 flex-1">
                  {near ? (
                    <GymClipPlayer
                      url={clip.url}
                      itemId={clip.id}
                      fill
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
                      onPostedBy={(next) =>
                        setHandles((prev) => (prev[clip.id] === next ? prev : { ...prev, [clip.id]: next }))
                      }
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center bg-black text-sm text-white/35">
                      {clip.name}
                    </div>
                  )}
                </div>
                {on ? (
                  <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 bg-gradient-to-t from-black via-black/70 to-transparent px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-16">
                    <div className="pointer-events-auto mb-16 flex items-end justify-between gap-3">
                      <div className="min-w-0">
                        {clip.collectionName ? (
                          <p className="text-[10px] font-semibold uppercase tracking-wider text-[#6ee7f0]/85">
                            {clip.collectionName}
                          </p>
                        ) : null}
                        <h2 className="text-lg font-semibold leading-tight">{clip.name}</h2>
                        {handle ? (
                          <p className="mt-1 text-sm font-semibold text-white/85">
                            @{handle.replace(/^@/, '')}
                          </p>
                        ) : null}
                        {clip.keywords && clip.keywords.length > 0 ? (
                          <p className="mt-1 text-xs text-white/55">{clip.keywords.join(' · ')}</p>
                        ) : null}
                        <p className="mt-2 text-[11px] text-white/40">
                          Swipe for the next clip · tap Shot to crop a shape
                        </p>
                        {flash ? (
                          <p className="mt-1 text-xs text-[#6ee7f0]">{flash}</p>
                        ) : null}
                      </div>
                      <div className="flex shrink-0 flex-col items-center gap-2">
                        <ShareReference
                          variant="reel"
                          draft={clipShareDraft(
                            clip.name,
                            clip.url,
                            clip.loopA,
                            clip.loopB,
                          )}
                        />
                        <FavoriteStar
                          fill
                          on={favorites.isUrlFavorite(favKey)}
                          onClick={() => favorites.toggleUrlFavorite(favKey)}
                          label={
                            favorites.isUrlFavorite(favKey)
                              ? `Unfavorite ${clip.name}`
                              : `Favorite ${clip.name}`
                          }
                          className="rounded-full bg-white/12 px-2 py-1 text-xl"
                        />
                        <ClipOrganizeMenu
                          variant="reel"
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
                          onCopied={(message) => {
                            setFlash(message)
                            onCopied?.(message)
                          }}
                        />
                      </div>
                    </div>
                  </div>
                ) : null}
              </section>
            )
          })}
        </div>
      )}
    </div>
  )

  if (typeof document === 'undefined') return body
  return createPortal(body, document.body)
}
