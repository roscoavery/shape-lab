import type { Lesson } from '../types'

export const RECOVERY: Lesson[] = [
  {
    id: 'rec-ranges',
    moduleId: 'recovery',
    title: 'Recovery ranges: what they are and what they are not',
    kicker: 'A range is an estimate for a group of people. It is not a promise for one athlete.',
    minutes: 5,
    review: 'draft',
    blocks: [
      {
        kind: 'callout',
        tone: 'safety',
        text: 'Every recovery range in this module is educational. No coach can use it to decide that an athlete is ready. A clinician sets the plan for each athlete.',
      },
      { kind: 'h', text: 'Two different questions' },
      {
        kind: 'list',
        items: [
          'Tissue healing: how long the injured tissue takes to heal enough to be loaded.',
          'Return to impact and tumbling: how long before running, jumping, landing, and tumbling are safe. This depends on strength, control, confidence, and clinician clearance, not on a date.',
        ],
        sourceIds: ['bern-2016'],
        evidence: 'consensus',
      },
      {
        kind: 'p',
        text: 'The 2016 return-to-sport consensus describes return as a continuum: return to participation, then return to sport, then return to performance. Each step is a decision based on criteria such as function and risk, not only on time.',
        sourceIds: ['bern-2016'],
        evidence: 'consensus',
      },
      { kind: 'comparison', comparisonId: 'cmp-recovery' },
      {
        kind: 'callout',
        tone: 'uncertain',
        text: 'Where the table says "not given", the sources reviewed do not publish a number that is safe to quote. That is intentional. This module does not invent recovery estimates.',
      },
    ],
    gym: 'When a parent asks "how long", say what the clinician said and add "and then we build back step by step".',
  },
  {
    id: 'rec-ladder',
    moduleId: 'recovery',
    title: 'Return-to-tumbling ladder (teaching framework)',
    kicker: 'A staged ladder from cleared walking to full tumbling, with a stop rule at every rung.',
    minutes: 6,
    review: 'draft',
    blocks: [
      {
        kind: 'callout',
        tone: 'safety',
        text: 'This ladder is a ShapeLab teaching framework, not a medical protocol. It never replaces a clinician plan. If a clinician gave you written steps, use those steps.',
      },
      {
        kind: 'p',
        text: 'The idea behind the ladder comes from criteria-based return-to-sport thinking: move forward only when the athlete meets the criteria for the current stage and has no new symptoms, and step back if pain returns.',
        sourceIds: ['bern-2016', 'cdc-coach-sheet'],
        evidence: 'consensus',
      },
      { kind: 'comparison', comparisonId: 'cmp-ladder' },
      {
        kind: 'list',
        items: [
          'Move up only with the clinician go-ahead for the current stage.',
          'Every new stage starts at low volume and low height.',
          'New pain, swelling, or a change in how the athlete moves is a stop. Step back one stage and tell the parent and clinician.',
          'Skills with falling or head-first risk and heavy hand or wrist loading usually come back last, but the clinician should say for each injury.',
        ],
        evidence: 'policy',
      },
      {
        kind: 'callout',
        tone: 'uncertain',
        text: 'The stage names are teaching labels. The sources reviewed support the idea of staged, criteria-based return. They do not define an identical ladder for every injury or give a standard length for each stage.',
      },
    ],
    gym: 'Ask the clinician for written criteria, then paste them next to the athlete name on your plan.',
  },
  {
    id: 'rec-communication',
    moduleId: 'recovery',
    title: 'Talking with athletes and parents, and writing it down',
    kicker: 'Say what you saw, say what the clinician said, and keep a record.',
    minutes: 4,
    review: 'draft',
    blocks: [
      {
        kind: 'list',
        items: [
          'Lead with facts: time, skill, surface, what the athlete said, what you saw.',
          'Avoid naming a diagnosis. Say "possible" and "I want a clinician to check this".',
          'Avoid promises about time or about return.',
          'Ask the family for the clinician written plan or clearance.',
          'Keep conversations about food, weight, and body shape out of the gym. If you are worried about eating or energy, tell the parent and let the clinician take it from there.',
          'Respect privacy. Share a diagnosis only with people who need it for safety.',
        ],
        evidence: 'policy',
      },
      {
        kind: 'p',
        text: 'CDC guidance for concussion asks coaches to document the injury and give a copy of the notes to the parents so the healthcare provider has useful information. The same habit helps with any injury.',
        sourceIds: ['cdc-action-plan'],
        evidence: 'guideline',
      },
      {
        kind: 'callout',
        tone: 'note',
        text: 'Injury notes in Coach education are for coaches\' learning. They are kept separate from any athlete medical history or injury log in ShapeLab.',
      },
    ],
    gym: 'Use the same four lines every time: when, what skill, what I saw, what the athlete said.',
  },
]
