/**
 * Athlete-facing rundown of how a skill grows.
 * Same four levels as the coach notes, written for the person on the floor.
 */

import type { CoachLesson } from './coachAnatomy'

export const ATHLETE_PROGRESSION_LESSONS: CoachLesson[] = [
  {
    id: 'meet-the-skill',
    section: 'How a skill grows',
    title: 'Four stages of a skill',
    image: {
      src: '/learn/progression-levels.png',
      alt: 'Four stages of a tumbling skill: introduction, approximation, acquisition, mastery',
    },
    kicker: 'Every skill moves through introduction, approximation, acquisition, and mastery.',
    body: [
      'Stage 1 is introduction. You watch the skill, learn the shapes that make it up, and do basic work on the floor or a mat. Being curious and being nervous both belong here. Nobody is asking you to do the full skill yet.',
      'Stage 2 is approximation. Drills, spots, and smaller versions of the skill. It will not be consistent yet, and that is the point. Some athletes start doing the full skill on their own during this stage. Landing a froggy back handspring by yourself is still approximation, not a finished skill. Small wins count here. Effort matters more than a clean rep.',
      'Stage 3 is acquisition. You can perform the skill with good form on the surface you trained it on. The reps start to feel normal. You might still get nervous. That is fine.',
      'Stage 4 is mastery. The skill still works when the room is louder, the surface changes, or it has to sit in a routine. All of the little details feel controllable, and manipulating the skill in multiple ways feels easy. One lucky hit does not count. This stage takes a lot of reps.',
    ],
    gym: 'Ask yourself which stage you are actually in today. “I have it on the rod, not on floor” is still stage 3.',
  },
  {
    id: 'nerves-are-normal',
    section: 'How a skill grows',
    title: 'Nerves are part of growing',
    kicker: 'Butterflies can show up the first day and they can still show up when the skill is yours.',
    body: [
      'Nerves are a normal response to something new or precise. They can show up when you first meet a skill. They can still show up on a skill you already own if the landing has to be exact.',
      'Normal nerves look like a pause before the try, a flutter in the stomach, or the thought “what if I cannot.” They do not erase a skill you already have.',
      'A small, agreed next step (just past comfortable) teaches your body that a weird feeling is not the same as unsafe. Shame and rushed “just go” cues do the opposite.',
    ],
    gym: 'Ask: am I scared of the new thing, or of a skill I already had? Those are different conversations.',
  },
  {
    id: 'when-a-skill-gets-stuck',
    section: 'How a skill grows',
    title: 'When a skill you had gets stuck',
    kicker: 'If you already had it and now you cannot go, that is not first-day fear.',
    body: [
      'Sometimes a skill you already owned suddenly will not go. A scare, a growth spurt, a rushed step, or a week away can do that. The sentence that often shows up is “I know I can do it, but I cannot.”',
      'That is a signal to shrink the skill on purpose. Return to pieces. Collect small wins. Do not prove bravery by throwing it in a routine.',
      'The skill is not gone. Trust has to be rebuilt in the same order you first built it: pieces, then practice, then more places.',
    ],
    gym: 'Tell your coach the true sentence. “I had it and now I cannot go” is useful. Pretending you are fine is not.',
  },
  {
    id: 'when-the-body-is-not-ready',
    section: 'How a skill grows',
    title: 'When the body is not ready yet',
    kicker: 'You can know the drill and still not have the strength, range, or timing.',
    body: [
      'Sometimes the mind knows the skill and the body has not caught up. Not enough strength or range, a growth spurt that changed the timing, coming back from time off, or a shape that falls apart when you are tired.',
      'This looks heavy or out of control. You can say the cue and still miss the shape. That is not stubbornness. Cueing louder will not add a hamstring.',
      'The honest path is to train the positions and the tissue the skill is asking for, then return to the skill.',
    ],
    gym: 'If you can do it on the tumble trak and it falls apart on floor, name what the floor is asking for: power, stiffness, or a shape you lose when you are tired.',
  },
  {
    id: 'when-the-room-feels-heavy',
    section: 'How a skill grows',
    title: 'When the room feels heavy',
    kicker: 'Sometimes the issue is not the skill. It is the weight of who is watching.',
    body: [
      'A skill can disappear when the room gets loud, a parent is grading from the door, or you only feel valued after a hit. The body may still be ready.',
      'This can look like crying, zoning out, or refusing a messy try because it will not be perfect. Messy tries are how stage 2 works.',
      'You are allowed to take a fun break, learn something else for a bit, and be valued as a person whether the skill hits today or not.',
    ],
    gym: 'If the pressure is coming from the doorway, say so. The next step may be a quieter room, not a harder skill.',
  },
]
