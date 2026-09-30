/**
 * "Say this instead": cue swaps that lead with what works — Ryan's cue as
 * the headline, the old cue and the reason behind a "Why this works"
 * disclosure. Shown in the Learn guide below the skill cards.
 *
 * Moved here from the old ryanSkillPath.ts during the Phase 5 skill merge
 * cleanup (2026-09-26). Content unchanged.
 */

export interface CueSwap {
  id: string
  insteadOf: string
  sayThis: string
  why: string
}

export const RYAN_CUE_SWAPS: CueSwap[] = [
  {
    id: 'snap-down',
    insteadOf: '\u201cSnap down\u201d',
    sayThis: 'Teach the rebound shape directly, not a handstand snapdown',
    why: 'Handstand snapdowns for lower level athletes are where bad rebound habits start: body segmentation, bending and jumping, breaking shapes. Done correctly by higher level athletes working blocking skills they can be genuinely useful. Teach good habits and be patient with approximation at the same time.',
  },
  {
    id: 'drive-toes',
    insteadOf: '\u201cDrive your toes!\u201d',
    sayThis: 'Hips up too',
    why: 'Driving toes alone leads to piking. The hips have to come up with them.',
  },
  {
    id: 'dont-be-scared',
    insteadOf: '\u201cDon\u2019t be scared\u201d',
    sayThis: 'Name what is actually happening and shrink the step',
    why: 'It usually doesnt help when athletes are struggling with fear. Fear needs a smaller agreed step, not a command.',
  },
  {
    id: 'chin-in',
    insteadOf: '\u201cGet your chin in\u201d (handsprings)',
    sayThis: '\u201cCover the ears and look through your hands\u201d',
    why: 'It puts the head where it needs to be without collapsing the chest.',
  },
  {
    id: 'chin-to-chest',
    insteadOf: '\u201cChin to chest\u201d',
    sayThis: 'Neutral head, chin slightly down, rounded thoracic spine',
    why: 'Round your thoracic spine to bring the head in naturally.',
  },
  {
    id: 'big-rebound',
    insteadOf: '\u201cBig rebound\u201d out of round offs',
    sayThis: '\u201cTight zombie at the end\u201d \u2014 arms in front, armpits past the toes, stand into the springs',
    why: 'A smaller rebound with the right shapes beats a big one with bent hips and knees. The rebound recycles momentum; bend-and-jump defeats the purpose.',
  },
  {
    id: 'sit',
    insteadOf: '\u201cSit\u201d (handsprings)',
    sayThis: '\u201cBend\u201d',
    why: 'Nobody is putting their weight onto an object to sit on. Bend describes what the body actually does.',
  },
  {
    id: 'lean',
    insteadOf: '\u201cLean\u201d',
    sayThis: '\u201cFall\u201d',
    why: 'Lean means putting weight on another object. There is no object. Fall is the honest word.',
  },
  {
    id: 'throw-it',
    insteadOf: '\u201cThrow it\u201d',
    sayThis: '\u201cExecute it\u201d / \u201cperform it\u201d / \u201cdo it\u201d',
    why: 'Throw encourages recklessly throwing the body at the skill. Execute asks for the skill on purpose.',
  },
]
