import type { ReactNode } from 'react'
import { socialPlatform } from '../../lib/socialUrls'
import type { Collage } from '../../lib/collages'

type Props = {
  collage: Collage
  nameForUrl: (url: string) => string
  onPlay: () => void
  children?: ReactNode
}

function SlotThumb({ url, name }: { url: string; name: string }) {
  if (!url || socialPlatform(url)) {
    return (
      <div className="flex h-full min-h-[4.5rem] items-center justify-center bg-[#0b1016] px-2 text-center text-[10px] font-semibold text-white/45">
        {name || 'Clip'}
      </div>
    )
  }
  return (
    <video
      src={url}
      muted
      playsInline
      preload="metadata"
      className="h-full min-h-[4.5rem] w-full object-cover"
    />
  )
}

export function CollageBoardCard({ collage, nameForUrl, onPlay, children }: Props) {
  const thumbs = collage.slots.slice(0, 4)
  const extra = collage.slots.length - thumbs.length
  const cols = thumbs.length <= 1 ? 1 : 2

  return (
    <article className="overflow-hidden rounded-2xl border border-white/10 bg-[#0d1218]">
      <button type="button" onClick={onPlay} className="block w-full text-left">
        <div
          className={`grid overflow-hidden bg-black ${
            thumbs.length === 0 ? 'aspect-video' : ''
          }`}
          style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
        >
          {thumbs.length === 0 ? (
            <div className="flex aspect-video items-center justify-center text-sm text-white/40">
              Empty board
            </div>
          ) : (
            thumbs.map((slot, i) => (
              <div key={`${slot.clipId || slot.url}-${i}`} className="relative min-h-[4.5rem]">
                <SlotThumb url={slot.url} name={nameForUrl(slot.url)} />
                {i === thumbs.length - 1 && extra > 0 ? (
                  <span className="absolute inset-0 flex items-center justify-center bg-black/55 text-sm font-bold text-white">
                    +{extra}
                  </span>
                ) : null}
              </div>
            ))
          )}
        </div>
        <div className="flex items-end justify-between gap-2 px-3 pt-2.5">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-white">{collage.name}</p>
            <p className="text-[11px] text-white/45">
              {collage.slots.length} panel{collage.slots.length === 1 ? '' : 's'}
            </p>
          </div>
          <span className="rounded-lg bg-[var(--accent)] px-2.5 py-1 text-[11px] font-bold text-[#06281f]">
            Play
          </span>
        </div>
      </button>
      {children ? <div className="flex flex-wrap gap-2 px-3 pb-3 pt-2">{children}</div> : null}
    </article>
  )
}
