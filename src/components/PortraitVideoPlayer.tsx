/**
 * Phone-shot (9:16) clips stay upright and fill the available height.
 * Landscape clips letterbox instead of stretching.
 */

import { useCallback, useRef, useState } from 'react'

type Size = 'watch' | 'embed' | 'thumb'

type Props = {
  src: string
  title?: string
  size?: Size
}

const FRAME: Record<Size, string> = {
  watch:
    'mx-auto flex h-[min(72dvh,calc(100dvh-11rem))] w-full max-w-md items-center justify-center overflow-hidden rounded-2xl bg-black',
  embed:
    'mx-auto flex h-[min(52dvh,26rem)] w-full max-w-sm items-center justify-center overflow-hidden rounded-xl bg-black',
  thumb:
    'flex h-[4.75rem] w-[2.7rem] shrink-0 items-center justify-center overflow-hidden rounded-md bg-black',
}

export function PortraitVideoPlayer({ src, title, size = 'embed' }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [portrait, setPortrait] = useState(true)

  const readRatio = useCallback(() => {
    const video = videoRef.current
    if (!video?.videoWidth || !video.videoHeight) return
    setPortrait(video.videoHeight >= video.videoWidth)
  }, [])

  return (
    <div className={`${FRAME[size]} ${portrait ? '' : size === 'thumb' ? '' : 'max-h-[min(42dvh,22rem)]'}`}>
      <video
        ref={videoRef}
        src={src}
        title={title}
        controls={size !== 'thumb'}
        playsInline
        muted={size === 'thumb'}
        preload={size === 'thumb' ? 'metadata' : 'auto'}
        onLoadedMetadata={readRatio}
        onLoadedData={(event) => {
          if (size !== 'thumb') return
          const video = event.currentTarget
          if (video.currentTime === 0) video.currentTime = 0.08
        }}
        className={
          size === 'thumb'
            ? 'pointer-events-none h-full w-full object-cover'
            : 'max-h-full max-w-full object-contain'
        }
      />
    </div>
  )
}
