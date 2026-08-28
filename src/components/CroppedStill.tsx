/**
 * Still framed by Ryan's display crop. Original JPEG is never rewritten.
 * Crop only clips what sits outside the rectangle — the picture is never stretched.
 */

import { useState, type CSSProperties, type SyntheticEvent } from 'react'
import { clampStillCrop, cropAspectRatio, cropViewBox } from '../lib/stillCrop'
import { useStillCrop } from './StillCropContext'

type Props = {
  src: string
  stillId?: string | null
  alt?: string
  className?: string
  onError?: () => void
}

function supportsObjectViewBox(): boolean {
  return typeof CSS !== 'undefined' && CSS.supports('object-view-box', 'inset(10% 10% 10% 10%)')
}

function withContain(className: string): string {
  return /\bobject-(contain|cover|none)\b/.test(className)
    ? className.replace(/\bobject-cover\b/g, 'object-contain')
    : `${className} object-contain`.trim()
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

  const c = clampStillCrop(crop)
  const containClass = withContain(className)

  if (supportsObjectViewBox()) {
    const viewStyle = {
      objectFit: 'contain',
      objectViewBox: cropViewBox(c),
    } as CSSProperties
    return (
      <img
        src={src}
        alt={alt}
        className={containClass}
        style={viewStyle}
        onError={onError}
        onLoad={onLoad}
        draggable={false}
      />
    )
  }

  const boxClass = className
    .replace(/\bobject-contain\b/g, '')
    .replace(/\bobject-cover\b/g, '')
    .replace(/\bobject-none\b/g, '')
    .trim()
  const aspect = nat ? cropAspectRatio(c, nat.w, nat.h) : `${c.w} / ${c.h}`
  const packed =
    /\bh-full\b/.test(className) ||
    /\bmax-h-full\b/.test(className) ||
    /\bh-\[/.test(className)

  return (
    <span className={`inline-flex items-center justify-center overflow-hidden ${boxClass}`}>
      <span
        className="relative block max-h-full max-w-full overflow-hidden"
        style={
          packed
            ? {
                aspectRatio: aspect,
                height: '100%',
                width: 'auto',
                maxWidth: '100%',
              }
            : {
                aspectRatio: aspect,
                width: '100%',
                height: 'auto',
                maxHeight: '100%',
              }
        }
      >
        <img
          src={src}
          alt={alt}
          draggable={false}
          onError={onError}
          onLoad={onLoad}
          className="absolute left-0 top-0 max-h-none max-w-none"
          style={{
            width: `${100 / c.w}%`,
            height: 'auto',
            transform: `translate(${-c.x * 100}%, ${-c.y * 100}%)`,
          }}
        />
      </span>
    </span>
  )
}
