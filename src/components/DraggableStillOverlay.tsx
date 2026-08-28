/**
 * Ghost still on a video: object-contain (never crops), scalable, draggable to a corner.
 */

import { useRef, type PointerEvent } from 'react'
import { useOverlayStill } from './OverlayStillContext'

type Props = {
  /** Compare delay-cam / homework camera. */
  className?: string
}

export function DraggableStillOverlay({ className = '' }: Props) {
  const { selected, opacity, scale, offsetX, offsetY, setOffset } = useOverlayStill()
  const drag = useRef<{
    pointerId: number
    startX: number
    startY: number
    origX: number
    origY: number
    width: number
    height: number
  } | null>(null)

  if (!selected || opacity < 0.02) return null

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    const parent = e.currentTarget.parentElement
    if (!parent) return
    e.preventDefault()
    e.stopPropagation()
    const rect = parent.getBoundingClientRect()
    e.currentTarget.setPointerCapture(e.pointerId)
    drag.current = {
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      origX: offsetX,
      origY: offsetY,
      width: rect.width,
      height: rect.height,
    }
  }

  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    const d = drag.current
    if (!d || d.pointerId !== e.pointerId) return
    e.preventDefault()
    const dx = ((e.clientX - d.startX) / d.width) * 100
    const dy = ((e.clientY - d.startY) / d.height) * 100
    setOffset(d.origX + dx, d.origY + dy)
  }

  const endDrag = (e: PointerEvent<HTMLDivElement>) => {
    if (drag.current?.pointerId === e.pointerId) drag.current = null
  }

  return (
    <div
      role="img"
      aria-label={`${selected.name} overlay — drag to move`}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      className={`absolute z-[12] cursor-grab touch-none active:cursor-grabbing ${className}`}
      style={{
        left: `${offsetX}%`,
        top: `${offsetY}%`,
        width: `${scale * 100}%`,
        height: `${scale * 100}%`,
        transform: 'translate(-50%, -50%)',
        opacity,
      }}
    >
      <img
        src={selected.src}
        alt=""
        draggable={false}
        className="h-full w-full object-contain"
      />
    </div>
  )
}
