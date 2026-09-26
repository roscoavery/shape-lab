/**
 * Infographic concept cards — Ryan's coaching concepts, visual treatment.
 * Each card is a self-contained visual: no walls of text.
 * Content from Ryan's interview answers (2026-09-25), organized not rewritten.
 */

export type ConceptCard = {
  id: string
  title: string
  subtitle: string
  kind:
    | 'gears'
    | 'scurve'
    | 'spectrum'
    | 'circles'
    | 'versus'
    | 'paradox'
    | 'steps'
    | 'funnel'
  /** Card-specific payload; the component interprets by kind. */
  data: unknown
}

export const CONCEPT_CARDS: ConceptCard[] = [
  {
    id: 'two-gears',
    title: 'Two gears that work together',
    subtitle: 'Perfection before progression is the order. Progress not perfection is the mindset.',
    kind: 'gears',
    data: {
      gears: [
        {
          name: 'Perfection before progression',
          color: '#2e7d4f',
          role: 'The order skills are taught',
          points: [
            'Walk before you run',
            'Set high standards with prerequisites',
            'Stronger basics make harder skills easier to learn',
            'Nothing is ever perfect — the expression is a reminder of order',
          ],
          quote: 'This is an order of operation.',
        },
        {
          name: 'Progress, not perfection',
          color: '#6a4fa3',
          role: 'How athletes respond to mistakes',
          points: [
            'Mistakes while learning are normal',
            'Celebrate small improvements, not just landings',
            'Effort and understanding compound over time',
            'Getting 1% better adds up to real long term growth',
          ],
          quote: 'Progress is not about leveling up and getting new skills.',
        },
      ],
      mesh: 'The gears mesh: high standards for what comes next, grace for where the athlete is now.',
    },
  },
  {
    id: 's-curve',
    title: 'The S-curve of progress',
    subtitle: 'Effort compounds like interest. The flat start is not failure.',
    kind: 'scurve',
    data: {
      phases: [
        {
          name: 'The flat start',
          color: '#8b99a3',
          text: 'Weeks of drilling basics with little to show. This is where most athletes quit. The effort is compounding invisibly.',
        },
        {
          name: 'The takeoff',
          color: '#2e7d4f',
          text: 'Basics click into place. Skills that felt impossible start working. Progress feels fast because the foundation was built.',
        },
        {
          name: 'The plateau',
          color: '#d9732b',
          text: 'Growth slows. This is not the end — it is the next flat start. Plateaus are information, not verdicts.',
        },
      ],
      takeaway: 'Do not judge the process by the flat parts. Judge it by what the flat parts are building.',
    },
  },
  {
    id: 'landing-vs-owning',
    title: 'Landing it once vs owning it',
    subtitle: 'There is a danger zone in between. Most injuries and blocks live there.',
    kind: 'spectrum',
    data: {
      stages: [
        {
          name: 'Landed it once',
          color: '#8b99a3',
          text: 'Celebrate it. But once is luck, twice is coincidence.',
        },
        {
          name: 'The danger zone',
          color: '#c93a3a',
          danger: true,
          text: 'Hit it 1 to 3 times and now it is expected on command. This is where tumbling blocks form, fear spikes, and injuries happen. The athlete feels conditionally accepted. Do not put it in the routine here.',
        },
        {
          name: 'Owning it',
          color: '#2e7d4f',
          text: 'Hundreds to thousands of intentional reps. Second nature. Minimal attention to detail required. Ready to compete.',
        },
      ],
      takeaway:
        'Landing it once or even 3 times should be celebrated but does not equal having the skill.',
    },
  },
  {
    id: 'control-circles',
    title: 'What is in our control',
    subtitle: 'Two circles. Energy spent outside the inner one is wasted.',
    kind: 'circles',
    data: {
      inner: {
        name: 'In our control',
        color: '#2e7d4f',
        items: ['Effort and focus today', 'Attitude toward mistakes', 'Preparation and drilling', 'How we respond to fear', 'Supporting teammates'],
      },
      outer: {
        name: 'Not in our control',
        color: '#8b99a3',
        items: ['Scores and placements', 'What judges see', 'Other athletes\u2019 progress', 'Growth spurts and timing', 'Outcomes on any single day'],
      },
      takeaway:
        'It always comes back to doing what is within our control and not getting hung up on outcomes we cannot control.',
    },
  },
  {
    id: 'five-vs-twenty',
    title: '5 clean reps vs 20 thrown reps',
    subtitle: 'Reps are not equal. Quality writes the pattern; quantity writes whatever you repeated.',
    kind: 'versus',
    data: {
      left: {
        name: '5 clean reps',
        color: '#2e7d4f',
        points: [
          'Every rep reinforces the right shape',
          'Builds the pattern the skill needs',
          'Athlete leaves better than they arrived',
          'Slow today, fast in three months',
        ],
      },
      right: {
        name: '20 thrown reps',
        color: '#c93a3a',
        points: [
          'Every rep reinforces the wrong shape',
          'Builds a pattern that must be unlearned',
          'Athlete leaves tired, not better',
          'Fast today, stuck in six months',
        ],
      },
      takeaway: 'Do not count reps. Make reps count.',
    },
  },
  {
    id: 'fast-is-slow',
    title: 'Fast is slow, slow is fast',
    subtitle: 'The paradox every rushed progression proves true.',
    kind: 'paradox',
    data: {
      quote: 'Fast is slow and slow is fast.',
      attribution: 'Coach Jim',
      fast: {
        name: 'Rushing looks fast',
        color: '#c93a3a',
        points: [
          'Skip the round off, go straight to the tuck',
          'New skill this month',
          'Stuck on the series for a year',
          'Relearn the basics you skipped, now with bad habits',
        ],
      },
      slow: {
        name: 'Patience looks slow',
        color: '#2e7d4f',
        points: [
          'Master the round off before the handspring',
          'No new skill this month',
          'Series clicks because the foundation is real',
          'Layouts and fulls arrive on a foundation that holds them',
        ],
      },
      takeaway:
        'If we focus too much on acquiring a skill and not how it affects the next one, we can slow long term progress drastically.',
    },
  },
  {
    id: 'plateau-unlocks',
    title: 'Three plateau unlocks',
    subtitle: 'When progress stalls, these three move it again.',
    kind: 'steps',
    data: {
      steps: [
        {
          n: 1,
          name: 'Resist instinct',
          color: '#2e7d4f',
          text: 'The instinct is to throw more reps at the stuck skill. Resist it. More of what is not working does not start working.',
        },
        {
          n: 2,
          name: 'Reference videos',
          color: '#6a4fa3',
          text: 'Watch the skill done well. Not to copy blindly, but to recalibrate what the shapes actually look like at speed.',
        },
        {
          n: 3,
          name: 'Alternate prerequisites with the skill',
          color: '#d9732b',
          text: 'Go back to the prerequisite and the skill in the same session. The prerequisite reminds the body; the skill tests the reminder.',
        },
      ],
      takeaway: 'You do not have to figure out if you are stuck. Work the unlocks and watch what moves.',
    },
  },
  {
    id: 'the-funnel',
    title: 'The funnel',
    subtitle: 'Everything narrows to this. Results are the last thing through.',
    kind: 'funnel',
    data: {
      layers: [
        { name: 'Habits', color: '#2e7d4f', text: 'Show up. Drill the basics. Do the boring work.' },
        { name: 'Consistent effort', color: '#3f8f5f', text: 'Not perfect days. Regular days, repeated.' },
        { name: 'Determination', color: '#6a4fa3', text: 'Relentless pursuit of understanding. Determination will get you anywhere you want to be.' },
        { name: 'Pursuit of understanding', color: '#d9732b', text: 'Know why the correction works, not just what it is.' },
        { name: 'Patience', color: '#c93a3a', text: 'Years, not weeks. Hundreds to thousands of reps.' },
      ],
      result: 'Skills, confidence, and an athlete who understands their own progress.',
      takeaway: 'The funnel never reverses. There is no shortcut from the top to the bottom.',
    },
  },
]
