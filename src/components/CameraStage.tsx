/**
 * Draws mirrored video + skeleton overlay + optional live angle labels
 */

import { useEffect, type ReactNode } from 'react'
import { jointAngle, VISIBILITY_DRAW } from '../lib/angles'
import { LM, POSE_EDGES } from '../lib/landmarks'
import { isLungeArmHold, isShoulderCriterionId, isSoftShoulderShape } from '../lib/scoring'
import type { CriterionDef, Landmark, ScoreResult, ShapeDef } from '../types'

type Props = {
  videoRef: React.RefObject<HTMLVideoElement | null>
  canvasRef: React.RefObject<HTMLCanvasElement | null>
  landmarks: Landmark[] | null
  mirror: boolean
  showAngles: boolean
  running: boolean
  /** When true, draw skeleton on a blank stage (no live video). */
  demoMode?: boolean
  /** Extra UI on top of the live canvas (coach still, last hit). */
  overlay?: ReactNode
  /** Color the skeleton from the live score (green = that line is in). */
  shape?: ShapeDef
  score?: ScoreResult | null
  /** Paint score + shape name onto the pixels so grade replays include them. */
  burnInHud?: boolean
  className?: string
  /** Fill the parent instead of sizing to the video aspect. */
  fill?: boolean
}

function criterionLandmarks(c: CriterionDef, all: CriterionDef[]): number[] {
  if (c.points) return [...c.points]
  if (c.segment) return [...c.segment]
  if (c.pair) return [...c.pair]
  if (c.leftPoints) return [...c.leftPoints]
  if (c.rightPoints) return [...c.rightPoints]
  if (c.of) {
    return c.of.flatMap((id) => {
      const sub = all.find((x) => x.id === id)
      return sub ? criterionLandmarks(sub, all) : []
    })
  }
  return []
}

function edgeTint(
  a: number,
  b: number,
  shape: ShapeDef | undefined,
  score: ScoreResult | null | undefined,
): string {
  if (!shape || !score) return 'rgba(45, 212, 168, 0.92)'
  let worst = 100
  let hit = false
  for (const c of shape.criteria) {
    if (c.id.startsWith('_')) continue
    if (isShoulderCriterionId(c.id) && isSoftShoulderShape(shape.id)) continue
    if (isLungeArmHold(shape.id) && c.id === 'back_leg') continue
    const pts = criterionLandmarks(c, shape.criteria)
    if (!pts.includes(a) && !pts.includes(b)) continue
    const row = score.criteria.find((r) => r.id === c.id)
    if (!row) continue
    hit = true
    worst = Math.min(worst, row.score)
  }
  if (!hit) return 'rgba(180, 200, 210, 0.55)'
  if (worst >= 80) return '#2dd4a8'
  if (worst >= 65) return '#e4c35a'
  return '#f07178'
}

const ANGLE_READOUTS: { label: string; points: [number, number, number]; color: string }[] = [
  { label: 'L elbow', points: [LM.LEFT_SHOULDER, LM.LEFT_ELBOW, LM.LEFT_WRIST], color: '#2dd4a8' },
  { label: 'R elbow', points: [LM.RIGHT_SHOULDER, LM.RIGHT_ELBOW, LM.RIGHT_WRIST], color: '#2dd4a8' },
  { label: 'L shoulder', points: [LM.LEFT_HIP, LM.LEFT_SHOULDER, LM.LEFT_ELBOW], color: '#f0b429' },
  { label: 'R shoulder', points: [LM.RIGHT_HIP, LM.RIGHT_SHOULDER, LM.RIGHT_ELBOW], color: '#f0b429' },
  { label: 'L hip', points: [LM.LEFT_SHOULDER, LM.LEFT_HIP, LM.LEFT_KNEE], color: '#7db7ff' },
  { label: 'R hip', points: [LM.RIGHT_SHOULDER, LM.RIGHT_HIP, LM.RIGHT_KNEE], color: '#7db7ff' },
  { label: 'L knee', points: [LM.LEFT_HIP, LM.LEFT_KNEE, LM.LEFT_ANKLE], color: '#c4a5ff' },
  { label: 'R knee', points: [LM.RIGHT_HIP, LM.RIGHT_KNEE, LM.RIGHT_ANKLE], color: '#c4a5ff' },
]

function scoreFill(n: number): string {
  if (n >= 85) return '#2dd4a8'
  if (n >= 70) return '#5ec2a8'
  if (n >= 50) return '#e4c35a'
  return '#f07178'
}

function drawGradeHud(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  overall: number,
  label: string,
) {
  const cx = width / 2
  const y = height * 0.025
  const scoreText = String(overall)
  const scorePx = Math.max(40, Math.round(width * 0.072))
  const labelPx = Math.max(13, Math.round(width * 0.022))
  ctx.save()
  ctx.textAlign = 'center'
  ctx.textBaseline = 'top'
  ctx.font = `800 ${scorePx}px ui-sans-serif, system-ui, sans-serif`
  const scoreW = ctx.measureText(scoreText).width
  ctx.font = `600 ${labelPx}px ui-sans-serif, system-ui, sans-serif`
  const labelW = ctx.measureText(label).width
  const boxW = Math.max(scoreW, labelW) + width * 0.05
  const boxH = scorePx + labelPx + height * 0.035
  const x0 = cx - boxW / 2
  ctx.fillStyle = 'rgba(0, 0, 0, 0.58)'
  if (typeof ctx.roundRect === 'function') {
    ctx.beginPath()
    ctx.roundRect(x0, y, boxW, boxH, Math.max(10, width * 0.012))
    ctx.fill()
  } else {
    ctx.fillRect(x0, y, boxW, boxH)
  }
  ctx.font = `800 ${scorePx}px ui-sans-serif, system-ui, sans-serif`
  ctx.fillStyle = scoreFill(overall)
  ctx.fillText(scoreText, cx, y + height * 0.008)
  ctx.font = `600 ${labelPx}px ui-sans-serif, system-ui, sans-serif`
  ctx.fillStyle = 'rgba(255,255,255,0.88)'
  ctx.fillText(label, cx, y + scorePx + height * 0.01)
  ctx.restore()
}

export function CameraStage({
  videoRef,
  canvasRef,
  landmarks,
  mirror,
  showAngles,
  running,
  demoMode = false,
  overlay,
  shape,
  score,
  burnInHud = false,
  className = '',
  fill = false,
}: Props) {
  useEffect(() => {
    let raf = 0

    const draw = () => {
      const video = videoRef.current
      const canvas = canvasRef.current
      if (!canvas) {
        raf = requestAnimationFrame(draw)
        return
      }

      // Demo mode uses a fixed canvas size; live mode follows the video.
      const hasVideo = Boolean(running && video && video.videoWidth)
      if (hasVideo && video) {
        if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
          canvas.width = video.videoWidth
          canvas.height = video.videoHeight
        }
      } else if (demoMode) {
        if (canvas.width !== 960 || canvas.height !== 720) {
          canvas.width = 960
          canvas.height = 720
        }
      }

      const ctx = canvas.getContext('2d')
      if (!ctx || (!hasVideo && !demoMode)) {
        raf = requestAnimationFrame(draw)
        return
      }

      ctx.clearRect(0, 0, canvas.width, canvas.height)
      ctx.save()
      if (mirror) {
        ctx.translate(canvas.width, 0)
        ctx.scale(-1, 1)
      }

      if (hasVideo && video) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
      } else if (demoMode) {
        // Subtle mat background for demo poses
        const g = ctx.createLinearGradient(0, 0, 0, canvas.height)
        g.addColorStop(0, '#1a2430')
        g.addColorStop(1, '#0d1218')
        ctx.fillStyle = g
        ctx.fillRect(0, 0, canvas.width, canvas.height)
      }

      if (landmarks) {
        ctx.lineJoin = 'round'
        ctx.lineCap = 'round'
        for (const [a, b] of POSE_EDGES) {
          const A = landmarks[a]
          const B = landmarks[b]
          if (!A || !B) continue
          if ((A.visibility ?? 1) < VISIBILITY_DRAW || (B.visibility ?? 1) < VISIBILITY_DRAW) continue
          const color = edgeTint(a, b, shape, score)
          ctx.lineWidth = Math.max(5, canvas.width * 0.006)
          ctx.strokeStyle = color
          ctx.beginPath()
          ctx.moveTo(A.x * canvas.width, A.y * canvas.height)
          ctx.lineTo(B.x * canvas.width, B.y * canvas.height)
          ctx.stroke()
        }

        for (const lm of landmarks) {
          if ((lm.visibility ?? 1) < VISIBILITY_DRAW) continue
          ctx.beginPath()
          ctx.fillStyle = '#ffffff'
          ctx.arc(
            lm.x * canvas.width,
            lm.y * canvas.height,
            Math.max(4, canvas.width * 0.006),
            0,
            Math.PI * 2,
          )
          ctx.fill()
        }

        if (showAngles) {
          ctx.restore()
          ctx.save()
          ctx.font = `600 ${Math.max(12, canvas.width * 0.018)}px sans-serif`
          ctx.textAlign = 'left'
          for (const readout of ANGLE_READOUTS) {
            const ang = jointAngle(landmarks, ...readout.points)
            if (ang === null) continue
            const joint = landmarks[readout.points[1]]
            if (!joint || (joint.visibility ?? 1) < VISIBILITY_DRAW) continue
            let x = joint.x * canvas.width
            let y = joint.y * canvas.height
            if (mirror) x = canvas.width - x
            ctx.fillStyle = 'rgba(0,0,0,0.55)'
            const text = `${readout.label} ${Math.round(ang)}°`
            const pad = 4
            const w = ctx.measureText(text).width
            ctx.fillRect(x + 8 - pad, y - 16 - pad, w + pad * 2, 18 + pad)
            ctx.fillStyle = readout.color
            ctx.fillText(text, x + 8, y - 4)
          }
        }
      }
      ctx.restore()

      if (burnInHud && score) {
        drawGradeHud(ctx, canvas.width, canvas.height, score.overall, shape?.name ?? 'Live score')
      }
      raf = requestAnimationFrame(draw)
    }

    raf = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(raf)
  }, [videoRef, canvasRef, landmarks, mirror, showAngles, running, demoMode, shape, score, burnInHud])

  return (
    <div
      className={`relative w-full overflow-hidden bg-black shadow-lg ${
        fill
          ? 'h-full rounded-none border-0'
          : 'rounded-xl border border-[var(--panel-border)]'
      } ${className}`}
    >
      <video ref={videoRef} className="hidden" playsInline muted />
      <canvas
        ref={canvasRef}
        className={`block bg-[#0a0e12] ${fill ? 'h-full w-full object-contain' : 'h-auto w-full'}`}
      />
      {!running && !demoMode && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-[#0a0e12]/90 p-6 text-center">
          <p className="text-lg font-semibold text-[var(--text)]">Camera is off</p>
          <p className="max-w-sm text-sm text-[var(--muted)]">
            Start the camera for live coaching, or use <strong>Demo: good HS</strong> to test
            Handstand scoring without a camera.
          </p>
        </div>
      )}
      {demoMode && (
        <div className="pointer-events-none absolute left-3 top-3 rounded bg-black/60 px-2 py-1 text-xs text-[var(--accent)]">
          Demo pose (no camera)
        </div>
      )}
      {overlay}
    </div>
  )
}
