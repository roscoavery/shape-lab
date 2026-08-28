/**
 * Draws mirrored video + skeleton overlay + optional live angle labels
 */

import { useEffect, useRef, type ReactNode } from 'react'
import { jointAngle, VISIBILITY_DRAW } from '../lib/angles'
import { LM, POSE_EDGES } from '../lib/landmarks'
import { isLungeArmHold, isShoulderCriterionId, isSoftShoulderShape } from '../lib/scoring'
import {
  drawGradeHud,
  drawPoseOverlay,
  overlayLineColor,
  type JointDrawMode,
} from '../lib/skeleton'
import type { CriterionDef, Landmark, ScoreResult, ShapeDef } from '../types'
import { DraggableStillOverlay } from './DraggableStillOverlay'

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
  /** Hold-challenge stopwatch burned in next to the live score. */
  holdSeconds?: number | null
  holdSecondsRef?: { current: number | null }
  /** merged = one side-view line (Tasks 2 hold). split = left and right. */
  jointMode?: JointDrawMode
  className?: string
  /** Fill the parent instead of sizing to the video aspect. */
  fill?: boolean
  /** Cap the camera so homework / coach lists stay usable. */
  compact?: boolean
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
  holdSeconds = null,
  holdSecondsRef,
  jointMode = 'split',
  className = '',
  fill = false,
  compact = false,
}: Props) {
  const localHoldRef = useRef<number | null>(null)

  useEffect(() => {
    localHoldRef.current = holdSeconds
  }, [holdSeconds])

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
        if (jointMode === 'merged') {
          ctx.restore()
          drawPoseOverlay(ctx, landmarks, {
            width: canvas.width,
            height: canvas.height,
            mirror,
            mode: 'merged',
            showAngles,
            lineColor: overlayLineColor(score),
          })
          ctx.save()
        } else {
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
      }
      ctx.restore()

      if (burnInHud && score) {
        drawGradeHud(
          ctx,
          canvas.width,
          canvas.height,
          score.overall,
          shape?.name ?? 'Live score',
          (holdSecondsRef ?? localHoldRef).current,
        )
      }
      raf = requestAnimationFrame(draw)
    }

    raf = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(raf)
  }, [videoRef, canvasRef, landmarks, mirror, showAngles, running, demoMode, shape, score, burnInHud, holdSecondsRef, jointMode])

  return (
    <div
      className={`relative w-full overflow-hidden bg-black shadow-lg ${
        fill
          ? 'h-full rounded-none border-0'
          : compact
            ? 'max-h-[min(38vh,280px)] rounded-2xl border border-[var(--panel-border)]'
            : 'rounded-2xl border border-[var(--panel-border)]'
      } ${className}`}
    >
      <video ref={videoRef} className="hidden" playsInline muted autoPlay />
      <canvas
        ref={canvasRef}
        className={`block bg-[#0a0e12] ${
          fill
            ? 'h-full w-full object-contain'
            : compact
              ? 'mx-auto max-h-[min(38vh,280px)] w-full object-contain'
              : 'h-auto w-full'
        }`}
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
      <DraggableStillOverlay />
      {overlay}
    </div>
  )
}
