import { useRef, useState, type PointerEvent } from 'react'
import { cropFromCorners, type StillCropRect } from '../../lib/stillCrop'
import { FramedPhoto } from './FramedPhoto'

type Props = {
  src: string
  crop?: StillCropRect
  onChange: (crop: StillCropRect) => void
}

export function SimpleCropper({ src, crop, onChange }: Props) {
  const hostRef = useRef<HTMLDivElement | null>(null)
  const startRef = useRef<{ x: number; y: number } | null>(null)
  const [draft, setDraft] = useState<StillCropRect | null>(null)

  const toNorm = (e: { clientX: number; clientY: number }) => {
    const host = hostRef.current
    if (!host) return null
    const r = host.getBoundingClientRect()
    if (r.width < 4 || r.height < 4) return null
    return {
      x: Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)),
      y: Math.min(1, Math.max(0, (e.clientY - r.top) / r.height)),
    }
  }

  const down = (e: PointerEvent<HTMLDivElement>) => {
    const p = toNorm(e)
    if (!p) return
    startRef.current = p
    setDraft({ x: p.x, y: p.y, w: 0.06, h: 0.06 })
    e.currentTarget.setPointerCapture(e.pointerId)
  }

  const move = (e: PointerEvent<HTMLDivElement>) => {
    const start = startRef.current
    const p = toNorm(e)
    if (!start || !p) return
    setDraft(cropFromCorners(start, p))
  }

  const up = () => {
    if (draft) onChange(draft)
    startRef.current = null
    setDraft(null)
  }

  const shown = draft ?? crop

  return (
    <div>
      <p className="mb-1 text-[11px] text-[var(--muted)]">
        Press one corner and drag to the opposite corner to crop.
      </p>
      <div
        ref={hostRef}
        className="relative cursor-crosshair overflow-hidden rounded-lg bg-[#0d1218]"
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={up}
      >
        <FramedPhoto src={src} className="pointer-events-none max-h-72 w-full object-contain" />
        {shown && (
          <div
            className="pointer-events-none absolute border-2 border-[var(--accent)] bg-[var(--accent)]/15"
            style={{
              left: `${shown.x * 100}%`,
              top: `${shown.y * 100}%`,
              width: `${shown.w * 100}%`,
              height: `${shown.h * 100}%`,
            }}
          />
        )}
      </div>
    </div>
  )
}
