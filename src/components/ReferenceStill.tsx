import { useEffect, useMemo, useRef, useState } from 'react'
import {
  isUsablePhotoSrc,
  listCoachStills,
  pickCoachStill,
  shippedStillCandidates,
} from '../lib/shippedRefs'
import { persistCoachStillExtra, persistMainCoachStill, removeCoachStillExtra } from '../lib/coachStillStore'
import { loadMainCoachStills } from '../lib/coachStillPrefs'
import { fileToJpegBlob, blobToDataUrl } from '../lib/glossaryStore'
import { createId, saveReferencePhoto } from '../lib/storage'
import type { ReferencePhoto } from '../types'
import { CroppedStill } from './CroppedStill'
import { StillCropEditor } from './StillCropEditor'

type Props = {
  shapeId: string
  photos: ReferencePhoto[]
  alt?: string
  className?: string
  /** Compact thumbnail vs full still. */
  emptyLabel?: string
  /** Render this specific still (IG crop) instead of the coach picture. */
  photo?: ReferencePhoto | null
}

/**
 * Always prefers the coach still you shipped (or a Glossary upload).
 * Tries several URLs so a Preview/path miss does not blank every picture.
 */
export function ReferenceStill({
  shapeId,
  photos,
  alt = '',
  className = 'h-full w-full object-contain',
  emptyLabel = 'No photo yet',
  photo = null,
}: Props) {
  const coach = pickCoachStill(photos, shapeId)
  const candidates = useMemo(() => {
    const list: string[] = []
    const add = (u?: string | null) => {
      if (u && isUsablePhotoSrc(u) && !list.includes(u)) list.push(u)
    }
    if (photo?.dataUrl?.startsWith('data:image')) add(photo.dataUrl)
    else if (photo?.dataUrl) add(photo.dataUrl)
    if (coach?.dataUrl?.startsWith('data:image')) add(coach.dataUrl)
    for (const u of shippedStillCandidates(shapeId)) add(u)
    if (coach?.dataUrl && !coach.dataUrl.startsWith('data:image')) add(coach.dataUrl)
    if (photo?.dataUrl && !photo.dataUrl.startsWith('data:image')) add(photo.dataUrl)
    return list
  }, [shapeId, coach?.dataUrl, photo?.dataUrl])

  const [index, setIndex] = useState(0)
  useEffect(() => {
    setIndex(0)
  }, [shapeId, candidates])

  const src = candidates[index]
  if (!src) {
    return (
      <div className="flex h-full min-h-16 items-center justify-center px-1 text-center text-[10px] leading-tight text-[var(--muted)]">
        {emptyLabel}
      </div>
    )
  }

  const stillId = photo?.id ?? pickCoachStill(photos, shapeId)?.id ?? `default_${shapeId}_0`

  return (
    <CroppedStill
      src={src}
      stillId={stillId}
      alt={alt}
      className={className}
      onError={() => setIndex((i) => i + 1)}
    />
  )
}

/** One or more shipped coach stills for a shape (grid when there are several). */
export function CoachStillGallery({
  shapeId,
  photos,
  alt = '',
  emptyLabel = 'No photo yet',
  imgClass = 'max-h-80 w-full object-contain',
  allowCrop = false,
  canEdit = false,
  onPhotosChange,
}: {
  shapeId: string
  photos: ReferencePhoto[]
  alt?: string
  emptyLabel?: string
  imgClass?: string
  /** Ryan: set display borders without rewriting the original JPEG. */
  allowCrop?: boolean
  canEdit?: boolean
  onPhotosChange?: (photos: ReferencePhoto[]) => void
}) {
  const [mainTick, setMainTick] = useState(0)
  const [flash, setFlash] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement | null>(null)
  const stills = listCoachStills(photos, shapeId)
  const mainId = loadMainCoachStills()[shapeId] ?? stills[0]?.id ?? null

  const setMain = (id: string) => {
    void persistMainCoachStill(shapeId, id)
    setMainTick((n) => n + 1)
  }

  const removeStill = async (id: string) => {
    if (!onPhotosChange || id.startsWith('default_')) return
    setFlash('Removing still…')
    const remote = await removeCoachStillExtra(id)
    onPhotosChange(photos.filter((p) => p.id !== id))
    if (mainId === id) {
      const next = stills.find((p) => p.id !== id && !p.id.startsWith('default_')) ?? stills.find((p) => p.id !== id)
      if (next) setMain(next.id)
    }
    setFlash(remote.ok ? 'Removed from this gym.' : remote.error ?? 'Could not remove that still.')
    window.setTimeout(() => setFlash(null), 3500)
  }

  const addStill = async (file: File) => {
    if (!onPhotosChange) return
    setFlash('Saving still…')
    try {
      const jpeg = await fileToJpegBlob(file)
      const dataUrl = await blobToDataUrl(jpeg)
      const photo: ReferencePhoto = {
        id: createId('coach'),
        shapeId,
        athleteId: null,
        dataUrl,
        label: `${alt || shapeId} extra`,
        createdAt: new Date().toISOString(),
        library: 'coach',
      }
      const remote = await persistCoachStillExtra(photo)
      const kept = remote.photo ?? photo
      if (!remote.ok) {
        setFlash(remote.error ?? 'Gym did not keep that still.')
        onPhotosChange([kept, ...photos.filter((p) => p.id !== kept.id)])
        return
      }
      try {
        await saveReferencePhoto(kept)
      } catch (err) {
        setFlash(err instanceof Error ? err.message : 'Gym kept the still. This phone storage is full.')
      }
      onPhotosChange([kept, ...photos.filter((p) => p.id !== kept.id)])
      if (stills.length === 0) setMain(kept.id)
      setFlash('Saved on this gym — other devices will pick it up.')
      window.setTimeout(() => setFlash(null), 3500)
    } catch (err) {
      setFlash(err instanceof Error ? err.message : 'Could not read that picture.')
    }
  }

  if (stills.length === 0 && !canEdit) {
    return (
      <div className="flex min-h-16 items-center justify-center px-1 text-center text-[10px] leading-tight text-[var(--muted)]">
        {emptyLabel}
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {stills.length === 1 && !canEdit ? (
        allowCrop ? (
          <StillCropEditor photo={stills[0]!} alt={alt} imgClass={imgClass} />
        ) : (
          <ReferenceStill
            shapeId={shapeId}
            photos={photos}
            photo={stills[0]}
            alt={alt}
            className={imgClass}
            emptyLabel={emptyLabel}
          />
        )
      ) : (
        <div className={`grid gap-2 ${stills.length >= 3 ? 'sm:grid-cols-3' : stills.length > 1 ? 'sm:grid-cols-2' : ''}`}>
          {stills.map((p) => (
            <figure key={`${p.id}-${mainTick}`} className="overflow-hidden rounded-md bg-[#0d1218]">
              {allowCrop ? (
                <StillCropEditor photo={p} alt={p.label ? `${alt} — ${p.label}` : alt} imgClass={imgClass} />
              ) : (
                <ReferenceStill
                  shapeId={shapeId}
                  photos={photos}
                  photo={p}
                  alt={p.label ? `${alt} — ${p.label}` : alt}
                  className={imgClass}
                  emptyLabel={emptyLabel}
                />
              )}
              <figcaption className="flex items-center justify-between gap-2 px-2 py-1 text-[10px] uppercase tracking-wider text-[var(--muted)]">
                <span>{p.id === mainId ? 'Main still' : p.label || 'Coach still'}</span>
                {canEdit && (
                  <span className="flex gap-1">
                    {p.id !== mainId && (
                      <button
                        type="button"
                        onClick={() => setMain(p.id)}
                        className="rounded bg-[var(--accent)] px-1.5 py-0.5 font-semibold text-[var(--on-accent)]"
                      >
                        Set as main
                      </button>
                    )}
                    {!p.id.startsWith('default_') && onPhotosChange && (
                      <button
                        type="button"
                        onClick={() => void removeStill(p.id)}
                        className="rounded bg-[var(--bad)]/20 px-1.5 py-0.5 font-semibold text-[var(--bad)]"
                      >
                        Delete
                      </button>
                    )}
                  </span>
                )}
              </figcaption>
            </figure>
          ))}
        </div>
      )}
      {canEdit && onPhotosChange && (
        <div>
          <label className="inline-flex cursor-pointer items-center rounded-lg bg-[var(--accent)] px-3 py-2 text-sm font-bold text-[var(--on-accent)]">
            Add a coach still
            <input
              ref={fileRef}
              type="file"
              accept="image/*,.heic,.heif"
              className="sr-only"
              onChange={(e) => {
                const file = e.target.files?.[0]
                e.target.value = ''
                if (file) void addStill(file)
              }}
            />
          </label>
          <p className="mt-1 text-[11px] text-[var(--muted)]">
            Extra pictures for this body position. Pick which one is the main still used in class flows
            and Compare. Screenshots and JPEGs work on iPhone.
          </p>
          {flash && <p className="mt-1 text-[11px] text-[var(--accent)]">{flash}</p>}
        </div>
      )}
      {!canEdit && (
        <p className="text-[11px] text-[var(--muted)]">
          Unlock Ryan or a coach profile to add a coach still to this shape.
        </p>
      )}
    </div>
  )
}
