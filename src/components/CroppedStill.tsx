/**
 * Still framed by Ryan's display crop. Original JPEG is never rewritten.
 */

import { useState, type SyntheticEvent } from 'react'
import { cropImageStyle } from '../lib/stillCrop'
import { useStillCrop } from './StillCropContext'

type Props = {
  src: string
  stillId?: string | null
  alt?: string
  className?: string
  onError?: () => void
}

export function CroppedStill({
  src,
  stillId,
  alt = '',
  className = 'h-full w-full object-contain',
  onError,
}: Props) {
  const { cropFor } = useStillCrop()
  const crop = cropFor(stillId)
  const [nat, setNat] = useState<{ w: number; h: number } | null>(null)

  const onLoad = (e: SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget
    if (img.naturalWidth > 0 && img.naturalHeight > 0) {
      setNat({ w: img.naturalWidth, h: img.naturalHeight })
    }
  }

  if (!crop) {
    return (
      <img
        src={src}
        alt={alt}
        className={className}
        onError={onError}
        onLoad={onLoad}
        draggable={false}
      />
    )
  }

  const fillsHeight =
    /\bh-full\b/.test(className) ||
    /\bmax-h-full\b/.test(className) ||
    /\bh-\[/.test(className)
  const boxClass = className
    .replace(/\bobject-contain\b/g, '')
    .replace(/\bobject-cover\b/g, '')
    .replace(/\bobject-none\b/g, '')
    .trim()
  const aspect = nat ? (crop.w * nat.w) / (crop.h * nat.h) : undefined

  return (
    <span
      className={`relative block overflow-hidden ${boxClass}`}
      style={
        fillsHeight
          ? undefined
          : aspect
            ? { aspectRatio: String(aspect) }
            : undefined
      }
    >
      <img
        src={src}
        alt={alt}
        draggable={false}
        onError={onError}
        onLoad={onLoad}
        className="absolute max-h-none max-w-none"
        style={cropImageStyle(crop)}
      />
    </span>
  )
}
