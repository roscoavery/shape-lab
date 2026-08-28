/**
 * Drag handle between Compare panes. Does not scale the videos —
 * each pane stays object-contain; this only changes how much of the
 * window each view is given.
 */

import { useRef, type PointerEvent } from 'react'

type Props = {
  axis: 'x' | 'y'
  value: number
  onChange: (n: number) => void
  min?: number
  max?: number
}

export function CompareSplitDivider({ axis, value, onChange, min = 0.22, max = 0.78 }: Props) {
  const drag = useRef<{ pointerId: number; start: number; orig: number; size: number } | null>(
    null,
  )

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    const parent = e.currentTarget.parentElement
    if (!parent) return
    e.preventDefault()
    e.stopPropagation()
    const rect = parent.getBoundingClientRect()
    e.currentTarget.setPointerCapture(e.pointerId)
    drag.current = {
      pointerId: e.pointerId,
      start: axis === 'y' ? e.clientY : e.clientX,
      orig: value,
      size: axis === 'y' ? rect.height : rect.width,
    }
  }

  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    const d = drag.current
    if (!d || d.pointerId !== e.pointerId || d.size < 8) return
    e.preventDefault()
    const now = axis === 'y' ? e.clientY : e.clientX
    const delta = (now - d.start) / d.size
    onChange(Math.min(max, Math.max(min, d.orig + delta)))
  }

  const end = (e: PointerEvent<HTMLDivElement>) => {
    if (drag.current?.pointerId === e.pointerId) drag.current = null
  }

  const vertical = axis === 'y'

  return (
    <div
      role="separator"
      aria-orientation={vertical ? 'horizontal' : 'vertical'}
      aria-valuenow={Math.round(value * 100)}
      aria-label="Resize reference and delay cam"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={end}
      onPointerCancel={end}
      className={
        vertical
          ? 'relative z-[16] flex h-3 shrink-0 cursor-ns-resize touch-none items-center justify-center bg-black'
          : 'relative z-[16] flex w-3 shrink-0 cursor-ew-resize touch-none items-center justify-center bg-black'
      }
    >
      <span
        className={
          vertical
            ? 'h-1 w-12 rounded-full bg-white/55'
            : 'h-12 w-1 rounded-full bg-white/55'
        }
      />
    </div>
  )
}
