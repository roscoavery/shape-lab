/**
 * Coach markup on a Compare video: tap-tap Line, smooth freehand Draw,
 * press-drag Arrow (head where you let go), and Screenshot crop.
 */

import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { cropVideoFrame, type NormPt } from '../../lib/cropFrame'
import { customShapeId } from '../../lib/igStills'
import { addIgStill } from '../../lib/igStillStore'
import { learnLibraryShapes } from '../../lib/educationCopy'
import { createId } from '../../lib/storage'
import type { ReferencePhoto } from '../../types'
import { HScrollRow } from '../HScrollRow'
import { useIgStillSave } from './IgStillContext'
import { CompareControlsButton, HudCircle, IconArrow, IconDraw, IconLine, IconShot, IconX } from './CompareHud'

export type MarkTool = 'line' | 'draw' | 'arrow' | 'crop'

type Pt = NormPt

type DrawStroke = { kind: 'draw'; points: Pt[] }
type ArrowMark = { kind: 'arrow'; points: Pt[] }
type Mark = DrawStroke | ArrowMark

function appendIfMoved(pts: Pt[], pt: Pt, min = 0.0018): Pt[] {
  const last = pts[pts.length - 1]
  if (last && Math.hypot(pt.x - last.x, pt.y - last.y) < min) return pts
  pts.push(pt)
  return pts
}

const LINE = '#f5d76e'
const DRAW = '#7dd3c7'
const ARROW = '#ff8a6b'
const CROP = '#9ecbff'

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

function lineDotRadius(boxWidth: number) {
  const lw = Math.max(3, boxWidth * 0.006)
  return Math.max(5, lw * 1.4)
}

/** Hit-test Line dots in screen pixels so a finished line can be selected and moved. */
function hitLineDotIndex(
  e: { clientX: number; clientY: number },
  host: HTMLElement,
  video: HTMLVideoElement | null,
  pts: Pt[],
): number {
  if (pts.length === 0) return -1
  const box = contentBox(video, host)
  if (box.width < 2 || box.height < 2) return -1
  const hr = host.getBoundingClientRect()
  const hitR = Math.max(24, lineDotRadius(box.width) * 2.5)
  let best = -1
  let bestD = Infinity
  for (let i = pts.length - 1; i >= 0; i--) {
    const q = toPx(pts[i]!, box)
    const d = Math.hypot(e.clientX - (hr.left + q.x), e.clientY - (hr.top + q.y))
    if (d <= hitR && d < bestD) {
      best = i
      bestD = d
    }
  }
  return best
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
  /** True when the <video> is CSS-mirrored. */
  mirror?: boolean
  /** Let two-finger pinch reach the player instead of starting a draw. */
  pinchPassthrough?: boolean
  /** Compact circular HUD (Replay Last / delay cam / reference). */
  hud?: boolean
  /** Extra top offset so Replay Last’s back chevron stays clear. */
  hudOffsetClass?: string
  /**
   * Start with no tool and let vertical swipes reach the page until Line /
   * Shot / Draw / Arrow is selected. Used by the phone reel viewer.
   */
  swipeSafe?: boolean
}

export function VideoMarkOverlay({
  videoRef,
  mirror = false,
  pinchPassthrough = false,
  hud = false,
  hudOffsetClass = 'left-1.5 top-2',
  swipeSafe = false,
}: Props) {
  const igSave = useIgStillSave()
  const hostRef = useRef<HTMLDivElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const shapes = learnLibraryShapes()
  const [tool, setTool] = useState<MarkTool | null>(swipeSafe ? null : 'line')
  const [marks, setMarks] = useState<Mark[]>([])
  const [linePts, setLinePts] = useState<Pt[]>([])
  const [selectedDot, setSelectedDot] = useState<number | null>(null)
  const [cursor, setCursor] = useState('crosshair')
  const [arrowPts, setArrowPts] = useState<Pt[]>([])
  const [drawPts, setDrawPts] = useState<Pt[] | null>(null)
  const [cropPts, setCropPts] = useState<[Pt, Pt] | null>(null)
  const [pending, setPending] = useState<{ dataUrl: string } | null>(null)
  const [shapeId, setShapeId] = useState('')
  const [customName, setCustomName] = useState('')
  const [shapeQuery, setShapeQuery] = useState('')
  const [label, setLabel] = useState('')
  const [notice, setNotice] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const drawingRef = useRef(false)
  const drawPtsRef = useRef<Pt[] | null>(null)
  const arrowDragRef = useRef(false)
  const arrowPtsRef = useRef<Pt[]>([])
  const paintFrameRef = useRef(0)
  const cropDragRef = useRef(false)
  const cropStartRef = useRef<Pt | null>(null)
  const linePtsRef = useRef(linePts)
  linePtsRef.current = linePts
  const selectedDotRef = useRef(selectedDot)
  selectedDotRef.current = selectedDot
  const draggingDotRef = useRef<number | null>(null)
  const toolRef = useRef(tool)
  toolRef.current = tool
  const mirrorRef = useRef(mirror)
  mirrorRef.current = mirror
  const pendingRef = useRef(pending)
  pendingRef.current = pending
  const pointersRef = useRef(new Set<number>())

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

    const strokeSmooth = (pts: Pt[], color: string, arrowEnd = false) => {
      if (pts.length === 0) return
      ctx.lineJoin = 'round'
      ctx.lineCap = 'round'
      ctx.strokeStyle = color
      ctx.fillStyle = color
      ctx.lineWidth = lw
      const px = pts.map((p) => toPx(p, box))
      if (px.length === 1) {
        ctx.beginPath()
        ctx.arc(px[0]!.x, px[0]!.y, lw / 2, 0, Math.PI * 2)
        ctx.fill()
        return
      }
      ctx.beginPath()
      ctx.moveTo(px[0]!.x, px[0]!.y)
      if (px.length === 2) {
        ctx.lineTo(px[1]!.x, px[1]!.y)
      } else {
        for (let i = 1; i < px.length - 1; i++) {
          const a = px[i]!
          const b = px[i + 1]!
          ctx.quadraticCurveTo(a.x, a.y, (a.x + b.x) / 2, (a.y + b.y) / 2)
        }
        const last = px[px.length - 1]!
        ctx.lineTo(last.x, last.y)
      }
      ctx.stroke()
      if (arrowEnd && px.length >= 2) {
        const from = px[px.length - 2]!
        const to = px[px.length - 1]!
        drawArrowHead(ctx, from, to, lw * 5.2)
      }
    }

    const strokeLineDots = (pts: Pt[], color: string) => {
      strokeSmooth(pts, color, false)
      const r = Math.max(5, lw * 1.4)
      ctx.fillStyle = color
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

    const liveDraw = drawPtsRef.current ?? drawPts
    const liveArrow = arrowPtsRef.current.length ? arrowPtsRef.current : arrowPts

    for (const m of marks) {
      if (m.kind === 'draw') strokeSmooth(m.points, DRAW)
      else strokeSmooth(m.points, ARROW, true)
    }
    if (liveDraw && liveDraw.length) strokeSmooth(liveDraw, DRAW)
    strokeLineDots(linePts, LINE)
    if (selectedDot != null && linePts[selectedDot]) {
      const q = toPx(linePts[selectedDot], box)
      const r = Math.max(5, lw * 1.4)
      ctx.beginPath()
      ctx.arc(q.x, q.y, r * 1.9, 0, Math.PI * 2)
      ctx.strokeStyle = '#fff'
      ctx.lineWidth = Math.max(2, lw * 0.5)
      ctx.stroke()
      ctx.beginPath()
      ctx.arc(q.x, q.y, r * 1.9, 0, Math.PI * 2)
      ctx.strokeStyle = LINE
      ctx.lineWidth = Math.max(1.5, lw * 0.35)
      ctx.stroke()
    }
    if (liveArrow.length) strokeSmooth(liveArrow, ARROW, true)

    if (cropPts) {
      const a = toPx(cropPts[0], box)
      const b = toPx(cropPts[1], box)
      const x = Math.min(a.x, b.x)
      const y = Math.min(a.y, b.y)
      const rw = Math.abs(b.x - a.x)
      const rh = Math.abs(b.y - a.y)
      ctx.fillStyle = 'rgba(8, 12, 18, 0.45)'
      ctx.fillRect(box.left, box.top, box.width, box.height)
      ctx.clearRect(x, y, rw, rh)
      ctx.strokeStyle = CROP
      ctx.lineWidth = Math.max(2, lw * 0.7)
      ctx.setLineDash([7, 5])
      ctx.strokeRect(x, y, rw, rh)
      ctx.setLineDash([])
      const cr = Math.max(4, lw)
      for (const p of [a, b]) {
        ctx.beginPath()
        ctx.arc(p.x, p.y, cr, 0, Math.PI * 2)
        ctx.fillStyle = '#fff'
        ctx.fill()
        ctx.beginPath()
        ctx.arc(p.x, p.y, cr * 0.55, 0, Math.PI * 2)
        ctx.fillStyle = CROP
        ctx.fill()
      }
    }
  }, [marks, linePts, selectedDot, cropPts, drawPts, arrowPts, videoRef])

  const schedulePaint = useCallback(() => {
    if (paintFrameRef.current) return
    paintFrameRef.current = window.requestAnimationFrame(() => {
      paintFrameRef.current = 0
      paint()
    })
  }, [paint])

  useEffect(() => {
    paint()
  }, [paint])

  useEffect(() => {
    return () => {
      if (paintFrameRef.current) window.cancelAnimationFrame(paintFrameRef.current)
    }
  }, [])

  useEffect(() => {
    const host = hostRef.current
    if (!host) return
    const ro = new ResizeObserver(() => paint())
    ro.observe(host)
    return () => ro.disconnect()
  }, [paint])

  const resetCropDrag = () => {
    cropDragRef.current = false
    cropStartRef.current = null
    setCropPts(null)
  }

  const onPointerDown = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    if (pendingRef.current) return
    pointersRef.current.add(e.pointerId)
    if (pinchPassthrough && pointersRef.current.size >= 2) {
      drawingRef.current = false
      arrowDragRef.current = false
      cropDragRef.current = false
      draggingDotRef.current = null
      try {
        canvasRef.current?.releasePointerCapture(e.pointerId)
      } catch {
        /* ignore */
      }
      return
    }
    const host = hostRef.current
    if (!host) return
    const pt = eventToNorm(e, host, videoRef.current)
    if (!pt) return
    e.preventDefault()
    e.stopPropagation()
    canvasRef.current?.setPointerCapture(e.pointerId)
    if (toolRef.current === 'crop') {
      videoRef.current?.pause()
      cropDragRef.current = true
      cropStartRef.current = pt
      setCropPts([pt, pt])
      setError(null)
      return
    }
    if (toolRef.current === 'draw') {
      drawingRef.current = true
      drawPtsRef.current = [pt]
      setDrawPts([pt])
      schedulePaint()
      return
    }
    if (toolRef.current === 'arrow') {
      arrowDragRef.current = true
      arrowPtsRef.current = [pt]
      setArrowPts([pt])
      schedulePaint()
      return
    }
    const hit = hitLineDotIndex(e, host, videoRef.current, linePtsRef.current)
    if (hit >= 0) {
      draggingDotRef.current = hit
      selectedDotRef.current = hit
      setSelectedDot(hit)
      setCursor('grabbing')
      return
    }
    setLinePts((prev) => {
      if (prev.length >= 3) {
        setSelectedDot(null)
        selectedDotRef.current = null
        return []
      }
      const next = [...prev, pt]
      const idx = next.length - 1
      selectedDotRef.current = idx
      setSelectedDot(idx)
      return next
    })
  }

  const onPointerMove = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    const host = hostRef.current
    if (!host) return
    const dragIdx = draggingDotRef.current
    if (dragIdx != null && toolRef.current === 'line') {
      const pt = eventToNorm(e, host, videoRef.current)
      if (!pt) return
      e.preventDefault()
      setLinePts((prev) => {
        if (dragIdx < 0 || dragIdx >= prev.length) return prev
        const next = [...prev]
        next[dragIdx] = pt
        return next
      })
      setCursor('grabbing')
      return
    }
    const pt = eventToNorm(e, host, videoRef.current)
    if (!pt) return
    if (toolRef.current === 'line' && !drawingRef.current) {
      const hover = hitLineDotIndex(e, host, videoRef.current, linePtsRef.current)
      setCursor(hover >= 0 ? 'grab' : 'crosshair')
    }
    if (cropDragRef.current && toolRef.current === 'crop') {
      const start = cropStartRef.current
      if (!start) return
      e.preventDefault()
      setCropPts([start, pt])
      return
    }
    if (arrowDragRef.current && toolRef.current === 'arrow') {
      e.preventDefault()
      const native = e.nativeEvent
      const events =
        typeof native.getCoalescedEvents === 'function' ? native.getCoalescedEvents() : [native]
      const pts = arrowPtsRef.current.length ? arrowPtsRef.current : [pt]
      for (const ev of events) {
        const p = eventToNorm(ev, host, videoRef.current)
        if (p) appendIfMoved(pts, p)
      }
      arrowPtsRef.current = pts
      schedulePaint()
      return
    }
    if (!drawingRef.current || toolRef.current !== 'draw') return
    e.preventDefault()
    const native = e.nativeEvent
    const events =
      typeof native.getCoalescedEvents === 'function' ? native.getCoalescedEvents() : [native]
    const pts = drawPtsRef.current ? drawPtsRef.current : [pt]
    for (const ev of events) {
      const p = eventToNorm(ev, host, videoRef.current)
      if (p) appendIfMoved(pts, p)
    }
    drawPtsRef.current = pts
    schedulePaint()
  }

  const onPointerUp = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    pointersRef.current.delete(e.pointerId)
    e.preventDefault()
    try {
      canvasRef.current?.releasePointerCapture(e.pointerId)
    } catch {
      /* already released */
    }
    if (draggingDotRef.current != null) {
      draggingDotRef.current = null
      const host = hostRef.current
      const hover =
        host && toolRef.current === 'line'
          ? hitLineDotIndex(e, host, videoRef.current, linePtsRef.current)
          : -1
      setCursor(hover >= 0 ? 'grab' : 'crosshair')
      return
    }
    if (cropDragRef.current && toolRef.current === 'crop') {
      cropDragRef.current = false
      const host = hostRef.current
      const start = cropStartRef.current
      cropStartRef.current = null
      const pt = host ? eventToNorm(e, host, videoRef.current) : null
      const end = pt ?? cropPts?.[1] ?? start
      setCropPts(null)
      if (start && end) {
        const dataUrl = cropVideoFrame(videoRef.current, start, end, mirrorRef.current)
        if (!dataUrl) {
          setError('Crop was too small, or this video cannot be captured. Pause a saved clip and try again.')
          return
        }
        setPending({ dataUrl })
        setShapeId((id) => id || shapes[0]?.id || '')
        setError(null)
      }
      return
    }
    if (arrowDragRef.current && toolRef.current === 'arrow') {
      arrowDragRef.current = false
      const host = hostRef.current
      const pt = host ? eventToNorm(e, host, videoRef.current) : null
      const pts = [...(arrowPtsRef.current.length ? arrowPtsRef.current : [])]
      if (pt) appendIfMoved(pts, pt)
      arrowPtsRef.current = []
      setArrowPts([])
      if (pts.length >= 2) {
        const a = pts[0]!
        const b = pts[pts.length - 1]!
        if (Math.hypot(b.x - a.x, b.y - a.y) > 0.012) {
          setMarks((m) => [...m, { kind: 'arrow', points: pts }])
        }
      }
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
    setSelectedDot(null)
    selectedDotRef.current = null
    draggingDotRef.current = null
    setCursor('crosshair')
    setArrowPts([])
    setDrawPts(null)
    drawingRef.current = false
    drawPtsRef.current = null
    arrowDragRef.current = false
    arrowPtsRef.current = []
    resetCropDrag()
  }

  const savePending = () => {
    if (!pending) return
    const custom = customName.trim()
    const listed = shapeId
    if (!custom && !listed) {
      setError('Pick a listed shape, or type a custom name if it is not in the list.')
      return
    }
    const shapeKey = custom ? customShapeId(custom) : listed
    if (igSave) {
      igSave.saveCrop({
        dataUrl: pending.dataUrl,
        shapeId: shapeKey,
        customName: custom || undefined,
        label: label.trim() || custom || undefined,
      })
    } else {
      const photo: ReferencePhoto = custom
        ? {
            id: createId('ig'),
            shapeId: shapeKey,
            athleteId: null,
            dataUrl: pending.dataUrl,
            customName: custom,
            label: label.trim() || custom,
            createdAt: new Date().toISOString(),
            library: 'ig',
          }
        : {
            id: createId('ig'),
            shapeId: listed,
            athleteId: null,
            dataUrl: pending.dataUrl,
            label: label.trim() || undefined,
            createdAt: new Date().toISOString(),
            library: 'ig',
          }
      void addIgStill(photo)
    }
    setPending(null)
    setLabel('')
    setCustomName('')
    setShapeQuery('')
    setShapeId('')
    if (swipeSafe) {
      setTool(null)
      setCursor('default')
    }
    setNotice(
      igSave?.persistToApp
        ? 'Saved into the app — every browser and link will have this still.'
        : 'Saved to IG shapes on this device. Select Ryan to save into the app for every link.',
    )
    window.setTimeout(() => setNotice(null), 4000)
  }

  const pickTool = (id: MarkTool) => {
    if (swipeSafe && tool === id) {
      setTool(null)
      setCursor('default')
      setArrowPts([])
      drawingRef.current = false
      arrowDragRef.current = false
      arrowPtsRef.current = []
      draggingDotRef.current = null
      resetCropDrag()
      return
    }
    setTool(id)
    setArrowPts([])
    drawingRef.current = false
    arrowDragRef.current = false
    arrowPtsRef.current = []
    draggingDotRef.current = null
    if (id !== 'line') {
      setSelectedDot(null)
      selectedDotRef.current = null
    }
    setCursor('crosshair')
    setDrawPts(null)
    resetCropDrag()
  }

  const btn = (id: MarkTool, labelText: string) => (
    <button
      type="button"
      onClick={() => pickTool(id)}
      className={`rounded-md px-2 py-1 text-[11px] font-semibold ${
        tool === id
          ? 'bg-[var(--accent)] text-[#06281f]'
          : 'border border-white/30 bg-black/55 text-white'
      }`}
    >
      {labelText}
    </button>
  )

  const toolHud = (
    <div className={`pointer-events-auto absolute z-20 flex flex-col items-center gap-2 ${hudOffsetClass}`}>
      <HudCircle label="Line" active={tool === 'line'} onClick={() => pickTool('line')}>
        <IconLine />
      </HudCircle>
      <HudCircle label="Draw" active={tool === 'draw'} onClick={() => pickTool('draw')}>
        <IconDraw />
      </HudCircle>
      <HudCircle label="Arrow" active={tool === 'arrow'} onClick={() => pickTool('arrow')}>
        <IconArrow />
      </HudCircle>
      <HudCircle label="Shot" active={tool === 'crop'} onClick={() => pickTool('crop')}>
        <IconShot />
      </HudCircle>
      <HudCircle label="Clear" onClick={clearAll}>
        <IconX />
      </HudCircle>
      {hud ? <CompareControlsButton /> : null}
    </div>
  )

  return (
    <div ref={hostRef} className="pointer-events-none absolute inset-0 z-10">
      <canvas
        ref={canvasRef}
        className={`absolute inset-0 h-full w-full ${
          tool && !pending ? 'pointer-events-auto touch-none' : 'pointer-events-none'
        }`}
        style={{
          touchAction: tool ? 'none' : 'pan-y',
          cursor: tool ? cursor : 'default',
          pointerEvents: pending || !tool ? 'none' : 'auto',
        }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        aria-label="Draw on video"
      />
      {hud ? (
        toolHud
      ) : (
        <div className="pointer-events-auto absolute left-1 top-1 z-20 flex flex-wrap gap-1">
          {btn('line', 'Line')}
          {btn('draw', 'Draw')}
          {btn('arrow', 'Arrow')}
          {btn('crop', 'Screenshot')}
          <button
            type="button"
            onClick={clearAll}
            className="rounded-md border border-white/30 bg-black/55 px-2 py-1 text-[11px] text-white"
          >
            Clear
          </button>
        </div>
      )}
      {!hud && tool === 'crop' && !pending && (
        <p className="pointer-events-none absolute inset-x-2 top-9 z-20 rounded bg-black/65 px-2 py-1 text-center text-[10px] text-white/90 sm:text-[11px]">
          Press one corner of the shape, drag to the opposite corner, then let go.
        </p>
      )}
      {!hud && tool === 'line' && linePts.length > 0 && !pending && (
        <p className="pointer-events-none absolute inset-x-2 top-9 z-20 rounded bg-black/65 px-2 py-1 text-center text-[10px] text-white/90 sm:text-[11px]">
          Tap a Line dot to select it, then drag to move. A fourth tap on empty space clears the line.
        </p>
      )}
      {!hud && tool === 'draw' && !pending && (
        <p className="pointer-events-none absolute inset-x-2 top-9 z-20 rounded bg-black/65 px-2 py-1 text-center text-[10px] text-white/90 sm:text-[11px]">
          Press and drag — a smooth stroke, not a line of dots.
        </p>
      )}
      {!hud && tool === 'arrow' && !pending && (
        <p className="pointer-events-none absolute inset-x-2 top-9 z-20 rounded bg-black/65 px-2 py-1 text-center text-[10px] text-white/90 sm:text-[11px]">
          Press, draw the path, let go — the arrowhead lands where you release.
        </p>
      )}
      {notice && (
        <p className="pointer-events-none absolute inset-x-2 bottom-2 z-30 rounded-md bg-[#102820] px-2 py-1.5 text-center text-[11px] font-medium text-[var(--accent)]">
          {notice}
        </p>
      )}
      {error && !pending && (
        <p className="pointer-events-none absolute inset-x-2 bottom-2 z-30 rounded-md bg-[#2a1518] px-2 py-1.5 text-center text-[11px] text-[var(--bad)]">
          {error}
        </p>
      )}
      {pending && (
        <div
          className="pointer-events-auto absolute inset-x-1 bottom-1 z-30 max-h-[78%] overflow-y-auto rounded-lg border border-white/25 bg-[#0d1218]/95 p-2 shadow-xl"
          onPointerDown={(e) => e.stopPropagation()}
          onPointerUp={(e) => e.stopPropagation()}
        >
          <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)]">
            Save to IG shapes
          </p>
          <img
            src={pending.dataUrl}
            alt="Crop preview"
            className="mt-1 max-h-28 w-full rounded bg-black object-contain"
          />
          <p className="mt-2 text-[11px] text-white/80">
            Scroll to the shape, or type a custom name if it is not listed.
          </p>
          <input
            type="search"
            value={shapeQuery}
            onChange={(e) => setShapeQuery(e.target.value)}
            placeholder="Search listed shapes…"
            className="mt-1 w-full rounded-md border border-white/20 bg-[#121820] px-2 py-1 text-xs text-[var(--text)]"
          />
          <HScrollRow label="Listed shapes" className="mt-1.5">
            {shapes
              .filter((s) => {
                const q = shapeQuery.trim().toLowerCase()
                if (!q) return true
                return `${s.name} ${s.id}`.toLowerCase().includes(q)
              })
              .map((s) => {
                const on = !customName.trim() && shapeId === s.id
                return (
                  <button
                    key={s.id}
                    type="button"
                    role="option"
                    aria-selected={on}
                    onClick={() => {
                      setShapeId(s.id)
                      setCustomName('')
                      setError(null)
                    }}
                    className={`max-w-[9rem] shrink-0 snap-start truncate rounded-md px-2 py-1.5 text-left text-[11px] font-semibold ${
                      on
                        ? 'bg-[var(--accent)] text-[#06281f]'
                        : 'border border-white/25 bg-black/50 text-white'
                    }`}
                  >
                    {s.name}
                  </button>
                )
              })}
          </HScrollRow>
          <label className="mt-2 block text-[11px] text-[var(--muted)]">
            Custom name (if it is not in the list)
            <input
              value={customName}
              onChange={(e) => {
                setCustomName(e.target.value)
                if (e.target.value.trim()) setShapeId('')
                setError(null)
              }}
              placeholder="e.g. back walkover set, punch jump"
              className="mt-0.5 w-full rounded-md border border-[var(--panel-border)] bg-[#121820] px-2 py-1 text-xs text-[var(--text)]"
            />
          </label>
          <label className="mt-1.5 block text-[11px] text-[var(--muted)]">
            Note (optional)
            <input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="e.g. landing, IG reel"
              className="mt-0.5 w-full rounded-md border border-[var(--panel-border)] bg-[#121820] px-2 py-1 text-xs text-[var(--text)]"
            />
          </label>
          {error && <p className="mt-1 text-[11px] text-[var(--bad)]">{error}</p>}
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              onClick={savePending}
              className="rounded-md bg-[var(--accent)] px-2.5 py-1 text-[11px] font-semibold text-[#06281f]"
            >
              Save to IG library
            </button>
            <button
              type="button"
              onClick={() => {
                setPending(null)
                setError(null)
                setCustomName('')
                setShapeQuery('')
              }}
              className="rounded-md border border-white/25 px-2.5 py-1 text-[11px] text-white"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
