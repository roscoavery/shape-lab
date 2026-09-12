import type { PhysicsQuizItem } from './physicsQuiz'

export const PROGRESSION_DEEP_QUIZ_BANK: PhysicsQuizItem[] = [
  {
    id: 'rod-not-mastery',
    lessonId: 'four-levels',
    prompt: 'They have a clean layout on the rod every turn, and they pike it on floor in a routine. Name the level honestly:',
    choices: [
      { id: 'a', label: 'Mastery, because the rod picture is pretty' },
      { id: 'b', label: 'Acquisition on the rod. Floor in a routine is not mastery yet' },
      { id: 'c', label: 'Introduction. They have never seen a layout' },
      { id: 'd', label: 'A physical block of the wrists' },
    ],
    answerId: 'b',
    explain:
      'Acquisition is consistent in a controlled setting. A new surface or a routine is another setting. Do not call it mastery to please a calendar.',
  },
  {
    id: 'had-it-sentence',
    lessonId: 'mental-block',
    prompt: 'Which sentence is the mental-block tell, not first-day fear?',
    choices: [
      { id: 'a', label: '“I have never tried this. I do not know if I can.”' },
      { id: 'b', label: '“I know I can do it. I did it last month. I cannot go today.”' },
      { id: 'c', label: '“My hamstring is tired.”' },
      { id: 'd', label: '“The parent is grading from the door.”' },
    ],
    answerId: 'b',
    explain: 'A block shows up after they already had the skill. First-day fear says they do not know if they can.',
  },
  {
    id: 'growth-spurt',
    lessonId: 'physical-block',
    prompt: 'They grew three inches. The drill language is the same. The set looks late and heavy. First guess:',
    choices: [
      { id: 'a', label: 'Mental block. Put it in the Saturday routine' },
      { id: 'b', label: 'Physical. Timing and power have not caught the new levers' },
      { id: 'c', label: 'They are ungrateful' },
      { id: 'd', label: 'Mastery, because they used to have it' },
    ],
    answerId: 'b',
    explain: 'A growth spurt is a classic physical cut. Rebuild the positions. Cueing bravery will not add a hamstring.',
  },
  {
    id: 'doorway',
    lessonId: 'emotional-block',
    prompt: 'The skill is there in a quiet gym and gone when a parent films from the doorway. The first move is:',
    choices: [
      { id: 'a', label: 'Raise the skill and add a full' },
      { id: 'b', label: 'Lower the audience before you raise the skill' },
      { id: 'c', label: 'Ice the ankle' },
      { id: 'd', label: 'Call it introduction' },
    ],
    answerId: 'b',
    explain: 'That pattern is pressure, not a missing round-off. The doorway is part of the plan.',
  },
  {
    id: 'approx-fear',
    lessonId: 'normal-fear',
    prompt: 'Butterflies on a brand-new drill they said yes to. You should:',
    choices: [
      { id: 'a', label: 'Label it a mental block and stop the skill for a month' },
      { id: 'b', label: 'Treat it as normal fear at approximation. Keep a range they can say yes to' },
      { id: 'c', label: 'Put it in the meet to get over it' },
      { id: 'd', label: 'Stretch the end range of a hyperextending elbow' },
    ],
    answerId: 'b',
    explain: 'Normal fear belongs at approximation. Shame or a routine “to get over it” is how you mint a real block.',
  },
  {
    id: 'write-the-plan',
    lessonId: 'levels-and-blocks',
    prompt: 'Which lesson note is a plan?',
    choices: [
      { id: 'a', label: 'They are scared' },
      { id: 'b', label: 'Approximation plus physical (shoulders). Rod only this week' },
      { id: 'c', label: 'Just go' },
      { id: 'd', label: 'Mastery because they are Level 8' },
    ],
    answerId: 'b',
    explain: 'Level plus block type plus the surface. “They are scared” is not a plan.',
  },
  {
    id: 'lucky-not-enough',
    lessonId: 'four-levels',
    prompt: 'One lucky floor layout after twenty rods. Next coaching move:',
    choices: [
      { id: 'a', label: 'Call mastery and write it in the routine tonight' },
      { id: 'b', label: 'Keep treating floor as early acquisition. Collect more honest reps' },
      { id: 'c', label: 'Add a full' },
      { id: 'd', label: 'Ice and return' },
    ],
    answerId: 'b',
    explain: 'One hit is not mastery. Mastery is the skill in more than one setting, on purpose, many times.',
  },
  {
    id: 'two-blocks',
    lessonId: 'mental-block',
    prompt: 'A blocked back tuck in a routine plus a parent grading every miss. Risk if you keep the routine:',
    choices: [
      { id: 'a', label: 'The mental block clears faster' },
      { id: 'b', label: 'An emotional block joins the mental one' },
      { id: 'c', label: 'The wrists get stronger' },
      { id: 'd', label: 'It proves mastery' },
    ],
    answerId: 'b',
    explain: 'A routine is a loud room. Drop to approximation on purpose and say so.',
  },
]
