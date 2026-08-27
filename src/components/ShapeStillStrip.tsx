/**
 * Labeled coach stills for the shape being named or asked.
 * The filename can look like another shape (mountain climber vs lunge) —
 * the label is the contract for what we are asking.
 */

import { getShape } from '../config/shapes'
import type { ReferencePhoto } from '../types'
import { ReferenceStill } from './ReferenceStill'

export type StripItem = {
  shapeId: string
  label?: string
}

type Props = {
  items: StripItem[]
  photos: ReferencePhoto[]
  activeShapeId?: string | null
  size?: 'sm' | 'md'
}

export function ShapeStillStrip({ items, photos, activeShapeId, size = 'md' }: Props) {
  const box = size === 'sm' ? 'w-[4.5rem] sm:w-24' : 'w-[5.5rem] sm:w-28'
  const img = size === 'sm' ? 'h-16 sm:h-20' : 'h-20 sm:h-24'
  return (
    <div className="flex gap-2 overflow-x-auto pb-1">
      {items.map((item, i) => {
        const shape = getShape(item.shapeId)
        const name = shape?.name ?? item.shapeId
        const nick = item.label
        const active = activeShapeId === item.shapeId
        return (
          <div
            key={`${item.shapeId}-${nick ?? ''}-${i}`}
            className={`shrink-0 overflow-hidden rounded-lg border ${box} ${
              active
                ? 'border-[var(--accent)] ring-1 ring-[var(--accent)]'
                : 'border-[var(--panel-border)]'
            } bg-[#0d1218]`}
          >
            <div className={`relative ${img} w-full bg-black`}>
              <ReferenceStill
                shapeId={item.shapeId}
                photos={photos}
                alt={name}
                className="h-full w-full object-contain"
                emptyLabel={name}
              />
              {nick && (
                <span className="absolute left-1 top-1 rounded bg-black/75 px-1 py-0.5 text-[10px] font-bold tracking-wide text-white">
                  {nick}
                </span>
              )}
            </div>
            <p
              className={`px-1 py-0.5 text-center text-[10px] font-semibold leading-tight ${
                active ? 'text-[var(--accent)]' : 'text-[var(--text)]'
              }`}
            >
              {name}
            </p>
          </div>
        )
      })}
    </div>
  )
}
