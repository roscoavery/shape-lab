/**
 * Lock the athlete pose across frames so furniture / wall art cannot
 * steal the skeleton. MediaPipe still proposes candidates; this module
 * chooses which one is the same person.
 *
 * Skeleton drawing stays on the selected pose. Hold detection / scoring
 * keep their own logic.
 */

import { LM } from './landmarks'
import { landmarksLookPresent } from './pose'
import type { Landmark } from '../types'

export const SUBJECT_HOLD_MS = 280
export const SUBJECT_LOCAL_MS = 900
export const SUBJECT_DROP_MS = 1400
const CORE = [LM.NOSE, LM.LEFT_SHOULDER, LM.RIGHT_SHOULDER, LM.LEFT_HIP, LM.RIGHT_HIP]
const BONES: Array<[number, number, keyof BoneNorms]> = [
  [LM.LEFT_SHOULDER, LM.LEFT_ELBOW, 'upperArm'],
  [LM.RIGHT_SHOULDER, LM.RIGHT_ELBOW, 'upperArm'],
  [LM.LEFT_ELBOW, LM.LEFT_WRIST, 'forearm'],
  [LM.RIGHT_ELBOW, LM.RIGHT_WRIST, 'forearm'],
  [LM.LEFT_HIP, LM.LEFT_KNEE, 'thigh'],
  [LM.RIGHT_HIP, LM.RIGHT_KNEE, 'thigh'],
  [LM.LEFT_KNEE, LM.LEFT_ANKLE, 'shin'],
  [LM.RIGHT_KNEE, LM.RIGHT_ANKLE, 'shin'],
  [LM.LEFT_SHOULDER, LM.RIGHT_SHOULDER, 'shoulderW'],
  [LM.LEFT_HIP, LM.RIGHT_HIP, 'hipW'],
]

type BoneNorms = {
  upperArm: number
  forearm: number
  thigh: number
  shin: number
  shoulderW: number
  hipW: number
}

export type NormBox = { x: number; y: number; w: number; h: number }

export type RejectedPose = {
  box: NormBox
  reason: string
  score: number
}

export type SubjectDebug = {
  locked: boolean
  reacquire: 'none' | 'local' | 'full'
  confidence: number
  landmarkVis: number
  motionBias: number
  box: NormBox | null
  roi: NormBox | null
  rejected: RejectedPose[]
  pickReason: string
}

export type SubjectPick = {
  landmarks: Landmark[] | null
  debug: SubjectDebug
}

const emptyDebug = (over: Partial<SubjectDebug> = {}): SubjectDebug => ({
  locked: false,
  reacquire: 'full',
  confidence: 0,
  landmarkVis: 0,
  motionBias: 0,
  box: null,
  roi: null,
  rejected: [],
  pickReason: 'no pose',
  ...over,
})

let lastDebug: SubjectDebug | null = null

export function getLastSubjectDebug(): SubjectDebug | null {
  return lastDebug
}

export function isPoseDebugEnabled(): boolean {
  if (typeof window === 'undefined') return false
  try {
    const q = new URLSearchParams(window.location.search)
    if (q.get('poseDebug') === '1' || q.get('holdDebug') === '1') return true
    return (
      window.localStorage.getItem('shape-lab.poseDebug') === '1' ||
      window.localStorage.getItem('shape-lab.holdDebug') === '1'
    )
  } catch {
    return false
  }
}

function visOk(p: Landmark | undefined, min = 0.28): p is Landmark {
  return Boolean(p) && Number.isFinite(p.x) && Number.isFinite(p.y) && (p.visibility ?? 1) >= min
}

function dist(a: { x: number; y: number }, b: { x: number; y: number }): number {
  return Math.hypot(a.x - b.x, a.y - b.y)
}

function mid(
  a: Landmark | undefined,
  b: Landmark | undefined,
  min = 0.22,
): { x: number; y: number; vis: number } | null {
  const pts = [a, b].filter((p): p is Landmark => visOk(p, min))
  if (!pts.length) return null
  return {
    x: pts.reduce((s, p) => s + p.x, 0) / pts.length,
    y: pts.reduce((s, p) => s + p.y, 0) / pts.length,
    vis: pts.reduce((s, p) => s + (p.visibility ?? 1), 0) / pts.length,
  }
}

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n))
}

export function poseBox(lm: Landmark[] | null | undefined, minVis = 0.22): NormBox | null {
  if (!lm || lm.length < 33) return null
  const pts = lm.filter((p) => visOk(p, minVis))
  if (pts.length < 4) return null
  let x0 = 1
  let y0 = 1
  let x1 = 0
  let y1 = 0
  for (const p of pts) {
    x0 = Math.min(x0, p.x)
    y0 = Math.min(y0, p.y)
    x1 = Math.max(x1, p.x)
    y1 = Math.max(y1, p.y)
  }
  return { x: x0, y: y0, w: Math.max(0.02, x1 - x0), h: Math.max(0.02, y1 - y0) }
}

export function expandBox(box: NormBox, padX: number, padY: number): NormBox {
  const x = clamp01(box.x - padX)
  const y = clamp01(box.y - padY)
  return {
    x,
    y,
    w: Math.max(0.04, Math.min(1 - x, box.w + padX * 2)),
    h: Math.max(0.04, Math.min(1 - y, box.h + padY * 2)),
  }
}

function boxIou(a: NormBox, b: NormBox): number {
  const x0 = Math.max(a.x, b.x)
  const y0 = Math.max(a.y, b.y)
  const x1 = Math.min(a.x + a.w, b.x + b.w)
  const y1 = Math.min(a.y + a.h, b.y + b.h)
  const w = Math.max(0, x1 - x0)
  const h = Math.max(0, y1 - y0)
  const inter = w * h
  const union = a.w * a.h + b.w * b.h - inter
  return union <= 1e-6 ? 0 : inter / union
}

function contains(box: NormBox, p: { x: number; y: number }): boolean {
  return p.x >= box.x && p.x <= box.x + box.w && p.y >= box.y && p.y <= box.y + box.h
}

export function torsoCenter(lm: Landmark[]): { x: number; y: number } | null {
  const hip = mid(lm[LM.LEFT_HIP], lm[LM.RIGHT_HIP])
  const sh = mid(lm[LM.LEFT_SHOULDER], lm[LM.RIGHT_SHOULDER])
  if (hip && sh) return { x: (hip.x + sh.x) / 2, y: (hip.y + sh.y) / 2 }
  return hip ?? sh
}

export function torsoScale(lm: Landmark[]): number | null {
  const hip = mid(lm[LM.LEFT_HIP], lm[LM.RIGHT_HIP], 0.18)
  const sh = mid(lm[LM.LEFT_SHOULDER], lm[LM.RIGHT_SHOULDER], 0.18)
  if (!hip || !sh) return null
  const len = dist(hip, sh)
  return len < 0.03 ? null : len
}

function meanVis(lm: Landmark[], idx = CORE): number {
  const pts = idx.map((i) => lm[i]).filter((p): p is Landmark => visOk(p, 0.12))
  if (!pts.length) return 0
  return pts.reduce((s, p) => s + (p.visibility ?? 1), 0) / idx.length
}

function visibleCount(lm: Landmark[], min = 0.32): number {
  return lm.reduce((n, p) => n + (visOk(p, min) ? 1 : 0), 0)
}

function boneLength(lm: Landmark[], a: number, b: number): number | null {
  const pa = lm[a]
  const pb = lm[b]
  if (!visOk(pa, 0.24) || !visOk(pb, 0.24)) return null
  return dist(pa, pb)
}

function sampleBones(lm: Landmark[]): Partial<BoneNorms> {
  const scale = torsoScale(lm)
  if (!scale) return {}
  const out: Partial<BoneNorms> = {}
  for (const [a, b, key] of BONES) {
    const len = boneLength(lm, a, b)
    if (len == null) continue
    const prev = out[key]
    const norm = len / scale
    out[key] = prev == null ? norm : (prev + norm) / 2
  }
  return out
}

function boneConflict(lm: Landmark[], norms: BoneNorms | null): string | null {
  if (!norms) return null
  const got = sampleBones(lm)
  for (const key of Object.keys(norms) as (keyof BoneNorms)[]) {
    const expect = norms[key]
    const value = got[key]
    if (expect == null || value == null || expect < 0.08) continue
    const ratio = value / expect
    if (ratio > 2.45 || ratio < 0.34) return `impossible ${key}`
  }
  return null
}

function limbFoldedImpossible(lm: Landmark[]): string | null {
  const pairs: Array<[number, number, number]> = [
    [LM.LEFT_SHOULDER, LM.LEFT_ELBOW, LM.LEFT_WRIST],
    [LM.RIGHT_SHOULDER, LM.RIGHT_ELBOW, LM.RIGHT_WRIST],
    [LM.LEFT_HIP, LM.LEFT_KNEE, LM.LEFT_ANKLE],
    [LM.RIGHT_HIP, LM.RIGHT_KNEE, LM.RIGHT_ANKLE],
  ]
  let bad = 0
  let seen = 0
  for (const [a, b, c] of pairs) {
    const ab = boneLength(lm, a, b)
    const bc = boneLength(lm, b, c)
    const ac = boneLength(lm, a, c)
    if (ab == null || bc == null || ac == null) continue
    seen += 1
    if (ac > (ab + bc) * 1.22 + 0.02) bad += 1
  }
  return seen >= 2 && bad >= 2 ? 'impossible joints' : null
}

const UPPER_PAIRS: Array<[number, number]> = [
  [LM.LEFT_SHOULDER, LM.RIGHT_SHOULDER],
  [LM.LEFT_ELBOW, LM.RIGHT_ELBOW],
  [LM.LEFT_WRIST, LM.RIGHT_WRIST],
  [LM.LEFT_HIP, LM.RIGHT_HIP],
]
const LEG_PAIRS: Array<[number, number]> = [
  [LM.LEFT_KNEE, LM.RIGHT_KNEE],
  [LM.LEFT_ANKLE, LM.RIGHT_ANKLE],
  [LM.LEFT_HEEL, LM.RIGHT_HEEL],
  [LM.LEFT_FOOT_INDEX, LM.RIGHT_FOOT_INDEX],
]

/**
 * Side-view MediaPipe invents the hidden side across the room.
 * Drop upper-body ghosts. Keep both legs when they are actually apart.
 */
export function sanitizePose(lm: Landmark[], prev: Landmark[] | null = null): Landmark[] {
  const out = lm.map((p) => ({ ...p }))
  for (const [i, j] of UPPER_PAIRS) {
    const a = out[i]
    const b = out[j]
    if (!a || !b) continue
    const gap = Math.hypot(a.x - b.x, a.y - b.y)
    if (gap <= 0.18) continue
    const va = a.visibility ?? 1
    const vb = b.visibility ?? 1
    if (va >= vb) b.visibility = 0
    else a.visibility = 0
  }
  for (const [i, j] of LEG_PAIRS) {
    const a = out[i]
    const b = out[j]
    if (!a || !b) continue
    const gap = Math.hypot(a.x - b.x, a.y - b.y)
    if (gap <= 0.22) continue
    const va = a.visibility ?? 1
    const vb = b.visibility ?? 1
    const weak = va >= vb ? b : a
    const strong = va >= vb ? a : b
    const weakVis = weak.visibility ?? 1
    const strongVis = strong.visibility ?? 1
    // Real straddle / legs-apart: both ankles stay. Only drop a faint ghost.
    if (weakVis < 0.28 && strongVis > 0.55) weak.visibility = 0
  }
  const prevTorso = prev && prev.length >= 33 ? torsoCenter(prev) : null
  const nextTorso = torsoCenter(out)
  const sameBody = Boolean(prevTorso && nextTorso && dist(prevTorso, nextTorso) < 0.22)
  if (sameBody && prev) {
    for (let i = 0; i < 33; i++) {
      const a = out[i]
      const q = prev[i]
      if (!a || !q || (q.visibility ?? 1) < 0.2) continue
      const jump = Math.hypot(a.x - q.x, a.y - q.y)
      const limb = i >= LM.LEFT_ELBOW
      if (jump > (limb ? 0.36 : 0.24) && (a.visibility ?? 1) < 0.92) {
        a.x = q.x
        a.y = q.y
        a.z = q.z
        a.visibility = Math.min(q.visibility ?? 1, 0.38)
      }
    }
  }
  return out
}

export function hasHead(lm: Landmark[]): boolean {
  const sh = mid(lm[LM.LEFT_SHOULDER], lm[LM.RIGHT_SHOULDER], 0.16)
  if (!sh) return false
  const nose = lm[LM.NOSE]
  if (visOk(nose, 0.12)) {
    const d = dist(nose, sh)
    if (d > 0.03 && d < 0.32) return true
  }
  return false
}

/** Wrists on the floor, hips/feet up — a real handstand, not furniture. */
export function looksInverted(lm: Landmark[]): boolean {
  const wrist = mid(lm[LM.LEFT_WRIST], lm[LM.RIGHT_WRIST], 0.12)
  const hip = mid(lm[LM.LEFT_HIP], lm[LM.RIGHT_HIP], 0.12)
  const ankle =
    mid(lm[LM.LEFT_ANKLE], lm[LM.RIGHT_ANKLE], 0.1) ??
    mid(lm[LM.LEFT_HEEL], lm[LM.RIGHT_HEEL], 0.1)
  if (wrist && hip && hip.y < wrist.y - 0.04) return true
  if (wrist && ankle && ankle.y < wrist.y - 0.08) return true
  return false
}

/** Coat rack / lamp / stand: joints stacked on one thin column. */
export function looksLikeThinColumn(lm: Landmark[]): boolean {
  const idx = [
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
  const pts = idx.map((i) => lm[i]).filter((p): p is Landmark => visOk(p, 0.22))
  if (pts.length < 6) return false
  const xs = pts.map((p) => p.x)
  const ys = pts.map((p) => p.y)
  const spanX = Math.max(...xs) - Math.min(...xs)
  const spanY = Math.max(...ys) - Math.min(...ys)
  const shW =
    visOk(lm[LM.LEFT_SHOULDER], 0.22) && visOk(lm[LM.RIGHT_SHOULDER], 0.22)
      ? Math.abs(lm[LM.LEFT_SHOULDER]!.x - lm[LM.RIGHT_SHOULDER]!.x)
      : spanX
  const hpW =
    visOk(lm[LM.LEFT_HIP], 0.22) && visOk(lm[LM.RIGHT_HIP], 0.22)
      ? Math.abs(lm[LM.LEFT_HIP]!.x - lm[LM.RIGHT_HIP]!.x)
      : spanX
  return spanY > 0.18 && spanX < 0.08 && shW < 0.07 && hpW < 0.06
}

/** Keyboard stands / coat racks — not a side-view athlete (those have a head). */
export function looksLikePole(lm: Landmark[]): boolean {
  if (hasHead(lm) || looksInverted(lm)) return false
  return looksLikeThinColumn(lm)
}

/** Keyboard on a stick: one column plus a thin horizontal bar. */
export function looksLikeFurniture(lm: Landmark[]): boolean {
  if (hasHead(lm) || looksInverted(lm)) return false
  if (looksLikePole(lm)) return true
  const idx = [
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
  const pts = idx.map((i) => lm[i]).filter((p): p is Landmark => visOk(p, 0.22))
  if (pts.length < 8) return false
  const xs = pts.map((p) => p.x).sort((a, b) => a - b)
  const xMid = xs[Math.floor(xs.length / 2)]!
  const column = pts.filter((p) => Math.abs(p.x - xMid) < 0.045)
  const off = pts.filter((p) => Math.abs(p.x - xMid) >= 0.045)
  if (column.length < 5 || off.length < 2) return false
  const offY = off.map((p) => p.y)
  const barH = Math.max(...offY) - Math.min(...offY)
  const shW =
    visOk(lm[LM.LEFT_SHOULDER], 0.22) && visOk(lm[LM.RIGHT_SHOULDER], 0.22)
      ? Math.abs(lm[LM.LEFT_SHOULDER]!.x - lm[LM.RIGHT_SHOULDER]!.x)
      : 1
  const hpW =
    visOk(lm[LM.LEFT_HIP], 0.22) && visOk(lm[LM.RIGHT_HIP], 0.22)
      ? Math.abs(lm[LM.LEFT_HIP]!.x - lm[LM.RIGHT_HIP]!.x)
      : 1
  return barH < 0.09 && shW < 0.1 && hpW < 0.08
}

/** Furniture that can fake an inverted stick-figure after a handstand. */
export function looksLikeBackgroundProp(lm: Landmark[]): boolean {
  if (looksLikePole(lm) || looksLikeFurniture(lm)) return true
  // After come-down, MediaPipe often maps a lamp / stand as an inverted
  // stick. A real side-view handstand is wider than this column.
  if (looksLikeThinColumn(lm) && !hasHead(lm)) return true
  if (hasHead(lm)) return false
  const idx = [
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
  const pts = idx.map((i) => lm[i]).filter((p): p is Landmark => visOk(p, 0.2))
  if (pts.length < 6) return false
  const xs = pts.map((p) => p.x)
  const spanX = Math.max(...xs) - Math.min(...xs)
  const shW =
    visOk(lm[LM.LEFT_SHOULDER], 0.2) && visOk(lm[LM.RIGHT_SHOULDER], 0.2)
      ? Math.abs(lm[LM.LEFT_SHOULDER]!.x - lm[LM.RIGHT_SHOULDER]!.x)
      : spanX
  const hpW =
    visOk(lm[LM.LEFT_HIP], 0.2) && visOk(lm[LM.RIGHT_HIP], 0.2)
      ? Math.abs(lm[LM.LEFT_HIP]!.x - lm[LM.RIGHT_HIP]!.x)
      : spanX
  if (spanX < 0.07 && shW < 0.06 && hpW < 0.055) return true
  return false
}

export function poseLooksHuman(lm: Landmark[] | null | undefined): boolean {
  if (!lm || lm.length < 33) return false
  if (visibleCount(lm, 0.3) < 8) return false
  const box = poseBox(lm)
  if (!box) return false
  if (box.h < 0.12 || box.w < 0.035) return false
  if (box.w > 0.98 && box.h > 0.98) return false
  if (looksLikePole(lm) || looksLikeFurniture(lm)) return false
  if (limbFoldedImpossible(lm)) return false
  // Homework "present" wants a wide torso. Side-on handstands are thinner.
  if (landmarksLookPresent(lm)) return true
  return box.h > 0.18 && visibleCount(lm, 0.35) >= 10
}

function coreProximity(prev: Landmark[], next: Landmark[]): number {
  let sum = 0
  let n = 0
  for (const i of CORE) {
    const a = prev[i]
    const b = next[i]
    if (!visOk(a, 0.2) || !visOk(b, 0.2)) continue
    sum += dist(a, b)
    n += 1
  }
  if (!n) return 1
  return sum / n
}

function stabilizeJoints(prev: Landmark[] | null, next: Landmark[], torsoMove: number): Landmark[] {
  if (!prev || prev.length < 33) return next
  const kickPad = Math.min(0.22, torsoMove * 2.2)
  return next.map((p, i) => {
    const q = prev[i]
    if (!q || !visOk(q, 0.12)) return p
    const jump = dist(p, q)
    const limb = i >= LM.LEFT_ELBOW
    const max = (limb ? 0.22 : 0.14) + kickPad
    if (jump <= max) return p
    // Keep the previous joint and mark it uncertain instead of teleporting.
    return {
      x: q.x,
      y: q.y,
      z: q.z,
      visibility: Math.min(q.visibility ?? 1, 0.4),
    }
  })
}

/** Tiny running background / recent-motion grid. Supporting cue only. */
export class BackgroundMotion {
  readonly cols = 48
  readonly rows = 27
  private canvas: HTMLCanvasElement | null = null
  private bg: Float32Array | null = null
  private heat: Float32Array
  private last = 0

  constructor() {
    this.heat = new Float32Array(this.cols * this.rows)
  }

  get ready(): boolean {
    return Boolean(this.bg)
  }

  reset() {
    this.bg = null
    this.heat.fill(0)
    this.last = 0
  }

  sample(video: HTMLVideoElement | null, now: number) {
    if (!video || video.readyState < 2 || video.videoWidth < 16) return
    if (now - this.last < 90) return
    this.last = now
    try {
      if (!this.canvas) {
        this.canvas = document.createElement('canvas')
        this.canvas.width = this.cols
        this.canvas.height = this.rows
      }
      const ctx = this.canvas.getContext('2d', { willReadFrequently: true })
      if (!ctx) return
      ctx.drawImage(video, 0, 0, this.cols, this.rows)
      const { data } = ctx.getImageData(0, 0, this.cols, this.rows)
      if (!this.bg) {
        this.bg = new Float32Array(this.cols * this.rows)
        for (let i = 0; i < this.bg.length; i++) {
          const o = i * 4
          this.bg[i] = (data[o]! + data[o + 1]! + data[o + 2]!) / 3
        }
        return
      }
      for (let i = 0; i < this.bg.length; i++) {
        const o = i * 4
        const lum = (data[o]! + data[o + 1]! + data[o + 2]!) / 3
        const delta = Math.abs(lum - this.bg[i]!)
        const moving = delta > 18
        this.heat[i] = Math.max(this.heat[i]! * 0.9, moving ? 1 : this.heat[i]! * 0.9)
        // Static cells train the background; moving cells stay out of it.
        this.bg[i] = moving ? this.bg[i]! : this.bg[i]! * 0.96 + lum * 0.04
      }
    } catch {
      /* iOS / tainted canvas — skip motion, lock still works */
    }
  }

  scoreBox(box: NormBox | null): number {
    if (!box || !this.bg) return 0
    const x0 = Math.max(0, Math.floor(box.x * this.cols))
    const y0 = Math.max(0, Math.floor(box.y * this.rows))
    const x1 = Math.min(this.cols, Math.ceil((box.x + box.w) * this.cols))
    const y1 = Math.min(this.rows, Math.ceil((box.y + box.h) * this.rows))
    let heat = 0
    let n = 0
    for (let y = y0; y < y1; y++) {
      for (let x = x0; x < x1; x++) {
        heat += this.heat[y * this.cols + x] ?? 0
        n += 1
      }
    }
    return n === 0 ? 0 : heat / n
  }
}

export class SubjectLock {
  private lastLm: Landmark[] | null = null
  private lastCenter: { x: number; y: number } | null = null
  private lastVel = { x: 0, y: 0 }
  private lastBox: NormBox | null = null
  private lastScale: number | null = null
  private lastSeen = 0
  private locked = false
  private bones: BoneNorms | null = null
  private boneFrames = 0
  private lastPublished: Landmark[] | null = null

  reset() {
    this.lastLm = null
    this.lastCenter = null
    this.lastVel = { x: 0, y: 0 }
    this.lastBox = null
    this.lastScale = null
    this.lastSeen = 0
    this.locked = false
    this.bones = null
    this.boneFrames = 0
    this.lastPublished = null
    lastDebug = emptyDebug({ pickReason: 'reset' })
  }

  private roi(speed: number): NormBox | null {
    if (!this.lastBox) return null
    const padX = 0.16 + Math.min(0.2, speed * 0.9)
    const padY = 0.22 + Math.min(0.28, speed * 1.1)
    return expandBox(this.lastBox, padX, padY)
  }

  private learnBones(lm: Landmark[]) {
    if (visibleCount(lm, 0.4) < 12) return
    const sample = sampleBones(lm)
    const keys = Object.keys(sample) as (keyof BoneNorms)[]
    if (keys.length < 4) return
    if (!this.bones) {
      this.bones = {
        upperArm: sample.upperArm ?? 0.7,
        forearm: sample.forearm ?? 0.65,
        thigh: sample.thigh ?? 0.9,
        shin: sample.shin ?? 0.85,
        shoulderW: sample.shoulderW ?? 0.55,
        hipW: sample.hipW ?? 0.4,
      }
      this.boneFrames = 1
      return
    }
    if (this.boneFrames >= 14) return
    const t = 1 / (this.boneFrames + 1)
    for (const key of keys) {
      const value = sample[key]
      if (value == null) continue
      this.bones[key] = this.bones[key] * (1 - t) + value * t
    }
    this.boneFrames += 1
  }

  private accept(lm: Landmark[], now: number) {
    const center = torsoCenter(lm)
    const box = poseBox(lm)
    const scale = torsoScale(lm)
    if (this.lastCenter && center && this.lastSeen) {
      const dt = Math.max(0.016, (now - this.lastSeen) / 1000)
      const vx = (center.x - this.lastCenter.x) / dt
      const vy = (center.y - this.lastCenter.y) / dt
      this.lastVel = {
        x: this.lastVel.x * 0.55 + vx * 0.45,
        y: this.lastVel.y * 0.55 + vy * 0.45,
      }
    }
    this.lastLm = lm
    this.lastCenter = center
    this.lastBox = box
    this.lastScale = scale ?? this.lastScale
    this.lastSeen = now
    this.locked = true
    this.learnBones(lm)
    this.lastPublished = lm
  }

  private scoreAgainstLock(
    lm: Landmark[],
    now: number,
    motion: BackgroundMotion | null,
    mode: 'none' | 'local' | 'full',
  ): { score: number; reason: string | null; motionBias: number } {
    const center = torsoCenter(lm)
    const box = poseBox(lm)
    const scale = torsoScale(lm)
    const vis = meanVis(lm)
    const motionBias = motion?.scoreBox(box) ?? 0
    if (
      (looksLikePole(lm) || looksLikeFurniture(lm)) &&
      !(this.locked && this.lastLm && this.lastBox && this.lastBox.w < 0.14 && poseLooksHuman(this.lastLm))
    ) {
      return { score: 0, reason: 'pole / stand', motionBias }
    }
    if (!this.locked && motion && box && motion.ready && motionBias < 0.08) {
      return { score: 0, reason: 'static object', motionBias }
    }
    if (!poseLooksHuman(lm) && visibleCount(lm, 0.28) < 10) {
      return { score: 0, reason: 'not a body', motionBias }
    }
    const anatomy = limbFoldedImpossible(lm) ?? boneConflict(lm, this.bones)
    if (anatomy) return { score: 0, reason: anatomy, motionBias }

    if (!this.locked || !this.lastLm) {
      const present = poseLooksHuman(lm) ? 0.55 : 0.2
      return { score: present + 0.25 * vis + 0.2 * motionBias, reason: null, motionBias }
    }

    const dt = Math.max(0.016, (now - this.lastSeen) / 1000)
    const predicted = this.lastCenter
      ? {
          x: this.lastCenter.x + this.lastVel.x * dt,
          y: this.lastCenter.y + this.lastVel.y * dt,
        }
      : null
    const torsoMove = center && predicted ? dist(center, predicted) : 1
    if (center && predicted && torsoMove > 0.4) {
      return { score: 0, reason: 'torso jump', motionBias }
    }
    if (this.lastScale && scale) {
      const ratio = scale / this.lastScale
      if (ratio > 2.3 || ratio < 0.42) return { score: 0, reason: 'scale jump', motionBias }
    }
    const roi = this.roi(Math.hypot(this.lastVel.x, this.lastVel.y) * 0.04)
    if (mode !== 'full' && roi && center && !contains(expandBox(roi, 0.06, 0.08), center)) {
      return { score: 0, reason: 'outside ROI', motionBias }
    }
    const prox = coreProximity(this.lastLm, lm)
    if (prox > 0.38) return { score: 0, reason: 'joints teleport', motionBias }

    const iou = box && this.lastBox ? boxIou(box, expandBox(this.lastBox, 0.12, 0.16)) : 0
    const scaleScore =
      this.lastScale && scale ? Math.max(0, 1 - Math.abs(Math.log(scale / this.lastScale)) / 0.7) : 0.5
    const score =
      0.3 * Math.max(0, 1 - torsoMove / 0.28) +
      0.2 * Math.max(0, 1 - prox / 0.28) +
      0.16 * iou +
      0.12 * scaleScore +
      0.12 * vis +
      0.1 * motionBias
    return { score, reason: null, motionBias }
  }

  select(
    candidates: Landmark[][],
    now: number,
    motion: BackgroundMotion | null = null,
  ): SubjectPick {
    const lostMs = this.locked && this.lastSeen ? now - this.lastSeen : Number.POSITIVE_INFINITY
    const speed = Math.hypot(this.lastVel.x, this.lastVel.y)
    const roi = this.roi(speed * 0.04)
    const reacquire: SubjectDebug['reacquire'] = !this.locked
      ? 'full'
      : lostMs < SUBJECT_LOCAL_MS
        ? lostMs < 40
          ? 'none'
          : 'local'
        : 'full'

    if (lostMs > SUBJECT_DROP_MS) {
      this.locked = false
      this.bones = null
      this.boneFrames = 0
    }

    const rejected: RejectedPose[] = []
    let best: { lm: Landmark[]; score: number; motionBias: number } | null = null
    for (const raw of candidates) {
      const clean = sanitizePose(raw, this.lastLm)
      const scored = this.scoreAgainstLock(clean, now, motion, reacquire)
      if (scored.reason) {
        const box = poseBox(clean)
        if (box) rejected.push({ box, reason: scored.reason, score: scored.score })
        continue
      }
      if (!best || scored.score > best.score) {
        best = { lm: clean, score: scored.score, motionBias: scored.motionBias }
      }
    }

    // iPad side-view: nose/ears often drop out. Do not discard the only
    // inverted body just because it looked like a pole without a face.
    if (!best && candidates.length === 1) {
      const clean = sanitizePose(candidates[0]!, this.lastLm)
      if (looksInverted(clean)) {
        const box = poseBox(clean)
        best = { lm: clean, score: 0.5, motionBias: motion?.scoreBox(box) ?? 0 }
      }
    }

    const lockIsProp =
      Boolean(this.lastLm) && (looksLikePole(this.lastLm!) || looksLikeFurniture(this.lastLm!))
    const lockIsStatic =
      Boolean(this.lastBox) && Boolean(motion?.ready) && (motion?.scoreBox(this.lastBox) ?? 1) < 0.1
    if ((lockIsProp || lockIsStatic) && this.locked) {
      let steal: { lm: Landmark[]; score: number; motionBias: number } | null = null
      for (const raw of candidates) {
        if (looksLikePole(raw) || looksLikeFurniture(raw) || !poseLooksHuman(raw)) continue
        const heat = motion?.scoreBox(poseBox(raw)) ?? 0
        const score = 0.55 + 0.45 * heat
        if (!steal || score > steal.score) steal = { lm: raw, score, motionBias: heat }
      }
      if (steal && (lockIsProp || steal.motionBias > 0.22)) {
        this.locked = false
        this.lastLm = null
        this.lastCenter = null
        this.lastPublished = null
        this.bones = null
        this.boneFrames = 0
        best = steal
      }
    }

    const need = this.locked ? (reacquire === 'full' ? 0.4 : 0.48) : 0.38
    if (best && best.score >= need) {
      const wasLocked = this.locked
      const torsoMove =
        this.lastCenter && torsoCenter(best.lm)
          ? dist(this.lastCenter, torsoCenter(best.lm)!)
          : 0
      const stable = stabilizeJoints(this.lastLm, best.lm, torsoMove)
      this.accept(stable, now)
      const debug = emptyDebug({
        locked: true,
        reacquire: 'none',
        confidence: best.score,
        landmarkVis: meanVis(stable),
        motionBias: best.motionBias,
        box: poseBox(stable),
        roi,
        rejected,
        pickReason: wasLocked ? 'continuity' : 'acquired',
      })
      lastDebug = debug
      return { landmarks: stable, debug }
    }

    if (
      this.lastPublished &&
      lostMs < SUBJECT_HOLD_MS &&
      !looksLikePole(this.lastPublished) &&
      !looksLikeFurniture(this.lastPublished)
    ) {
      const debug = emptyDebug({
        locked: true,
        reacquire,
        confidence: 0,
        landmarkVis: meanVis(this.lastPublished),
        motionBias: 0,
        box: this.lastBox,
        roi,
        rejected,
        pickReason: 'holding last subject',
      })
      lastDebug = debug
      return { landmarks: this.lastPublished, debug }
    }

    const debug = emptyDebug({
      locked: this.locked && lostMs < SUBJECT_DROP_MS,
      reacquire,
      confidence: best?.score ?? 0,
      landmarkVis: 0,
      motionBias: 0,
      box: this.lastBox,
      roi,
      rejected,
      pickReason: best ? 'candidate below lock threshold' : 'no usable candidate',
    })
    lastDebug = debug
    return { landmarks: null, debug }
  }
}

export function drawSubjectDebug(
  ctx: CanvasRenderingContext2D,
  debug: SubjectDebug,
  width: number,
  height: number,
) {
  const stroke = (box: NormBox, color: string, widthPx: number) => {
    ctx.strokeStyle = color
    ctx.lineWidth = widthPx
    ctx.strokeRect(box.x * width, box.y * height, box.w * width, box.h * height)
  }
  if (debug.roi) stroke(debug.roi, 'rgba(90, 170, 255, 0.7)', Math.max(2, width * 0.003))
  if (debug.box) stroke(debug.box, 'rgba(80, 255, 170, 0.95)', Math.max(3, width * 0.004))
  for (const bad of debug.rejected) {
    stroke(bad.box, 'rgba(255, 80, 80, 0.85)', Math.max(2, width * 0.003))
    ctx.fillStyle = 'rgba(255, 80, 80, 0.9)'
    ctx.font = `600 ${Math.max(11, width * 0.016)}px sans-serif`
    ctx.fillText(bad.reason, bad.box.x * width + 4, Math.max(14, bad.box.y * height - 4))
  }
}
