import { useEffect, useRef, useState } from 'react'

/**
 * Full-picture view for an athlete's profile photo. The round avatar crops
 * hard-to-see faces, so this shows the whole frame large: double-tap to
 * zoom in on the face, drag to pan while zoomed, tap outside the photo
 * (or Close) to go back. Same photo the profile already shows, only bigger.
 */
export function ProfilePhotoViewer({
  src,
  name,
  onClose,
}: {
  src: string
  name: string
  onClose: () => void
}) {
  const ZOOM = 2.5
  const [scale, setScale] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const frameRef = useRef<HTMLDivElement>(null)
  const dragRef = useRef<{ x: number; y: number; panX: number; panY: number } | null>(null)
  const downRef = useRef<{ x: number; y: number } | null>(null)
  const lastTapRef = useRef<{ t: number; x: number; y: number } | null>(null)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const clampPan = (x: number, y: number, s: number) => {
    const el = frameRef.current
    if (!el || s <= 1) return { x: 0, y: 0 }
    const rect = el.getBoundingClientRect()
    const maxX = (rect.width * (s - 1)) / 2
    const maxY = (rect.height * (s - 1)) / 2
    return { x: Math.max(-maxX, Math.min(maxX, x)), y: Math.max(-maxY, Math.min(maxY, y)) }
  }

  const toggleZoom = () => {
    setScale((s) => {
      const next = s > 1 ? 1 : ZOOM
      if (next === 1) setPan({ x: 0, y: 0 })
      return next
    })
  }

  return (
    <div
      className="fixed inset-0 z-[210] flex flex-col overscroll-contain bg-black/95 text-white"
      role="dialog"
      aria-modal="true"
      aria-label={`${name}'s profile photo`}
    >
      <div className="flex shrink-0 items-center justify-between gap-3 px-4 py-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <p className="min-w-0 truncate text-sm font-semibold">{name}</p>
        <button
          type="button"
          onClick={onClose}
          className="shrink-0 rounded-lg bg-white/10 px-3 py-1.5 text-sm font-semibold"
        >
          Close
        </button>
      </div>
      <div
        ref={frameRef}
        className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden"
        onClick={onClose}
      >
        <img
          src={src}
          alt=""
          draggable={false}
          className="max-h-full max-w-full select-none object-contain"
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})`,
            touchAction: scale > 1 ? 'none' : 'manipulation',
            cursor: scale > 1 ? 'grab' : 'zoom-in',
          }}
          onClick={(e) => e.stopPropagation()}
          onPointerDown={(e) => {
            downRef.current = { x: e.clientX, y: e.clientY }
            if (scale > 1) {
              dragRef.current = { x: e.clientX, y: e.clientY, panX: pan.x, panY: pan.y }
            }
          }}
          onPointerMove={(e) => {
            const drag = dragRef.current
            if (!drag) return
            setPan(clampPan(drag.panX + (e.clientX - drag.x), drag.panY + (e.clientY - drag.y), scale))
          }}
          onPointerUp={(e) => {
            dragRef.current = null
            const down = downRef.current
            downRef.current = null
            // A press that moved is a pan, not a tap.
            if (down && Math.hypot(e.clientX - down.x, e.clientY - down.y) > 10) return
            const now = Date.now()
            const last = lastTapRef.current
            if (
              last &&
              now - last.t < 300 &&
              Math.hypot(e.clientX - last.x, e.clientY - last.y) < 40
            ) {
              lastTapRef.current = null
              toggleZoom()
              return
            }
            lastTapRef.current = { t: now, x: e.clientX, y: e.clientY }
          }}
          onPointerCancel={() => {
            dragRef.current = null
            downRef.current = null
          }}
        />
      </div>
      <p className="shrink-0 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2 text-center text-xs text-white/60">
        Double-tap the photo to zoom. Tap outside the photo to close.
      </p>
    </div>
  )
}
