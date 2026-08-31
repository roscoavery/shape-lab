import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'

/**
 * Spin a delay-cam <video> 90° clockwise so iPhone sensor pixels match LIVE.
 * (CCW left the picture upside down.) Transform does not change layout size.
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
  const [fill, setFill] = useState(1)

  useEffect(() => {
    const el = boxRef.current
    if (!el || !active) return
    const apply = () => {
      const w = el.clientWidth
      const h = el.clientHeight
      if (w < 2 || h < 2) return
      setFill(Math.max(w / h, h / w))
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

  return (
    <div ref={boxRef} className={`ios-delay-stage ${className ?? ''}`} style={style}>
      <div
        className="ios-delay-spin"
        style={{
          transform: `rotate(90deg) scale(${fill})`,
          WebkitTransform: `rotate(90deg) scale(${fill})`,
          transformOrigin: 'center center',
        }}
      >
        {children}
      </div>
    </div>
  )
}
