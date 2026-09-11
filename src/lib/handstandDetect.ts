/**
 * Hold-challenge recognition: “is this a handstand?” with hysteresis.
 * Quality / form scores stay in scoring.ts — do not use those gates here.
 *
 * Image space: y grows downward. An inverted stack is
 * wristY > shoulderY > hipY > kneeY > ankleY.
 */

import { LM } from './landmarks'
import type { Landmark } from '../types'

export const HOLD_ENTER_MS = 320
export const HOLD_EXIT_MS = 480
export const HOLD_COME_DOWN_MS = 200
export const HOLD_ENTER_CONF = 0.7
export const HOLD_EXIT_CONF = 0.52
const EMA = 0.38
const VIS = 0.2

export type HoldDetectDebug = {
  state: 'idle' | 'candidate' | 'holding'
  holding: boolean
  confidence: number
  enterAt: number
  exitAt: number
  validMs: number
  invalidMs: number
  validFrames: number
  invalidFrames: number
  stack: number
  extension: number
  vertical: number
  visibility: number
  elbowDeg: number | null
  bodyAxisDeg: number | null
  landmarkVis: number
  hardFail: string | null
}

export type HoldDetectSample = {
  confidence: number
  holding: boolean
  candidate: boolean
  handsDown: boolean
  feetOff: boolean
  debug: HoldDetectDebug
}

function visOk(p: Landmark | undefined, min = VIS): p is Landmark {
  return Boolean(p) && Number.isFinite(p.x) && Number.isFinite(p.y) && (p.visibility ?? 1) >= min
}

function pair(
  a: Landmark | undefined,
  b: Landmark | undefined,
  min = VIS,
): { x: number; y: number; vis: number } | null {
  const pts = [a, b].filter((p): p is Landmark => visOk(p, min))
  if (!pts.length) return null
  if (pts.length === 2) {
    const gap = Math.hypot(pts[0]!.x - pts[1]!.x, pts[0]!.y - pts[1]!.y)
    if (gap > 0.16) {
      const pick = (pts[0]!.visibility ?? 1) >= (pts[1]!.visibility ?? 1) ? pts[0]! : pts[1]!
      return { x: pick.x, y: pick.y, vis: pick.visibility ?? 1 }
    }
  }
  return {
    x: pts.reduce((s, p) => s + p.x, 0) / pts.length,
    y: pts.reduce((s, p) => s + p.y, 0) / pts.length,
    vis: pts.reduce((s, p) => s + (p.visibility ?? 1), 0) / pts.length,
  }
}

function angleDeg(
  a: Landmark | undefined,
  b: Landmark | undefined,
  c: Landmark | undefined,
): number | null {
  if (!visOk(a, VIS) || !visOk(b, VIS) || !visOk(c, VIS)) return null
  const bax = a.x - b.x
  const bay = a.y - b.y
  const bcx = c.x - b.x
  const bcy = c.y - b.y
  const magBA = Math.hypot(bax, bay)
  const magBC = Math.hypot(bcx, bcy)
  if (magBA < 1e-6 || magBC < 1e-6) return null
  const cos = Math.min(1, Math.max(-1, (bax * bcx + bay * bcy) / (magBA * magBC)))
  return (Math.acos(cos) * 180) / Math.PI
}

function betterAngle(left: number | null, right: number | null): number | null {
  if (left == null) return right
  if (right == null) return left
  return Math.max(left, right)
}

function worseAngle(left: number | null, right: number | null): number | null {
  if (left == null) return right
  if (right == null) return left
  return Math.min(left, right)
}

/** 0–1 from a joint that should be straight. Loose for recognition, not quality. */
function straightness(deg: number | null, ok: number, fail: number): number {
  if (deg == null) return 0.55
  if (deg >= ok) return 1
  if (deg <= fail) return 0
  return (deg - fail) / (ok - fail)
}

function verticalDev(
  from: { x: number; y: number },
  to: { x: number; y: number },
): number {
  const dx = to.x - from.x
  const dy = -(to.y - from.y)
  return Math.abs((Math.atan2(dx, dy) * 180) / Math.PI)
}

export function isHoldDebugEnabled(): boolean {
  if (typeof window === 'undefined') return false
  try {
    if (new URLSearchParams(window.location.search).get('holdDebug') === '1') return true
    return window.localStorage.getItem('shape-lab.holdDebug') === '1'
  } catch {
    return false
  }
}

export function smoothLandmarks(
  prev: Landmark[] | null,
  next: Landmark[] | null,
  alpha = EMA,
): Landmark[] | null {
  if (!next || next.length < 33) return prev
  if (!prev || prev.length < 33) {
    return next.map((p) => ({ ...p }))
  }
  return next.map((p, i) => {
    const q = prev[i]
    if (!q) return { ...p }
    const vis = p.visibility ?? 1
    const a = vis < 0.15 ? 0.15 : alpha
    return {
      x: q.x + (p.x - q.x) * a,
      y: q.y + (p.y - q.y) * a,
      z: q.z + (p.z - q.z) * a,
      visibility: vis,
    }
  })
}

export function evaluateHandstandGeometry(lm: Landmark[] | null | undefined): {
  confidence: number
  handsDown: boolean
  feetOff: boolean
  stack: number
  extension: number
  vertical: number
  visibility: number
  elbowDeg: number | null
  bodyAxisDeg: number | null
  landmarkVis: number
  hardFail: string | null
} {
  const empty = {
    confidence: 0,
    handsDown: false,
    feetOff: false,
    stack: 0,
    extension: 0,
    vertical: 0,
    visibility: 0,
    elbowDeg: null as number | null,
    bodyAxisDeg: null as number | null,
    landmarkVis: 0,
    hardFail: 'no pose' as string | null,
  }
  if (!lm || lm.length < 33) return empty

  const wrist = pair(lm[LM.LEFT_WRIST], lm[LM.RIGHT_WRIST])
  const shoulder = pair(lm[LM.LEFT_SHOULDER], lm[LM.RIGHT_SHOULDER])
  const hip = pair(lm[LM.LEFT_HIP], lm[LM.RIGHT_HIP])
  const knee = pair(lm[LM.LEFT_KNEE], lm[LM.RIGHT_KNEE], 0.12)
  const ankle = pair(lm[LM.LEFT_ANKLE], lm[LM.RIGHT_ANKLE], 0.12) ?? pair(lm[LM.LEFT_HEEL], lm[LM.RIGHT_HEEL], 0.12)

  const core = [wrist, shoulder, hip].filter(Boolean)
  const visPts = [wrist, shoulder, hip, knee, ankle].filter(Boolean)
  const landmarkVis =
    visPts.length === 0 ? 0 : visPts.reduce((s, p) => s + (p!.vis ?? 0), 0) / visPts.length
  const visibility = core.length < 3 ? 0 : Math.min(1, landmarkVis / 0.55)

  if (!wrist || !shoulder || !hip) {
    return { ...empty, visibility, landmarkVis, hardFail: 'missing core' }
  }

  // Planted hands: wrists below shoulders, and not still reaching above the feet.
  const handsDown = wrist.y > shoulder.y + 0.03 && (ankle == null || !(ankle.y > wrist.y + 0.07))
  const feetOff = ankle == null ? hip.y < wrist.y - 0.06 : ankle.y < wrist.y - 0.1

  let hardFail: string | null = null
  if (wrist.y < shoulder.y) hardFail = 'hands above shoulders'
  else if (ankle && ankle.y > wrist.y - 0.06) hardFail = 'feet still down'
  else if (hip.y > wrist.y - 0.03) hardFail = 'hips not above hands'

  const ordered: Array<[{ y: number } | null, { y: number } | null, number]> = [
    [wrist, shoulder, 0.03],
    [shoulder, hip, 0.02],
    [hip, knee, 0.02],
    [knee ?? hip, ankle, 0.03],
  ]
  let stackHits = 0
  let stackNeed = 0
  for (const [low, high, margin] of ordered) {
    if (!low || !high) continue
    stackNeed += 1
    if (low.y > high.y + margin) stackHits += 1
  }
  const stack = stackNeed === 0 ? 0 : stackHits / stackNeed

  const leftElbow = angleDeg(lm[LM.LEFT_SHOULDER], lm[LM.LEFT_ELBOW], lm[LM.LEFT_WRIST])
  const rightElbow = angleDeg(lm[LM.RIGHT_SHOULDER], lm[LM.RIGHT_ELBOW], lm[LM.RIGHT_WRIST])
  const leftKnee = angleDeg(lm[LM.LEFT_HIP], lm[LM.LEFT_KNEE], lm[LM.LEFT_ANKLE])
  const rightKnee = angleDeg(lm[LM.RIGHT_HIP], lm[LM.RIGHT_KNEE], lm[LM.RIGHT_ANKLE])
  const leftSupport = angleDeg(lm[LM.LEFT_WRIST], lm[LM.LEFT_SHOULDER], lm[LM.LEFT_HIP])
  const rightSupport = angleDeg(lm[LM.RIGHT_WRIST], lm[LM.RIGHT_SHOULDER], lm[LM.RIGHT_HIP])
  const leftBody = angleDeg(lm[LM.LEFT_SHOULDER], lm[LM.LEFT_HIP], lm[LM.LEFT_ANKLE])
  const rightBody = angleDeg(lm[LM.RIGHT_SHOULDER], lm[LM.RIGHT_HIP], lm[LM.RIGHT_ANKLE])
  const elbowDeg = worseAngle(leftElbow, rightElbow)
  const kneeDeg = betterAngle(leftKnee, rightKnee)
  const supportDeg = betterAngle(leftSupport, rightSupport)
  const bodyLineDeg = betterAngle(leftBody, rightBody)
  // Recognition only — loose floors so a piked or slightly bent-arm HS still counts.
  const extension =
    0.4 * straightness(betterAngle(leftElbow, rightElbow), 155, 108) +
    0.3 * straightness(kneeDeg, 150, 95) +
    0.15 * straightness(supportDeg, 150, 88) +
    0.15 * straightness(bodyLineDeg, 155, 90)

  const hipToAnkle = ankle ?? knee
  const axisA = verticalDev(wrist, hip)
  const axisB = hipToAnkle ? verticalDev(hip, hipToAnkle) : axisA
  const bodyAxisDeg = (axisA + axisB) / 2
  const vertical = Math.max(0, 1 - bodyAxisDeg / 48)

  let confidence =
    0.4 * stack + 0.22 * vertical + 0.2 * extension + 0.18 * visibility
  if (hardFail) confidence = Math.min(confidence, 0.34)
  confidence = Math.max(0, Math.min(1, confidence))

  return {
    confidence,
    handsDown,
    feetOff,
    stack,
    extension,
    vertical,
    visibility,
    elbowDeg,
    bodyAxisDeg,
    landmarkVis,
    hardFail,
  }
}

/** Single-frame “this looks like a handstand” — homework / salvage, not the timer. */
export function poseLooksLikeHandstand(lm: Landmark[] | null | undefined): boolean {
  return evaluateHandstandGeometry(lm).confidence >= 0.62
}

function isComeDownFail(fail: string | null): boolean {
  return fail === 'feet still down' || fail === 'hands above shoulders'
}

export class HoldDetector {
  private smoothed: Landmark[] | null = null
  private state: HoldDetectDebug['state'] = 'idle'
  private validSince = 0
  private invalidSince = 0
  private validFrames = 0
  private invalidFrames = 0
  private lastLog = 0

  reset() {
    this.smoothed = null
    this.state = 'idle'
    this.validSince = 0
    this.invalidSince = 0
    this.validFrames = 0
    this.invalidFrames = 0
  }

  push(raw: Landmark[] | null, now: number): HoldDetectSample {
    const enterAt = HOLD_ENTER_CONF
    const exitAt = HOLD_EXIT_CONF

    if (!raw || raw.length < 33) {
      return this.finishSample(
        evaluateHandstandGeometry(null),
        {
          comeDown: this.state === 'holding',
          lostPose: true,
          enterAt,
          exitAt,
          now,
        },
      )
    }

    this.smoothed = smoothLandmarks(this.smoothed, raw)
    const geo = evaluateHandstandGeometry(this.smoothed)
    const rawGeo = evaluateHandstandGeometry(raw)
    // Raw feet-down / hands-up wins so EMA cannot hide a real come-down.
    const comeDown = isComeDownFail(rawGeo.hardFail) || isComeDownFail(geo.hardFail)
    return this.finishSample(geo, { comeDown, lostPose: false, enterAt, exitAt, now })
  }

  private finishSample(
    geo: ReturnType<typeof evaluateHandstandGeometry>,
    opts: {
      comeDown: boolean
      lostPose: boolean
      enterAt: number
      exitAt: number
      now: number
    },
  ): HoldDetectSample {
    const { comeDown, lostPose, enterAt, exitAt, now } = opts
    const confidence = lostPose ? 0 : geo.confidence
    const looksEnter = !lostPose && !comeDown && confidence >= enterAt
    const looksHold = !lostPose && !comeDown && confidence >= exitAt
    const looksExit = lostPose || comeDown || confidence < exitAt

    if (looksEnter) {
      if (!this.validSince) this.validSince = now
      this.invalidSince = 0
      this.validFrames += 1
      this.invalidFrames = 0
    } else if (this.state === 'holding' && looksHold) {
      this.invalidSince = 0
      this.invalidFrames = 0
      this.validFrames += 1
    } else if (looksExit) {
      if (!this.invalidSince) this.invalidSince = now
      this.invalidFrames += 1
      if (lostPose || comeDown || confidence < exitAt - 0.08) {
        this.validSince = 0
        this.validFrames = 0
      }
    }

    const validMs = this.validSince ? now - this.validSince : 0
    const invalidMs = this.invalidSince ? now - this.invalidSince : 0
    const exitNeed = comeDown || lostPose ? HOLD_COME_DOWN_MS : HOLD_EXIT_MS

    if (this.state === 'idle') {
      if (looksEnter) this.state = 'candidate'
    }
    if (this.state === 'candidate') {
      if (!looksHold) this.state = 'idle'
      else if (validMs >= HOLD_ENTER_MS) this.state = 'holding'
    }
    if (this.state === 'holding') {
      if (invalidMs >= exitNeed) this.state = 'idle'
    }

    const holding = this.state === 'holding'
    const debug: HoldDetectDebug = {
      state: this.state,
      holding,
      confidence,
      enterAt,
      exitAt,
      validMs,
      invalidMs,
      validFrames: this.validFrames,
      invalidFrames: this.invalidFrames,
      stack: geo.stack,
      extension: geo.extension,
      vertical: geo.vertical,
      visibility: geo.visibility,
      elbowDeg: geo.elbowDeg,
      bodyAxisDeg: geo.bodyAxisDeg,
      landmarkVis: geo.landmarkVis,
      hardFail: lostPose ? 'lost pose' : geo.hardFail,
    }

    if (isHoldDebugEnabled() && now - this.lastLog > 500) {
      this.lastLog = now
      console.debug('[hold-detect]', {
        state: debug.state,
        conf: Number(geo.confidence.toFixed(2)),
        stack: Number(geo.stack.toFixed(2)),
        ext: Number(geo.extension.toFixed(2)),
        vert: debug.bodyAxisDeg != null ? Math.round(debug.bodyAxisDeg) : null,
        elbow: debug.elbowDeg != null ? Math.round(debug.elbowDeg) : null,
        fail: geo.hardFail,
      })
    }

    return {
      confidence,
      holding,
      candidate: this.state === 'candidate',
      handsDown: lostPose ? false : geo.handsDown,
      feetOff: lostPose ? false : geo.feetOff,
      debug,
    }
  }
}
