/**
 * Subject-lock cases: keep the athlete, reject background ghosts.
 * Run: npx tsx scripts/check-pose-subject.mjs
 */
import { bodyCenterOfMass } from '../src/lib/skeleton.ts'
import {
  SubjectLock,
  SUBJECT_DROP_MS,
  SUBJECT_HOLD_MS,
  looksLikePole,
  poseLooksHuman,
  sanitizePose,
  torsoCenter,
} from '../src/lib/poseSubject.ts'

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
const chair = stacked(0.88, {
  0: 0.62,
  sh: 0.64,
  el: 0.66,
  wr: 0.68,
  hp: 0.7,
  kn: 0.74,
  an: 0.78,
})
for (const p of chair) {
  if (p.y === 0.5) p.visibility = 0.05
}

let failed = 0
function assert(name, ok, extra) {
  if (!ok) {
    failed += 1
    console.error('FAIL', name, extra ?? '')
  } else {
    console.log('ok', name)
  }
}

const pianoStand = Array.from({ length: 33 }, (_, i) => {
  const y = 0.28 + (i % 12) * 0.04
  return pt(0.78, y, i === 0 ? 0.05 : 0.8)
})

const com = bodyCenterOfMass(hsAt(0.4))
assert(
  'COM sits between hips and shoulders',
  Boolean(com) && com.y > 0.4 && com.y < 0.7,
  com,
)
assert('standing looks human', poseLooksHuman(standAt(0.4)))
assert('handstand looks human', poseLooksHuman(hsAt(0.4)))
assert('tiny furniture cluster is not a person', !poseLooksHuman(chair))
assert('keyboard stand is a pole, not a person', looksLikePole(pianoStand) && !poseLooksHuman(pianoStand))
const sideHs = stacked(0.42, { 0: 0.78, sh: 0.72, el: 0.8, wr: 0.9, hp: 0.46, kn: 0.3, an: 0.14 })
sideHs[12] = pt(0.43, 0.72, 0.2)
sideHs[14] = pt(0.43, 0.8, 0.15)
sideHs[16] = pt(0.43, 0.9, 0.12)
assert('side-view handstand is not a pole', !looksLikePole(sideHs) && poseLooksHuman(sideHs))
const ghost = hsAt(0.4)
ghost[12] = pt(0.92, 0.2, 0.45)
const cleaned = sanitizePose(ghost)
assert(
  'hidden-side shoulder across the room is dropped',
  (cleaned[12].visibility ?? 1) < 0.1 && Math.abs(cleaned[11].x - 0.33) < 0.1,
  cleaned[12],
)
const onlyPole = new SubjectLock().select([pianoStand], 100)
assert('never locks onto a stand alone', !onlyPole.landmarks && !onlyPole.debug.locked, onlyPole.debug)

const lock = new SubjectLock()
const first = lock.select([standAt(0.32), chair], 1_000)
assert('acquires the person, not the furniture', Boolean(first.landmarks) && first.debug.locked, first.debug)
assert(
  'locked torso stays on the athlete',
  first.landmarks != null && Math.abs((torsoCenter(first.landmarks)?.x ?? 1) - 0.32) < 0.08,
)

const stolen = lock.select([chair], 1_040)
assert(
  'background-only frame does not steal the lock',
  stolen.debug.locked && stolen.debug.pickReason === 'holding last subject',
  stolen.debug,
)
assert(
  'published pose stays on the athlete',
  Math.abs((torsoCenter(stolen.landmarks)?.x ?? 1) - 0.32) < 0.08,
)

const afterHold = lock.select([chair], 1_000 + SUBJECT_HOLD_MS + 40)
assert(
  'after the hold window, do not publish the furniture',
  afterHold.landmarks == null,
  afterHold.debug,
)
assert('identity is still remembered for reacquire', afterHold.debug.locked)

const back = lock.select([standAt(0.34)], 1_000 + SUBJECT_HOLD_MS + 80)
assert('reacquires near the last location', Boolean(back.landmarks) && back.debug.locked, back.debug)

const jump = new SubjectLock()
jump.select([standAt(0.3)], 2_000)
const far = jump.select([standAt(0.88)], 2_040)
assert(
  'torso teleport across the room is rejected',
  far.landmarks == null || far.debug.pickReason === 'holding last subject',
  far.debug,
)

const standSteal = new SubjectLock()
standSteal.select([hsAt(0.42)], 2_500)
const ontoStand = standSteal.select([pianoStand, hsAt(0.44)], 2_540)
assert(
  'keeps the handstand when a keyboard stand is also proposed',
  ontoStand.landmarks != null && Math.abs((torsoCenter(ontoStand.landmarks)?.x ?? 1) - 0.43) < 0.1,
  ontoStand.debug,
)
const onlyStand = standSteal.select([pianoStand], 2_580)
assert(
  'does not jump onto the stand when the athlete flickers',
  onlyStand.landmarks == null || onlyStand.debug.pickReason === 'holding last subject',
  onlyStand.debug,
)

const two = new SubjectLock()
two.select([standAt(0.28)], 3_000)
const pick = two.select([standAt(0.86), standAt(0.3)], 3_040)
assert(
  'with two candidates, keeps the nearby person',
  Math.abs((torsoCenter(pick.landmarks)?.x ?? 1) - 0.3) < 0.08,
  pick.debug,
)

const kick = new SubjectLock()
kick.select([standAt(0.4)], 4_000)
const inverted = kick.select([hsAt(0.4)], 4_080)
assert(
  'kick-up at the same place is still the same subject',
  Boolean(inverted.landmarks) && inverted.debug.locked,
  inverted.debug,
)

const wristSteal = new SubjectLock()
const body = standAt(0.4)
wristSteal.select([body], 5_000)
const mixed = standAt(0.4).map((p) => ({ ...p }))
mixed[15] = pt(0.92, 0.12, 0.95)
mixed[16] = pt(0.94, 0.1, 0.95)
const held = wristSteal.select([mixed], 5_040)
assert(
  'wrists that jump to a wall object stay near the last arms',
  held.landmarks != null && held.landmarks[15].x < 0.55,
  held.landmarks?.[15],
)

const drop = new SubjectLock()
drop.select([standAt(0.4)], 6_000)
const gone = drop.select([], 6_000 + SUBJECT_DROP_MS + 20)
assert('lock drops after the athlete is truly lost', !gone.debug.locked, gone.debug)

if (failed) {
  console.error(`${failed} pose subject checks failed`)
  process.exit(1)
}
console.log('pose subject ok')
