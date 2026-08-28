/**
 * Coach markup on a Compare video: 3-dot connected arrows, freehand draw, two-tap arrows.
 * Arrow: press, drag, let go — the arrowhead is where you release.
 */

import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'

export type MarkTool = 'line' | 'draw' | 'arrow'

type Pt = { x: number; y: number }

type DrawStroke = { kind: 'draw'; points: Pt[] }
type ArrowMark = { kind: 'arrow'; a: Pt; b: Pt }
type Mark = DrawStroke | ArrowMark

const LINE = '#f5d76e'
const DRAW = '#7dd3c7'
const ARROW = '#ff8a6b'

function contentBox(video: HTMLVideoElement | null, host: HTMLElement): {
  left: number
  top: number
  width: number
  height: number
} {
  const hr = host.getBoundingClientRect()
  const vw = video?.videoWidth ?? 0
  const vh = video?.videoHeight ?? 0
  if (!vw || !vh || hr.width < 2 || hr.height < 2) {
    return { left: 0, top: 0, width: hr.width, height: hr.height }
  }
  const scale = Math.min(hr.width / vw, hr.height / vh)
  const width = vw * scale
  const height = vh * scale
  return {
    left: (hr.width - width) / 2,
    top: (hr.height - height) / 2,
    width,
    height,
  }
}

function eventToNorm(
  e: { clientX: number; clientY: number },
  host: HTMLElement,
  video: HTMLVideoElement | null,
): Pt | null {
  const box = contentBox(video, host)
  if (box.width < 2 || box.height < 2) return null
  const hr = host.getBoundingClientRect()
  const x = (e.clientX - hr.left - box.left) / box.width
  const y = (e.clientY - hr.top - box.top) / box.height
  if (x < -0.04 || y < -0.04 || x > 1.04 || y > 1.04) return null
  return {
    x: Math.min(1, Math.max(0, x)),
    y: Math.min(1, Math.max(0, y)),
  }
}

function toPx(p: Pt, box: { left: number; top: number; width: number; height: number }) {
  return { x: box.left + p.x * box.width, y: box.top + p.y * box.height }
}

function drawArrowHead(
  ctx: CanvasRenderingContext2D,
  from: { x: number; y: number },
  to: { x: number; y: number },
  size: number,
) {
  const ang = Math.atan2(to.y - from.y, to.x - from.x)
  ctx.beginPath()
  ctx.moveTo(to.x, to.y)
  ctx.lineTo(to.x - size * Math.cos(ang - 0.45), to.y - size * Math.sin(ang - 0.45))
  ctx.lineTo(to.x - size * Math.cos(ang + 0.45), to.y - size * Math.sin(ang + 0.45))
  ctx.closePath()
  ctx.fill()
}

type Props = {
  videoRef: { current: HTMLVideoElement | null }
}

export function VideoMarkOverlay({ videoRef }: Props) {
  const hostRef = useRef<HTMLDivElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const [tool, setTool] = useState<MarkTool>('line')
  const [marks, setMarks] = useState<Mark[]>([])
  const [linePts, setLinePts] = useState<Pt[]>([])
  const [arrowPts, setArrowPts] = useState<Pt[]>([])
  const [drawPts, setDrawPts] = useState<Pt[] | null>(null)
  const drawingRef = useRef(false)
  const drawPtsRef = useRef<Pt[] | null>(null)
  const arrowDragRef = useRef(false)
  const arrowStartRef = useRef<Pt | null>(null)
  const toolRef = useRef(tool)
  toolRef.current = tool

  const paint = useCallback(() => {
    const canvas = canvasRef.current
    const host = hostRef.current
    if (!canvas || !host) return
    const dpr = Math.max(1, window.devicePixelRatio || 1)
    const w = host.clientWidth
    const h = host.clientHeight
    if (w < 2 || h < 2) return
    if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
      canvas.width = Math.round(w * dpr)
      canvas.height = Math.round(h * dpr)
      canvas.style.width = `${w}px`
      canvas.style.height = `${h}px`
    }
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, w, h)
    const box = contentBox(videoRef.current, host)
    const lw = Math.max(3, box.width * 0.006)

    const strokeLine = (pts: Pt[], color: string, arrows = false) => {
      if (pts.length === 0) return
      ctx.lineJoin = 'round'
      ctx.lineCap = 'round'
      ctx.strokeStyle = color
      ctx.fillStyle = color
      ctx.lineWidth = lw
      if (pts.length > 1) {
        ctx.beginPath()
        const a = toPx(pts[0]!, box)
        ctx.moveTo(a.x, a.y)
        for (let i = 1; i < pts.length; i++) {
          const p = toPx(pts[i]!, box)
          ctx.lineTo(p.x, p.y)
        }
        ctx.stroke()
        if (arrows) {
          for (let i = 1; i < pts.length; i++) {
            drawArrowHead(ctx, toPx(pts[i - 1]!, box), toPx(pts[i]!, box), lw * 4)
          }
        }
      }
      const r = Math.max(5, lw * 1.4)
      for (const p of pts) {
        const q = toPx(p, box)
        ctx.beginPath()
        ctx.arc(q.x, q.y, r, 0, Math.PI * 2)
        ctx.fillStyle = '#fff'
        ctx.fill()
        ctx.beginPath()
        ctx.arc(q.x, q.y, r * 0.62, 0, Math.PI * 2)
        ctx.fillStyle = color
        ctx.fill()
      }
    }

    for (const m of marks) {
      if (m.kind === 'draw') strokeLine(m.points, DRAW)
      else strokeLine([m.a, m.b], ARROW, true)
    }
    if (drawPts && drawPts.length) strokeLine(drawPts, DRAW)
    strokeLine(linePts, LINE, true)
    strokeLine(arrowPts, ARROW, true)
  }, [marks, linePts, drawPts, arrowPts, videoRef])

  useEffect(() => {
    paint()
  }, [paint])

  useEffect(() => {
    const host = hostRef.current
    if (!host) return
    const ro = new ResizeObserver(() => paint())
    ro.observe(host)
    return () => ro.disconnect()
  }, [paint])

  const onPointerDown = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    const host = hostRef.current
    if (!host) return
    const pt = eventToNorm(e, host, videoRef.current)
    if (!pt) return
    e.preventDefault()
    e.stopPropagation()
    canvasRef.current?.setPointerCapture(e.pointerId)
    if (toolRef.current === 'draw') {
      drawingRef.current = true
      drawPtsRef.current = [pt]
      setDrawPts([pt])
      return
    }
    if (toolRef.current === 'arrow') {
      arrowDragRef.current = true
      arrowStartRef.current = pt
      setArrowPts([pt, pt])
      return
    }
    setLinePts((prev) => (prev.length >= 3 ? [] : [...prev, pt]))
  }

  const onPointerMove = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    const host = hostRef.current
    if (!host) return
    const pt = eventToNorm(e, host, videoRef.current)
    if (!pt) return
    if (arrowDragRef.current && toolRef.current === 'arrow') {
      const start = arrowStartRef.current
      if (!start) return
      e.preventDefault()
      setArrowPts([start, pt])
      return
    }
    if (!drawingRef.current || toolRef.current !== 'draw') return
    e.preventDefault()
    setDrawPts((prev) => {
      const next = prev ? [...prev, pt] : [pt]
      drawPtsRef.current = next
      return next
    })
  }

  const onPointerUp = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    e.preventDefault()
    if (arrowDragRef.current && toolRef.current === 'arrow') {
      arrowDragRef.current = false
      const host = hostRef.current
      const start = arrowStartRef.current
      arrowStartRef.current = null
      const pt = host ? eventToNorm(e, host, videoRef.current) : null
      const end = pt ?? arrowPts[1] ?? start
      if (start && end) {
        const dist = Math.hypot(end.x - start.x, end.y - start.y)
        if (dist > 0.012) {
          setMarks((m) => [...m, { kind: 'arrow', a: start, b: end }])
        }
      }
      setArrowPts([])
      return
    }
    if (!drawingRef.current) return
    drawingRef.current = false
    const pts = drawPtsRef.current
    drawPtsRef.current = null
    setDrawPts(null)
    if (pts && pts.length > 1) {
      setMarks((m) => [...m, { kind: 'draw', points: pts }])
    }
  }

  const clearAll = () => {
    setMarks([])
    setLinePts([])
    setArrowPts([])
    setDrawPts(null)
    drawingRef.current = false
    drawPtsRef.current = null
    arrowDragRef.current = false
    arrowStartRef.current = null
  }

  const btn = (id: MarkTool, label: string) => (
    <button
      type="button"
      onClick={() => {
        setTool(id)
        setArrowPts([])
        drawingRef.current = false
        arrowDragRef.current = false
        arrowStartRef.current = null
        setDrawPts(null)
      }}
      className={`rounded-md px-2 py-1 text-[11px] font-semibold ${
        tool === id
          ? 'bg-[var(--accent)] text-[#06281f]'
          : 'border border-white/30 bg-black/55 text-white'
      }`}
    >
      {label}
    </button>
  )

  return (
    <div ref={hostRef} className="pointer-events-none absolute inset-0 z-10">
      <canvas
        ref={canvasRef}
        className="pointer-events-auto absolute inset-0 h-full w-full touch-none"
        style={{ touchAction: 'none' }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        aria-label="Draw on video"
      />
      <div className="pointer-events-auto absolute left-1 top-1 z-20 flex flex-wrap gap-1">
        {btn('line', 'Line')}
        {btn('draw', 'Draw')}
        {btn('arrow', 'Arrow')}
        <button
          type="button"
          onClick={clearAll}
          className="rounded-md border border-white/30 bg-black/55 px-2 py-1 text-[11px] text-white"
        >
          Clear
        </button>
      </div>
    </div>
  )
}
