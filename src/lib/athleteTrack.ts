/**
 * Athlete tracker for the Tasks / Handstand Hold camera.
 * Camera → MediaPipe candidates → pick one human → lock → One Euro
 * → bone gate → publish. Furniture cannot become a second skeleton.
 */

import { LandmarkEuro } from './oneEuro'
import { LM } from './landmarks'
import type { Landmark } from '../types'
import { evaluateHandstandGeometry } from './handstandDetect'
import {
  BackgroundMotion,
  expandBox,
  looksInverted,
  looksLikeBackgroundProp,
  poseBox,
  poseLooksHuman,
  sanitizePose,
  torsoCenter,
  torsoScale,
  type NormBox,
} from './poseSubject'

export type TrackState =
  | 'searching'
  | 'acquiring'
  | 'locked'
  | 'uncertain'
  | 'reacquiring'
  | 'lost'

export type PoseQuality = 'fast' | 'balanced' | 'accurate'

export type JointFlag = 'accepted' | 'smoothed' | 'predicted' | 'outlier'

export type TrackDebug = {
  state: TrackState
  quality: PoseQuality
  model: string
  candidates: number
  fps: number
  inferMs: number
  poseConf: number
  continuity: number
  anatomy: number
  motion: number
  holdReady: boolean
  pickReason: string
  rejected: Array<{ box: NormBox; reason: string }>
  box: NormBox | null
  roi: NormBox | null
  flags: JointFlag[]
  predicted: boolean
}

export type TrackFrame = {
  raw: Landmark[] | null
  stabilized: Landmark[] | null
  state: TrackState
  debug: TrackDebug
}

const BODY = [
  LM.LEFT_SHOULDER,
  LM.RIGHT_SHOULDER,
  LM.LEFT_ELBOW,
  LM.RIGHT_ELBOW,
  LM.LEFT_WRIST,
  LM.RIGHT_WRIST,
  LM.LEFT_HIP,
  LM.RIGHT_HIP,
  LM.LEFT_KNEE,
  LM.RIGHT_KNEE,
  LM.LEFT_ANKLE,
  LM.RIGHT_ANKLE,
]

const BONES: Array<[number, number, number]> = [
  [LM.LEFT_SHOULDER, LM.RIGHT_SHOULDER, 0.42],
  [LM.LEFT_HIP, LM.RIGHT_HIP, 0.38],
  [LM.LEFT_SHOULDER, LM.LEFT_HIP, 0.48],
  [LM.RIGHT_SHOULDER, LM.RIGHT_HIP, 0.48],
  [LM.LEFT_SHOULDER, LM.LEFT_ELBOW, 0.3],
  [LM.RIGHT_SHOULDER, LM.RIGHT_ELBOW, 0.3],
  [LM.LEFT_ELBOW, LM.LEFT_WRIST, 0.3],
  [LM.RIGHT_ELBOW, LM.RIGHT_WRIST, 0.3],
  [LM.LEFT_HIP, LM.LEFT_KNEE, 0.42],
  [LM.RIGHT_HIP, LM.RIGHT_KNEE, 0.42],
  [LM.LEFT_KNEE, LM.LEFT_ANKLE, 0.42],
  [LM.RIGHT_KNEE, LM.RIGHT_ANKLE, 0.42],
]

const CHILD_OF: Array<[number, number]> = [
  [LM.LEFT_ELBOW, LM.LEFT_SHOULDER],
  [LM.RIGHT_ELBOW, LM.RIGHT_SHOULDER],
  [LM.LEFT_WRIST, LM.LEFT_ELBOW],
  [LM.RIGHT_WRIST, LM.RIGHT_ELBOW],
  [LM.LEFT_KNEE, LM.LEFT_HIP],
  [LM.RIGHT_KNEE, LM.RIGHT_HIP],
  [LM.LEFT_ANKLE, LM.LEFT_KNEE],
  [LM.RIGHT_ANKLE, LM.RIGHT_KNEE],
  [LM.LEFT_HEEL, LM.LEFT_ANKLE],
  [LM.RIGHT_HEEL, LM.RIGHT_ANKLE],
  [LM.LEFT_FOOT_INDEX, LM.LEFT_ANKLE],
  [LM.RIGHT_FOOT_INDEX, LM.RIGHT_ANKLE],
]

const ACQUIRE_MS = 180
const UNCERTAIN_MS = 320
const REACQUIRE_MS = 900
const LOST_MS = 1400
const OUTLIER = 0.28

function vis(p: Landmark | undefined, min = 0.28): p is Landmark {
  return Boolean(p) && Number.isFinite(p.x) && Number.isFinite(p.y) && (p.visibility ?? 1) >= min
}

function dist(a: { x: number; y: number }, b: { x: number; y: number }): number {
  return Math.hypot(a.x - b.x, a.y - b.y)
}

function cloneLm(lm: Landmark[]): Landmark[] {
  return lm.map((p) => ({ x: p.x, y: p.y, z: p.z, visibility: p.visibility }))
}

function meanVis(lm: Landmark[], idx = BODY): number {
  let s = 0
  let n = 0
  for (const i of idx) {
    const p = lm[i]
    if (!p) continue
    s += p.visibility ?? 1
    n += 1
  }
  return n ? s / n : 0
}

function completeCount(lm: Landmark[], min = 0.4): number {
  return BODY.reduce((n, i) => n + (vis(lm[i], min) ? 1 : 0), 0)
}

/** Drop limbs that would stretch across the room. */
export function clipImpossibleBones(lm: Landmark[]): { lm: Landmark[]; flags: JointFlag[]; broken: number } {
  const out = cloneLm(lm)
  const flags: JointFlag[] = out.map(() => 'accepted')
  let broken = 0
  const foot = new Set([
    LM.LEFT_HEEL,
    LM.RIGHT_HEEL,
    LM.LEFT_FOOT_INDEX,
    LM.RIGHT_FOOT_INDEX,
  ])
  for (const [child, parent] of CHILD_OF) {
    const c = out[child]
    const p = out[parent]
    if (!c || !p) continue
    if (!vis(p, 0.32) || !vis(c, 0.32)) continue
    const max = BONES.find((b) => (b[0] === parent && b[1] === child) || (b[0] === child && b[1] === parent))?.[2] ?? 0.32
    if (dist(c, p) <= max) continue
    c.visibility = 0
    flags[child] = 'outlier'
    if (!foot.has(child)) broken += 1
  }
  for (const [a, b, max] of BONES) {
    const A = out[a]
    const B = out[b]
    if (!A || !B || !vis(A, 0.32) || !vis(B, 0.32)) continue
    if (dist(A, B) <= max) continue
    const weak = (A.visibility ?? 1) <= (B.visibility ?? 1) ? A : B
    const wi = weak === A ? a : b
    // Never zero the torso just because a limb is wild.
    if (wi === LM.LEFT_SHOULDER || wi === LM.RIGHT_SHOULDER || wi === LM.LEFT_HIP || wi === LM.RIGHT_HIP) {
      continue
    }
    weak.visibility = 0
    flags[wi] = 'outlier'
    if (!foot.has(wi)) broken += 1
  }
  return { lm: out, flags, broken }
}

function anatomyScore(lm: Landmark[]): number {
  const { broken } = clipImpossibleBones(lm)
  const complete = completeCount(lm, 0.35) / BODY.length
  const visScore = Math.min(1, meanVis(lm) / 0.62)
  return Math.max(0, 0.5 * complete + 0.35 * visScore - 0.12 * broken)
}

function emptyDebug(over: Partial<TrackDebug> = {}): TrackDebug {
  return {
    state: 'searching',
    quality: 'balanced',
    model: 'lite',
    candidates: 0,
    fps: 0,
    inferMs: 0,
    poseConf: 0,
    continuity: 0,
    anatomy: 0,
    motion: 0,
    holdReady: false,
    pickReason: 'none',
    rejected: [],
    box: null,
    roi: null,
    flags: [],
    predicted: false,
    ...over,
  }
}

export function loadPoseQuality(): PoseQuality {
  if (typeof window === 'undefined') return 'balanced'
  try {
    const q = new URLSearchParams(window.location.search).get('poseQuality')
    if (q === 'fast' || q === 'balanced' || q === 'accurate') return q
    const stored = window.localStorage.getItem('shape-lab.poseQuality')
    if (stored === 'fast' || stored === 'balanced' || stored === 'accurate') return stored
  } catch {
    /* private mode */
  }
  return 'balanced'
}

export function isTrackDebugEnabled(): boolean {
  if (typeof window === 'undefined') return false
  try {
    const q = new URLSearchParams(window.location.search)
    if (q.get('poseDebug') === '1' || q.get('holdDebug') === '1' || q.get('trackDebug') === '1') {
      return true
    }
    return (
      window.localStorage.getItem('shape-lab.poseDebug') === '1' ||
      window.localStorage.getItem('shape-lab.holdDebug') === '1' ||
      window.localStorage.getItem('shape-lab.trackDebug') === '1'
    )
  } catch {
    return false
  }
}

let lastDebug: TrackDebug | null = null

export function getLastTrackDebug(): TrackDebug | null {
  return lastDebug
}

export class AthleteTracker {
  private state: TrackState = 'searching'
  private euro = new LandmarkEuro(33, 1.2, 0.09)
  private lastRaw: Landmark[] | null = null
  private lastStable: Landmark[] | null = null
  private lastCenter: { x: number; y: number } | null = null
  private lastVel = { x: 0, y: 0 }
  private lastBox: NormBox | null = null
  private lastScale: number | null = null
  private lastSeen = 0
  private acquireSince = 0
  private flags: JointFlag[] = []
  private quality: PoseQuality = 'balanced'
  private model = 'lite'
  private inferMs = 0
  private fps = 0
  private fpsN = 0
  private fpsT = 0

  setMeta(quality: PoseQuality, model: string, inferMs: number) {
    this.quality = quality
    this.model = model
    this.inferMs = inferMs
  }

  reset() {
    this.state = 'searching'
    this.euro.reset()
    this.lastRaw = null
    this.lastStable = null
    this.lastCenter = null
    this.lastVel = { x: 0, y: 0 }
    this.lastBox = null
    this.lastScale = null
    this.lastSeen = 0
    this.acquireSince = 0
    this.flags = []
    lastDebug = emptyDebug({ pickReason: 'reset' })
  }

  private roi(): NormBox | null {
    if (!this.lastBox) return null
    const speed = Math.hypot(this.lastVel.x, this.lastVel.y)
    const kick = this.lastStable && looksInverted(this.lastStable) ? 0.12 : 0
    return expandBox(this.lastBox, 0.18 + Math.min(0.22, speed * 0.8) + kick, 0.26 + Math.min(0.3, speed) + kick)
  }

  private scoreCandidate(
    raw: Landmark[],
    now: number,
    motion: BackgroundMotion | null,
  ): { lm: Landmark[]; flags: JointFlag[]; score: number; anatomy: number; motion: number; continuity: number; reason: string | null } {
    const cleaned = clipImpossibleBones(sanitizePose(raw, this.lastStable))
    const lm = cleaned.lm
    const anatomy = anatomyScore(lm)
    const box = poseBox(lm, 0.2)
    const heat = motion?.scoreBox(box) ?? 0
    const human = poseLooksHuman(lm) || looksInverted(lm)
    const complete = completeCount(lm, 0.32)

    if (looksLikeBackgroundProp(lm) && !looksInverted(lm)) {
      return { lm, flags: cleaned.flags, score: 0, anatomy, motion: heat, continuity: 0, reason: 'pole / stand' }
    }
    if (looksLikeBackgroundProp(lm) && looksInverted(lm) && heat < 0.12 && complete < 9) {
      return { lm, flags: cleaned.flags, score: 0, anatomy, motion: heat, continuity: 0, reason: 'background stick' }
    }
    if (cleaned.broken >= 5 && complete < 8) {
      return { lm, flags: cleaned.flags, score: 0, anatomy, motion: heat, continuity: 0, reason: 'impossible skeleton' }
    }
    if (!human && complete < 7) {
      return { lm, flags: cleaned.flags, score: 0, anatomy, motion: heat, continuity: 0, reason: 'not a body' }
    }
    if (
      !this.lastStable &&
      motion?.ready &&
      box &&
      heat < 0.08 &&
      !looksInverted(lm)
    ) {
      return { lm, flags: cleaned.flags, score: 0, anatomy, motion: heat, continuity: 0, reason: 'static object' }
    }

    const center = torsoCenter(lm)
    const scale = torsoScale(lm)
    const comingDown =
      Boolean(this.lastStable && looksInverted(this.lastStable)) &&
      !looksInverted(lm) &&
      (poseLooksHuman(lm) || complete >= 8)
    let continuity = 0.35
    if (comingDown) {
      continuity = 0.62
    } else if (this.lastCenter && center && this.lastSeen) {
      const dt = Math.max(0.016, (now - this.lastSeen) / 1000)
      const predicted = {
        x: this.lastCenter.x + this.lastVel.x * dt,
        y: this.lastCenter.y + this.lastVel.y * dt,
      }
      const jump = dist(center, predicted)
      const stayInv = Boolean(this.lastStable && looksInverted(this.lastStable) && looksInverted(lm))
      if (jump > (stayInv ? 0.55 : 0.42)) {
        return { lm, flags: cleaned.flags, score: 0, anatomy, motion: heat, continuity: 0, reason: 'torso jump' }
      }
      continuity = Math.max(0, 1 - jump / 0.28)
      const roi = this.roi()
      if (
        roi &&
        (this.state === 'locked' || this.state === 'uncertain' || this.state === 'reacquiring') &&
        (center.x < roi.x - 0.04 ||
          center.y < roi.y - 0.04 ||
          center.x > roi.x + roi.w + 0.04 ||
          center.y > roi.y + roi.h + 0.04)
      ) {
        return { lm, flags: cleaned.flags, score: 0.05, anatomy, motion: heat, continuity, reason: 'outside ROI' }
      }
    }
    if (this.lastScale && scale) {
      const ratio = scale / this.lastScale
      if (ratio > 2.4 || ratio < 0.4) {
        return { lm, flags: cleaned.flags, score: 0, anatomy, motion: heat, continuity, reason: 'scale jump' }
      }
    }

    const locked = this.state === 'locked' || this.state === 'uncertain'
    const hs = looksInverted(lm) ? evaluateHandstandGeometry(lm).confidence : 0
    const score =
      (locked ? 0.38 : 0.16) * continuity +
      0.24 * anatomy +
      0.14 * Math.min(1, complete / 10) +
      0.12 * heat +
      0.1 * Math.min(1, meanVis(lm) / 0.6) +
      0.24 * hs
    return { lm, flags: cleaned.flags, score, anatomy, motion: heat, continuity, reason: null }
  }

  private accept(lm: Landmark[], now: number, flags: JointFlag[]) {
    const center = torsoCenter(lm)
    if (this.lastCenter && center && this.lastSeen) {
      const dt = Math.max(0.016, (now - this.lastSeen) / 1000)
      const vx = (center.x - this.lastCenter.x) / dt
      const vy = (center.y - this.lastCenter.y) / dt
      this.lastVel = { x: this.lastVel.x * 0.55 + vx * 0.45, y: this.lastVel.y * 0.55 + vy * 0.45 }
    }
    this.lastRaw = lm
    this.lastCenter = center
    this.lastBox = poseBox(lm)
    this.lastScale = torsoScale(lm) ?? this.lastScale
    this.lastSeen = now
    this.flags = flags
  }

  private predict(now: number): Landmark[] | null {
    if (!this.lastStable) return null
    const dt = Math.min(0.2, (now - this.lastSeen) / 1000)
    const out = cloneLm(this.lastStable)
    const ox = this.lastVel.x * dt * 0.35
    const oy = this.lastVel.y * dt * 0.35
    for (const p of out) {
      p.x += ox
      p.y += oy
      p.visibility = Math.min(p.visibility ?? 1, 0.42)
    }
    this.flags = out.map(() => 'predicted')
    return out
  }

  private stabilize(lm: Landmark[], now: number, flags: JointFlag[]): Landmark[] {
    const gated = lm.map((p, i) => {
      const prev = this.lastStable?.[i]
      if (!prev || !vis(prev, 0.15) || !vis(p, 0.15)) return p
      const jump = dist(p, prev)
      const cap = this.lastStable && looksInverted(this.lastStable) ? 0.16 : OUTLIER
      if (jump > cap && (p.visibility ?? 1) < 0.93) {
        flags[i] = 'outlier'
        return {
          x: prev.x,
          y: prev.y,
          z: prev.z,
          visibility: Math.min(prev.visibility ?? 1, 0.4),
        }
      }
      return p
    })
    const smoothed = this.euro.apply(gated, now)
    for (let i = 0; i < flags.length; i++) {
      if (flags[i] === 'accepted') flags[i] = 'smoothed'
    }
    return clipImpossibleBones(smoothed).lm
  }

  push(candidates: Landmark[][], now: number, motion: BackgroundMotion | null = null): TrackFrame {
    this.fpsN += 1
    if (!this.fpsT) this.fpsT = now
    if (now - this.fpsT >= 1000) {
      this.fps = this.fpsN
      this.fpsN = 0
      this.fpsT = now
    }

    const lostMs = this.lastSeen ? now - this.lastSeen : Number.POSITIVE_INFINITY
    if (lostMs > LOST_MS) {
      this.state = this.lastStable ? 'lost' : 'searching'
      if (lostMs > LOST_MS + 400) {
        this.lastStable = null
        this.lastCenter = null
        this.euro.reset()
      }
    } else if (this.state === 'locked' && lostMs > UNCERTAIN_MS) {
      this.state = 'uncertain'
    } else if (this.state === 'uncertain' && lostMs > REACQUIRE_MS) {
      this.state = 'reacquiring'
    }

    const rejected: TrackDebug['rejected'] = []
    let best: ReturnType<AthleteTracker['scoreCandidate']> | null = null
    for (const raw of candidates) {
      const scored = this.scoreCandidate(raw, now, motion)
      if (scored.reason) {
        const box = poseBox(scored.lm)
        if (box) rejected.push({ box, reason: scored.reason })
        continue
      }
      if (!best || scored.score > best.score) best = scored
    }

    // Sole inverted athlete with a hidden face still counts.
    if (!best && candidates.length === 1) {
      const fallback = clipImpossibleBones(sanitizePose(candidates[0]!, this.lastStable))
      if (looksInverted(fallback.lm) && !looksLikeBackgroundProp(fallback.lm) && fallback.broken < 5) {
        best = {
          lm: fallback.lm,
          flags: fallback.flags,
          score: 0.48,
          anatomy: anatomyScore(fallback.lm),
          motion: 0,
          continuity: 0.4,
          reason: null,
        }
      }
    }

    const lockIsProp =
      Boolean(this.lastStable) && looksLikeBackgroundProp(this.lastStable!)
    if (lockIsProp || (this.lastStable && looksInverted(this.lastStable))) {
      let steal: ReturnType<AthleteTracker['scoreCandidate']> | null = null
      for (const raw of candidates) {
        const cleaned = clipImpossibleBones(sanitizePose(raw, null))
        if (looksLikeBackgroundProp(cleaned.lm)) continue
        const standing =
          poseLooksHuman(cleaned.lm) && !looksInverted(cleaned.lm)
        const athlete = standing || looksInverted(cleaned.lm)
        if (!athlete) continue
        const heat = motion?.scoreBox(poseBox(cleaned.lm)) ?? 0
        const scored = {
          lm: cleaned.lm,
          flags: cleaned.flags,
          score: 0.58 + 0.3 * heat,
          anatomy: anatomyScore(cleaned.lm),
          motion: heat,
          continuity: 0.55,
          reason: null,
        }
        if (!steal || scored.score > steal.score) steal = scored
      }
      const bestIsAthlete = Boolean(best && !looksLikeBackgroundProp(best.lm))
      if (steal && !bestIsAthlete) {
        this.euro.reset()
        this.state = 'acquiring'
        this.acquireSince = now
        best = steal
      }
    }

    const need =
      this.state === 'locked' ? 0.36 : this.state === 'reacquiring' || this.state === 'uncertain' ? 0.4 : 0.34

    if (best && best.score >= need) {
      this.accept(best.lm, now, best.flags)
      if (this.state === 'searching' || this.state === 'lost') {
        this.state = 'acquiring'
        this.acquireSince = now
      }
      if (this.state === 'acquiring' && now - this.acquireSince >= ACQUIRE_MS) this.state = 'locked'
      if (this.state === 'uncertain' || this.state === 'reacquiring') this.state = 'locked'
      const stable = this.stabilize(best.lm, now, best.flags)
      this.lastStable = stable
      this.flags = best.flags
      const debug = emptyDebug({
        state: this.state,
        quality: this.quality,
        model: this.model,
        candidates: candidates.length,
        fps: this.fps,
        inferMs: this.inferMs,
        poseConf: best.score,
        continuity: best.continuity,
        anatomy: best.anatomy,
        motion: best.motion,
        holdReady: this.state === 'locked',
        pickReason: 'continuity',
        rejected,
        box: poseBox(stable),
        roi: this.roi(),
        flags: this.flags,
        predicted: false,
      })
      lastDebug = debug
      return { raw: best.lm, stabilized: stable, state: this.state, debug }
    }

    const lastInv = Boolean(this.lastStable && looksInverted(this.lastStable))
    const stillInv = candidates.some((c) => looksInverted(c))
    const lastProp = Boolean(this.lastStable && looksLikeBackgroundProp(this.lastStable))
    if (
      this.lastStable &&
      lostMs < UNCERTAIN_MS &&
      !lastProp &&
      !(lastInv && !stillInv && lostMs > 80)
    ) {
      const predicted = this.predict(now)
      this.state = this.state === 'locked' ? 'uncertain' : this.state
      const debug = emptyDebug({
        state: this.state,
        quality: this.quality,
        model: this.model,
        candidates: candidates.length,
        fps: this.fps,
        inferMs: this.inferMs,
        poseConf: best?.score ?? 0,
        continuity: best?.continuity ?? 0,
        anatomy: best?.anatomy ?? 0,
        motion: 0,
        holdReady: this.state === 'locked' || this.state === 'uncertain',
        pickReason: 'holding last subject',
        rejected,
        box: this.lastBox,
        roi: this.roi(),
        flags: this.flags,
        predicted: true,
      })
      lastDebug = debug
      return { raw: this.lastRaw, stabilized: predicted ?? this.lastStable, state: this.state, debug }
    }

    this.state = this.lastStable && lostMs < LOST_MS ? 'reacquiring' : 'searching'
    const debug = emptyDebug({
      state: this.state,
      quality: this.quality,
      model: this.model,
      candidates: candidates.length,
      fps: this.fps,
      inferMs: this.inferMs,
      poseConf: best?.score ?? 0,
      continuity: 0,
      anatomy: 0,
      motion: 0,
      holdReady: false,
      pickReason: best ? 'candidate below lock threshold' : 'no usable candidate',
      rejected,
      box: this.lastBox,
      roi: this.roi(),
      flags: [],
      predicted: false,
    })
    lastDebug = debug
    return { raw: null, stabilized: null, state: this.state, debug }
  }
}

export function drawTrackDebug(
  ctx: CanvasRenderingContext2D,
  debug: TrackDebug,
  width: number,
  height: number,
) {
  const stroke = (box: NormBox, color: string, px: number) => {
    ctx.strokeStyle = color
    ctx.lineWidth = px
    ctx.strokeRect(box.x * width, box.y * height, box.w * width, box.h * height)
  }
  if (debug.roi) stroke(debug.roi, 'rgba(90, 170, 255, 0.65)', Math.max(2, width * 0.003))
  if (debug.box) stroke(debug.box, 'rgba(80, 255, 170, 0.95)', Math.max(3, width * 0.004))
  for (const bad of debug.rejected) {
    stroke(bad.box, 'rgba(255, 80, 80, 0.8)', Math.max(2, width * 0.003))
    ctx.fillStyle = 'rgba(255, 90, 90, 0.9)'
    ctx.font = `600 ${Math.max(11, width * 0.015)}px sans-serif`
    ctx.fillText(bad.reason, bad.box.x * width + 4, Math.max(14, bad.box.y * height - 4))
  }
}

export function jointDrawColor(flag: JointFlag | undefined): string {
  if (flag === 'outlier') return '#ff4d4d'
  if (flag === 'predicted') return '#f0c400'
  if (flag === 'smoothed') return '#7dffc8'
  return '#ffffff'
}
