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
}: Props) {
  const social = socialPlatform(url)
  if (social) {
    return (
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
      />
    )
  }
  return (
    <VideoWorkbench
      src={url}
      allowAbLoop
      autoPlay={active !== false}
      fill={fill}
      persistUrl={persistUrl}
      loopA={loopA}
      loopB={loopB}
      onAbChange={onAbChange}
      markup={!compact}
      compact={compact}
      active={active}
    />
  )
}
