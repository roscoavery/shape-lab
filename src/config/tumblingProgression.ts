/**
 * Four levels of skill progression, and how fear and blocks sit on that path.
 * Progress is not linear.
 */

import type { CoachLesson } from './coachAnatomy'

export const PROGRESSION_LESSONS: CoachLesson[] = [
  {
    id: 'four-levels',
    section: 'The 4 levels',
    title: 'The 4 levels of progression',
    kicker: 'Introduction → approximation → acquisition → mastery. Athletes move forward, stay, or step back.',
    body: [
      'Level 1 — Skill introduction. They are first learning the skill exists. They see it, hear the shapes, do drills on the ground. They may be curious, excited, or nervous. Your job is teach, build a foundation, make the first impression safe, and earn trust. Do not test courage here.',
      'Level 2 — Skill approximation. They try parts of the skill with help and modifications. Drills, progressions, spots. The skill is attempted and not consistent. They feel challenged. Normal fear and uncertainty belong here. Cue effort, not a perfect picture. Small wins are the point.',
      'Level 3 — Skill acquisition. They can do the skill consistently in a controlled setting — good form, in practice, on the surface you trained. Between acquisition and mastery is the bridge from instructional to instinctual: the reps you asked for become the default. They are gaining confidence and still managing normal fear. You refine, add a little variety, and give more independence.',
      'Level 4 — Skill mastery. The skill is second nature in more than one setting — pressure, routine, competition. Mastery can take years and a lot of intentional reps. They can look calm and still have normal fear on a high-precision skill. Your job is maintain, add difficulty on purpose, prepare for performance, and let them help others. Do not confuse one lucky hit with mastery.',
    ],
    gym: 'Name the level out loud. “We are approximating” stops a parent from asking why it is not in the routine yet. “We have it on a rod, not on floor” is still acquisition, not mastery.',
  },
  {
    id: 'normal-fear',
    section: 'Fear and blocks',
    title: 'Normal fear (any level)',
    kicker: 'Fear is a normal part of growth. The question is whether it is still fuel.',
    body: [
      'Normal fear is a natural response to something challenging or new. It can show up at introduction and it can still show up at mastery on a high-precision skill. It looks like hesitation before the try, butterflies, “what if I can’t.” It does not wipe out a skill they already own.',
      'Help: manage the response in a controlled environment. A small, agreed challenge (about 10% past comfortable) trains them to stay with discomfort. Intentional exposure to techniques that feel unnatural — a straight-arm handstand forward roll, a new drill — teaches the nervous system that weird is not the same as unsafe.',
      'This is not a block. Do not treat butterflies as a mental block or you will create one. Keep the skill moving in a range they can say yes to. Fear is fuel when it sharpens focus. It is a problem when we shame it or skip the levels.',
    ],
    gym: 'Ask “are you scared of the new, or of a skill you already had?” New-and-scared is introduction or approximation. Had-it-and-can’t is a different conversation.',
  },
  {
    id: 'mental-block',
    section: 'Fear and blocks',
    title: 'Mental block (after acquisition or mastery)',
    kicker: 'A block is not first-time fear. It is a roadblock after they already had the skill.',
    body: [
      'A mental block shows up after success. They had the skill — often at acquisition or mastery — and then suddenly they cannot go. Common reasons: a crash or a scare, a growth spurt, they never really understood the technique, we rushed the prerequisites, or something random hit their confidence.',
      'It looks like sudden fear of a known skill, consistent hesitation or refusal, overthinking, “I know I can do it, but I can’t.” That sentence is the tell. Introduction fear says “I don’t know if I can.” A block says they already know they could.',
      'Help: be patient. Do not force. Go back to gradual progressions and small wins. Return to basics of that skill. Use breath, a simple cue, visualization if they like it. Extra professional support if it is stuck past what coaching can hold. The skill is not lost. The goal is trust in the skill again, not a proof of bravery today.',
    ],
    gym: 'Do not put a blocked skill in a routine to “get over it.” That is how an emotional block joins the mental one. Drop the level to approximation on purpose and say so.',
  },
  {
    id: 'physical-block',
    section: 'Fear and blocks',
    title: 'Physical block (any level)',
    kicker: 'The mind can know the skill. The body has not caught up.',
    body: [
      'A physical block is a body limit: not enough strength, mobility, or endurance; a habit that leaks power; a growth spurt that wrecked timing; coming back from injury; a strength standard they have not met. It can show up at any level, often after they grew or sat out.',
      'It looks like they can tell you the drill and still cannot hit the shape. They feel heavy, weak, or out of control. Performance is inconsistent in a “the body isn’t there” way, not a “I refuse” way.',
      'Help: build the tissue and the positions. Quality shapes and drills. Set a strength standard and meet it before you ask for the skill again. Give the body time. This is not stubbornness. Cueing harder will not add a hamstring.',
    ],
    gym: 'If they can do the drill on a tumble trak and collapse on floor, ask which physical quality the floor is asking for — power, stiffness, or a shape they lose when they are tired.',
  },
  {
    id: 'emotional-block',
    section: 'Fear and blocks',
    title: 'Emotional block (pressure and overload)',
    kicker: 'The issue is not the skill. It is the weight they are carrying.',
    body: [
      'An emotional block is shutdown from pressure or from feeling not good enough. Unrealistic expectations from a parent or a coach, approval that only shows up after a hit, burnout. It can happen at any level, including after mastery, especially when the room gets loud.',
      'It looks like skills disappearing under pressure, crying or zoning out, fear of disappointing someone, perfectionism that will not let them try a messy approximation. They may still be physically ready.',
      'Help: gradual progressions, celebrate small wins, allow misses, take a fun break, learn something new that is not the stuck skill. Have the conversation. Remind them they are valued as a person. Unconditional support is not a slogan here — it is the condition that lets any other block move.',
    ],
    gym: 'If the parent is grading the practice from the door, the block may not be on the floor. Lower the audience before you raise the skill.',
  },
  {
    id: 'levels-and-blocks',
    section: 'Fear and blocks',
    title: 'How blocks sit on the 4 levels',
    kicker: 'Normal fear can live anywhere. A mental block is a step back from a level they already earned.',
    body: [
      'Introduction and approximation should have normal fear. If you see refusal there, it is usually too big a jump or a physical gap, not a mental block. Call it what it is. Shrink the drill or build the body.',
      'Acquisition is where mental blocks like to start: they had it last month, growth or a scare, and the skill is gone in their head. Treat them as approximating again. Mastery is where emotional blocks like to show — the routine, the meet, the person they do not want to disappoint. Physical blocks can cut any level off at the knees after a growth spurt or a layoff.',
      'Every athlete’s path is unique. Managing fear is ongoing. Some days the hurdle is bigger. The foundation under all of it is the same: they have to feel safe, and the skill cannot be the price of being valued. Then you can put them back on the level they are actually on, not the level the calendar wanted.',
    ],
    gym: 'Write the level and the block type on the lesson note. “Approximation + physical (shoulders)” is a plan. “They are scared” is not.',
  },
]
