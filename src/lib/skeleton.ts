/**
 * Pose overlay for live camera and hold-analysis replay.
 * Split = left and right chains (front view).
 * Merged = one side-view line: hands, shoulders, hips, knees, ankles, toes.
 */

import { VISIBILITY_DRAW, jointAngle } from './angles'
import { LM, POSE_EDGES } from './landmarks'
import type { Landmark, ScoreResult } from '../types'

export type JointDrawMode = 'merged' | 'split'

const MODE_KEY = 'shape-lab.hold-joint-mode'

export function loadJointDrawMode(): JointDrawMode {
  try {
    return localStorage.getItem(MODE_KEY) === 'split' ? 'split' : 'merged'
  } catch {
    return 'merged'
  }
}

export function saveJointDrawMode(mode: JointDrawMode): void {
  try {
    localStorage.setItem(MODE_KEY, mode)
  } catch {
    /* private mode */
  }
}

function visOk(p: Landmark | undefined, min = 0.14): p is Landmark {
  if (!p) return false
  return (p.visibility ?? 1) >= min
}

/** Visibility-weighted midpoint of a left/right pair (or the visible one). */
export function mergePair(a?: Landmark, b?: Landmark, min = 0.14): Landmark | null {
  const A = visOk(a, min) ? a : null
  const B = visOk(b, min) ? b : null
  if (A && B) {
    const wa = A.visibility ?? 1
    const wb = B.visibility ?? 1
    const w = wa + wb
    return {
      x: (A.x * wa + B.x * wb) / w,
      y: (A.y * wa + B.y * wb) / w,
      z: (A.z * wa + B.z * wb) / w,
      visibility: Math.max(wa, wb),
    }
  }
  return A ?? B ?? null
}

export type MergedJoints = {
  hands: Landmark
  shoulders: Landmark
  hips: Landmark
  knees: Landmark
  ankles: Landmark
  toes: Landmark
}

export function mergeSideJoints(lm: Landmark[] | null | undefined): MergedJoints | null {
  if (!lm || lm.length < 33) return null
  const hands = mergePair(lm[LM.LEFT_WRIST], lm[LM.RIGHT_WRIST], 0.12)
  const shoulders = mergePair(lm[LM.LEFT_SHOULDER], lm[LM.RIGHT_SHOULDER], 0.12)
  const hips = mergePair(lm[LM.LEFT_HIP], lm[LM.RIGHT_HIP], 0.12)
  if (!hands || !shoulders || !hips) return null
  const knees = mergePair(lm[LM.LEFT_KNEE], lm[LM.RIGHT_KNEE], 0.1) ?? hips
  const ankles = mergePair(lm[LM.LEFT_ANKLE], lm[LM.RIGHT_ANKLE], 0.1) ?? knees
  const toes =
    mergePair(lm[LM.LEFT_FOOT_INDEX], lm[LM.RIGHT_FOOT_INDEX], 0.08) ?? ankles
  return { hands, shoulders, hips, knees, ankles, toes }
}

const MERGED_ORDER: (keyof MergedJoints)[] = [
  'hands',
  'shoulders',
  'hips',
  'knees',
  'ankles',
  'toes',
]

const MERGED_ANGLES: { label: string; keys: [keyof MergedJoints, keyof MergedJoints, keyof MergedJoints]; color: string }[] =
  [
    { label: 'Shoulders', keys: ['hands', 'shoulders', 'hips'], color: '#f0b429' },
    { label: 'Hips', keys: ['shoulders', 'hips', 'knees'], color: '#7db7ff' },
    { label: 'Knees', keys: ['hips', 'knees', 'ankles'], color: '#c4a5ff' },
  ]

const SPLIT_ANGLES: { label: string; points: [number, number, number]; color: string }[] = [
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

export function formatHoldClock(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const sec = seconds - m * 60
  if (m > 0) return `${m}:${sec.toFixed(1).padStart(4, '0')}`
  return `${sec.toFixed(1)}s`
}

function toPx(p: Landmark, width: number, height: number, mirror: boolean): { x: number; y: number } {
  return {
    x: mirror ? (1 - p.x) * width : p.x * width,
    y: p.y * height,
  }
}

function drawDot(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
) {
  ctx.beginPath()
  ctx.fillStyle = '#ffffff'
  ctx.arc(x, y, r, 0, Math.PI * 2)
  ctx.fill()
}

function drawMerged(
  ctx: CanvasRenderingContext2D,
  joints: MergedJoints,
  width: number,
  height: number,
  mirror: boolean,
  showAngles: boolean,
  lineColor: string,
) {
  const pts = MERGED_ORDER.map((k) => joints[k])
  const px = pts.map((p) => toPx(p, width, height, mirror))
  ctx.lineJoin = 'round'
  ctx.lineCap = 'round'
  ctx.strokeStyle = lineColor
  ctx.lineWidth = Math.max(6, width * 0.008)
  ctx.beginPath()
  ctx.moveTo(px[0]!.x, px[0]!.y)
  for (let i = 1; i < px.length; i++) ctx.lineTo(px[i]!.x, px[i]!.y)
  ctx.stroke()
  const r = Math.max(5, width * 0.008)
  for (const p of px) drawDot(ctx, p.x, p.y, r)

  if (!showAngles) return
  ctx.font = `600 ${Math.max(13, width * 0.02)}px sans-serif`
  ctx.textAlign = 'left'
  const fake: Landmark[] = pts
  for (const readout of MERGED_ANGLES) {
    const ia = MERGED_ORDER.indexOf(readout.keys[0])
    const ib = MERGED_ORDER.indexOf(readout.keys[1])
    const ic = MERGED_ORDER.indexOf(readout.keys[2])
    const ang = jointAngle(fake, ia, ib, ic)
    if (ang === null) continue
    const at = px[ib]!
    const text = `${readout.label} ${Math.round(ang)}°`
    const pad = 4
    const tw = ctx.measureText(text).width
    ctx.fillStyle = 'rgba(0,0,0,0.55)'
    ctx.fillRect(at.x + 8 - pad, at.y - 16 - pad, tw + pad * 2, 18 + pad)
    ctx.fillStyle = readout.color
    ctx.fillText(text, at.x + 8, at.y - 4)
  }
}

function drawSplit(
  ctx: CanvasRenderingContext2D,
  landmarks: Landmark[],
  width: number,
  height: number,
  mirror: boolean,
  showAngles: boolean,
  lineColor: string,
) {
  ctx.lineJoin = 'round'
  ctx.lineCap = 'round'
  for (const [a, b] of POSE_EDGES) {
    const A = landmarks[a]
    const B = landmarks[b]
    if (!A || !B) continue
    if ((A.visibility ?? 1) < VISIBILITY_DRAW || (B.visibility ?? 1) < VISIBILITY_DRAW) continue
    const pa = toPx(A, width, height, mirror)
    const pb = toPx(B, width, height, mirror)
    ctx.lineWidth = Math.max(5, width * 0.006)
    ctx.strokeStyle = lineColor
    ctx.beginPath()
    ctx.moveTo(pa.x, pa.y)
    ctx.lineTo(pb.x, pb.y)
    ctx.stroke()
  }
  const r = Math.max(4, width * 0.006)
  for (const lm of landmarks) {
    if ((lm.visibility ?? 1) < VISIBILITY_DRAW) continue
    const p = toPx(lm, width, height, mirror)
    drawDot(ctx, p.x, p.y, r)
  }
  if (!showAngles) return
  ctx.font = `600 ${Math.max(12, width * 0.018)}px sans-serif`
  ctx.textAlign = 'left'
  for (const readout of SPLIT_ANGLES) {
    const ang = jointAngle(landmarks, ...readout.points)
    if (ang === null) continue
    const joint = landmarks[readout.points[1]]
    if (!joint || (joint.visibility ?? 1) < VISIBILITY_DRAW) continue
    const p = toPx(joint, width, height, mirror)
    const text = `${readout.label} ${Math.round(ang)}°`
    const pad = 4
    const tw = ctx.measureText(text).width
    ctx.fillStyle = 'rgba(0,0,0,0.55)'
    ctx.fillRect(p.x + 8 - pad, p.y - 16 - pad, tw + pad * 2, 18 + pad)
    ctx.fillStyle = readout.color
    ctx.fillText(text, p.x + 8, p.y - 4)
  }
}

export function drawPoseOverlay(
  ctx: CanvasRenderingContext2D,
  landmarks: Landmark[] | null,
  opts: {
    width: number
    height: number
    mirror: boolean
    mode: JointDrawMode
    showAngles?: boolean
    lineColor?: string
  },
) {
  if (!landmarks) return
  const color = opts.lineColor ?? 'rgba(45, 212, 168, 0.92)'
  const showAngles = opts.showAngles !== false
  if (opts.mode === 'merged') {
    const merged = mergeSideJoints(landmarks)
    if (merged) {
      drawMerged(ctx, merged, opts.width, opts.height, opts.mirror, showAngles, color)
      return
    }
  }
  drawSplit(ctx, landmarks, opts.width, opts.height, opts.mirror, showAngles, color)
}

export function drawGradeHud(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  overall: number,
  label: string,
  holdSeconds?: number | null,
) {
  const cx = width / 2
  const y = height * 0.025
  const scoreText = String(overall)
  const scorePx = Math.max(40, Math.round(width * 0.072))
  const labelPx = Math.max(13, Math.round(width * 0.022))
  const clockPx = Math.max(18, Math.round(width * 0.038))
  const clockText = holdSeconds != null ? formatHoldClock(holdSeconds) : null
  ctx.save()
  ctx.textAlign = 'center'
  ctx.textBaseline = 'top'
  ctx.font = `800 ${scorePx}px ui-sans-serif, system-ui, sans-serif`
  const scoreW = ctx.measureText(scoreText).width
  ctx.font = `600 ${labelPx}px ui-sans-serif, system-ui, sans-serif`
  const labelW = ctx.measureText(label).width
  let clockW = 0
  if (clockText) {
    ctx.font = `800 ${clockPx}px ui-sans-serif, system-ui, sans-serif`
    clockW = ctx.measureText(clockText).width
  }
  const boxW = Math.max(scoreW, labelW, clockW) + width * 0.05
  const boxH = scorePx + labelPx + (clockText ? clockPx + height * 0.012 : 0) + height * 0.035
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
  if (clockText) {
    ctx.font = `800 ${clockPx}px ui-sans-serif, system-ui, sans-serif`
    ctx.fillStyle = '#f0b429'
    ctx.fillText(clockText, cx, y + scorePx + labelPx + height * 0.018)
  }
  ctx.restore()
}

export function overlayLineColor(score: ScoreResult | null | undefined): string {
  if (!score) return 'rgba(45, 212, 168, 0.92)'
  const n = score.overall
  if (n >= 80) return '#2dd4a8'
  if (n >= 65) return '#e4c35a'
  return '#f07178'
}
