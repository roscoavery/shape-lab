/**
 * Shape overlay that sits on the whole Compare fullscreen stage —
 * drag it over either video, park it off to the side, hide it when you are done.
 */

import { useRef, type PointerEvent } from 'react'
import { CroppedStill } from './CroppedStill'
import { useOverlayStill } from './OverlayStillContext'

export function FloatingStillOverlay() {
  const {
    selected,
    visible,
    opacity,
    scale,
    offsetX,
    offsetY,
    setOffset,
    setVisible,
  } = useOverlayStill()
  const drag = useRef<{
    pointerId: number
    startX: number
    startY: number
    origX: number
    origY: number
    width: number
    height: number
  } | null>(null)

  if (!selected) return null

  if (!visible || opacity < 0.02) {
    return (
      <button
        type="button"
        onClick={() => setVisible(true)}
        className="pointer-events-auto absolute bottom-3 right-3 z-[22] rounded-full border border-white/25 bg-black/70 px-3 py-1.5 text-[11px] font-semibold text-white shadow-lg backdrop-blur-md hover:bg-black/85"
      >
        Show {selected.name}
      </button>
    )
  }

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
      aria-label={`${selected.name} overlay — drag anywhere, hide when done`}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      className="pointer-events-auto absolute z-[18] cursor-grab touch-none active:cursor-grabbing"
      style={{
        left: `${offsetX}%`,
        top: `${offsetY}%`,
        width: `${scale * 100}%`,
        height: `${scale * 100}%`,
        transform: 'translate(-50%, -50%)',
      }}
    >
      <div className="relative h-full w-full" style={{ opacity }}>
        <CroppedStill
          src={selected.src}
          stillId={selected.photoId}
          alt=""
          className="h-full w-full object-contain"
        />
      </div>
      <button
        type="button"
        aria-label="Hide overlay"
        onPointerDown={(e) => {
          e.stopPropagation()
        }}
        onClick={(e) => {
          e.stopPropagation()
          setVisible(false)
        }}
        className="absolute -right-1 -top-1 z-[2] flex h-7 w-7 items-center justify-center rounded-full bg-black/85 text-sm font-semibold text-white shadow-md ring-1 ring-white/30 hover:bg-black"
      >
        ×
      </button>
    </div>
  )
}
