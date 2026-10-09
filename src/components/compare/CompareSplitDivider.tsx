/**
 * Drag handle between Compare panes. Does not scale the videos —
 * each pane stays object-contain; this only changes how much of the
 * window each view is given.
 *
 * Top/bottom: drag the bar all the way to either edge for a full-size
 * pane. A fast flick up or down on the bar snaps it to the top or
 * bottom with a scroll-like ease (bottom video full size on flick up,
 * top video full size on flick down). Tapping the bar while it sits at
 * an extreme restores the previous split.
 */

import { useEffect, useRef, useState, type PointerEvent } from 'react'

type Props = {
  axis: 'x' | 'y'
  value: number
  onChange: (n: number) => void
  min?: number
  max?: number
  /** Leave fullscreen without sitting on the Clip HUD. */
  onClose?: () => void
  /** Playhead link state for the Compare link button. */
  linked?: boolean
  onToggleLink?: () => void
  /** Two-clips mode: camera hidden, two clips compared. */
  twoClips?: boolean
  onToggleTwoClips?: () => void
  /** Fit mode: cover (crop to fill) or contain (fit whole video). */
  fitContain?: boolean
  onToggleFit?: () => void
  /** Clean recording: capture videos without UI buttons. */
  onRecord?: (withMic: boolean) => void
  recording?: boolean
}

// A release faster than this (px per ms) counts as a flick, not a drag.
const FLICK_VELOCITY = 0.5
// Window (ms) over which flick velocity is measured.
const FLICK_WINDOW = 120
// Movement under this (px) within this time (ms) counts as a tap.
const TAP_SLOP = 10
const TAP_TIME = 350
// Ease duration for the flick snap, in ms.
const FLICK_DURATION = 320

export function CompareSplitDivider({
  axis,
  value,
  onChange,
  min,
  max,
  onClose,
  linked = false,
  onToggleLink,
  twoClips = false,
  onToggleTwoClips,
  fitContain = false,
  onToggleFit,
  onRecord,
  recording = false,
}: Props) {
  const vertical = axis === 'y'
  // Top/bottom gets the full travel range so either video can go full
  // size; left/right keeps the old limits.
  const lo = min ?? (vertical ? 0 : 0.22)
  const hi = max ?? (vertical ? 1 : 0.78)

  const valueRef = useRef(value)
  valueRef.current = value
  const drag = useRef<{
    pointerId: number
    start: number
    orig: number
    size: number
    downTime: number
    history: { pos: number; t: number }[]
  } | null>(null)
  const animFrame = useRef<number | null>(null)
  const animating = useRef(false)
  const restoreRatio = useRef(0.5)

  // Remember the last settled non-extreme ratio so a tap at an extreme
  // can bring the split back. Flick animation intermediates are excluded.
  if (!animating.current && value > 0.02 && value < 0.98) {
    restoreRatio.current = value
  }

  // Record menu: choose with or without voiceover.
  const [recordMenu, setRecordMenu] = useState(false)

  useEffect(() => {
    return () => {
      if (animFrame.current != null) cancelAnimationFrame(animFrame.current)
    }
  }, [])

  const cancelAnim = () => {
    if (animFrame.current != null) {
      cancelAnimationFrame(animFrame.current)
      animFrame.current = null
    }
    animating.current = false
  }

  // Scroll-like snap: fast start, gentle landing.
  const animateTo = (target: number) => {
    cancelAnim()
    const from = valueRef.current
    if (from === target) return
    const start = performance.now()
    animating.current = true
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / FLICK_DURATION)
      const eased = 1 - Math.pow(1 - t, 3)
      onChange(from + (target - from) * eased)
      if (t < 1) {
        animFrame.current = requestAnimationFrame(step)
      } else {
        animFrame.current = null
        animating.current = false
      }
    }
    animFrame.current = requestAnimationFrame(step)
  }

  const posOf = (e: PointerEvent<HTMLDivElement>) => (vertical ? e.clientY : e.clientX)

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    const parent = e.currentTarget.parentElement
    if (!parent) return
    e.preventDefault()
    e.stopPropagation()
    cancelAnim()
    const rect = parent.getBoundingClientRect()
    e.currentTarget.setPointerCapture(e.pointerId)
    const pos = posOf(e)
    const now = performance.now()
    drag.current = {
      pointerId: e.pointerId,
      start: pos,
      orig: valueRef.current,
      size: vertical ? rect.height : rect.width,
      downTime: now,
      history: [{ pos, t: now }],
    }
  }

  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    const d = drag.current
    if (!d || d.pointerId !== e.pointerId || d.size < 8) return
    e.preventDefault()
    const pos = posOf(e)
    const now = performance.now()
    d.history.push({ pos, t: now })
    while (d.history.length > 2 && now - d.history[0].t > FLICK_WINDOW) d.history.shift()
    const delta = (pos - d.start) / d.size
    onChange(Math.min(hi, Math.max(lo, d.orig + delta)))
  }

  const onPointerCancel = (e: PointerEvent<HTMLDivElement>) => {
    const d = drag.current
    if (!d || d.pointerId !== e.pointerId) return
    drag.current = null
    cancelAnim()
  }

  const end = (e: PointerEvent<HTMLDivElement>) => {
    const d = drag.current
    if (!d || d.pointerId !== e.pointerId) return
    drag.current = null
    const pos = posOf(e)
    const now = performance.now()
    const moved = Math.abs(pos - d.start)

    // Tap without a real drag: at an extreme, restore the previous split.
    if (moved < TAP_SLOP && now - d.downTime < TAP_TIME) {
      const v = valueRef.current
      if (vertical && (v <= lo + 0.001 || v >= hi - 0.001)) {
        onChange(Math.min(hi, Math.max(lo, restoreRatio.current)))
      }
      return
    }

    // Flick: top/bottom axis only, only when fast. The bar snaps all the
    // way to the edge in the flick direction.
    if (vertical) {
      const first = d.history[0]
      const hdt = now - first.t
      if (hdt > 0) {
        const velocity = (pos - first.pos) / hdt // px per ms, negative is up
        if (velocity < -FLICK_VELOCITY) {
          animateTo(lo) // fling up: bar to the top, bottom video full size
          return
        }
        if (velocity > FLICK_VELOCITY) {
          animateTo(hi) // fling down: bar to the bottom, top video full size
          return
        }
      }
    }
    // Otherwise the drag already left the bar where it was dropped.
  }

  return (
    <div
      role="separator"
      aria-orientation={vertical ? 'horizontal' : 'vertical'}
      aria-valuenow={Math.round(value * 100)}
      aria-label="Resize reference and delay cam"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={end}
      onPointerCancel={onPointerCancel}
      className={
        vertical
          ? 'relative z-[30] flex h-14 shrink-0 cursor-ns-resize touch-none items-center justify-center bg-[#0b0f14]'
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
      {onToggleLink ? (
        <button
          type="button"
          aria-label={linked ? 'Unlink playheads' : 'Link playheads'}
          aria-pressed={linked}
          title={linked ? 'Unlink playheads' : 'Link playheads: scrub and play move both videos'}
          onPointerDown={(e) => e.stopPropagation()}
          onClick={onToggleLink}
          className={
            vertical
              ? `absolute left-2 top-1/2 z-[32] flex h-9 w-9 -translate-y-1/2 touch-auto items-center justify-center rounded-full text-lg shadow-[0_4px_14px_rgba(0,0,0,0.45)] ${
                  linked ? 'bg-[var(--accent)] text-black' : 'bg-white/15 text-white'
                }`
              : `absolute left-1/2 top-2 z-[32] flex h-9 w-9 -translate-x-1/2 touch-auto items-center justify-center rounded-full text-lg shadow-[0_4px_14px_rgba(0,0,0,0.45)] ${
                  linked ? 'bg-[var(--accent)] text-black' : 'bg-white/15 text-white'
                }`
          }
        >
          <span aria-hidden className={linked ? '' : 'opacity-40 grayscale'}>🔗</span>
        </button>
      ) : null}
      {onToggleTwoClips ? (
        <button
          type="button"
          aria-label={twoClips ? 'Show camera' : 'Two clips: hide camera'}
          aria-pressed={twoClips}
          title={twoClips ? 'Show camera' : 'Two clips: hide the camera, compare two clips'}
          onPointerDown={(e) => e.stopPropagation()}
          onClick={onToggleTwoClips}
          className={
            vertical
              ? `absolute left-[3.75rem] top-1/2 z-[32] flex h-9 w-9 -translate-y-1/2 touch-auto items-center justify-center rounded-full text-lg shadow-[0_4px_14px_rgba(0,0,0,0.45)] ${
                  twoClips ? 'bg-[var(--accent)] text-black' : 'bg-white/15 text-white'
                }`
              : `absolute left-1/2 top-[3.75rem] z-[32] flex h-9 w-9 -translate-x-1/2 touch-auto items-center justify-center rounded-full text-lg shadow-[0_4px_14px_rgba(0,0,0,0.45)] ${
                  twoClips ? 'bg-[var(--accent)] text-black' : 'bg-white/15 text-white'
                }`
          }
        >
          <span aria-hidden className={twoClips ? '' : 'opacity-40 grayscale'}>
            {twoClips ? '📷' : '🎬'}
          </span>
        </button>
      ) : null}
      {onToggleFit ? (
        <button
          type="button"
          aria-label={fitContain ? 'Fill video (crop)' : 'Fit video (show all)'}
          aria-pressed={fitContain}
          title={fitContain ? 'Fill: crop to fill the panel' : 'Fit: show the whole video'}
          onPointerDown={(e) => e.stopPropagation()}
          onClick={onToggleFit}
          className={
            vertical
              ? `absolute right-[3.75rem] top-1/2 z-[32] flex h-9 w-9 -translate-y-1/2 touch-auto items-center justify-center rounded-full text-lg shadow-[0_4px_14px_rgba(0,0,0,0.45)] ${
                  fitContain ? 'bg-[var(--accent)] text-black' : 'bg-white/15 text-white'
                }`
              : `absolute left-1/2 top-[3.75rem] z-[32] flex h-9 w-9 -translate-x-1/2 touch-auto items-center justify-center rounded-full text-lg shadow-[0_4px_14px_rgba(0,0,0,0.45)] ${
                  fitContain ? 'bg-[var(--accent)] text-black' : 'bg-white/15 text-white'
                }`
          }
        >
          <span aria-hidden className={fitContain ? '' : 'opacity-40 grayscale'}>
            {fitContain ? '⛶' : '◫'}
          </span>
        </button>
      ) : null}
      {onRecord ? (
        <>
          <button
            type="button"
            aria-label={recording ? 'Stop recording' : 'Record clean video'}
            title={recording ? 'Stop recording' : 'Record without UI buttons'}
            onPointerDown={(e) => e.stopPropagation()}
            onClick={() => {
              if (recording) {
                onRecord(false) // false = stop
              } else {
                setRecordMenu((v) => !v)
              }
            }}
            className={
              vertical
                ? `absolute right-[6.5rem] top-1/2 z-[32] flex h-9 w-9 -translate-y-1/2 touch-auto items-center justify-center rounded-full text-lg shadow-[0_4px_14px_rgba(0,0,0,0.45)] ${
                    recording ? 'bg-red-600 text-white' : 'bg-white/15 text-white'
                  }`
                : `absolute left-1/2 top-[6.5rem] z-[32] flex h-9 w-9 -translate-x-1/2 touch-auto items-center justify-center rounded-full text-lg shadow-[0_4px_14px_rgba(0,0,0,0.45)] ${
                    recording ? 'bg-red-600 text-white' : 'bg-white/15 text-white'
                  }`
            }
          >
            <span aria-hidden>{recording ? '⏹' : '⏺'}</span>
          </button>
          {recordMenu && !recording ? (
            <div
              className={
                vertical
                  ? 'absolute right-[6.5rem] top-1/2 z-[33] -translate-y-[130%] rounded-xl border border-white/10 bg-[#1a222c] p-2 shadow-xl'
                  : 'absolute left-1/2 top-[6.5rem] z-[33] -translate-x-1/2 translate-y-[-130%] rounded-xl border border-white/10 bg-[#1a222c] p-2 shadow-xl'
              }
              onPointerDown={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                onClick={() => {
                  setRecordMenu(false)
                  onRecord(true)
                }}
                className="block w-full rounded-lg px-3 py-2 text-left text-sm font-semibold text-white hover:bg-white/10"
              >
                🎙 With voiceover
              </button>
              <button
                type="button"
                onClick={() => {
                  setRecordMenu(false)
                  onRecord(false)
                }}
                className="block w-full rounded-lg px-3 py-2 text-left text-sm font-semibold text-white hover:bg-white/10"
              >
                🔇 Without voiceover
              </button>
            </div>
          ) : null}
        </>
      ) : null}
    </div>
  )
}
