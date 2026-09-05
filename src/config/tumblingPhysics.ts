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
  /** Optional nav grouping in Learn. */
  section?: string
}

export const PHYSICS_LESSONS: PhysicsLesson[] = [
  {
    id: 'inertia',
    section: 'How motion works',
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
    section: 'How motion works',
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
    section: 'How motion works',
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
    section: 'How motion works',
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
    section: 'Tumbling skills',
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
    section: 'Tumbling skills',
    title: 'Back tucks and layouts',
    kicker: 'Same idea of flip, very different I — and that is why layouts expose the set.',
    body: [
      'A back tuck keeps mass close to the axis. I is small, ω is large, and a modest amount of angular momentum still gets the athlete around. That is why tucks appear “easier” even when the set is only okay. The shape is doing a lot of the work by speeding rotation.',
      'A layout keeps the body long. I is large, so the same L produces a slower spin. If the set was only enough for a tuck, the layout will look like it hangs, pikes, or tucks at the end — the athlete is secretly shrinking I because they do not have the budget to stay long. Layouts do not fail because the athlete “forgot to stay pretty.” They fail when L is too small for that I.',
      'Teaching progression that matches the physics: get a set that already has extra flip in a tuck (they make it easily, even a little over). Then lengthen. Do not lengthen first and hope the layout invents angular momentum. Challenges on layout are often set problems wearing a shape costume.',
    ],
    gym: 'If layouts pike or pull a late tuck, film the set, not only the air shape. Ask whether a punch tuck from that same set would be easy. If the tuck is a fight, the layout is asking for money they do not have.',
  },
  {
    id: 'block-surfaces',
    section: 'Block, surfaces, and twist',
    title: 'Newton’s 3rd law, the block, and surfaces',
    kicker: 'The floor pushes back as hard as you push it — and a deeper surface spends that push as give.',
    body: [
      'Newton’s third law: if the athlete pushes the floor, the floor pushes the athlete with an equal force the other way. The block is that conversation. Hands or feet do not “hit and hope.” They apply force at an angle. The surface answers with a force that can send the body up, down the floor, or into more rotation — depending on the shape and the angle of that push.',
      'Inertia still wants the body to keep doing what it was doing. The block is the force that redirects that leftover travel. A late, soft, or collapsed block lets inertia keep going the old way (down the floor, chest dropping, feet behind). A firm block with the right body line turns leftover run into height and turnover.',
      'The desired block angle is not one magic number. It depends on (1) how fast they are traveling, (2) how much flip they already have and still need, and (3) how deep and how quickly the surface gives. Dead floor gives almost nothing — the redirect is sharp and short. A spring floor stores and returns more. A rod floor is springy but different under the feet. Tumble Trak and trampoline give deeper and longer. The deeper the surface gives, the longer the athlete has to stay in a pushing shape, and the more the angle has to account for sinking before the rebound.',
      'If they treat tramp like dead floor, they punch and leave before the bed has answered — the third-law push never fully arrives. If they sit in a spring floor like a tramp, they wait too long and the return dumps them. Same physics, different timing. Shape at contact (open shoulders, tight hollow or the sit you actually want) decides whether the return goes into the skill or into a pike and a stall.',
    ],
    gym: 'Name the surface before you cue the block. “Same arms as on floor” on a tramp is often the wrong timing. Watch whether they stay in the push until the surface has given and come back.',
  },
  {
    id: 'twisting',
    section: 'Block, surfaces, and twist',
    title: 'How twisting works',
    kicker: 'Twist is not a mystery. It is contact, late aerial work, tilt, or a cat twist — all spending the same L.',
    body: [
      'Angular momentum is still the budget. Moment of inertia is still the dial. A twist is rotation around the long axis of the body. You can start that twist while you are still on the floor (contact twist), or you can create or finish it after you leave (aerial / late twist). You can also tilt the flip axis so some of the flip “looks like” twist, and you can use a cat-twist: one half of the body turns, then the other, with almost no extra L needed from the floor.',
      'Contact twisting: the feet or hands are still on the surface when the shoulders and hips start to turn. The surface can add a little twist L because there is still an external torque. This is the “I already started the twist on the set” look. Useful when the set is strong. Dangerous as a habit if they throw the twist so early that the flip axis dies.',
      'Aerial (late) twisting: they leave the floor mostly on the flip, then create twist in the air. They do that with arm and shoulder work and with small asymmetries — one arm in, a slight hip offset, a look. That is the tilt method: if the body is a little off the true flip axis, some of the existing flip L shows up as twist. They did not invent a new law. They spent the same L on a slightly tilted axis. Late twist needs enough leftover flip. If the tuck is already a fight, a late full will look like a spinny undercut.',
      'Cat twist: think of a cat righting in the air. The upper body turns against the lower body, then the hips follow. Coaches see this as a “wrap” that starts in the chest and finishes in the legs. It is useful for teaching that twist can be built without slamming the floor into a corkscrew set. Circle back to I: arms in drops the long-axis I so the same twist L turns faster. Arms out brakes the twist. Same story as tuck versus layout, just on a different axis.',
    ],
    gym: 'Ask where the twist started: on the floor, late in the air, from a tilt, or from a cat wrap. If they have no flip, do not add twist. If they have flip and no twist, check arms and whether they are actually off-axis or just hoping.',
  },
]

export function physicsLessonById(id: string): PhysicsLesson | undefined {
  return PHYSICS_LESSONS.find((l) => l.id === id)
}
