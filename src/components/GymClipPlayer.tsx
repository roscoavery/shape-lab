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
      markup={!compact && !bare}
      compact={compact}
      bare={bare}
      active={active}
    />
  )
  return fill ? <div className="h-full min-h-0 w-full">{bench}</div> : bench
}
