/**
 * Sanity-check handstand hold geometry against standing / inverted poses.
 * Run: node scripts/check-hold-geometry.mjs
 */
import { readFileSync } from 'node:fs'

const src = readFileSync(new URL('../src/lib/handstandHold.ts', import.meta.url), 'utf8')
if (!src.includes('feet often leave the frame')) {
  throw new Error('handstandHold.ts is missing the feet-out-of-frame path')
}
if (!src.includes('SALVAGE_HOLD_SEC')) {
  throw new Error('handstandHold.ts is missing Done salvage')
}
if (!src.includes('A pike / reach used to count')) {
  throw new Error('handstandHold.ts is missing the planted-hands + feet-off gate')
}
if (!src.includes('HOLD_ENTER_FRAMES = 8')) {
  throw new Error('handstandHold.ts should wait ~8 frames before the clock starts')
}

function pt(y, vis = 0.9) {
  return { x: 0.5, y, z: 0, visibility: vis }
}

function pose(overrides) {
  const lm = Array.from({ length: 33 }, () => pt(0.5))
  for (const [i, v] of Object.entries(overrides)) lm[Number(i)] = v
  return lm
}

function visOk(p, min = 0.04) {
  return Boolean(p) && Number.isFinite(p.x) && Number.isFinite(p.y) && (p.visibility ?? 1) >= min
}

function pairY(a, b, min = 0.04) {
  const pts = [a, b].filter((p) => visOk(p, min))
  if (!pts.length) return null
  return pts.reduce((s, p) => s + p.y, 0) / pts.length
}

function handsOnGround(lm) {
  const wristY = pairY(lm[15], lm[16], 0.03)
  const tipY = pairY(lm[19], lm[20], 0.03)
  const handY = wristY ?? tipY
  if (handY == null) return false
  const shoulderY = pairY(lm[11], lm[12], 0.03)
  const hipY = pairY(lm[23], lm[24], 0.03)
  const ankleY = pairY(lm[27], lm[28], 0.03)
  const heelY = pairY(lm[29], lm[30], 0.03)
  const footY = ankleY ?? heelY
  if (shoulderY != null && handY < shoulderY) return false
  if (footY != null && footY > handY + 0.07) return false
  if (footY == null && handY < 0.42) return false
  if (hipY != null && handY < hipY - 0.02) return false
  return true
}

function feetOffGround(lm) {
  const wristY = pairY(lm[15], lm[16], 0.03) ?? pairY(lm[19], lm[20], 0.03) ?? 0.82
  const hipY = pairY(lm[23], lm[24], 0.03)
  const ankleY = pairY(lm[27], lm[28], 0.03)
  const heelY = pairY(lm[29], lm[30], 0.03)
  const footY = ankleY ?? heelY
  if (footY == null) return hipY != null && hipY < wristY - 0.04
  const floorY = wristY - 0.1
  const left = [lm[27], lm[29], lm[31]].some((p) => visOk(p, 0.05) && p.y > floorY)
  const right = [lm[28], lm[30], lm[32]].some((p) => visOk(p, 0.05) && p.y > floorY)
  return !left && !right
}

function poseInverted(lm) {
  const wristY = pairY(lm[15], lm[16], 0.03) ?? pairY(lm[19], lm[20], 0.03)
  const hipY = pairY(lm[23], lm[24], 0.03)
  const shoulderY = pairY(lm[11], lm[12], 0.03)
  const ankleY = pairY(lm[27], lm[28], 0.03) ?? pairY(lm[29], lm[30], 0.03)
  const noseY = visOk(lm[0], 0.03) ? lm[0].y : null
  const handsDown = handsOnGround(lm)
  const feetOff = feetOffGround(lm)
  const headLow = noseY != null && hipY != null && noseY > hipY + 0.05
  const hipsAboveHands = wristY != null && hipY != null && hipY < wristY - 0.04
  const feetAboveHands = wristY != null && ankleY != null && ankleY < wristY - 0.08
  const feetAboveShoulders = shoulderY != null && ankleY != null && ankleY < shoulderY - 0.04
  const longInvert = wristY != null && ankleY != null && wristY - ankleY > 0.2
  if (!handsDown || !feetOff) return false
  return hipsAboveHands || feetAboveHands || feetAboveShoulders || longInvert || headLow
}

const hs = pose({
  0: pt(0.8),
  11: pt(0.7),
  12: pt(0.7),
  15: pt(0.88),
  16: pt(0.88),
  23: pt(0.48),
  24: pt(0.48),
  27: pt(0.16),
  28: pt(0.16),
})
const hsNoFeet = pose({
  0: pt(0.8, 0.08),
  11: pt(0.7, 0.08),
  12: pt(0.7, 0.08),
  15: pt(0.88, 0.06),
  16: pt(0.88, 0.06),
  23: pt(0.42, 0.08),
  24: pt(0.42, 0.08),
  27: pt(0.2, 0),
  28: pt(0.2, 0),
})
const stand = pose({
  0: pt(0.16),
  11: pt(0.28),
  12: pt(0.28),
  15: pt(0.58),
  16: pt(0.58),
  23: pt(0.55),
  24: pt(0.55),
  27: pt(0.9),
  28: pt(0.9),
})
const armsUp = pose({
  0: pt(0.16),
  11: pt(0.28),
  12: pt(0.28),
  15: pt(0.1),
  16: pt(0.1),
  23: pt(0.55),
  24: pt(0.55),
  27: pt(0.9),
  28: pt(0.9),
})
const pikeReach = pose({
  0: pt(0.4),
  11: pt(0.38),
  12: pt(0.38),
  15: pt(0.72),
  16: pt(0.72),
  23: pt(0.5),
  24: pt(0.5),
  27: pt(0.9),
  28: pt(0.9),
})
const pikePlanted = pose({
  0: pt(0.48),
  11: pt(0.52),
  12: pt(0.52),
  15: pt(0.88),
  16: pt(0.88),
  23: pt(0.48),
  24: pt(0.48),
  27: pt(0.9),
  28: pt(0.9),
})

const checks = [
  ['handstand', poseInverted(hs), true],
  ['handstand feet out of frame', poseInverted(hsNoFeet), true],
  ['standing', poseInverted(stand), false],
  ['standing arms up', poseInverted(armsUp), false],
  ['pike reaching (hands not planted)', poseInverted(pikeReach), false],
  ['pike planted, feet still down', poseInverted(pikePlanted), false],
  ['standing hands not planted', handsOnGround(stand), false],
  ['pike reach hands not planted', handsOnGround(pikeReach), false],
  ['handstand hands planted', handsOnGround(hs), true],
]
let failed = 0
for (const [name, got, want] of checks) {
  if (got !== want) {
    failed += 1
    console.error(`FAIL ${name}: got ${got}, want ${want}`)
  } else {
    console.log(`ok ${name}`)
  }
}
if (failed) process.exit(1)
console.log('geometry ok')
