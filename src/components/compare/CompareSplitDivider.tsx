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
  /** Replay Last: panes sit flush; the drag hit area still overlaps both videos. */
  flush?: boolean
}

export function CompareSplitDivider({
  axis,
  value,
  onChange,
  min = 0.22,
  max = 0.78,
  flush = false,
}: Props) {
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
          ? flush
            ? 'relative z-[16] h-0 shrink-0 cursor-ns-resize touch-none'
            : 'relative z-[16] flex h-3 shrink-0 cursor-ns-resize touch-none items-center justify-center bg-black'
          : flush
            ? 'relative z-[16] w-0 shrink-0 cursor-ew-resize touch-none'
            : 'relative z-[16] flex w-3 shrink-0 cursor-ew-resize touch-none items-center justify-center bg-black'
      }
    >
      <span
        className={
          vertical
            ? flush
              ? 'absolute left-1/2 top-1/2 z-[17] h-5 w-full -translate-x-1/2 -translate-y-1/2'
              : 'h-1 w-12 rounded-full bg-white/55'
            : flush
              ? 'absolute left-1/2 top-1/2 z-[17] h-full w-5 -translate-x-1/2 -translate-y-1/2'
              : 'h-12 w-1 rounded-full bg-white/55'
        }
      />
      {flush ? (
        <span
          className={
            vertical
              ? 'pointer-events-none absolute left-1/2 top-1/2 h-px w-10 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/40'
              : 'pointer-events-none absolute left-1/2 top-1/2 h-10 w-px -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/40'
          }
        />
      ) : null}
    </div>
  )
}
