/**
 * Draws mirrored video + skeleton overlay + optional live angle labels
 */

import { useEffect, useRef, type ReactNode } from 'react'
import { jointAngle, VISIBILITY_DRAW } from '../lib/angles'
import { LM, POSE_EDGES } from '../lib/landmarks'
import { isLungeArmHold, isShoulderCriterionId, isSoftShoulderShape } from '../lib/scoring'
import {
  drawTrackDebug,
  getLastTrackDebug,
  isTrackDebugEnabled,
  jointDrawColor,
} from '../lib/athleteTrack'
import { syncCanvasToVideo } from '../lib/poseCoords'
import { isPoseDebugEnabled } from '../lib/poseSubject'
import {
  drawCenterOfMass,
  drawGradeHud,
  drawPoseOverlay,
  edgePlausible,
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
  /** Hold challenge: live score stays 0 until the clock is running. */
  holdScoreGate?: boolean
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
  { label: 'L ankle', points: [LM.LEFT_KNEE, LM.LEFT_ANKLE, LM.LEFT_FOOT_INDEX], color: '#f0c400' },
  { label: 'R ankle', points: [LM.RIGHT_KNEE, LM.RIGHT_ANKLE, LM.RIGHT_FOOT_INDEX], color: '#f0c400' },
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
  holdScoreGate = false,
  jointMode = 'split',
  className = '',
  fill = false,
  compact = false,
}: Props) {
  const localHoldRef = useRef<number | null>(null)
  const landmarksRef = useRef(landmarks)
  const scoreRef = useRef(score)
  const shapeRef = useRef(shape)
  const runningRef = useRef(running)
  const mirrorRef = useRef(mirror)
  const showAnglesRef = useRef(showAngles)
  const jointModeRef = useRef(jointMode)
  landmarksRef.current = landmarks
  scoreRef.current = score
  shapeRef.current = shape
  runningRef.current = running
  mirrorRef.current = mirror
  showAnglesRef.current = showAngles
  jointModeRef.current = jointMode

  useEffect(() => {
    localHoldRef.current = holdSeconds
  }, [holdSeconds])

  useEffect(() => {
    let raf = 0

    const draw = () => {
      const video = videoRef.current
      const canvas = canvasRef.current
      const landmarks = landmarksRef.current
      const score = scoreRef.current
      const shape = shapeRef.current
      const running = runningRef.current
      const mirror = mirrorRef.current
      const showAngles = showAnglesRef.current
      const jointMode = jointModeRef.current
      if (!canvas) {
        raf = requestAnimationFrame(draw)
        return
      }

      // Demo mode uses a fixed canvas size; live mode follows the video.
      const hasVideo = Boolean(running && video && video.videoWidth)
      if (hasVideo && video) {
        syncCanvasToVideo(canvas, video)
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
        if (jointMode === 'merged' || jointMode === 'auto') {
          ctx.restore()
          drawPoseOverlay(ctx, landmarks, {
            width: canvas.width,
            height: canvas.height,
            mirror,
            mode: jointMode,
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
            if (!edgePlausible(A, B)) continue
            const color = edgeTint(a, b, shape, score)
            ctx.lineWidth = Math.max(5, canvas.width * 0.006)
            ctx.strokeStyle = color
            ctx.beginPath()
            ctx.moveTo(A.x * canvas.width, A.y * canvas.height)
            ctx.lineTo(B.x * canvas.width, B.y * canvas.height)
            ctx.stroke()
          }

          const flags = isTrackDebugEnabled() ? getLastTrackDebug()?.flags : null
          for (let i = LM.LEFT_SHOULDER; i < landmarks.length; i++) {
            const lm = landmarks[i]
            if (!lm || (lm.visibility ?? 1) < VISIBILITY_DRAW) continue
            ctx.beginPath()
            ctx.fillStyle = flags ? jointDrawColor(flags[i]) : '#ffffff'
            ctx.arc(
              lm.x * canvas.width,
              lm.y * canvas.height,
              Math.max(4, canvas.width * 0.006),
              0,
              Math.PI * 2,
            )
            ctx.fill()
          }

          drawCenterOfMass(ctx, landmarks, canvas.width, canvas.height, false)
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

      if (isPoseDebugEnabled() || isTrackDebugEnabled()) {
        const track = getLastTrackDebug()
        if (track) {
          ctx.save()
          if (mirror) {
            ctx.translate(canvas.width, 0)
            ctx.scale(-1, 1)
          }
          drawTrackDebug(ctx, track, canvas.width, canvas.height)
          ctx.restore()
          const lines = [
            `${track.state}  ${track.pickReason}`,
            `model ${track.model}  ${track.quality}  ${track.candidates} cand`,
            `conf ${track.poseConf.toFixed(2)}  cont ${track.continuity.toFixed(2)}  anat ${track.anatomy.toFixed(2)}`,
            `fps ${track.fps}  infer ${track.inferMs.toFixed(1)}ms  motion ${track.motion.toFixed(2)}`,
            ...track.rejected.slice(0, 3).map((r) => `reject ${r.reason}`),
          ]
          ctx.save()
          ctx.font = `600 ${Math.max(12, canvas.width * 0.016)}px ui-monospace, monospace`
          ctx.textAlign = 'left'
          const pad = 8
          const lineH = Math.max(16, canvas.width * 0.02)
          const boxW = Math.min(canvas.width - 16, 440)
          ctx.fillStyle = 'rgba(0,0,0,0.62)'
          ctx.fillRect(8, 8, boxW, pad * 2 + lineH * lines.length)
          ctx.fillStyle = '#7dffc8'
          lines.forEach((line, i) => {
            ctx.fillText(line, 16, 8 + pad + lineH * (i + 0.75))
          })
          ctx.restore()
        }
      }

      if (burnInHud && score) {
        const clock = (holdSecondsRef ?? localHoldRef).current
        drawGradeHud(
          ctx,
          canvas.width,
          canvas.height,
          holdScoreGate && clock == null ? 0 : score.overall,
          shape?.name ?? 'Live score',
          clock,
        )
      }
      raf = requestAnimationFrame(draw)
    }

    raf = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(raf)
  }, [videoRef, canvasRef, demoMode, burnInHud, holdSecondsRef, holdScoreGate])

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
            Start the camera for live coaching and shape scoring.
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
