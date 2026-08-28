import { useEffect, useMemo, useState } from 'react'
import {
  isUsablePhotoSrc,
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
    if (coach?.dataUrl?.startsWith('data:image')) add(coach.dataUrl)
    for (const u of shippedStillCandidates(shapeId)) add(u)
    if (coach?.dataUrl && !coach.dataUrl.startsWith('data:image')) add(coach.dataUrl)
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
