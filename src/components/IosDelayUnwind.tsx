import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'

/**
 * Spin a delay-cam <video> 90° clockwise so iPhone sensor pixels match LIVE.
 * The inner box is the pane's swapped size (height × width), then rotated,
 * so the picture fills at 1× — no extra scale() zoom.
 * Mirror / zoom belong on this outer box.
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

  useEffect(() => {
    const el = boxRef.current
    if (!el || !active) return
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
  }, [active, className])

  if (!active) {
    return (
      <div className={className} style={style}>
        {children}
      </div>
    )
  }

  const spin =
    box.w > 0 && box.h > 0
      ? {
          position: 'absolute' as const,
          left: '50%',
          top: '50%',
          width: box.h,
          height: box.w,
          transform: 'translate(-50%, -50%) rotate(90deg)',
          WebkitTransform: 'translate(-50%, -50%) rotate(90deg)',
          transformOrigin: 'center center',
        }
      : {
          width: '100%',
          height: '100%',
        }

  return (
    <div ref={boxRef} className={`ios-delay-stage ${className ?? ''}`} style={style}>
      <div className="ios-delay-spin" style={spin}>
        {children}
      </div>
    </div>
  )
}
