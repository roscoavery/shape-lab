import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { shippedExtraCandidatesForId } from '../config/shippedCoachExtras'
import {
  isUsablePhotoSrc,
  listCoachStillSlots,
  listCoachStills,
  pickCoachStill,
  shippedStillCandidates,
} from '../lib/shippedRefs'
import {
  applyStillFromFile,
  hideCoachStill,
  persistMainCoachStill,
  renameCoachStillExtra,
} from '../lib/coachStillStore'
import { loadMainCoachStills } from '../lib/coachStillPrefs'
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
    if (photo?.id) {
      for (const u of shippedExtraCandidatesForId(photo.id)) add(u)
    }
    if (coach?.dataUrl?.startsWith('data:image')) add(coach.dataUrl)
    for (const u of shippedStillCandidates(shapeId)) add(u)
    if (coach?.id) {
      for (const u of shippedExtraCandidatesForId(coach.id)) add(u)
    }
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

export async function dropStillOntoShape(opts: {
  shapeId: string
  file: File
  photos: ReferencePhoto[]
  onPhotosChange?: (photos: ReferencePhoto[]) => void
  replaceId?: string | null
}): Promise<string> {
  const remote = await applyStillFromFile({
    shapeId: opts.shapeId,
    file: opts.file,
    replaceId: opts.replaceId,
    photos: opts.photos,
  })
  const kept = remote.photo
  if (kept && opts.onPhotosChange) {
    opts.onPhotosChange([kept, ...opts.photos.filter((p) => p.id !== kept.id)])
  }
  if (!remote.ok) return remote.error ?? 'Gym did not keep that still.'
  return 'Saved on this gym — other devices pick it up on the next pull.'
}

/** Drop a photo onto a listed still or shape card. */
export function StillDropTarget({
  shapeId,
  photos,
  onPhotosChange,
  replaceId = null,
  className = '',
  children,
  label = 'Drop a photo here',
}: {
  shapeId: string
  photos: ReferencePhoto[]
  onPhotosChange?: (photos: ReferencePhoto[]) => void
  replaceId?: string | null
  className?: string
  children: ReactNode
  label?: string
}) {
  const [over, setOver] = useState(false)
  const [flash, setFlash] = useState<string | null>(null)
  if (!onPhotosChange) return <div className={className}>{children}</div>
  return (
    <div
      className={`relative ${className}`}
      onDragOver={(e) => {
        if (![...e.dataTransfer.types].includes('Files')) return
        e.preventDefault()
        setOver(true)
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault()
        e.stopPropagation()
        setOver(false)
        const file = e.dataTransfer.files?.[0]
        if (!file) return
        void dropStillOntoShape({
          shapeId,
          file,
          photos,
          onPhotosChange,
          replaceId,
        }).then((msg) => {
          setFlash(msg)
          window.setTimeout(() => setFlash(null), 3500)
        })
      }}
    >
      {children}
      {over && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-[#6ec8d6]/85 text-center text-sm font-black uppercase tracking-wide text-[#061418]">
          {label}
        </div>
      )}
      {flash && (
        <p className="px-2 py-1 text-[11px] text-[var(--accent)]">{flash}</p>
      )}
    </div>
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
  const [renameId, setRenameId] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const fileRef = useRef<HTMLInputElement | null>(null)
  const replaceRef = useRef<string | null>(null)
  const stills = canEdit ? listCoachStillSlots(photos, shapeId) : listCoachStills(photos, shapeId)
  const mainId = loadMainCoachStills()[shapeId] ?? stills.find((p) => isUsablePhotoSrc(p.dataUrl))?.id ?? null

  const setMain = (id: string) => {
    void persistMainCoachStill(shapeId, id)
    setMainTick((n) => n + 1)
  }

  const removeStill = async (id: string) => {
    if (!onPhotosChange) return
    setFlash('Removing still…')
    const remote = await hideCoachStill(id)
    onPhotosChange(photos.filter((p) => p.id !== id))
    if (mainId === id) {
      const next = stills.find((p) => p.id !== id && !p.id.startsWith('default_')) ?? stills.find((p) => p.id !== id)
      if (next) setMain(next.id)
    }
    setFlash(remote.ok ? 'Removed from this gym.' : remote.error ?? 'Could not remove that still.')
    window.setTimeout(() => setFlash(null), 3500)
  }

  const addStill = async (file: File, replaceId?: string | null) => {
    if (!onPhotosChange) return
    setFlash('Saving still…')
    try {
      const msg = await dropStillOntoShape({
        shapeId,
        file,
        photos,
        onPhotosChange,
        replaceId,
      })
      setFlash(msg)
      window.setTimeout(() => setFlash(null), 3500)
    } catch (err) {
      setFlash(err instanceof Error ? err.message : 'Could not read that picture.')
    }
  }

  const saveRename = async (id: string) => {
    const label = renameValue.trim()
    setRenameId(null)
    if (!label || !onPhotosChange) return
    setFlash('Saving name…')
    const remote = await renameCoachStillExtra(id, label, photos)
    if (remote.photo) {
      onPhotosChange(photos.map((p) => (p.id === id ? { ...p, label } : p)))
    }
    setFlash(remote.ok ? 'Name saved on this gym.' : remote.error ?? 'Could not rename that still.')
    window.setTimeout(() => setFlash(null), 3500)
  }

  if (stills.length === 0 && !canEdit) {
    return (
      <div className="flex min-h-16 items-center justify-center px-1 text-center text-[10px] leading-tight text-[var(--muted)]">
        {emptyLabel}
      </div>
    )
  }

  const renderStill = (p: ReferencePhoto) => {
    const empty = !isUsablePhotoSrc(p.dataUrl)
    const body = empty ? (
      <div className="flex min-h-48 items-center justify-center px-3 text-center text-xs text-[var(--muted)]">
        Drop a photo on this still
      </div>
    ) : allowCrop ? (
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
    )
    return (
      <figure key={`${p.id}-${mainTick}`} className="overflow-hidden rounded-md bg-[#0d1218]">
        {canEdit && onPhotosChange ? (
          <StillDropTarget
            shapeId={shapeId}
            photos={photos}
            onPhotosChange={onPhotosChange}
            replaceId={p.id}
            label="Replace this still"
          >
            {body}
          </StillDropTarget>
        ) : (
          body
        )}
        <figcaption className="flex items-center justify-between gap-2 px-2 py-1 text-[10px] uppercase tracking-wider text-[var(--muted)]">
          {renameId === p.id ? (
            <input
              autoFocus
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              onBlur={() => void saveRename(p.id)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') void saveRename(p.id)
                if (e.key === 'Escape') setRenameId(null)
              }}
              className="min-w-0 flex-1 rounded bg-[#0d1218] px-1 py-0.5 text-[11px] text-[var(--text)]"
            />
          ) : (
            <button
              type="button"
              className="min-w-0 truncate text-left"
              onClick={() => {
                if (!canEdit) return
                setRenameId(p.id)
                setRenameValue(p.label || '')
              }}
            >
              {p.id === mainId ? 'Main still' : p.label || (empty ? 'Empty still' : 'Coach still')}
            </button>
          )}
          {canEdit && (
            <span className="flex gap-1">
              {p.id !== mainId && isUsablePhotoSrc(p.dataUrl) && (
                <button
                  type="button"
                  onClick={() => setMain(p.id)}
                  className="rounded bg-[var(--accent)] px-1.5 py-0.5 font-semibold text-[var(--on-accent)]"
                >
                  Set as main
                </button>
              )}
              {onPhotosChange && (
                <label className="cursor-pointer rounded bg-[#2c3a52] px-1.5 py-0.5 font-semibold text-[var(--text)]">
                  Replace
                  <input
                    type="file"
                    accept="image/*,.heic,.heif"
                    className="sr-only"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      e.target.value = ''
                      if (file) void addStill(file, p.id)
                    }}
                  />
                </label>
              )}
              {onPhotosChange && (
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
      ) : stills.length > 0 ? (
        <div className={`grid gap-2 ${stills.length >= 3 ? 'sm:grid-cols-3' : stills.length > 1 ? 'sm:grid-cols-2' : ''}`}>
          {stills.map(renderStill)}
        </div>
      ) : null}
      {canEdit && onPhotosChange && (
        <StillDropTarget
          shapeId={shapeId}
          photos={photos}
          onPhotosChange={onPhotosChange}
          className="rounded-lg border border-dashed border-[var(--panel-border)] bg-[#0d1218]"
          label="Add this photo"
        >
          <div className="px-3 py-4 text-center">
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
                  replaceRef.current = null
                  if (file) void addStill(file)
                }}
              />
            </label>
            <p className="mt-2 text-[11px] text-[var(--muted)]">
              Drag a photo onto a listed still to fill or replace it. You do not need to retype the
              shape name. Edits save to this gym and show up on every device.
            </p>
          </div>
        </StillDropTarget>
      )}
      {flash && <p className="text-[11px] text-[var(--accent)]">{flash}</p>}
      {!canEdit && (
        <p className="text-[11px] text-[var(--muted)]">
          Unlock Ryan or a coach profile to add a coach still to this shape.
        </p>
      )}
    </div>
  )
}
