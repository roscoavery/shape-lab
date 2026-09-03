import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'

/**
 * iPhone / iPad MediaRecorder often writes landscape pixels even when the
 * live camera is portrait. MSE ignores rotation metadata, so the delay
 * <video> looks sideways. Spin 90° only while the decoded frame is wider
 * than it is tall — a true portrait recording stays upright.
 *
 * The inner box is the pane's swapped size, then rotated, so the picture
 * fills at 1×. Mirror / zoom belong on this outer box.
 */
export function IosDelayUnwind({
  active,
  className,
  style,
  children,
}: {
  active: boolean
  className?: string
  style?: CSSProperties
  children: ReactNode
}) {
  const boxRef = useRef<HTMLDivElement | null>(null)
  const [box, setBox] = useState({ w: 0, h: 0 })
  const [sideways, setSideways] = useState(false)

  useEffect(() => {
    const el = boxRef.current
    if (!el) return
    const apply = () => {
      const w = el.clientWidth
      const h = el.clientHeight
      if (w < 2 || h < 2) return
      setBox({ w, h })
    }
    apply()
    const ro = new ResizeObserver(apply)
    ro.observe(el)
    return () => ro.disconnect()
  }, [className])

  useEffect(() => {
    if (!active) {
      setSideways(false)
      return
    }
    const el = boxRef.current
    if (!el) return
    const video = el.querySelector('video')
    if (!video) return
    const check = () => {
      const w = video.videoWidth
      const h = video.videoHeight
      if (w > 8 && h > 8) setSideways(w > h)
    }
    check()
    video.addEventListener('loadedmetadata', check)
    video.addEventListener('resize', check)
    const id = window.setInterval(check, 400)
    return () => {
      video.removeEventListener('loadedmetadata', check)
      video.removeEventListener('resize', check)
      window.clearInterval(id)
    }
  }, [active])

  const spin = active && sideways && box.w > 0 && box.h > 0

  return (
    <div ref={boxRef} className={`ios-delay-stage ${className ?? ''}`} style={style}>
      <div
        className="ios-delay-spin"
        style={
          spin
            ? {
                position: 'absolute',
                left: '50%',
                top: '50%',
                width: box.h,
                height: box.w,
                transform: 'translate(-50%, -50%) rotate(90deg)',
                WebkitTransform: 'translate(-50%, -50%) rotate(90deg)',
                transformOrigin: 'center center',
              }
            : { width: '100%', height: '100%' }
        }
      >
        {children}
      </div>
    </div>
  )
}
