/**
 * Team Power Up pack: 6 circuits that alternate knowledge tasks (real
 * items from the cue-quest and coach's-eye packs, looked up at runtime)
 * with low-risk move tasks (short floor/standing shape holds).
 * Draft content.
 */

export type PowerUpTask =
  | {
      id: string
      kind: 'knowledge'
      title: string
      detail: string
      source: { pack: 'cue' | 'eye'; refId: string }
    }
  | {
      id: string
      kind: 'move'
      title: string
      detail: string
      source: { shapeName: string; seconds: number }
    }

export type PowerUpCircuit = {
  id: string
  name: string
  tasks: PowerUpTask[]
}

export const TEAM_POWER_UP_CIRCUITS: PowerUpCircuit[] = [
  {
    id: 'tp-hollow-heroes',
    name: 'Hollow Heroes',
    tasks: [
      {
        id: 'tp-hh-1',
        kind: 'knowledge',
        title: 'Which shape does this cue build?',
        detail: 'Match the coach cue to the right shape.',
        source: { pack: 'cue', refId: 'cq-01' },
      },
      {
        id: 'tp-hh-2',
        kind: 'move',
        title: 'Hold Hollow (arms down): 5 seconds',
        detail: 'On your back, low back pressed flat, feet just off the floor. Breathe.',
        source: { shapeName: 'Hollow (arms down)', seconds: 5 },
      },
      {
        id: 'tp-hh-3',
        kind: 'knowledge',
        title: 'Which shape does this cue build?',
        detail: 'Match the coach cue to the right shape.',
        source: { pack: 'cue', refId: 'cq-05' },
      },
      {
        id: 'tp-hh-4',
        kind: 'move',
        title: 'Hold C shape: 5 seconds',
        detail: 'Hips under, chest rounded. Round the back, do not arch.',
        source: { shapeName: 'C shape', seconds: 5 },
      },
      {
        id: 'tp-hh-5',
        kind: 'knowledge',
        title: "Coach's eye: what first?",
        detail: 'Read the scenario and pick what you would focus on first.',
        source: { pack: 'eye', refId: 'ce-03' },
      },
    ],
  },
  {
    id: 'tp-arch-angels',
    name: 'Arch Angels',
    tasks: [
      {
        id: 'tp-aa-1',
        kind: 'knowledge',
        title: 'Which shape does this cue build?',
        detail: 'Match the coach cue to the right shape.',
        source: { pack: 'cue', refId: 'cq-02' },
      },
      {
        id: 'tp-aa-2',
        kind: 'move',
        title: 'Hold Tight arch: 5 seconds',
        detail: 'On your back, tight arch. Long and lifted, not a Superman.',
        source: { shapeName: 'Tight arch', seconds: 5 },
      },
      {
        id: 'tp-aa-3',
        kind: 'knowledge',
        title: 'Which shape does this cue build?',
        detail: 'Match the coach cue to the right shape.',
        source: { pack: 'cue', refId: 'cq-03' },
      },
      {
        id: 'tp-aa-4',
        kind: 'move',
        title: 'Hold Superman: 5 seconds',
        detail: 'On your stomach, chin up, straight arms behind the ears.',
        source: { shapeName: 'Superman', seconds: 5 },
      },
      {
        id: 'tp-aa-5',
        kind: 'knowledge',
        title: "Coach's eye: what first?",
        detail: 'Read the scenario and pick what you would focus on first.',
        source: { pack: 'eye', refId: 'ce-01' },
      },
    ],
  },
  {
    id: 'tp-line-leaders',
    name: 'Line Leaders',
    tasks: [
      {
        id: 'tp-ll-1',
        kind: 'knowledge',
        title: 'Which shape does this cue build?',
        detail: 'Match the coach cue to the right shape.',
        source: { pack: 'cue', refId: 'cq-04' },
      },
      {
        id: 'tp-ll-2',
        kind: 'move',
        title: 'Hold Candlestick: 5 seconds',
        detail: 'On the shoulders, open hips, ribs in. Stacked like a handstand.',
        source: { shapeName: 'Candlestick', seconds: 5 },
      },
      {
        id: 'tp-ll-3',
        kind: 'knowledge',
        title: "Coach's eye: what first?",
        detail: 'Read the scenario and pick what you would focus on first.',
        source: { pack: 'eye', refId: 'ce-02' },
      },
      {
        id: 'tp-ll-4',
        kind: 'move',
        title: 'Hold Front support: 10 seconds',
        detail: 'Straight line head to heels, ribs in. Knees down is fine.',
        source: { shapeName: 'Front plank', seconds: 10 },
      },
      {
        id: 'tp-ll-5',
        kind: 'knowledge',
        title: 'Which shape does this cue build?',
        detail: 'Match the coach cue to the right shape.',
        source: { pack: 'cue', refId: 'cq-06' },
      },
      {
        id: 'tp-ll-6',
        kind: 'move',
        title: 'Stand in Zombie shape: 5 seconds',
        detail: 'Standing hollow: armpits in front of toes, ribs in.',
        source: { shapeName: 'Zombie', seconds: 5 },
      },
    ],
  },
  {
    id: 'tp-steady-base',
    name: 'Steady Base',
    tasks: [
      {
        id: 'tp-sb-1',
        kind: 'knowledge',
        title: "Coach's eye: what first?",
        detail: 'Read the scenario and pick what you would focus on first.',
        source: { pack: 'eye', refId: 'ce-04' },
      },
      {
        id: 'tp-sb-2',
        kind: 'move',
        title: 'Lunge hold: 5 seconds each side',
        detail: 'Tall chest, front knee over ankle. Switch sides when ready.',
        source: { shapeName: 'Lunge', seconds: 10 },
      },
      {
        id: 'tp-sb-3',
        kind: 'knowledge',
        title: 'Which shape does this cue build?',
        detail: 'Match the coach cue to the right shape.',
        source: { pack: 'cue', refId: 'cq-07' },
      },
      {
        id: 'tp-sb-4',
        kind: 'move',
        title: 'Hold Side plank: 5 seconds each side',
        detail: 'Be a pencil. Straightest line you can squeeze. Knees down is fine.',
        source: { shapeName: 'Side plank', seconds: 10 },
      },
      {
        id: 'tp-sb-5',
        kind: 'knowledge',
        title: "Coach's eye: what first?",
        detail: 'Read the scenario and pick what you would focus on first.',
        source: { pack: 'eye', refId: 'ce-06' },
      },
    ],
  },
  {
    id: 'tp-takeoff-team',
    name: 'Takeoff Team',
    tasks: [
      {
        id: 'tp-tt-1',
        kind: 'knowledge',
        title: 'Which shape does this cue build?',
        detail: 'Match the coach cue to the right shape.',
        source: { pack: 'cue', refId: 'cq-08' },
      },
      {
        id: 'tp-tt-2',
        kind: 'move',
        title: 'Hold Front support: 10 seconds',
        detail: 'Blocking strength starts here: straight arms, ribs in, hold the line.',
        source: { shapeName: 'Front plank', seconds: 10 },
      },
      {
        id: 'tp-tt-3',
        kind: 'knowledge',
        title: "Coach's eye: what first?",
        detail: 'Read the scenario and pick what you would focus on first.',
        source: { pack: 'eye', refId: 'ce-05' },
      },
      {
        id: 'tp-tt-4',
        kind: 'move',
        title: 'Hold Hollow (arms down): 5 seconds',
        detail: 'Low back flat, feet inch off the ground. This is the shape you block through.',
        source: { shapeName: 'Hollow (arms down)', seconds: 5 },
      },
    ],
  },
  {
    id: 'tp-finisher-flow',
    name: 'Finisher Flow',
    tasks: [
      {
        id: 'tp-ff-1',
        kind: 'knowledge',
        title: 'Which shape does this cue build?',
        detail: 'Match the coach cue to the right shape.',
        source: { pack: 'cue', refId: 'cq-11' },
      },
      {
        id: 'tp-ff-2',
        kind: 'move',
        title: 'Hold Tucked candle: 5 seconds',
        detail: 'On the shoulders, knees tucked tight to the chest.',
        source: { shapeName: 'Tucked candle', seconds: 5 },
      },
      {
        id: 'tp-ff-3',
        kind: 'knowledge',
        title: "Coach's eye: what first?",
        detail: 'Read the scenario and pick what you would focus on first.',
        source: { pack: 'eye', refId: 'ce-02' },
      },
      {
        id: 'tp-ff-4',
        kind: 'move',
        title: 'Hold Superman: 5 seconds',
        detail: 'Chin up, arms behind the ears. Finish long.',
        source: { shapeName: 'Superman', seconds: 5 },
      },
      {
        id: 'tp-ff-5',
        kind: 'knowledge',
        title: 'Which shape does this cue build?',
        detail: 'Match the coach cue to the right shape.',
        source: { pack: 'cue', refId: 'cq-01' },
      },
      {
        id: 'tp-ff-6',
        kind: 'move',
        title: 'Hold Hollow (arms down): 5 seconds',
        detail: 'Last one: low back flat, breathe, hold the shape.',
        source: { shapeName: 'Hollow (arms down)', seconds: 5 },
      },
    ],
  },
]
