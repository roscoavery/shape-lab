/**
 * Multiple-choice bank for Learn → Physics test.
 * Gym applications of the tumbling-physics lessons — not a textbook exam.
 */

export type PhysicsQuizChoice = {
  id: string
  label: string
}

export type PhysicsQuizItem = {
  id: string
  lessonId: string
  prompt: string
  choices: PhysicsQuizChoice[]
  answerId: string
  /** Shown after the test on misses so they can learn the right idea immediately. */
  explain: string
}

export const PHYSICS_QUIZ_BANK: PhysicsQuizItem[] = [
  {
    id: 'inertia-connection',
    lessonId: 'inertia',
    prompt:
      'After a round-off, the back handspring should treat leftover travel and rotation as:',
    choices: [
      { id: 'a', label: 'Something to kill — pause until the body is at a dead stop' },
      { id: 'b', label: 'Motion to use — the connection redirects what inertia already built' },
      { id: 'c', label: 'A problem only the arms can solve by staying glued overhead' },
      { id: 'd', label: 'New flip that starts from zero once the feet land' },
    ],
    answerId: 'b',
    explain:
      'Inertia: a body keeps doing what it is doing until a force changes it. The round-off already put travel and rotation in the system. Hands, shoulders, and the block redirect that — they do not start a new skill from rest.',
  },
  {
    id: 'inertia-fight',
    lessonId: 'inertia',
    prompt: 'Fighting leftover round-off motion instead of using it often looks like:',
    choices: [
      { id: 'a', label: 'A stall, a pike, or a connection that never quite gets the feet in front' },
      { id: 'b', label: 'Extra height with no rotation' },
      { id: 'c', label: 'An early twist' },
      { id: 'd', label: 'Over-rotation of a layout' },
    ],
    answerId: 'a',
    explain:
      'If they try to reset from a dead stop, they are fighting inertia. That fight shows up as a stall, a pike, or feet that lose the race to get in front for the handspring.',
  },
  {
    id: 'l-takeoff',
    lessonId: 'angular-momentum',
    prompt: 'How much flip an athlete has in the air is mostly:',
    choices: [
      { id: 'a', label: 'Created by tucking harder after they leave the floor' },
      { id: 'b', label: 'Set on takeoff, before the feet (or hands) leave' },
      { id: 'c', label: 'Added by opening to a layout' },
      { id: 'd', label: 'Invented by a late pike' },
    ],
    answerId: 'b',
    explain:
      'Angular momentum (L) is largely decided on takeoff. In flight, L stays about the same. Tucking and opening change how that L is spent — they do not mint new flip from nothing.',
  },
  {
    id: 'l-tuck-spend',
    lessonId: 'angular-momentum',
    prompt: 'Tucking tighter in the air does what to angular momentum?',
    choices: [
      { id: 'a', label: 'Creates new L so a weak set can still finish a layout' },
      { id: 'b', label: 'Increases moment of inertia so they float' },
      { id: 'c', label: 'Spends the L they already have at a faster spin rate by shrinking I' },
      { id: 'd', label: 'Replaces the set' },
    ],
    answerId: 'c',
    explain:
      'L ≈ Iω. Shrink I (tuck) and ω goes up. That is spending the budget, not adding to it. A weak set still does not have enough L for a long layout.',
  },
  {
    id: 'i-layout-vs-tuck',
    lessonId: 'moment-of-inertia',
    prompt: 'Compared with a tight tuck, a long layout has:',
    choices: [
      { id: 'a', label: 'Smaller moment of inertia, so the same L spins faster' },
      { id: 'b', label: 'Larger moment of inertia, so the same L spins slower' },
      { id: 'c', label: 'The same I if the set is strong' },
      { id: 'd', label: 'No moment of inertia, because the body is straight' },
    ],
    answerId: 'b',
    explain:
      'I is how spread out the mass is around the flip axis. A long layout puts mass farther out, so I is larger and the same L produces a slower spin. A tuck hides a modest set because small I makes ω large.',
  },
  {
    id: 'i-get-tight',
    lessonId: 'moment-of-inertia',
    prompt: 'The cue “get tight” in the air is mainly asking the athlete to:',
    choices: [
      { id: 'a', label: 'Increase I so they look longer' },
      { id: 'b', label: 'Decrease I so the same angular momentum turns faster' },
      { id: 'c', label: 'Add angular momentum after takeoff' },
      { id: 'd', label: 'Kill linear speed down the floor' },
    ],
    answerId: 'b',
    explain:
      'Chin in, knees in, arms in: mass closer to the axis, smaller I, higher spin rate. “Stay long” is the opposite cue — and it only works if the set already put enough L in the system.',
  },
  {
    id: 'spin-faster',
    lessonId: 'speed-rotation',
    prompt: 'To spin faster once they are in the air, the useful dial is:',
    choices: [
      { id: 'a', label: 'Increase I — reach longer, open the hips' },
      { id: 'b', label: 'Decrease I — tuck, arms in, knees in' },
      { id: 'c', label: 'Wait for gravity to add flip' },
      { id: 'd', label: 'Pike the chest on the floor after they have already left' },
    ],
    answerId: 'b',
    explain:
      'Once airborne, shape is the main dial left. Smaller I → faster ω. Bigger I → slower ω. Gravity does not hand them extra angular momentum.',
  },
  {
    id: 'layout-secret-pike',
    lessonId: 'speed-rotation',
    prompt:
      'A layout that suddenly “makes it” by piking or pulling a late tuck is usually:',
    choices: [
      { id: 'a', label: 'Inventing extra angular momentum in the air' },
      { id: 'b', label: 'Secretly dropping I so spin rate rises' },
      { id: 'c', label: 'Increasing I to float longer' },
      { id: 'd', label: 'Using leftover run speed as new flip' },
    ],
    answerId: 'b',
    explain:
      'They looked long, then they cheated I down. The same L now turns a smaller package. That is why a slightly piked layout can finish when a true long one would hang — not because they found new L.',
  },
  {
    id: 'ro-arm-drop',
    lessonId: 'roundoff-handspring',
    prompt:
      'A small arm drop after the round-off, before connecting into the back handspring, is useful because it:',
    choices: [
      { id: 'a', label: 'Brakes the run so they can reset' },
      { id: 'b', label: 'Briefly shrinks moment of inertia so the feet can get in front' },
      { id: 'c', label: 'Dumps the shoulders so the block is softer' },
      { id: 'd', label: 'Creates new angular momentum for the flip' },
    ],
    answerId: 'b',
    explain:
      'Feet have to beat the hands. If the body stays long and the arms stay glued up, I is large and turnover is slow. A short, controlled arm drop decreases I so the feet win, then the arms reach back to the block. A collapse that kills the shoulders is not the same thing.',
  },
  {
    id: 'ro-arms-glued',
    lessonId: 'roundoff-handspring',
    prompt:
      'If the arms stay high and the chest stays long with no turnover out of the round-off:',
    choices: [
      { id: 'a', label: 'The feet usually beat the hands anyway' },
      { id: 'b', label: 'I stays large, turnover is slow, and the feet lose the race' },
      { id: 'c', label: 'They will over-rotate the handspring' },
      { id: 'd', label: 'Moment of inertia drops on its own' },
    ],
    answerId: 'b',
    explain:
      'Large I means slow turnover. The feet stay behind. The coaching target is a controlled drop that speeds the feet, then a strong reach — not arms glued up, and not a crash that loses the block.',
  },
  {
    id: 'layout-exposes-set',
    lessonId: 'tuck-vs-layout',
    prompt: 'Layouts expose a weak set more than tucks do because:',
    choices: [
      { id: 'a', label: 'Pretty shapes need less angular momentum' },
      { id: 'b', label: 'Large I means the same L spins slower — not enough L shows up' },
      { id: 'c', label: 'Tucks hide extra L the layout does not have' },
      { id: 'd', label: 'Layouts have smaller I than tucks' },
    ],
    answerId: 'b',
    explain:
      'A tuck keeps mass close to the axis (small I, large ω). A layout is long (large I, slower spin). If the set only bought enough L for a tuck, the layout hangs, pikes, or tucks at the end. That is a set problem wearing a shape costume.',
  },
  {
    id: 'layout-progression',
    lessonId: 'tuck-vs-layout',
    prompt: 'The progression that matches the physics is:',
    choices: [
      { id: 'a', label: 'Lengthen first and hope the layout invents angular momentum' },
      { id: 'b', label: 'Get extra flip in a tuck from that set, then lengthen' },
      { id: 'c', label: 'Pike every layout until it makes it, then call it a layout' },
      { id: 'd', label: 'Drop the arms the same way as a round-off connection' },
    ],
    answerId: 'b',
    explain:
      'If a punch tuck from that set is already a fight, the layout is asking for money they do not have. Get a set with extra flip in a tuck, then stay long. Do not lengthen first and hope L appears.',
  },
  {
    id: 'n3-equal-opposite',
    lessonId: 'block-surfaces',
    prompt: 'In a block, Newton’s third law means:',
    choices: [
      { id: 'a', label: 'The floor pushes the athlete back with an equal force the other way' },
      { id: 'b', label: 'The athlete can invent extra flip after they leave the floor' },
      { id: 'c', label: 'A deeper surface always gives a sharper, shorter redirect' },
      { id: 'd', label: 'Inertia resets to zero when the hands touch' },
    ],
    answerId: 'a',
    explain:
      'If they push the floor, the floor pushes them. That return is the block. Inertia still wants the old direction; the block is the force that redirects it. A deeper surface spends more of that conversation as give, so timing has to stay in the push longer.',
  },
  {
    id: 'n3-surface-depth',
    lessonId: 'block-surfaces',
    prompt: 'Compared with dead floor, a trampoline or a deep Tumble Trak:',
    choices: [
      { id: 'a', label: 'Gives less, so they should punch and leave even sooner' },
      { id: 'b', label: 'Gives deeper and longer, so they must stay in the pushing shape until the bed answers' },
      { id: 'c', label: 'Removes Newton’s third law' },
      { id: 'd', label: 'Adds angular momentum from nothing' },
    ],
    answerId: 'b',
    explain:
      'Deeper give means a longer third-law conversation. Punch-and-leave like dead floor and the return never fully arrives. Sit too long on a spring floor and the return dumps them. Same law, different timing.',
  },
  {
    id: 'twist-contact-vs-late',
    lessonId: 'twisting',
    prompt: 'A contact twist is different from a late (aerial) twist because:',
    choices: [
      { id: 'a', label: 'Contact twist starts while they are still on the floor; late twist is built after they leave' },
      { id: 'b', label: 'Late twist invents new angular momentum; contact twist does not' },
      { id: 'c', label: 'Contact twist only works on trampoline' },
      { id: 'd', label: 'Late twist means they have no flip' },
    ],
    answerId: 'a',
    explain:
      'Contact: feet or hands still on the surface when the shoulders start to turn. Aerial/late: they leave mostly on the flip, then create twist with arms, look, and small asymmetries. Both spend the same L. A weak flip cannot fund a late full.',
  },
  {
    id: 'twist-tilt-i',
    lessonId: 'twisting',
    prompt: 'The tilt method and “arms in to twist faster” are really:',
    choices: [
      { id: 'a', label: 'A new kind of force that only exists in twisting' },
      { id: 'b', label: 'Spending the same angular momentum on a tilted axis, and dropping long-axis I so ω rises' },
      { id: 'c', label: 'Proof that moment of inertia does not apply to twist' },
      { id: 'd', label: 'A reason to throw the twist so early the flip dies' },
    ],
    answerId: 'b',
    explain:
      'Tilt: if the body is a little off the true flip axis, some flip L shows up as twist. Arms in: smaller I around the long axis, faster twist rate — same Iω story as a tuck. Cat twist is a wrap (upper, then lower) without needing a corkscrew set.',
  },
]
