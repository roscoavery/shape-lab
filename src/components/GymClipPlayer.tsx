import type { ReactNode } from 'react'
import { InstagramEmbed } from './compare/InstagramEmbed'
import { VideoWorkbench } from './compare/VideoWorkbench'
import { socialPlatform } from '../lib/socialUrls'

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
}: Props) {
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
    return fill ? <div className="h-full min-h-0 w-full">{embed}</div> : embed
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
  return fill ? <div className="h-full min-h-0 w-full">{bench}</div> : bench
}
