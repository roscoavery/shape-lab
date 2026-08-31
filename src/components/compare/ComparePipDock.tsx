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
    const maxX = Math.max(MARGIN, prect.width - CHIP_W - MARGIN)
    const maxY = Math.max(MARGIN, prect.height - CHIP_H - 52 - MARGIN)
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
          ? `absolute z-[36] flex w-[7rem] flex-col items-center gap-1 ${
              pos ? '' : pipCornerClass(pipCorner)
            }`
          : splitClass
      }
      style={active ? (pos ? { left: pos.x, top: pos.y, right: 'auto', bottom: 'auto' } : undefined) : splitStyle}
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
      <div className={active ? `relative ${COMPARE_PIP_BOX}` : 'h-full min-h-0 min-w-0'}>
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
      </div>
    </div>
  )
}
