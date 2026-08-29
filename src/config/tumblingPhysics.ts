/**
 * Coach-facing tumbling physics. Not a textbook chapter — gym applications
 * of inertia, angular momentum, and moment of inertia.
 */

export type PhysicsLesson = {
  id: string
  title: string
  kicker: string
  body: string[]
  gym: string
}

export const PHYSICS_LESSONS: PhysicsLesson[] = [
  {
    id: 'inertia',
    title: 'Law of inertia',
    kicker: 'A body keeps doing what it is doing until something changes it.',
    body: [
      'Newton’s first law: an object at rest stays at rest, and an object in motion stays in motion at the same speed and in the same direction, unless a net force acts on it. In tumbling that “object” is the athlete.',
      'After a round-off, the body does not magically reset. Linear speed down the floor wants to keep going down the floor. Rotation that is already in the system wants to keep rotating. The connection is not a pause — it is a redirect. Hands, shoulders, and the block are the forces that change what inertia was already doing.',
      'If the round-off leaves the athlete traveling and rotating one way, the back handspring has to use that motion, not fight it from a dead stop. Fighting inertia feels like a stall, a pike, or a connection that never quite gets the feet in front.',
    ],
    gym: 'Cue the connection as using what the round-off already built, not as a new skill that starts from zero.',
  },
  {
    id: 'angular-momentum',
    title: 'Angular momentum',
    kicker: 'How much spin you have in the air is mostly set on takeoff.',
    body: [
      'Angular momentum is the “amount of rotation” in the system. In a simple picture it is L = Iω: moment of inertia times how fast you are spinning. In flight, external torques are small, so angular momentum stays roughly the same until the athlete lands.',
      'That means the flip is largely decided before the feet leave the floor (or the hands leave on a handspring). A weak set cannot be rescued by tucking harder later if there is not enough L to begin with. Tucking changes how that L is shared between shape and spin rate — it does not create new L from nothing.',
      'Coaches feel this as “they don’t have enough flip.” The physics name is not enough angular momentum off the floor. Shape changes (tuck, pike, layout) spend that budget at different spin rates.',
    ],
    gym: 'Train the set and the block so there is enough L. Then teach shape to spend it. Do not ask a layout to finish on a tuck’s takeoff.',
  },
  {
    id: 'moment-of-inertia',
    title: 'Moment of inertia',
    kicker: 'How spread out the body is around the flip axis.',
    body: [
      'Moment of inertia (I) is the body’s resistance to changing its spin. Mass farther from the flip axis makes I larger. A long layout has more I than a tight tuck. Arms overhead, legs straight, and an open hollow all push mass away from the axis. Chin in, knees in, and arms tight pull mass in.',
      'Because L ≈ Iω stays about the same in the air, shrinking I raises ω (spin rate). Growing I lowers ω. That is the whole “tuck to spin, open to float” story, stated cleanly.',
      'I is not a moral quality. A layout is supposed to have a large I. The athlete needs enough angular momentum so that even at that slower spin rate they still make it around. A tuck can hide a modest set because small I makes ω large.',
    ],
    gym: '“Get tight” is a moment-of-inertia cue. “Stay long” is the opposite cue — and it only works if the set already put enough L in the system.',
  },
  {
    id: 'speed-rotation',
    title: 'Speeding and slowing rotation',
    kicker: 'Change shape to change spin rate, not to invent flip.',
    body: [
      'To spin faster in the air: decrease I. Tuck, drop the chin slightly toward the chest, keep the arms in, pull the knees. The same angular momentum now lives in a smaller package, so it turns faster.',
      'To spin slower, or to look longer: increase I. Stretch the hips, keep the legs long, reach the arms. The same L is now turning a longer lever, so it turns slower. That is why a layout that is even a little piked or tucked will suddenly “make it” — they secretly dropped I.',
      'On the floor, you can also add rotation before takeoff (a stronger snap, a better block, arms that contribute instead of stall). Once airborne, shape is the main dial you still have.',
    ],
    gym: 'If they are under-rotating a layout, first ask whether the set had enough L. If they are over-rotating a tuck, they may be dropping I more than the skill needs.',
  },
  {
    id: 'roundoff-handspring',
    title: 'Round-off into back handspring',
    kicker: 'A small arm drop can shrink I so the feet can get in front.',
    body: [
      'Out of a round-off the athlete is still carrying linear speed and some rotation. For a back handspring they need the feet to beat the hands — feet in front of the hips so the sit and jump can happen. If the body is too long and the arms stay glued up, I is large, the turn-over is slow, and the feet lose the race.',
      'A common, useful pattern: after the round-off, the arms come down a little before they connect into the handspring. That is not “giving up on open shoulders.” It is a brief decrease in moment of inertia so the body can rotate the feet through faster, then the arms go back to the block. Inertia of the run is still going down the floor; the arm drop is a rotation-rate tool, not a brake.',
      'If the arms stay high and the chest stays long with no turnover, the feet stay behind. If the arms crash all the way and the chest collapses, they lose the block. The coaching target is a controlled, short drop that speeds the feet, then a strong reach to the floor.',
    ],
    gym: 'Watch the arm path from round-off rebound to handspring reach. A small drop that lets the feet win is physics. A collapse that kills the shoulders is not.',
  },
  {
    id: 'tuck-vs-layout',
    title: 'Back tucks and layouts',
    kicker: 'Same idea of flip, very different I — and that is why layouts expose the set.',
    body: [
      'A back tuck keeps mass close to the axis. I is small, ω is large, and a modest amount of angular momentum still gets the athlete around. That is why tucks appear “easier” even when the set is only okay. The shape is doing a lot of the work by speeding rotation.',
      'A layout keeps the body long. I is large, so the same L produces a slower spin. If the set was only enough for a tuck, the layout will look like it hangs, pikes, or tucks at the end — the athlete is secretly shrinking I because they do not have the budget to stay long. Layouts do not fail because the athlete “forgot to stay pretty.” They fail when L is too small for that I.',
      'Teaching progression that matches the physics: get a set that already has extra flip in a tuck (they make it easily, even a little over). Then lengthen. Do not lengthen first and hope the layout invents angular momentum. Challenges on layout are often set problems wearing a shape costume.',
    ],
    gym: 'If layouts pike or pull a late tuck, film the set, not only the air shape. Ask whether a punch tuck from that same set would be easy. If the tuck is a fight, the layout is asking for money they do not have.',
  },
]

export function physicsLessonById(id: string): PhysicsLesson | undefined {
  return PHYSICS_LESSONS.find((l) => l.id === id)
}
