/**
 * Parent education cards. Add articles here — the Learn page renders this list.
 * Copy supports Shape Lab coaching: fundamentals, quiet quality holds, patience.
 */

export type ParentEducationCategory =
  | 'progress'
  | 'fundamentals'
  | 'strength'
  | 'practice'
  | 'confidence'
  | 'class'
  | 'health'
  | 'support'

export type ParentEducationArticle = {
  id: string
  category: ParentEducationCategory
  title: string
  summary: string
  body: string[]
}

export const PARENT_EDUCATION_CATEGORIES: { id: ParentEducationCategory; label: string }[] = [
  { id: 'progress', label: 'Understanding Progress' },
  { id: 'fundamentals', label: 'Why Fundamentals Matter' },
  { id: 'strength', label: 'Strength vs Skill' },
  { id: 'practice', label: 'Practice Frequency' },
  { id: 'confidence', label: 'Fear and Confidence' },
  { id: 'class', label: 'Choosing the Right Class' },
  { id: 'health', label: 'Rest and Recovery' },
  { id: 'support', label: 'How to Help Without Over-Coaching' },
]

export const PARENT_EDUCATION: ParentEducationArticle[] = [
  {
    id: 'understanding-progress',
    category: 'progress',
    title: 'Understanding Progress',
    summary: 'Holds, shape tests, and homework logs are snapshots — not a race.',
    body: [
      'Progress in Shape Lab is quiet quality time in a shape, not a highlight clip.',
      'A shorter hold with better lines is often the real step forward.',
      'Plateaus are normal. The next skill usually waits on a basic that is not automatic yet.',
    ],
  },
  {
    id: 'why-fundamentals',
    category: 'fundamentals',
    title: 'Why Perfect Basics Matter',
    summary: 'Hollow, arch, and handstand lines show up in every later skill.',
    body: [
      'Tumbling skills are built from a few body shapes. If hollow and arch are noisy, later skills stay noisy.',
      'Repetitions of the same basic are not busywork. They are how the body learns to hold still under fatigue.',
    ],
  },
  {
    id: 'strength-vs-skill',
    category: 'strength',
    title: 'Strength vs Skill',
    summary: 'Strong is not the same as skilled. Both matter; they train differently.',
    body: [
      'Strength work (holds, shapes, conditioning) makes the body able to do the skill.',
      'Skill work is timing and pattern. More tumbling volume does not replace missing strength in a shape.',
    ],
  },
  {
    id: 'practice-frequency',
    category: 'practice',
    title: 'Practice Frequency',
    summary: 'Short, regular homework beats rare long sessions.',
    body: [
      'Assigned homework is the work to do between classes. A few quality minutes most days beats one exhausted weekend.',
      'If something hurts in a new way, stop and tell the coach. Soreness from work is not the same as injury pain.',
    ],
  },
  {
    id: 'fear-confidence',
    category: 'confidence',
    title: 'Fear and Confidence',
    summary: 'Confidence comes from a shape the athlete already owns.',
    body: [
      'Moving up a skill before the basic is quiet often makes fear worse, not better.',
      'Celebrate the hold that looked boring and correct. That is the one that unlocks the next skill.',
    ],
  },
  {
    id: 'when-to-move-up',
    category: 'class',
    title: 'When to Move Up a Class',
    summary: 'Class placement follows what the athlete can do on a tired day.',
    body: [
      'Coaches look at shapes, not just the hardest skill an athlete has landed once.',
      'Ask the coach before pushing a move-up. Wanting a harder class is not the same as being ready for it.',
    ],
  },
  {
    id: 'rest-recovery',
    category: 'health',
    title: 'Rest and Recovery',
    summary: 'Sleep and rest days are part of training.',
    body: [
      'Growth, strength, and skill all need recovery. More training is not always more progress.',
      'This app does not diagnose injury. Lasting or worsening pain belongs with a healthcare professional.',
    ],
  },
  {
    id: 'help-without-overcoaching',
    category: 'support',
    title: 'How to Help Without Over-Coaching',
    summary: 'Parents help most by protecting sleep, food, and the homework list.',
    body: [
      'One cue from a parent on the sideline is plenty. The coach already has a plan for that skill.',
      'Ask “what did you work on?” instead of “why didn’t you do the skill?” After class, the athlete is tired.',
    ],
  },
  {
    id: 'skill-progressions',
    category: 'fundamentals',
    title: 'Skill Progressions',
    summary: 'Each skill sits on a quieter version of a simpler shape.',
    body: [
      'A progression is not a skip list. Coaches look for the shape that still looks clean when the athlete is tired.',
      'If a skill is stalled, the missing piece is usually an earlier hold, not more of the hard skill.',
    ],
  },
  {
    id: 'flexibility-mobility',
    category: 'strength',
    title: 'Flexibility and Mobility',
    summary: 'Range of motion supports shapes. Forcing splits is not the same as owning a line.',
    body: [
      'Mobility work should feel like quality time in a position, not a contest to go farther today.',
      'Pain that is sharp, lingering, or new in a joint is a stop-and-tell-the-coach signal.',
    ],
  },
  {
    id: 'why-reps-matter',
    category: 'practice',
    title: 'Why Repetitions Matter',
    summary: 'Quiet repeats of the same basic teach the body what to do under fatigue.',
    body: [
      'Homework repeats are how a shape becomes automatic. Automatic shapes show up in tumbling without thinking.',
      'A few quality holds beat a pile of sloppy ones.',
    ],
  },
  {
    id: 'injury-prevention',
    category: 'health',
    title: 'Injury Prevention',
    summary: 'Sleep, load, and honest pain reporting matter more than a gadget.',
    body: [
      'This app does not diagnose or treat injury. It can help a parent notice patterns and talk to the coach.',
      'Persistent, severe, worsening, neurologic, traumatic, or otherwise concerning symptoms belong with a healthcare professional.',
    ],
  },
  {
    id: 'what-coaches-look-for',
    category: 'class',
    title: 'What Coaches Look For',
    summary: 'Lines, stillness, and basics on a tired day — not the hardest skill landed once.',
    body: [
      'A coach would rather see a quiet hollow than a messy skill that only works on a good day.',
      'Ask what to practice at home instead of asking when they will move up.',
    ],
  },
  {
    id: 'common-misunderstandings',
    category: 'support',
    title: 'Common Parent Misunderstandings',
    summary: 'More tumbling is not always more progress.',
    body: [
      'Sitting a skill out can be training. Rest and fundamentals are not punishment.',
      'Comparing kids by the hardest skill they have posted online skips the work that actually lasts.',
    ],
  },
  {
    id: 'goal-setting',
    category: 'progress',
    title: 'Goal Setting',
    summary: 'Useful goals name a shape and a quality, not a date for a skill.',
    body: [
      '“Still hollow for 20 quiet seconds” is a better home goal than “back tuck by next month.”',
      'The coach sets class goals. Home goals should match the homework list.',
    ],
  },
  {
    id: 'understanding-plateaus',
    category: 'progress',
    title: 'Understanding Plateaus',
    summary: 'A stall usually means a basic is not automatic yet.',
    body: [
      'Plateaus are normal. The next skill is often waiting on a hold that still gets noisy under fatigue.',
      'Keep the homework. Changing the whole plan every week restarts the clock.',
    ],
  },
  {
    id: 'why-some-skills-take-longer',
    category: 'progress',
    title: 'Why Some Skills Take Longer Than Others',
    summary: 'Different bodies, different missing basics — not a ranking of talent.',
    body: [
      'Two athletes in the same class can need different amounts of time on the same skill. That is expected.',
      'The Shape Lab record is the hold and the shape test, not a race against another family.',
    ],
  },
]
