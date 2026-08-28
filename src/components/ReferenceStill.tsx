import { useEffect, useMemo, useState } from 'react'
import {
  isUsablePhotoSrc,
  makeShippedPhotos,
  pickCoachStill,
  shippedStillCandidates,
} from '../lib/shippedRefs'
import type { ReferencePhoto } from '../types'

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
  className = 'h-full w-full object-cover',
  emptyLabel = 'No photo yet',
  photo = null,
}: Props) {
  const coach = pickCoachStill(photos, shapeId)
  const candidates = useMemo(() => {
    const list: string[] = []
    const add = (u?: string | null) => {
      if (u && isUsablePhotoSrc(u) && !list.includes(u)) list.push(u)
    }
    if (photo?.dataUrl) add(photo.dataUrl)
    if (!photo) {
      if (coach?.dataUrl?.startsWith('data:image')) add(coach.dataUrl)
      for (const u of shippedStillCandidates(shapeId)) add(u)
      if (coach?.dataUrl && !coach.dataUrl.startsWith('data:image')) add(coach.dataUrl)
    }
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

  return (
    <img
      src={src}
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
}: {
  shapeId: string
  photos: ReferencePhoto[]
  alt?: string
  emptyLabel?: string
  imgClass?: string
}) {
  const shipped = makeShippedPhotos(shapeId)
  const one = pickCoachStill(photos, shapeId)
  const stills = shipped.length > 0 ? shipped : one ? [one] : []
  if (stills.length === 0) {
    return (
      <div className="flex min-h-16 items-center justify-center px-1 text-center text-[10px] leading-tight text-[var(--muted)]">
        {emptyLabel}
      </div>
    )
  }
  if (stills.length === 1) {
    return (
      <ReferenceStill
        shapeId={shapeId}
        photos={photos}
        photo={stills[0]}
        alt={alt}
        className={imgClass}
        emptyLabel={emptyLabel}
      />
    )
  }
  return (
    <div className={`grid gap-2 ${stills.length >= 3 ? 'sm:grid-cols-3' : 'sm:grid-cols-2'}`}>
      {stills.map((p) => (
        <figure key={p.id} className="overflow-hidden rounded-md bg-[#0d1218]">
          <ReferenceStill
            shapeId={shapeId}
            photos={photos}
            photo={p}
            alt={p.label ? `${alt} — ${p.label}` : alt}
            className={imgClass}
            emptyLabel={emptyLabel}
          />
          {p.label && (
            <figcaption className="px-2 py-1 text-[10px] uppercase tracking-wider text-[var(--muted)]">
              {p.label}
            </figcaption>
          )}
        </figure>
      ))}
    </div>
  )
}
