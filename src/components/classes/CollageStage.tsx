import { createPortal } from 'react-dom'
import { GymClipPlayer } from '../GymClipPlayer'
import { evenGrid, type Collage, type CollageSlot } from '../../lib/collages'

export function CollageStage({
  collage,
  nameForUrl,
  fullscreen,
  onFullscreen,
  onClose,
  onSlots,
  canEdit,
}: {
  collage: Collage
  nameForUrl: (url: string) => string
  fullscreen: boolean
  onFullscreen: (v: boolean) => void
  onClose: () => void
  onSlots?: (slots: CollageSlot[]) => void
  canEdit: boolean
}) {
  const landscape = typeof window !== 'undefined' && window.innerWidth > window.innerHeight
  const { cols, rows } = evenGrid(collage.slots.length, landscape || fullscreen)
  const body = (
    <div
      className={
        fullscreen
          ? 'fixed inset-0 z-[260] flex flex-col bg-black'
          : 'overflow-hidden rounded-2xl border border-[var(--panel-border)] bg-black'
      }
    >
      <div className="flex shrink-0 flex-wrap items-center gap-2 px-3 py-2 text-white">
        <h3 className="mr-auto text-sm font-semibold">{collage.name}</h3>
        <button
          type="button"
          onClick={() => onFullscreen(!fullscreen)}
          className="rounded-md border border-white/30 px-2 py-1 text-xs"
        >
          {fullscreen ? 'Exit full screen' : 'Full screen'}
        </button>
        <button type="button" onClick={onClose} className="rounded-md border border-white/30 px-2 py-1 text-xs">
          Close
        </button>
      </div>
      <div
        className={`grid min-h-0 flex-1 gap-px bg-white/10 ${fullscreen ? 'h-full' : 'min-h-[420px]'}`}
        style={{
          gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
          gridTemplateRows: `repeat(${rows}, minmax(0, 1fr))`,
        }}
      >
        {collage.slots.map((slot, i) => {
          const spanLast = collage.slots.length === 5 && i === 4 && cols === 2
          return (
            <div
              key={`${slot.url}-${i}`}
              className="relative flex min-h-0 min-w-0 flex-col bg-black"
              style={spanLast && cols === 2 ? { gridColumn: '1 / -1' } : undefined}
            >
              <div className="min-h-0 flex-1">
                <GymClipPlayer
                  url={slot.url}
                  itemId={slot.clipId}
                  fill
                  persistUrl={slot.url}
                  loopA={slot.loopA}
                  loopB={slot.loopB}
                  compact
                  quiet
                  onAbChange={
                    canEdit && onSlots
                      ? (a, b) => {
                          const slots = collage.slots.map((s, idx) =>
                            idx === i ? { ...s, loopA: a, loopB: b } : s,
                          )
                          onSlots(slots)
                        }
                      : undefined
                  }
                />
              </div>
              <div className="pointer-events-none absolute inset-x-0 top-0 bg-gradient-to-b from-black/70 to-transparent px-2 py-2">
                <p className="text-[11px] font-semibold text-white">{nameForUrl(slot.url)}</p>
                {slot.caption ? (
                  <p className="text-[12px] text-[var(--accent)]">{slot.caption}</p>
                ) : null}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
  if (fullscreen) return createPortal(body, document.body)
  return body
}
