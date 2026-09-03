import { useEffect, type ReactNode } from 'react'
import { InstagramEmbed } from './compare/InstagramEmbed'
import { VideoWorkbench } from './compare/VideoWorkbench'
import { socialPlatform } from '../lib/socialUrls'
import { prefetchInstagram } from '../lib/igCache'
import { ClipWatchMeta } from './ClipWatchMeta'
import { ShareReference } from './share/ShareReference'
import { clipShareDraft } from '../lib/shareReference'
import { useGymLibrary } from '../lib/gymLibrary'

type Props = {
  url: string
  itemId?: string
  fill?: boolean
  active?: boolean
  persistUrl?: string
  loopA?: number | null
  loopB?: number | null
  onAbChange?: (a: number | null, b: number | null) => void
  compact?: boolean
  quiet?: boolean
  bare?: boolean
  markup?: boolean
  markupSwipeSafe?: boolean
  hudCorner?: ReactNode
  overlayChrome?: boolean
  postedBy?: string | null
  onPostedBy?: (handle: string) => void
  /** Overlay Share on fill players. Off for reels that already have Share in chrome. */
  shareChrome?: boolean
}

export function GymClipPlayer({
  url,
  itemId,
  fill = false,
  active,
  persistUrl = url,
  loopA,
  loopB,
  onAbChange,
  compact = false,
  quiet = false,
  bare = false,
  markup,
  markupSwipeSafe = false,
  hudCorner,
  overlayChrome,
  postedBy,
  onPostedBy,
  shareChrome,
}: Props) {
  useEffect(() => {
    if (socialPlatform(url) && itemId) void prefetchInstagram(url, itemId)
  }, [url, itemId])
  const persist = persistUrl || url
  const { nameForUrl } = useGymLibrary()
  const showShare = shareChrome ?? (fill && !bare)
  const share = showShare ? (
    <div className="pointer-events-auto absolute right-2 bottom-[5.75rem] z-30 sm:bottom-24">
      <ShareReference
        variant="story"
        draft={clipShareDraft(nameForUrl(persist) || 'Reference clip', persist, loopA, loopB)}
      />
    </div>
  ) : null
  const social = socialPlatform(url)
  if (social) {
    const embed = (
      <InstagramEmbed
        url={url}
        itemId={itemId}
        fill={fill}
        persistUrl={persistUrl}
        loopA={loopA}
        loopB={loopB}
        onAbChange={onAbChange}
        compact={compact}
        quiet={quiet}
        active={active}
        bare={bare}
        markup={markup}
        markupSwipeSafe={markupSwipeSafe}
        hudCorner={hudCorner}
        overlayChrome={overlayChrome}
        postedBy={postedBy}
        onPostedBy={onPostedBy}
      />
    )
    return fill ? (
      <div className="relative h-full min-h-0 w-full">
        {embed}
        {share}
      </div>
    ) : (
      <div className="space-y-2">
        {embed}
        {!quiet && !bare && <ClipWatchMeta url={persistUrl || url} />}
      </div>
    )
  }
  const bench = (
    <VideoWorkbench
      src={url}
      allowAbLoop
      autoPlay={active !== false}
      fill={fill}
      persistUrl={persistUrl}
      loopA={loopA}
      loopB={loopB}
      onAbChange={onAbChange}
      markup={markup ?? (!compact && !bare)}
      markupSwipeSafe={markupSwipeSafe}
      compact={compact}
      bare={bare}
      active={active}
      hudCorner={hudCorner}
      overlayChrome={overlayChrome}
    />
  )
  return fill ? (
    <div className="relative h-full min-h-0 w-full">
      {bench}
      {share}
    </div>
  ) : (
    <div className="space-y-2">
      {bench}
      {!quiet && !bare && <ClipWatchMeta url={persistUrl || url} />}
    </div>
  )
}
