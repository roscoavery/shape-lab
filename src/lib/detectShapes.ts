/**
 * Auto-detect which gym shape each person on camera is closest to.
 * Used on Today so the coach does not have to pick a shape first.
 */

import { getShape } from '../config/shapes'
import type { Landmark, ScoreResult, ShapeDef } from '../types'
import { LM } from './landmarks'
import {
  handstandLooksRight,
  leverLooksRight,
  scoreShape,
  snapshotLooksRight,
} from './scoring'

/** Floor shapes that look distinct enough to name on a live class camera. */
export const AUTO_DETECT_IDS = [
  'lever',
  'lunge_start',
  'lunge_land',
  'handstand',
  'hollow_arms_down',
  'superman',
  'side_plank',
  'wall_handstand',
  'rainbow_bridge',
  'long_bridge',
  'passe',
  'mountain_climber',
  'c_shape',
  'candlestick',
  'seated_pike',
  'tuck_open_shoulders',
  'zombie',
] as const

export type DetectedPerson = {
  id: string
  landmarks: Landmark[]
  shape: ShapeDef | null
  score: ScoreResult | null
  /** Short line on the picture: "Lever detected" or "Lunge  61". */
  headline: string
  confident: boolean
}

function hipX(lm: Landmark[]): number {
  const a = lm[LM.LEFT_HIP]
  const b = lm[LM.RIGHT_HIP]
  if (a && b) return (a.x + b.x) / 2
  return a?.x ?? b?.x ?? 0.5
}

function looksLike(id: string, score: ScoreResult): boolean {
  if (id === 'lever') return leverLooksRight(score)
  if (id === 'handstand' || id === 'wall_handstand') return handstandLooksRight(score)
  if (snapshotLooksRight(id, score) && score.overall >= 62) return true
  return Boolean(score.holdReady && score.overall >= 64)
}

function rank(id: string, score: ScoreResult): number {
  let n = score.overall
  if (looksLike(id, score)) n += 10
  if (id === 'lever' && leverLooksRight(score)) n += 6
  if (id === 'lunge_start' || id === 'lunge_land') {
    const knee = score.criteria.find((c) => c.id === 'front_knee')?.score ?? 0
    if (knee >= 40) n += 4
  }
  return n
}

export function classifyOnePose(landmarks: Landmark[]): Omit<DetectedPerson, 'id'> {
  let best: { shape: ShapeDef; score: ScoreResult; rank: number } | null = null
  let second = 0
  for (const id of AUTO_DETECT_IDS) {
    const shape = getShape(id)
    if (!shape) continue
    const score = scoreShape(landmarks, shape, null, { stance: 'auto', profileOk: true })
    const r = rank(id, score)
    if (!best || r > best.rank) {
      second = best?.rank ?? 0
      best = { shape, score, rank: r }
    } else if (r > second) {
      second = r
    }
  }

  if (!best || best.score.overall < 48) {
    return { landmarks, shape: null, score: null, headline: '', confident: false }
  }
  if (best.score.overall < 62 && best.rank - second < 6) {
    return { landmarks, shape: null, score: null, headline: '', confident: false }
  }

  const confident = looksLike(best.shape.id, best.score) || best.score.overall >= 75
  const name = best.shape.name
  const headline = confident
    ? `${name} detected`
    : `${name}  ${best.score.overall}`
  return {
    landmarks,
    shape: best.shape,
    score: best.score,
    headline,
    confident,
  }
}

export function classifyPoses(poses: Landmark[][]): DetectedPerson[] {
  const ordered = poses
    .map((lm, i) => ({ lm, x: hipX(lm), i }))
    .sort((a, b) => a.x - b.x)
  return ordered.map((row, slot) => {
    const hit = classifyOnePose(row.lm)
    return { ...hit, id: `p${slot}` }
  })
}

export function personAnchor(lm: Landmark[]): { x: number; y: number } {
  const hips = [lm[LM.LEFT_HIP], lm[LM.RIGHT_HIP]].filter(Boolean)
  const feet = [lm[LM.LEFT_ANKLE], lm[LM.RIGHT_ANKLE], lm[LM.LEFT_FOOT_INDEX], lm[LM.RIGHT_FOOT_INDEX]].filter(
    (p) => p && (p.visibility ?? 1) > 0.25,
  )
  const x =
    hips.length > 0 ? hips.reduce((s, p) => s + p!.x, 0) / hips.length : 0.5
  const maxFoot = feet.reduce((m, p) => Math.max(m, p!.y), 0)
  const hipY = hips.length > 0 ? hips.reduce((s, p) => s + p!.y, 0) / hips.length : 0.55
  const y = Math.min(0.96, Math.max(maxFoot + 0.03, hipY + 0.16))
  return { x, y }
}
