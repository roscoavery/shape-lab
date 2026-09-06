/**
 * Drag a chip to any screen corner. Used on class-flow fullscreen
 * for the coach still (and the delay-cam pip when that view is shown).
 */

import { useEffect, useRef, useState, type PointerEvent, type ReactNode } from 'react'
import { pipCornerClass, type PipCorner } from './compare/compareLayout'

const MARGIN = 12
const CORNER_KEY = 'shape-lab.flowChipCorner.v1'

function loadCorner(persistKey: string, fallback: PipCorner): PipCorner {
  try {
    const raw = localStorage.getItem(`${CORNER_KEY}.${persistKey}`)
    if (raw === 'tl' || raw === 'tr' || raw === 'bl' || raw === 'br') return raw
  } catch {
    /* private mode */
  }
  return fallback
}

function saveCorner(persistKey: string, corner: PipCorner) {
  try {
    localStorage.setItem(`${CORNER_KEY}.${persistKey}`, corner)
  } catch {
    /* quota */
  }
}

function snapCorner(x: number, y: number, w: number, h: number): PipCorner {
  const left = x < w / 2
  const top = y < h / 2
  if (top && left) return 'tl'
  if (top) return 'tr'
  if (left) return 'bl'
  return 'br'
}

type Props = {
  persistKey: string
  defaultCorner?: PipCorner
  className?: string
  children: ReactNode
}

export function CornerChip({
  persistKey,
  defaultCorner = 'tl',
  className = '',
  children,
}: Props) {
  const [corner, setCorner] = useState<PipCorner>(() => loadCorner(persistKey, defaultCorner))
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

  useEffect(() => {
    setCorner(loadCorner(persistKey, defaultCorner))
  }, [persistKey, defaultCorner])

  const beginDrag = (e: PointerEvent<HTMLDivElement>) => {
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
    const d = drag.current
    const parent = dockRef.current?.parentElement
    if (!d || d.pointerId !== e.pointerId || !parent) return
    const dx = e.clientX - d.startX
    const dy = e.clientY - d.startY
    if (!d.moved && Math.hypot(dx, dy) < 8) return
    d.moved = true
    e.preventDefault()
    const prect = parent.getBoundingClientRect()
    const box = dockRef.current!.getBoundingClientRect()
    const maxX = Math.max(MARGIN, prect.width - box.width - MARGIN)
    const maxY = Math.max(MARGIN, prect.height - box.height - MARGIN)
    const next = {
      x: Math.min(maxX, Math.max(MARGIN, d.origX + dx)),
      y: Math.min(maxY, Math.max(MARGIN, d.origY + dy)),
    }
    posRef.current = next
    setPos(next)
  }

  const end = (e: PointerEvent<HTMLDivElement>) => {
    const d = drag.current
    if (!d || d.pointerId !== e.pointerId) return
    const moved = d.moved
    const last = posRef.current
    drag.current = null
    posRef.current = null
    const parent = dockRef.current?.parentElement
    if (moved && parent && last) {
      const prect = parent.getBoundingClientRect()
      const next = snapCorner(last.x, last.y, prect.width, prect.height)
      setCorner(next)
      saveCorner(persistKey, next)
    }
    setPos(null)
  }

  return (
    <div
      ref={dockRef}
      className={`pointer-events-auto z-[90] ${pos ? 'absolute' : `absolute ${pipCornerClass(corner)}`} ${className}`}
      style={pos ? { left: pos.x, top: pos.y, right: 'auto', bottom: 'auto' } : undefined}
    >
      {children}
      <div
        className="absolute inset-0 z-[80] touch-none"
        onPointerDown={beginDrag}
        onPointerMove={onPointerMove}
        onPointerUp={end}
        onPointerCancel={end}
        aria-label="Drag to a corner"
      />
    </div>
  )
}
