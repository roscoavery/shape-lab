/**
 * Ryan-only: drag a rectangle on a shared still to set how it is framed in the app.
 * Press one corner, drag to the opposite corner — same motion as Compare Screenshot.
 */

import { useEffect, useRef, useState, type PointerEvent } from 'react'
import type { ReferencePhoto } from '../types'
import { cropFromCorners, type StillCropRect } from '../lib/stillCrop'
import { CroppedStill } from './CroppedStill'
import { useStillCrop } from './StillCropContext'

type Props = {
  photo: ReferencePhoto
  alt?: string
  imgClass?: string
}

type Pt = { x: number; y: number }

function containBox(host: HTMLElement, natW: number, natH: number) {
  const r = host.getBoundingClientRect()
  if (!natW || !natH || r.width < 2 || r.height < 2) {
    return { left: 0, top: 0, width: r.width, height: r.height }
  }
  const scale = Math.min(r.width / natW, r.height / natH)
  const width = natW * scale
  const height = natH * scale
  return {
    left: (r.width - width) / 2,
    top: (r.height - height) / 2,
    width,
    height,
  }
}

function eventToNorm(
  e: { clientX: number; clientY: number },
  host: HTMLElement,
  nat: { w: number; h: number } | null,
): Pt | null {
  const box = containBox(host, nat?.w ?? 0, nat?.h ?? 0)
  if (box.width < 2 || box.height < 2) return null
  const hr = host.getBoundingClientRect()
  const x = (e.clientX - hr.left - box.left) / box.width
  const y = (e.clientY - hr.top - box.top) / box.height
  if (x < -0.04 || y < -0.04 || x > 1.04 || y > 1.04) return null
  return {
    x: Math.min(1, Math.max(0, x)),
    y: Math.min(1, Math.max(0, y)),
  }
}

export function StillCropEditor({
  photo,
  alt = '',
  imgClass = 'max-h-80 w-full object-contain',
}: Props) {
  const { canEdit, cropFor, saveCrop } = useStillCrop()
  const saved = cropFor(photo.id)
  const hostRef = useRef<HTMLDivElement | null>(null)
  const natRef = useRef<{ w: number; h: number } | null>(null)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState<StillCropRect | null>(null)
  const [box, setBox] = useState({ left: 0, top: 0, width: 0, height: 0 })
  const drag = useRef<{ pointerId: number; a: Pt } | null>(null)
  const [busy, setBusy] = useState(false)
  const [flash, setFlash] = useState<string | null>(null)

  const live = draft ?? saved

  const syncBox = () => {
    const host = hostRef.current
    const nat = natRef.current
    if (!host || !nat) return
    setBox(containBox(host, nat.w, nat.h))
  }

  useEffect(() => {
    if (!editing) return
    syncBox()
    window.addEventListener('resize', syncBox)
    return () => window.removeEventListener('resize', syncBox)
  }, [editing])

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if (!editing) return
    const host = hostRef.current
    if (!host) return
    const a = eventToNorm(e, host, natRef.current)
    if (!a) return
    e.preventDefault()
    e.stopPropagation()
    host.setPointerCapture(e.pointerId)
    drag.current = { pointerId: e.pointerId, a }
    setDraft({ x: a.x, y: a.y, w: 0.06, h: 0.06 })
  }

  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    const d = drag.current
    const host = hostRef.current
    if (!d || d.pointerId !== e.pointerId || !host) return
    const b = eventToNorm(e, host, natRef.current)
    if (!b) return
    setDraft(cropFromCorners(d.a, b))
  }

  const endDrag = (e: PointerEvent<HTMLDivElement>) => {
    if (drag.current?.pointerId === e.pointerId) drag.current = null
  }

  const save = async (crop: StillCropRect | null) => {
    setBusy(true)
    setFlash(null)
    try {
      await saveCrop(photo.id, crop)
      setEditing(false)
      setDraft(null)
      setFlash(crop ? 'Display crop saved into the app.' : 'Full photo restored.')
    } catch {
      setFlash('Could not save — keep the Shape Lab server running.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <figure className="overflow-hidden rounded-md bg-[#0d1218]">
      {editing ? (
        <div
          ref={hostRef}
          className="relative cursor-crosshair touch-none select-none bg-black"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
        >
          <img
            src={photo.dataUrl}
            alt={alt}
            draggable={false}
            className={imgClass}
            onLoad={(e) => {
              const img = e.currentTarget
              natRef.current = { w: img.naturalWidth, h: img.naturalHeight }
              syncBox()
            }}
          />
          {live && box.width > 2 && (
            <span
              className="pointer-events-none absolute border-2 border-[#9ecbff] bg-[#9ecbff]/15"
              style={{
                left: box.left + live.x * box.width,
                top: box.top + live.y * box.height,
                width: live.w * box.width,
                height: live.h * box.height,
              }}
            />
          )}
        </div>
      ) : (
        <CroppedStill
          src={photo.dataUrl}
          stillId={photo.id}
          alt={alt}
          className={imgClass}
        />
      )}
      {photo.label && (
        <figcaption className="px-2 py-1 text-[10px] uppercase tracking-wider text-[var(--muted)]">
          {photo.label}
        </figcaption>
      )}
      {canEdit && (
        <div className="flex flex-wrap items-center gap-1.5 border-t border-white/10 px-2 py-2">
          {!editing ? (
            <button
              type="button"
              onClick={() => {
                setFlash(null)
                setDraft(saved)
                setEditing(true)
              }}
              className="rounded-full bg-[var(--accent)] px-2.5 py-1 text-[10px] font-semibold text-[#06281f]"
            >
              Crop display
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={() => void save(draft ?? saved)}
                disabled={busy || !draft}
                className="rounded-full bg-[var(--accent)] px-2.5 py-1 text-[10px] font-semibold text-[#06281f] disabled:opacity-50"
              >
                {busy ? 'Saving…' : 'Save crop'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setEditing(false)
                  setDraft(null)
                }}
                className="rounded-full border border-white/20 px-2.5 py-1 text-[10px] text-white"
              >
                Cancel
              </button>
            </>
          )}
          {(saved || editing) && (
            <button
              type="button"
              onClick={() => void save(null)}
              disabled={busy}
              className="rounded-full px-2.5 py-1 text-[10px] text-[var(--accent)]"
            >
              Reset to full
            </button>
          )}
          {flash && <p className="text-[11px] text-[var(--accent)]">{flash}</p>}
          {editing && (
            <p className="w-full text-[10px] leading-snug text-[var(--muted)]">
              Press one corner of what should stay on screen, drag to the opposite
              corner. Empty sides of the photo stay out of the library and overlay.
            </p>
          )}
        </div>
      )}
    </figure>
  )
}
