import { useEffect, useRef, useState, type PointerEvent, type WheelEvent } from 'react'

type Props = {
  src: string
  athleteId?: string
  onSave: (dataUrl: string) => void
  onCancel: () => void
}

const VIEW = 280
const OUT = 720
const MAX_ZOOM = 10

function decodeImage(href: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('Could not read that photo.'))
    img.src = href
  })
}

async function fetchObjectUrl(src: string): Promise<string> {
  const res = await fetch(src, { credentials: 'same-origin', cache: 'reload' })
  if (!res.ok) throw new Error('Could not read that photo.')
  return URL.createObjectURL(await res.blob())
}

async function loadCropSource(
  src: string,
  athleteId?: string,
): Promise<{ img: HTMLImageElement; preview: string; revoke: string | null }> {
  if (src.startsWith('data:') || src.startsWith('blob:')) {
    return { img: await decodeImage(src), preview: src, revoke: null }
  }

  const candidates: string[] = []
  if (athleteId && (/^https?:/i.test(src) || src.startsWith('/'))) {
    candidates.push(`/api/roster-photo-file?id=${encodeURIComponent(athleteId)}&v=${Date.now()}`)
  }
  if (/^https?:/i.test(src) || src.startsWith('/')) candidates.push(src)

  let lastErr: unknown
  for (const href of candidates) {
    try {
      const objectUrl = await fetchObjectUrl(href)
      try {
        const img = await decodeImage(objectUrl)
        return { img, preview: objectUrl, revoke: objectUrl }
      } catch (err) {
        URL.revokeObjectURL(objectUrl)
        lastErr = err
      }
    } catch (err) {
      lastErr = err
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error('Could not read that photo.')
}

function minCover(nw: number, nh: number): number {
  if (nw < 2 || nh < 2) return 1
  return Math.max(VIEW / nw, VIEW / nh)
}

function clampOffset(tx: number, ty: number, scale: number, nw: number, nh: number) {
  const rangeX = Math.max(0, (nw * scale - VIEW) / 2)
  const rangeY = Math.max(0, (nh * scale - VIEW) / 2)
  return {
    tx: Math.min(rangeX, Math.max(-rangeX, tx)),
    ty: Math.min(rangeY, Math.max(-rangeY, ty)),
  }
}

export function ProfilePhotoCropper({ src, athleteId, onSave, onCancel }: Props) {
  const hostRef = useRef<HTMLDivElement | null>(null)
  const imgRef = useRef<HTMLImageElement | null>(null)
  const revokeRef = useRef<string | null>(null)
  const pointers = useRef(new Map<number, { x: number; y: number }>())
  const pinch = useRef<{ dist: number; scale: number } | null>(null)
  const drag = useRef<{ x: number; y: number; tx: number; ty: number } | null>(null)
  const [natural, setNatural] = useState({ w: 1, h: 1 })
  const [preview, setPreview] = useState(src)
  const [scale, setScale] = useState(1)
  const [tx, setTx] = useState(0)
  const [ty, setTy] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const cover = minCover(natural.w, natural.h)
  const maxScale = cover * MAX_ZOOM

  const releaseAll = () => {
    const host = hostRef.current
    pointers.current.forEach((_, id) => {
      if (host?.hasPointerCapture?.(id)) {
        try {
          host.releasePointerCapture(id)
        } catch {
          /* already released */
        }
      }
    })
    pointers.current.clear()
    pinch.current = null
    drag.current = null
  }

  useEffect(() => {
    let cancelled = false
    if (revokeRef.current) {
      URL.revokeObjectURL(revokeRef.current)
      revokeRef.current = null
    }
    void loadCropSource(src, athleteId)
      .then((next) => {
        if (cancelled) {
          if (next.revoke) URL.revokeObjectURL(next.revoke)
          return
        }
        revokeRef.current = next.revoke
        const w = next.img.naturalWidth || next.img.width
        const h = next.img.naturalHeight || next.img.height
        setNatural({ w, h })
        const coverScale = minCover(w, h)
        setScale(coverScale)
        setTx(0)
        setTy(0)
        setPreview(next.preview)
        imgRef.current = next.img
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Could not read that photo.')
      })
    return () => {
      cancelled = true
      releaseAll()
      if (revokeRef.current) {
        URL.revokeObjectURL(revokeRef.current)
        revokeRef.current = null
      }
    }
  }, [src, athleteId])

  const applyScale = (next: number, around?: { x: number; y: number }) => {
    const clamped = Math.min(maxScale, Math.max(cover, next))
    const origin = around ?? { x: VIEW / 2, y: VIEW / 2 }
    const ratio = clamped / scale
    const nx = origin.x - VIEW / 2
    const ny = origin.y - VIEW / 2
    const shifted = clampOffset(nx - (nx - tx) * ratio, ny - (ny - ty) * ratio, clamped, natural.w, natural.h)
    setScale(clamped)
    setTx(shifted.tx)
    setTy(shifted.ty)
  }

  const down = (e: PointerEvent<HTMLDivElement>) => {
    e.stopPropagation()
    e.preventDefault()
    try {
      e.currentTarget.setPointerCapture(e.pointerId)
    } catch {
      /* iPad Safari may already own the pointer */
    }
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()]
      const dist = Math.hypot(a!.x - b!.x, a!.y - b!.y)
      pinch.current = { dist: Math.max(dist, 1), scale }
      drag.current = null
      return
    }
    drag.current = { x: e.clientX, y: e.clientY, tx, ty }
  }

  const move = (e: PointerEvent<HTMLDivElement>) => {
    if (!pointers.current.has(e.pointerId)) return
    e.preventDefault()
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    if (pointers.current.size >= 2 && pinch.current) {
      const [a, b] = [...pointers.current.values()]
      const dist = Math.hypot(a!.x - b!.x, a!.y - b!.y)
      applyScale(pinch.current.scale * (dist / pinch.current.dist))
      return
    }
    const start = drag.current
    if (!start) return
    const next = clampOffset(
      start.tx + (e.clientX - start.x),
      start.ty + (e.clientY - start.y),
      scale,
      natural.w,
      natural.h,
    )
    setTx(next.tx)
    setTy(next.ty)
  }

  const release = (el: HTMLDivElement | null, id: number) => {
    if (el && el.hasPointerCapture?.(id)) {
      try {
        el.releasePointerCapture(id)
      } catch {
        /* already released */
      }
    }
    pointers.current.delete(id)
    if (pointers.current.size < 2) pinch.current = null
    if (pointers.current.size === 0) drag.current = null
  }

  const up = (e: PointerEvent<HTMLDivElement>) => {
    release(e.currentTarget, e.pointerId)
  }

  useEffect(() => {
    const host = hostRef.current
    const end = (e: globalThis.PointerEvent) => {
      if (!pointers.current.has(e.pointerId)) return
      release(host, e.pointerId)
    }
    window.addEventListener('pointerup', end)
    window.addEventListener('pointercancel', end)
    window.addEventListener('blur', releaseAll)
    return () => {
      window.removeEventListener('pointerup', end)
      window.removeEventListener('pointercancel', end)
      window.removeEventListener('blur', releaseAll)
      releaseAll()
    }
  }, [])

  const wheel = (e: WheelEvent<HTMLDivElement>) => {
    e.preventDefault()
    const host = hostRef.current
    if (!host) return
    const r = host.getBoundingClientRect()
    applyScale(scale * (e.deltaY < 0 ? 1.08 : 0.92), { x: e.clientX - r.left, y: e.clientY - r.top })
  }

  const save = async () => {
    const img = imgRef.current
    if (!img) return
    releaseAll()
    setBusy(true)
    setError(null)
    try {
      const crop = VIEW / scale
      const sx = Math.min(natural.w - crop, Math.max(0, natural.w / 2 - tx / scale - crop / 2))
      const sy = Math.min(natural.h - crop, Math.max(0, natural.h / 2 - ty / scale - crop / 2))
      const canvas = document.createElement('canvas')
      canvas.width = OUT
      canvas.height = OUT
      const ctx = canvas.getContext('2d')
      if (!ctx) throw new Error('Could not crop that photo.')
      ctx.drawImage(img, sx, sy, crop, crop, 0, 0, OUT, OUT)
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const finish = (blob: Blob | null) => {
          if (!blob) {
            try {
              const fallback = canvas.toDataURL('image/jpeg', 0.88)
              if (fallback.startsWith('data:image')) resolve(fallback)
              else reject(new Error('Could not save that crop.'))
            } catch {
              reject(new Error('Could not save that crop.'))
            }
            return
          }
          const reader = new FileReader()
          reader.onload = () => {
            const next = typeof reader.result === 'string' ? reader.result : ''
            if (!next.startsWith('data:image')) reject(new Error('Could not save that crop.'))
            else resolve(next)
          }
          reader.onerror = () => reject(new Error('Could not save that crop.'))
          reader.readAsDataURL(blob)
        }
        try {
          canvas.toBlob(finish, 'image/jpeg', 0.88)
        } catch {
          finish(null)
        }
      })
      onSave(dataUrl)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save that crop.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs text-[var(--muted)]">
        Drag to move. Pinch or use the slider to zoom in on a small face, then save.
      </p>
      <div
        ref={hostRef}
        className="relative mx-auto overflow-hidden rounded-full bg-black [touch-action:none]"
        style={{ width: VIEW, height: VIEW }}
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={up}
        onPointerCancel={up}
        onWheel={wheel}
      >
        <img
          src={preview}
          alt=""
          draggable={false}
          className="pointer-events-none absolute max-w-none select-none"
          style={{
            width: natural.w * scale,
            height: natural.h * scale,
            left: VIEW / 2 - (natural.w * scale) / 2 + tx,
            top: VIEW / 2 - (natural.h * scale) / 2 + ty,
          }}
        />
      </div>
      <label className="flex items-center gap-3 text-xs text-[var(--muted)]">
        Zoom
        <input
          type="range"
          min={cover}
          max={maxScale}
          step={0.01}
          value={scale}
          onChange={(e) => applyScale(Number(e.target.value))}
          className="flex-1 accent-[var(--accent)]"
        />
      </label>
      {error && <p className="text-sm text-[var(--bad)]">{error}</p>}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => void save()}
          disabled={busy}
          className="h-12 flex-1 rounded-2xl bg-[var(--accent)] text-sm font-semibold text-[#06281f] disabled:opacity-40"
        >
          {busy ? 'Saving…' : 'Save photo'}
        </button>
        <button
          type="button"
          onClick={() => {
            releaseAll()
            onCancel()
          }}
          className="h-12 rounded-2xl border border-white/15 px-4 text-sm font-semibold"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}
