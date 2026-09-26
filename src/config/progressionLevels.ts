/**
 * The 4 Levels of Progression for any tumbling skill.
 * Ryan's framework (from his "stages-in-your-words" interview answer):
 * introduction, approximation, acquisition, mastery.
 * Content transcribed from his 4-levels reference infographic.
 */

export type ProgressionLevel = {
  n: number
  name: string
  color: string
  tagline: string
  looksLike: string
  bridge?: { title: string; body: string }
  masteryNote?: string
  athleteExperience: string[]
  coachFocus: string[]
}

export const PROGRESSION_LEVELS: ProgressionLevel[] = [
  {
    n: 1,
    name: 'Skill Introduction',
    color: '#2e7d4f',
    tagline: 'The athlete is first learning about the skill.',
    looksLike:
      'Understanding the skill, seeing demonstrations, learning key shapes and drills on the ground.',
    athleteExperience: ['Curious', 'Excited or nervous', 'Absorbing information'],
    coachFocus: [
      'Teach and explain',
      'Build a foundation',
      'Create a positive first impression',
      'Establish safety and trust',
    ],
  },
  {
    n: 2,
    name: 'Skill Approximation',
    color: '#6a4fa3',
    tagline: 'The athlete begins trying parts of the skill with assistance and modifications.',
    looksLike:
      'Working on drills, progressions, and shapes. The skill is attempted but not yet consistent.',
    athleteExperience: ['Challenged', 'Normal fear and uncertainty', 'Learning through reps'],
    coachFocus: [
      'Break down the skill',
      'Use progressions',
      'Encourage effort, not perfection',
      'Reinforce small wins',
    ],
  },
  {
    n: 3,
    name: 'Skill Acquisition',
    color: '#d9732b',
    tagline: 'The athlete can perform the skill consistently in a controlled environment.',
    looksLike:
      'The skill is hit consistently with good form and control in practice settings.',
    bridge: {
      title: 'The bridge: intentional execution to instinctual execution',
      body: 'This is the stage between acquisition and mastery where intentional, thoughtful repetitions gradually become natural habits. Corrections that once required conscious focus become the athlete\u2019s default movement patterns through hundreds or thousands of quality repetitions.',
    },
    athleteExperience: ['Gaining confidence', 'Still managing normal fear', 'Focused on consistency'],
    coachFocus: [
      'Refine technique',
      'Build consistency',
      'Increase independence',
      'Add variety and challenge',
    ],
  },
  {
    n: 4,
    name: 'Skill Mastery',
    color: '#c93a3a',
    tagline: 'The athlete performs the skill with confidence, consistency, and in multiple settings.',
    looksLike:
      'The skill is second nature. They can do it under pressure, in routines, and in competition.',
    masteryNote:
      'Mastery takes time. True mastery can take years and/or hundreds to thousands of intentional reps.',
    athleteExperience: [
      'Confident',
      'Calm under pressure',
      'Takes pride in execution',
      'Normal fear can still be present on skills that require precision and have less room for error',
    ],
    coachFocus: [
      'Maintain and perfect',
      'Add difficulty and variety',
      'Prepare for performance',
      'Help others and lead',
    ],
  },
]

export type ProgressionBlock = {
  name: string
  when: string
  color: string
  whatItIs: string
  commonReasons: string[]
  whenItShowsUp: string
  howItLooks: string[]
  howToHelp: string[]
  takeaway: string
}

export const PROGRESSION_BLOCKS: ProgressionBlock[] = [
  {
    name: 'Normal Fear',
    when: 'During any phase',
    color: '#2e7d4f',
    whatItIs: 'A natural response to trying something challenging or unfamiliar.',
    commonReasons: [],
    whenItShowsUp:
      'During any phase of progression, including mastery. Normal fear can happen even during mastery phase on skills that require precision and have less room for error.',
    howItLooks: ['Hesitation before trying', 'Butterflies or nervousness', '"What if I can\'t?" thoughts'],
    howToHelp: [
      'Learning how to manage their response to fear and perform the technique while fear is present in a controlled environment.',
      'Conditioning response to discomfort (indirectly with Coach Lain\u2019s 10% challenge).',
      'Intentional exposure to unnatural feeling techniques in ways that make easier skills feel harder (ex: straight arm handstand forward rolls).',
    ],
    takeaway: 'Fear is fuel when managed. It sharpens focus and builds resilience.',
  },
  {
    name: 'Mental Block',
    when: 'After acquisition or mastery',
    color: '#4a5fa3',
    whatItIs: 'A mental roadblock that shows up after the athlete has already been successful with the skill.',
    commonReasons: [
      'Traumatic event (personal or witnessed)',
      'Major growth spurt or physical change',
      'Acquired the skill without a true understanding of the required technique',
      'Rushing skills before prerequisites are strong',
      'Random hit to confidence',
    ],
    whenItShowsUp:
      'After mastery or strong consistency. The athlete suddenly feels fear where there was none.',
    howItLooks: [
      'Sudden fear of a skill they used to do',
      'Consistent hesitation or refusal',
      '"I know I can do it, but I can\'t."',
      'Overthinking and loss of timing',
    ],
    howToHelp: [
      'Be patient and calm. Do not force',
      'Use gradual progressions',
      'Rebuild confidence with small wins',
      'Return to basics and technical understanding',
      'Use mental skills (visualization, breathing, self talk)',
      'Provide extra support (trusted coach, counselor, sports psychologist if needed)',
    ],
    takeaway: 'The skill is not lost. Rebuilding confidence and trust in the skill is the goal.',
  },
  {
    name: 'Physical Block',
    when: 'During any phase',
    color: '#d9732b',
    whatItIs: 'A physical limitation that prevents the athlete from performing the skill even though they understand how.',
    commonReasons: [
      'Lack of strength, power, mobility, or endurance',
      'Poor physical habits or incomplete drilling',
      'Growth spurt affecting timing or coordination',
      'Coming back from an injury',
      'Not meeting physical strength standards',
    ],
    whenItShowsUp:
      'During any phase. Often after a growth spurt, when strength or coordination requirements increase, or when returning from injury.',
    howItLooks: [
      'Knows what to do, but can\'t hit the shapes or technique',
      'Feels heavy, weak, or out of control',
      'Can do it sometimes, but not consistently',
    ],
    howToHelp: [
      'Build strength, power, and mobility',
      'Focus on quality drills and shapes',
      'Set and meet physical strength standards',
      'Be patient; the body needs time to adapt',
    ],
    takeaway: 'The body needs to catch up to what the mind already knows.',
  },
  {
    name: 'Emotional Block',
    when: 'Outside pressure and emotional overload',
    color: '#c93a3a',
    whatItIs: 'An emotional shutdown caused by pressure, expectations, or feeling like they are not good enough.',
    commonReasons: [
      'Outside pressure or unrealistic expectations (parents, coaches, team, etc.)',
      'The belief that love or approval is conditional on performance',
      'Leads to emotional overload or burnout',
    ],
    whenItShowsUp:
      'Anytime, often after mastery. Often in high pressure environments.',
    howItLooks: [
      'Loss of skills under pressure',
      'Crying, shutting down, or "zoning out"',
      'Fear of disappointing others',
      'Negative self talk and perfectionism',
    ],
    howToHelp: [
      'Use gradual progressions',
      'Acknowledge and celebrate small wins',
      'Allow mistakes',
      'Take breaks to do things that make the session fun',
      'Learn something new outside of the skill they\u2019re stuck on to refuel passion',
      'Have open conversations and listen',
      'Remind them they are valued for who they are',
    ],
    takeaway: 'The issue is not the skill. It is the emotional weight they are carrying.',
  },
]
