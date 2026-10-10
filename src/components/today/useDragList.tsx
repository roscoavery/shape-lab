import { useCallback, useRef, useState } from 'react'

type DragState = {
  index: number
  offsetY: number
} | null

/**
 * Touch-based drag reorder for vertical lists.
 *
 * Usage:
 *   const { dragState, handleProps, rowStyle } = useDragList(items.length, onReorder)
 *   // On the handle: <span {...handleProps(index)}>⋮⋮</span>
 *   // On the row: <li style={rowStyle(index)}>
 *
 * Press the handle and drag vertically. The row follows your finger.
 * On release, onReorder(fromIndex, toIndex) fires.
 */
export function useDragList(
  onReorder: (from: number, to: number) => void,
) {
  const [dragState, setDragState] = useState<DragState>(null)
  const startY = useRef(0)
  const startIndex = useRef(0)
  const rowHeight = useRef(44)
  const active = useRef(false)

  const handleProps = useCallback(
    (index: number) => ({
      onTouchStart: (e: React.TouchEvent) => {
        const touch = e.touches[0]
        if (!touch) return
        const row = (e.currentTarget as HTMLElement).closest('li')
        if (row) {
          rowHeight.current = row.getBoundingClientRect().height || 44
        }
        startY.current = touch.clientY
        startIndex.current = index
        active.current = true
        setDragState({ index, offsetY: 0 })
        e.preventDefault()
        e.stopPropagation()
      },
      onTouchMove: (e: React.TouchEvent) => {
        if (!active.current) return
        const touch = e.touches[0]
        if (!touch) return
        const dy = touch.clientY - startY.current
        setDragState({ index: startIndex.current, offsetY: dy })
        e.preventDefault()
        e.stopPropagation()
      },
      onTouchEnd: (e: React.TouchEvent) => {
        if (!active.current) return
        active.current = false
        const h = rowHeight.current || 44
        setDragState((prev) => {
          if (!prev) return null
          const delta = Math.round(prev.offsetY / h)
          const to = Math.max(0, startIndex.current + delta)
          if (to !== startIndex.current) {
            // Defer so state clears first.
            setTimeout(() => onReorder(startIndex.current, to), 0)
          }
          return null
        })
        e.preventDefault()
      },
      onTouchCancel: () => {
        active.current = false
        setDragState(null)
      },
    }),
    [onReorder],
  )

  const rowStyle = useCallback(
    (index: number): React.CSSProperties => {
      if (dragState && dragState.index === index) {
        return {
          transform: `translateY(${dragState.offsetY}px)`,
          zIndex: 10,
          position: 'relative',
          opacity: 0.92,
          boxShadow: '0 4px 16px rgba(0,0,0,0.35)',
          backgroundColor: 'var(--panel)',
          borderRadius: '8px',
        }
      }
      return {}
    },
    [dragState],
  )

  return { dragState, handleProps, rowStyle }
}

/** The ⋮⋮ grip icon. Spread handleProps(index) onto it. */
export function DragGrip(props: React.HTMLAttributes<HTMLElement>) {
  return (
    <span
      role="button"
      aria-label="Drag to reorder"
      {...props}
      className={`flex shrink-0 cursor-grab touch-none select-none items-center px-1.5 py-1 text-[var(--muted)] ${props.className ?? ''}`}
      style={{ touchAction: 'none', ...props.style }}
    >
      <span className="text-sm leading-none tracking-tighter">⋮⋮</span>
    </span>
  )
}
