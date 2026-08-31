import type { CSSProperties, ReactNode } from 'react'

/**
 * Spin a delay-cam surface 90° CCW so iPhone sensor pixels match LIVE.
 * Mirror / zoom belong on this outer box (screen space), not inside the canvas.
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
  if (!active) {
    return (
      <div className={className} style={style}>
        {children}
      </div>
    )
  }
  return (
    <div className={`ios-delay-stage ${className ?? ''}`} style={style}>
      <div className="ios-delay-unwind">
        <div className="ios-delay-unwind-inner">{children}</div>
      </div>
    </div>
  )
}
