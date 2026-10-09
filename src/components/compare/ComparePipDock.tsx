/**
 * Draggable corner chip for the minimized Compare pane.
 * Drag snaps to any corner so HUD buttons behind it stay reachable.
 * Swap / Split sit on the chip so they travel with it.
 */

import { useRef, useState, type CSSProperties, type PointerEvent, type ReactNode } from 'react'
import { HudCircle, IconSplit, IconSwap } from './CompareHud'
import {
  COMPARE_PIP_BOX,
  pipCornerClass,
  useCompareLayout,
  type PipCorner,
} from './compareLayout'

const MARGIN = 12
const CHIP_W = 112
const CHIP_H = 156
const MIN_W = 88
const MIN_H = 120
const MAX_W = 320
const MAX_H = 420

function snapCorner(x: number, y: number, w: number, h: number): PipCorner {
  const left = x + CHIP_W / 2 < w / 2
  const top = y + CHIP_H / 2 < h / 2
  if (top && left) return 'tl'
  if (top && !left) return 'tr'
  if (!top && left) return 'bl'
  return 'br'
}

type Props = {
  active: boolean
  children: ReactNode
  onSwap: () => void
  onSplit: () => void
  splitClass: string
  splitStyle?: CSSProperties
}

export function ComparePipSlot({
  active,
  children,
  onSwap,
  onSplit,
  splitClass,
  splitStyle,
}: Props) {
  const { pipCorner, setPipCorner } = useCompareLayout()
  const dockRef = useRef<HTMLDivElement | null>(null)
  const posRef = useRef<{ x: number; y: number } | null>(null)
  const drag = useRef<{
    pointerId: number
    startX: number
    startY: number
    origX: number
    origY: number
    moved: boolean
  } | null>(null)
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null)
  // Resizable chip: drag a corner to grow/shrink.
  const [size, setSize] = useState<{ w: number; h: number }>({ w: CHIP_W, h: CHIP_H })
  const resize = useRef<{
    pointerId: number
    startX: number
    startY: number
    origW: number
    origH: number
    corner: 'tl' | 'tr' | 'bl' | 'br'
  } | null>(null)

  const beginResize =
    (corner: 'tl' | 'tr' | 'bl' | 'br') => (e: PointerEvent<HTMLDivElement>) => {
      if (!active) return
      e.preventDefault()
      e.stopPropagation()
      e.currentTarget.setPointerCapture(e.pointerId)
      resize.current = {
        pointerId: e.pointerId,
        startX: e.clientX,
        startY: e.clientY,
        origW: size.w,
        origH: size.h,
        corner,
      }
    }

  const onResizeMove = (e: PointerEvent<HTMLDivElement>) => {
    if (!active) return
    const r = resize.current
    if (!r || r.pointerId !== e.pointerId) return
    e.preventDefault()
    const dx = e.clientX - r.startX
    const dy = e.clientY - r.startY
    // Flip the delta for left/top corners so dragging outward grows the chip.
    const dw = r.corner === 'tl' || r.corner === 'bl' ? -dx : dx
    const dh = r.corner === 'tl' || r.corner === 'tr' ? -dy : dy
    // Keep the 112:156 aspect ratio.
    const ratio = CHIP_H / CHIP_W
    let w = Math.min(MAX_W, Math.max(MIN_W, r.origW + dw))
    let h = Math.min(MAX_H, Math.max(MIN_H, r.origH + dh))
    // Use the larger delta to drive both, preserving ratio.
    if (Math.abs(dw) >= Math.abs(dh)) {
      h = Math.min(MAX_H, Math.max(MIN_H, w * ratio))
      w = h / ratio
    } else {
      w = Math.min(MAX_W, Math.max(MIN_W, h / ratio))
      h = w * ratio
    }
    setSize({ w: Math.round(w), h: Math.round(h) })
  }

  const endResize = (e: PointerEvent<HTMLDivElement>) => {
    const r = resize.current
    if (!r || r.pointerId !== e.pointerId) return
    resize.current = null
  }

  const beginDrag = (e: PointerEvent<HTMLDivElement>) => {
    if (!active) return
    const dock = dockRef.current
    const parent = dock?.parentElement
    if (!dock || !parent) return
    e.preventDefault()
    e.stopPropagation()
    const prect = parent.getBoundingClientRect()
    const drect = dock.getBoundingClientRect()
    e.currentTarget.setPointerCapture(e.pointerId)
    posRef.current = null
    drag.current = {
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      origX: drect.left - prect.left,
      origY: drect.top - prect.top,
      moved: false,
    }
  }

  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    if (!active) return
    const d = drag.current
    const parent = dockRef.current?.parentElement
    if (!d || d.pointerId !== e.pointerId || !parent) return
    const dx = e.clientX - d.startX
    const dy = e.clientY - d.startY
    if (!d.moved && Math.hypot(dx, dy) < 8) return
    d.moved = true
    e.preventDefault()
    const prect = parent.getBoundingClientRect()
    const maxX = Math.max(MARGIN, prect.width - size.w - MARGIN)
    const maxY = Math.max(MARGIN, prect.height - size.h - 52 - MARGIN)
    const next = {
      x: Math.min(maxX, Math.max(MARGIN, d.origX + dx)),
      y: Math.min(maxY, Math.max(MARGIN, d.origY + dy)),
    }
    posRef.current = next
    setPos(next)
  }

  const end = (e: PointerEvent<HTMLDivElement>) => {
    if (!active) return
    const d = drag.current
    if (!d || d.pointerId !== e.pointerId) return
    const moved = d.moved
    const last = posRef.current
    drag.current = null
    posRef.current = null
    const parent = dockRef.current?.parentElement
    if (moved && parent && last) {
      const prect = parent.getBoundingClientRect()
      setPipCorner(snapCorner(last.x, last.y, prect.width, prect.height))
      setPos(null)
      return
    }
    setPos(null)
    if (!moved) onSwap()
  }

  return (
    <div
      ref={dockRef}
      className={
        active
          ? `absolute z-[36] flex flex-col items-center gap-1 ${
              pos ? '' : pipCornerClass(pipCorner)
            }`
          : splitClass
      }
      style={
        active
          ? {
              width: size.w,
              ...(pos ? { left: pos.x, top: pos.y, right: 'auto', bottom: 'auto' } : undefined),
            }
          : splitStyle
      }
    >
      {active ? (
        <div className="flex items-center gap-2">
          <HudCircle label="Swap" size="sm" onClick={onSwap}>
            <IconSwap />
          </HudCircle>
          <HudCircle label="Split" size="sm" onClick={onSplit}>
            <IconSplit />
          </HudCircle>
        </div>
      ) : null}
      <div
        className={active ? `relative ${COMPARE_PIP_BOX}` : 'h-full min-h-0 min-w-0'}
        style={active ? { width: size.w, height: size.h } : undefined}
      >
        <div className={active ? 'pointer-events-none h-full min-h-0' : 'h-full min-h-0'}>
          {children}
        </div>
        {active ? (
          <div
            className="absolute inset-0 z-[80] touch-none"
            onPointerDown={beginDrag}
            onPointerMove={onPointerMove}
            onPointerUp={end}
            onPointerCancel={end}
            aria-label="Drag minimized view to a corner, or tap to swap"
          />
        ) : null}
        {active
          ? (['tl', 'tr', 'bl', 'br'] as const).map((corner) => (
              <div
                key={corner}
                className={`absolute z-[90] h-6 w-6 touch-none ${
                  corner === 'tl'
                    ? '-left-2 -top-2 cursor-nwse-resize'
                    : corner === 'tr'
                      ? '-right-2 -top-2 cursor-nesw-resize'
                      : corner === 'bl'
                        ? '-bottom-2 -left-2 cursor-nesw-resize'
                        : '-bottom-2 -right-2 cursor-nwse-resize'
                }`}
                onPointerDown={beginResize(corner)}
                onPointerMove={onResizeMove}
                onPointerUp={endResize}
                onPointerCancel={endResize}
                aria-label={`Drag to resize minimized view (${corner})`}
              />
            ))
          : null}
      </div>
    </div>
  )
}
