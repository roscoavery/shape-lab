import { useEffect, useState } from 'react'
import { cropSourcePixels, isFullStillCrop, type StillCropRect } from '../../lib/stillCrop'

type Props = {
  src: string
  crop?: StillCropRect
  alt?: string
  className?: string
}

export function FramedPhoto({ src, crop, alt = '', className = 'max-h-64 w-full object-contain' }: Props) {
  const [out, setOut] = useState(src)

  useEffect(() => {
    if (!crop || isFullStillCrop(crop)) {
      setOut(src)
      return
    }
    const img = new Image()
    img.onload = () => {
      const { sx, sy, sw, sh } = cropSourcePixels(crop, img.naturalWidth, img.naturalHeight)
      const canvas = document.createElement('canvas')
      canvas.width = sw
      canvas.height = sh
      const ctx = canvas.getContext('2d')
      if (!ctx) return
      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh)
      setOut(canvas.toDataURL('image/jpeg', 0.9))
    }
    img.src = src
  }, [src, crop])

  return <img src={out} alt={alt} className={className} />
}
