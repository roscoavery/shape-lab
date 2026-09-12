/**
 * Pose-track time vs stretched (slow-mo) saved clips.
 * Run: npx tsx scripts/check-pose-track.mjs
 */
import { mediaStretch, mediaTimeToTrackTime } from '../src/lib/poseTrack.ts'

function lm(y) {
  return Array.from({ length: 33 }, () => ({ x: 0.5, y, z: 0, visibility: 0.9 }))
}

const track = [
  { t: 0, lm: lm(0.8) },
  { t: 11.5, lm: lm(0.4) },
  { t: 23, lm: lm(0.2) },
]

let failed = 0
function assert(name, ok, extra) {
  if (!ok) {
    failed += 1
    console.error('FAIL', name, extra ?? '')
  } else {
    console.log('ok', name)
  }
}

assert('aligned 1x file keeps media time', Math.abs(mediaTimeToTrackTime(10, 23, track, 2, 20) - 10) < 0.001)
assert('1x file stretch is 1', Math.abs(mediaStretch(23, track, 2, 20) - 1) < 0.02)
assert(
  'stretched file maps come-down to the end of the track',
  Math.abs(mediaTimeToTrackTime(40, 40, track, 2, 20) - 23) < 0.05,
)
assert(
  'stretched file stays aligned at the start',
  Math.abs(mediaTimeToTrackTime(0, 40, track, 2, 20) - 0) < 0.001,
)
assert(
  'halfway through a stretched file is halfway through the hold',
  Math.abs(mediaTimeToTrackTime(20, 40, track, 2, 20) - 11.5) < 0.05,
)

const live = [
  { t: 42, lm: lm(0.8) },
  { t: 55, lm: lm(0.2) },
]
assert(
  '1x rolling file keeps absolute time',
  Math.abs(mediaTimeToTrackTime(48, 56, live, 42, 13) - 48) < 0.001,
)
assert(
  'slow rolling file maps file time back to session time',
  Math.abs(mediaTimeToTrackTime(67.2, 67.2, live, 42, 13) - 56) < 0.2,
)
assert('slow rolling stretch is above 1', mediaStretch(67.2, live, 42, 13) > 1.1)

if (failed) {
  console.error(`${failed} pose track checks failed`)
  process.exit(1)
}
console.log('pose track ok')
