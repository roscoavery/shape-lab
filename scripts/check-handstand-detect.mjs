/**
 * Geometry cases for hold recognition (not quality scoring).
 * Run: npx tsx scripts/check-handstand-detect.mjs
 */
import {
  evaluateHandstandGeometry,
  HoldDetector,
  HOLD_COME_DOWN_MS,
  HOLD_ENTER_MS,
  HOLD_EXIT_MS,
  poseLooksLikeHandstand,
} from '../src/lib/handstandDetect.ts'

function pt(x, y, vis = 0.85) {
  return { x, y, z: 0, visibility: vis }
}
function pose(map) {
  const lm = Array.from({ length: 33 }, () => pt(0.5, 0.5, 0.4))
  for (const [i, v] of Object.entries(map)) lm[Number(i)] = v
  return lm
}
function stacked(yMap, x = 0.5) {
  return pose({
    0: pt(x, yMap[0]),
    11: pt(x - 0.04, yMap.sh),
    12: pt(x + 0.04, yMap.sh),
    13: pt(x - 0.04, yMap.el),
    14: pt(x + 0.04, yMap.el),
    15: pt(x - 0.04, yMap.wr),
    16: pt(x + 0.04, yMap.wr),
    23: pt(x - 0.03, yMap.hp),
    24: pt(x + 0.03, yMap.hp),
    25: pt(x - 0.03, yMap.kn),
    26: pt(x + 0.03, yMap.kn),
    27: pt(x - 0.03, yMap.an),
    28: pt(x + 0.03, yMap.an),
    29: pt(x - 0.03, yMap.an, yMap.footVis ?? 0.85),
    30: pt(x + 0.03, yMap.an, yMap.footVis ?? 0.85),
  })
}

const stand = stacked({ 0: 0.16, sh: 0.28, el: 0.42, wr: 0.58, hp: 0.55, kn: 0.72, an: 0.9 })
const pike = stacked({ 0: 0.42, sh: 0.4, el: 0.58, wr: 0.86, hp: 0.5, kn: 0.7, an: 0.9 })
const pikePlanted = stacked({ 0: 0.48, sh: 0.52, el: 0.7, wr: 0.88, hp: 0.48, kn: 0.7, an: 0.9 })
const armsUp = stacked({ 0: 0.16, sh: 0.28, el: 0.18, wr: 0.1, hp: 0.55, kn: 0.72, an: 0.9 })
const hs = stacked({ 0: 0.78, sh: 0.72, el: 0.8, wr: 0.9, hp: 0.46, kn: 0.3, an: 0.14 })
const arched = stacked({ 0: 0.74, sh: 0.7, el: 0.8, wr: 0.9, hp: 0.52, kn: 0.34, an: 0.2 })
const piked = stacked({ 0: 0.8, sh: 0.72, el: 0.8, wr: 0.9, hp: 0.58, kn: 0.4, an: 0.26 })
const bentElbow = (() => {
  const lm = stacked({ 0: 0.78, sh: 0.7, el: 0.78, wr: 0.88, hp: 0.46, kn: 0.3, an: 0.14 })
  // Pull the elbows forward so the arms are actually bent, not just shorter.
  lm[13] = pt(0.38, 0.78)
  lm[14] = pt(0.62, 0.78)
  return lm
})()
const hsNoFeet = stacked({
  0: 0.78,
  sh: 0.72,
  el: 0.8,
  wr: 0.9,
  hp: 0.44,
  kn: 0.28,
  an: 0.12,
  footVis: 0.04,
})
const occludedWrist = (() => {
  const lm = stacked({ 0: 0.78, sh: 0.72, el: 0.8, wr: 0.9, hp: 0.46, kn: 0.3, an: 0.14 })
  lm[15] = pt(0.46, 0.9, 0.08)
  return lm
})()
const mirrored = hs.map((p) => ({ ...p, x: 1 - p.x }))
const angled = stacked({ 0: 0.78, sh: 0.72, el: 0.8, wr: 0.9, hp: 0.46, kn: 0.3, an: 0.14 }, 0.58)

function assert(name, ok, extra) {
  if (!ok) {
    console.error('FAIL', name, extra ?? '')
    return 1
  }
  console.log('ok', name)
  return 0
}

function holdAfter(poseLm, ms, step = 40) {
  const det = new HoldDetector()
  let t = 10_000
  let sample = det.push(poseLm, t)
  for (let elapsed = 0; elapsed <= ms; elapsed += step) {
    t += step
    sample = det.push(poseLm, t)
  }
  return sample
}

let failed = 0
failed += assert('standing is not a handstand', !poseLooksLikeHandstand(stand))
failed += assert('pike / hands on floor is not a handstand', !poseLooksLikeHandstand(pike))
failed += assert('pike planted is not a handstand', !poseLooksLikeHandstand(pikePlanted))
failed += assert('standing arms up is not a handstand', !poseLooksLikeHandstand(armsUp))
failed += assert('straight handstand counts', poseLooksLikeHandstand(hs))
failed += assert('slightly arched still counts', poseLooksLikeHandstand(arched))
failed += assert('slightly piked still counts', poseLooksLikeHandstand(piked))
failed += assert('standing confidence low', evaluateHandstandGeometry(stand).confidence < 0.45)
failed += assert('handstand confidence high', evaluateHandstandGeometry(hs).confidence >= 0.7)
failed += assert('bent-elbow handstand still recognized', poseLooksLikeHandstand(bentElbow))
failed += assert(
  'recognition stays high for imperfect but real handstands',
  evaluateHandstandGeometry(arched).confidence >= 0.7 &&
    evaluateHandstandGeometry(piked).confidence >= 0.7 &&
    evaluateHandstandGeometry(bentElbow).confidence >= 0.62,
)
failed += assert('feet out of frame still counts', poseLooksLikeHandstand(hsNoFeet))
failed += assert('one occluded wrist still counts', poseLooksLikeHandstand(occludedWrist))
failed += assert(
  'front-camera mirror does not change confidence',
  Math.abs(evaluateHandstandGeometry(hs).confidence - evaluateHandstandGeometry(mirrored).confidence) < 0.02,
)
failed += assert('slight camera angle still counts', poseLooksLikeHandstand(angled))

const first = new HoldDetector().push(hs, 1_000)
failed += assert('first frame is only a candidate', !first.holding && first.candidate)

failed += assert('cartwheel / brief kick does not start a hold', !holdAfter(hs, 200).holding)
failed += assert('straight HS holds after the stability window', holdAfter(hs, HOLD_ENTER_MS + 40).holding)
failed += assert('arched HS can still start a hold', holdAfter(arched, HOLD_ENTER_MS + 40).holding)
failed += assert('piked HS can still start a hold', holdAfter(piked, HOLD_ENTER_MS + 40).holding)

const jitter = new HoldDetector()
let t = 1_000
jitter.push(hs, t)
t += HOLD_ENTER_MS + 40
failed += assert('stable window starts the hold', jitter.push(hs, t).holding)
t += 40
failed += assert('brief standing jitter must not drop the hold', jitter.push(stand, t).holding)
t += 40
failed += assert('return to the handstand keeps the hold', jitter.push(hs, t).holding)

const comeDown = new HoldDetector()
t = 2_000
comeDown.push(hs, t)
t += HOLD_ENTER_MS + 40
comeDown.push(hs, t)
for (let i = 0; i < Math.ceil(HOLD_COME_DOWN_MS / 40) + 2; i += 1) {
  t += 40
  comeDown.push(stand, t)
}
failed += assert('coming down should end the hold', !comeDown.push(stand, t + 40).holding)

const softExit = new HoldDetector()
t = 3_000
softExit.push(hs, t)
t += HOLD_ENTER_MS + 40
softExit.push(hs, t)
// Arms-up standing is a hard fail; use a near-vertical reach that is not inverted.
for (let i = 0; i < Math.ceil(HOLD_EXIT_MS / 40) + 2; i += 1) {
  t += 40
  softExit.push(armsUp, t)
}
failed += assert('sustained invalid ends the hold', !softExit.push(armsUp, t + 40).holding)

if (failed) {
  console.error(`${failed} handstand detect checks failed`)
  process.exit(1)
}
console.log('detect ok')
