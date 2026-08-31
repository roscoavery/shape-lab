/**
 * Still framed by Ryan's display crop. Original JPEG is never rewritten.
 * Crop clips pixels outside the rectangle. The remaining picture keeps its
 * proportions — width and height are never scaled independently.
 */

import { useEffect, useState } from 'react'
import { cropSourcePixels, type StillCropRect } from '../lib/stillCrop'
import { useStillCrop } from './StillCropContext'

type Props = {
  src: string
  stillId?: string | null
  alt?: string
  className?: string
  onError?: () => void
}

function clipToObjectUrl(
  img: HTMLImageElement,
  crop: StillCropRect,
): Promise<string | null> {
  const { sx, sy, sw, sh } = cropSourcePixels(crop, img.naturalWidth, img.naturalHeight)
  const canvas = document.createElement('canvas')
  canvas.width = sw
  canvas.height = sh
  const ctx = canvas.getContext('2d')
  if (!ctx) return Promise.resolve(null)
  ctx.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh)
  return new Promise((resolve) => {
    canvas.toBlob(
      (blob) => resolve(blob ? URL.createObjectURL(blob) : null),
      'image/jpeg',
      0.92,
    )
  })
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
  const [clipped, setClipped] = useState<string | null>(null)

  const cropKey = crop ? `${crop.x}:${crop.y}:${crop.w}:${crop.h}` : ''

  useEffect(() => {
    if (!crop) {
      setClipped(null)
      return
    }
    let objectUrl: string | null = null
    let cancelled = false
    setClipped(null)
    const img = new Image()
    img.onload = () => {
      void clipToObjectUrl(img, crop).then((url) => {
        if (cancelled) {
          if (url) URL.revokeObjectURL(url)
          return
        }
        if (!url) {
          setClipped(src)
          return
        }
        objectUrl = url
        setClipped(url)
      })
    }
    img.onerror = () => {
      if (!cancelled) setClipped(src)
    }
    img.src = src
    return () => {
      cancelled = true
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [src, crop, cropKey])

  // Always paint the source picture. A 0-height crop placeholder was
  // hiding every still that uses max-height (IG library, shape cards).
  return (
    <img
      src={clipped ?? src}
      alt={alt}
      className={className}
      onError={onError}
      draggable={false}
    />
  )
}
