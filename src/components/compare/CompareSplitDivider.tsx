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
  /** Leave fullscreen without sitting on the Clip HUD. */
  onClose?: () => void
}

export function CompareSplitDivider({
  axis,
  value,
  onChange,
  min = 0.22,
  max = 0.78,
  onClose,
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
          ? 'relative z-[30] flex h-11 shrink-0 cursor-ns-resize touch-none items-center justify-center bg-[#0b0f14]'
          : 'relative z-[30] flex w-11 shrink-0 cursor-ew-resize touch-none items-center justify-center bg-[#0b0f14]'
      }
    >
      <span
        className={
          vertical
            ? 'pointer-events-none h-1.5 w-16 rounded-full bg-white/75 shadow-[0_0_0_6px_rgba(255,255,255,0.08)]'
            : 'pointer-events-none h-16 w-1.5 rounded-full bg-white/75 shadow-[0_0_0_6px_rgba(255,255,255,0.08)]'
        }
      />
      {onClose ? (
        <button
          type="button"
          aria-label="Close replay with reference cam"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={onClose}
          className={
            vertical
              ? 'absolute right-2 top-1/2 z-[32] flex h-9 w-9 -translate-y-1/2 touch-auto items-center justify-center rounded-full bg-[#e03131] text-[1.35rem] font-bold leading-none text-white shadow-[0_4px_14px_rgba(0,0,0,0.45)]'
              : 'absolute bottom-2 left-1/2 z-[32] flex h-9 w-9 -translate-x-1/2 touch-auto items-center justify-center rounded-full bg-[#e03131] text-[1.35rem] font-bold leading-none text-white shadow-[0_4px_14px_rgba(0,0,0,0.45)]'
          }
        >
          ×
        </button>
      ) : null}
    </div>
  )
}
