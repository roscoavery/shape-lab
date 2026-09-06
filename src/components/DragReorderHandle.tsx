/**
 * Apple-style reorder grip: press and drag a row to a new index.
 * Works with touch (pointer events). Desktop can still drop on a row.
 */

import type { PointerEvent } from 'react'

type Props = {
  disabled?: boolean
  label: string
  onPointerDown: (e: PointerEvent<HTMLButtonElement>) => void
  onPointerMove: (e: PointerEvent<HTMLButtonElement>) => void
  onPointerUp: (e: PointerEvent<HTMLButtonElement>) => void
  className?: string
}

export function DragReorderHandle({
  disabled,
  label,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  className = '',
}: Props) {
  return (
    <button
      type="button"
      disabled={disabled}
      aria-label={`Drag to reorder ${label}`}
      title="Drag to reorder"
      className={`touch-none shrink-0 cursor-grab px-2 py-3 text-current active:cursor-grabbing disabled:opacity-30 ${className}`}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden>
        <circle cx="8" cy="6" r="1.6" />
        <circle cx="16" cy="6" r="1.6" />
        <circle cx="8" cy="12" r="1.6" />
        <circle cx="16" cy="12" r="1.6" />
        <circle cx="8" cy="18" r="1.6" />
        <circle cx="16" cy="18" r="1.6" />
      </svg>
    </button>
  )
}

export function rowIndexFromPoint(list: HTMLElement | null, clientY: number, count: number): number {
  if (!list || count <= 0) return 0
  const rows = [...list.querySelectorAll<HTMLElement>('[data-reorder-row]')]
  if (rows.length === 0) return 0
  for (let i = 0; i < rows.length; i++) {
    const box = rows[i]!.getBoundingClientRect()
    if (clientY < box.top + box.height / 2) return i
  }
  return count - 1
}
