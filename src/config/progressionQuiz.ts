import type { PhysicsQuizItem } from './physicsQuiz'

export const PROGRESSION_QUIZ_BANK: PhysicsQuizItem[] = [
  {
    id: 'intro',
    lessonId: 'four-levels',
    prompt: 'Skill introduction is the level where:',
    choices: [
      { id: 'a', label: 'They already have the skill in a routine' },
      { id: 'b', label: 'They first learn the skill exists, see it, and do ground work' },
      { id: 'c', label: 'You test courage with the full skill' },
      { id: 'd', label: 'One lucky hit means mastery' },
    ],
    answerId: 'b',
    explain:
      'Introduction is meeting the skill. Teach, make it safe, earn trust. Do not test courage here.',
  },
  {
    id: 'approx',
    lessonId: 'four-levels',
    prompt: 'Skill approximation looks like:',
    choices: [
      { id: 'a', label: 'Perfect form in a meet' },
      { id: 'b', label: 'Parts of the skill with help. Attempted and not consistent' },
      { id: 'c', label: 'The skill is second nature on every surface' },
      { id: 'd', label: 'They refuse because they already had it last month' },
    ],
    answerId: 'b',
    explain:
      'Approximation is pieces, spots, and modifications. Cue effort. Small wins are the point. Normal fear belongs here.',
  },
  {
    id: 'acq-vs-mastery',
    lessonId: 'four-levels',
    prompt: 'They can do the skill with good form in practice on the rod, but not yet on floor in a routine. That is:',
    choices: [
      { id: 'a', label: 'Mastery' },
      { id: 'b', label: 'Acquisition, not mastery' },
      { id: 'c', label: 'Introduction' },
      { id: 'd', label: 'A mental block by definition' },
    ],
    answerId: 'b',
    explain:
      'Acquisition is consistent in a controlled setting. “We have it on a rod, not on floor” is still acquisition. Mastery is more than one setting.',
  },
  {
    id: 'lucky-hit',
    lessonId: 'four-levels',
    prompt: 'One lucky hit of a new skill means:',
    choices: [
      { id: 'a', label: 'Mastery. Put it in the routine' },
      { id: 'b', label: 'Not mastery. Mastery takes many intentional reps in more than one setting' },
      { id: 'c', label: 'A physical block is gone forever' },
      { id: 'd', label: 'Normal fear should disappear' },
    ],
    answerId: 'b',
    explain:
      'Do not confuse one lucky hit with mastery. Mastery can take years and still include normal fear on a high-precision skill.',
  },
  {
    id: 'normal-fear',
    lessonId: 'normal-fear',
    prompt: 'Normal fear:',
    choices: [
      { id: 'a', label: 'Only happens at introduction and means they have a mental block' },
      { id: 'b', label: 'Can show up at any level, including mastery, and does not erase a skill they own' },
      { id: 'c', label: 'Should be shamed so they go anyway' },
      { id: 'd', label: 'Means they are not talented' },
    ],
    answerId: 'b',
    explain:
      'Butterflies can live at introduction and at mastery. Do not treat them as a mental block or you may create one.',
  },
  {
    id: 'block-tell',
    lessonId: 'mental-block',
    prompt: 'The sentence that most often marks a mental block is:',
    choices: [
      { id: 'a', label: '“I do not know if I can.”' },
      { id: 'b', label: '“I know I can do it, but I cannot.”' },
      { id: 'c', label: '“This drill is new.”' },
      { id: 'd', label: '“My hamstring is tired.”' },
    ],
    answerId: 'b',
    explain:
      'Introduction fear says they do not know if they can. A block shows up after they already had the skill.',
  },
  {
    id: 'blocked-routine',
    lessonId: 'mental-block',
    prompt: 'A blocked skill in a routine “to get over it” often:',
    choices: [
      { id: 'a', label: 'Clears the block in one meet' },
      { id: 'b', label: 'Lets an emotional block join the mental one' },
      { id: 'c', label: 'Proves mastery' },
      { id: 'd', label: 'Fixes a physical gap' },
    ],
    answerId: 'b',
    explain:
      'Drop the level to approximation on purpose and say so. Do not use the routine as exposure therapy.',
  },
  {
    id: 'physical',
    lessonId: 'physical-block',
    prompt: 'A physical block looks most like:',
    choices: [
      { id: 'a', label: 'They refuse a skill they already owned last month' },
      { id: 'b', label: 'They can tell you the drill and still cannot hit the shape. The body is not there' },
      { id: 'c', label: 'They cry because a parent is grading from the door' },
      { id: 'd', label: 'Butterflies before a brand new drill' },
    ],
    answerId: 'b',
    explain:
      'The mind can know the skill. The body has not caught up. Cueing harder will not add a hamstring.',
  },
  {
    id: 'emotional',
    lessonId: 'emotional-block',
    prompt: 'An emotional block is most often about:',
    choices: [
      { id: 'a', label: 'Not enough plantarflexion' },
      { id: 'b', label: 'Pressure, approval only after a hit, or feeling not good enough' },
      { id: 'c', label: 'A missing prerequisite shape' },
      { id: 'd', label: 'First-day curiosity' },
    ],
    answerId: 'b',
    explain:
      'Skills can disappear under pressure even when the body is ready. Lower the audience before you raise the skill.',
  },
  {
    id: 'intro-refusal',
    lessonId: 'levels-and-blocks',
    prompt: 'Refusal during introduction or approximation is usually:',
    choices: [
      { id: 'a', label: 'A mental block after mastery' },
      { id: 'b', label: 'Too big a jump or a physical gap, not a mental block' },
      { id: 'c', label: 'Proof they should skip to the routine' },
      { id: 'd', label: 'A reason to ice the ankle' },
    ],
    answerId: 'b',
    explain:
      'Call it what it is. Shrink the drill or build the body. Mental blocks like to start after they already had the skill.',
  },
]
