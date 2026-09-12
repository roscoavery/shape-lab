/**
 * Athlete tracker: lock the person, reject furniture limbs, keep a handstand.
 * Run: npx tsx scripts/check-athlete-track.mjs
 */
import { AthleteTracker, clipImpossibleBones } from '../src/lib/athleteTrack.ts'
import { swapUpperLower } from '../src/lib/handstandDetect.ts'
import { looksInverted, looksLikePole } from '../src/lib/poseSubject.ts'

function pt(x, y, vis = 0.85) {
  return { x, y, z: 0, visibility: vis }
}

function stacked(x, yMap, vis = 0.85) {
  const lm = Array.from({ length: 33 }, () => pt(x, 0.5, 0.4))
  const put = (i, px, py, v = vis) => {
    lm[i] = pt(px, py, v)
  }
  put(0, x, yMap[0])
  put(11, x - 0.07, yMap.sh)
  put(12, x + 0.07, yMap.sh)
  put(13, x - 0.08, yMap.el)
  put(14, x + 0.08, yMap.el)
  put(15, x - 0.07, yMap.wr)
  put(16, x + 0.07, yMap.wr)
  put(23, x - 0.04, yMap.hp)
  put(24, x + 0.04, yMap.hp)
  put(25, x - 0.04, yMap.kn)
  put(26, x + 0.04, yMap.kn)
  put(27, x - 0.04, yMap.an)
  put(28, x + 0.04, yMap.an)
  return lm
}

const standAt = (x) =>
  stacked(x, { 0: 0.16, sh: 0.28, el: 0.42, wr: 0.58, hp: 0.55, kn: 0.72, an: 0.9 })
const hsAt = (x) =>
  stacked(x, { 0: 0.78, sh: 0.72, el: 0.8, wr: 0.9, hp: 0.46, kn: 0.3, an: 0.14 })

const pianoStand = Array.from({ length: 33 }, (_, i) => {
  const y = 0.28 + (i % 12) * 0.04
  return pt(0.78, y, i === 0 ? 0.05 : 0.8)
})

let failed = 0
function assert(name, ok, extra) {
  if (!ok) {
    failed += 1
    console.error('FAIL', name, extra ?? '')
  } else {
    console.log('ok', name)
  }
}

const chimera = standAt(0.35)
chimera[15] = pt(0.92, 0.08, 0.9)
chimera[16] = pt(0.94, 0.1, 0.88)
const clipped = clipImpossibleBones(chimera)
assert(
  'room-crossing wrists are clipped off the skeleton',
  (clipped.lm[15].visibility ?? 1) < 0.1 && (clipped.lm[16].visibility ?? 1) < 0.1,
  clipped.lm[15],
)
assert('torso survives a wild wrist', (clipped.lm[11].visibility ?? 1) > 0.5)

assert('keyboard stand is still a pole', looksLikePole(pianoStand))

const tracker = new AthleteTracker()
const empty = tracker.push([], 1_000)
assert('empty room publishes no skeleton', empty.stabilized == null)

const first = tracker.push([standAt(0.32), pianoStand], 1_040)
assert('acquires the person, not the stand', Boolean(first.stabilized), first.debug)
assert(
  'state is acquiring or locked',
  first.state === 'acquiring' || first.state === 'locked',
  first.state,
)

const locked = tracker.push([standAt(0.33)], 1_040 + 200)
assert('locks after the acquire window', locked.state === 'locked', locked.debug)

const stolen = tracker.push([pianoStand], 1_280)
assert(
  'furniture-only frame keeps the last athlete',
  stolen.stabilized != null && stolen.debug.predicted,
  stolen.debug,
)

const kick = tracker.push([hsAt(0.34)], 1_360)
assert('kick-up at the same place stays locked', kick.state === 'locked' && Boolean(kick.stabilized), kick.debug)

const fly = hsAt(0.34)
fly[16] = pt(0.97, 0.04, 0.95)
const gated = tracker.push([fly], 1_400)
assert(
  'teleporting wrist is not drawn across the frame',
  gated.stabilized != null && (gated.stabilized[16].visibility ?? 1) < 0.5,
  gated.stabilized?.[16],
)

const lone = new AthleteTracker()
const side = hsAt(0.42)
for (let i = 0; i <= 10; i++) side[i] = pt(0.42, 0.78, 0.04)
const hit = lone.push([side], 2_000)
assert('side handstand without a face still acquires', Boolean(hit.stabilized), hit.debug)

const onlyPole = new AthleteTracker().push([pianoStand], 3_000)
assert('never locks a stand alone', onlyPole.stabilized == null, onlyPole.debug)

const down = new AthleteTracker()
down.push([hsAt(0.36)], 4_000)
down.push([hsAt(0.36)], 4_200)
const after = down.push([standAt(0.36), pianoStand], 4_360)
assert(
  'come-down locks the standing person, not the furniture',
  Boolean(after.stabilized) && !looksLikePole(after.stabilized),
  after.debug,
)
const torsoX = after.stabilized ? (after.stabilized[11].x + after.stabilized[12].x) / 2 : 0
assert('come-down torso stays on the athlete', Math.abs(torsoX - 0.36) < 0.12, torsoX)

const invertPole = Array.from({ length: 33 }, (_, i) => {
  const y = 0.12 + (i % 12) * 0.06
  return pt(0.82, y, i === 0 ? 0.05 : 0.85)
})
invertPole[15] = pt(0.82, 0.9, 0.85)
invertPole[16] = pt(0.82, 0.9, 0.85)
invertPole[23] = pt(0.82, 0.4, 0.85)
invertPole[24] = pt(0.82, 0.4, 0.85)
invertPole[27] = pt(0.82, 0.16, 0.85)
invertPole[28] = pt(0.82, 0.16, 0.85)
const stuck = new AthleteTracker()
stuck.push([hsAt(0.34)], 6_000)
stuck.push([hsAt(0.34)], 6_200)
const jumped = stuck.push([invertPole], 6_360)
const jumpedX = jumped.stabilized
  ? (jumped.stabilized[11].x + jumped.stabilized[12].x) / 2
  : null
assert(
  'after a hold, an inverted stand across the room is not drawn',
  jumped.stabilized == null || Math.abs((jumpedX ?? 0.82) - 0.82) > 0.2,
  jumped.debug,
)

const keep = new AthleteTracker()
keep.push([hsAt(0.34)], 7_000)
keep.push([hsAt(0.34)], 7_200)
const withStand = keep.push([hsAt(0.34), standAt(0.82)], 7_360)
const keepX = withStand.stabilized
  ? (withStand.stabilized[11].x + withStand.stabilized[12].x) / 2
  : 0
assert(
  'keeps the inverted body when a standing ghost is also proposed',
  Boolean(withStand.stabilized) && Math.abs(keepX - 0.34) < 0.12,
  withStand.debug,
)
const farStand = keep.push([standAt(0.82)], 7_440)
const farX = farStand.stabilized
  ? (farStand.stabilized[11].x + farStand.stabilized[12].x) / 2
  : null
assert(
  'does not steal a standing pose across the room mid-hold',
  farStand.stabilized == null || Math.abs((farX ?? 0.82) - 0.82) > 0.2,
  farStand.debug,
)

const otherWay = new AthleteTracker()
otherWay.push([standAt(0.68)], 8_000)
otherWay.push([standAt(0.68)], 8_200)
const flippedHs = swapUpperLower(hsAt(0.7))
const otherKick = otherWay.push([flippedHs, pianoStand], 8_360)
const otherX = otherKick.stabilized
  ? (otherKick.stabilized[11].x + otherKick.stabilized[12].x) / 2
  : null
assert(
  'opposite-facing kick-up stays on the athlete, not the stand',
  Boolean(otherKick.stabilized) &&
    looksInverted(otherKick.stabilized) &&
    Math.abs((otherX ?? 0) - 0.7) < 0.14,
  otherKick.debug,
)

const lampFirst = new AthleteTracker()
const hsThenLamp = lampFirst.push([pianoStand, hsAt(0.3)], 9_000)
const hsThenX = hsThenLamp.stabilized
  ? (hsThenLamp.stabilized[11].x + hsThenLamp.stabilized[12].x) / 2
  : null
assert(
  'inverted athlete wins on the first frame when a stand is also proposed',
  Boolean(hsThenLamp.stabilized) && Math.abs((hsThenX ?? 0) - 0.3) < 0.12,
  hsThenLamp.debug,
)

if (failed) {
  console.error(`${failed} athlete track checks failed`)
  process.exit(1)
}
console.log('athlete track ok')
