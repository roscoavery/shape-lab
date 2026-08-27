/**
 * Tasks 2 — class-pace guided sequences.
 * Not a gate: the show goes on. Voice leads, camera grades after.
 */

export type FlowPreviewShape = {
  shapeId: string
  /** Class nickname on the preview strip (LG, LV, HS). */
  label: string
}

export type FlowBeat = {
  speak: string
  /** Shape to show + score. Omit to keep the previous shape. */
  shapeId?: string
  stance?: 'left' | 'right'
  profileOk?: boolean
  /** Pause after this line before the next (ms). */
  pauseMs?: number
  /** Grab a snapshot this many ms after the line starts (class “2”). */
  snapshotAtMs?: number
}

export type FlowSequence = {
  id: string
  name: string
  nickname: string
  description: string
  previewSpeak: string
  previewShapes: FlowPreviewShape[]
  beats: FlowBeat[]
}

const HS_PREVIEW: FlowPreviewShape[] = [
  { shapeId: 'lunge_start', label: 'LG' },
  { shapeId: 'lever', label: 'LV' },
  { shapeId: 'handstand', label: 'HS' },
  { shapeId: 'lunge_land', label: 'LG' },
]

function hsProgression(side: 'left' | 'right'): FlowBeat[] {
  const cartwheel = side === 'right' ? 'cartwheel' : 'cartwheel'
  return [
    {
      speak:
        'Start feet together, fully open shoulders, arms in close by the ears.',
      shapeId: 'feet_together_open_shoulders',
      profileOk: true,
      pauseMs: 600,
      snapshotAtMs: 2200,
    },
    {
      speak: `Take your ${cartwheel} leg to a passé and hold for 3.`,
      shapeId: 'passe',
      stance: side,
      pauseMs: 350,
    },
    { speak: '2.', pauseMs: 400, snapshotAtMs: 120 },
    {
      speak: 'Fall to lunge.',
      shapeId: 'lunge_start',
      stance: side,
      pauseMs: 250,
    },
    { speak: 'Hold for 3.', pauseMs: 350 },
    { speak: '2.', pauseMs: 400, snapshotAtMs: 120 },
    {
      speak: 'Lever.',
      shapeId: 'lever',
      stance: side,
      pauseMs: 250,
    },
    { speak: 'Hold for 3.', pauseMs: 350 },
    { speak: '2.', pauseMs: 400, snapshotAtMs: 120 },
    {
      speak: 'Handstand.',
      shapeId: 'handstand',
      pauseMs: 1100,
      snapshotAtMs: 850,
    },
    {
      speak: 'Back to your landing lunge. Hold for 5. With your back foot flat.',
      shapeId: 'lunge_land',
      stance: side,
      pauseMs: 200,
    },
    { speak: '4. Arms tight behind the ears.', pauseMs: 200 },
    { speak: '3. Chest stays tilted forward.', pauseMs: 200 },
    { speak: '2. Chin stays up.', pauseMs: 400, snapshotAtMs: 120 },
    {
      speak: 'And clean.',
      shapeId: 'stand_clean',
      profileOk: true,
      pauseMs: 900,
      snapshotAtMs: 500,
    },
  ]
}

function lungeLeverFlow(side: 'left' | 'right'): FlowBeat[] {
  return [
    {
      speak:
        'Start feet together, fully open shoulders, arms in close by the ears.',
      shapeId: 'feet_together_open_shoulders',
      profileOk: true,
      pauseMs: 600,
      snapshotAtMs: 2200,
    },
    {
      speak: 'Take your cartwheel leg to a passé and hold.',
      shapeId: 'passe',
      stance: side,
      pauseMs: 200,
    },
    { speak: '3.', pauseMs: 350 },
    { speak: '2.', pauseMs: 400, snapshotAtMs: 120 },
    {
      speak: 'Fall to a starting lunge.',
      shapeId: 'lunge_start',
      stance: side,
      pauseMs: 250,
    },
    { speak: 'Hold for 3.', pauseMs: 350 },
    { speak: '2.', pauseMs: 400, snapshotAtMs: 120 },
    {
      speak: 'Lever.',
      shapeId: 'lever',
      stance: side,
      pauseMs: 250,
    },
    { speak: 'Hold for 3.', pauseMs: 350 },
    { speak: '2.', pauseMs: 400, snapshotAtMs: 120 },
    {
      speak: 'Landing lunge. Back heel flat.',
      shapeId: 'lunge_land',
      stance: side,
      pauseMs: 250,
    },
    { speak: 'Hold for 3.', pauseMs: 350 },
    { speak: '2.', pauseMs: 400, snapshotAtMs: 120 },
    {
      speak: 'And clean.',
      shapeId: 'stand_clean',
      profileOk: true,
      pauseMs: 900,
      snapshotAtMs: 500,
    },
  ]
}

export const FLOW_SEQUENCES: FlowSequence[] = [
  {
    id: 'flow_hs_right',
    name: '1. Handstand progression (RIGHT)',
    nickname: 'LG LV HS LG',
    description:
      'Class flow: feet together, passé, starting lunge, lever, handstand, landing lunge, clean. Not a gate — we guide, snapshot, and grade after.',
    previewSpeak:
      'This sequence is lunge, lever, handstand, lunge. LG. LV. HS. LG.',
    previewShapes: HS_PREVIEW,
    beats: hsProgression('right'),
  },
  {
    id: 'flow_hs_left',
    name: '2. Handstand progression (LEFT)',
    nickname: 'LG LV HS LG',
    description: 'Same class flow on the left side. The show goes on — we grade after.',
    previewSpeak:
      'Left side. This sequence is lunge, lever, handstand, lunge. LG. LV. HS. LG.',
    previewShapes: HS_PREVIEW,
    beats: hsProgression('left'),
  },
  {
    id: 'flow_lunge_lever_right',
    name: '3. Lunge–lever sequence (RIGHT)',
    nickname: 'FTOS PASSE LG LV LG',
    description:
      'Shorter class flow without the handstand: FTOS, passé, starting lunge, lever, landing lunge, clean.',
    previewSpeak:
      'This sequence is feet together, passé, lunge, lever, landing lunge.',
    previewShapes: [
      { shapeId: 'feet_together_open_shoulders', label: 'FTOS' },
      { shapeId: 'passe', label: 'PASSE' },
      { shapeId: 'lunge_start', label: 'LG' },
      { shapeId: 'lever', label: 'LV' },
      { shapeId: 'lunge_land', label: 'LG' },
    ],
    beats: lungeLeverFlow('right'),
  },
  {
    id: 'flow_lunge_lever_left',
    name: '4. Lunge–lever sequence (LEFT)',
    nickname: 'FTOS PASSE LG LV LG',
    description: 'Same shorter flow, left side.',
    previewSpeak:
      'Left side. Feet together, passé, lunge, lever, landing lunge.',
    previewShapes: [
      { shapeId: 'feet_together_open_shoulders', label: 'FTOS' },
      { shapeId: 'passe', label: 'PASSE' },
      { shapeId: 'lunge_start', label: 'LG' },
      { shapeId: 'lever', label: 'LV' },
      { shapeId: 'lunge_land', label: 'LG' },
    ],
    beats: lungeLeverFlow('left'),
  },
  {
    id: 'flow_mc_hs',
    name: '5. Mountain climber → HS → lever → lunge',
    nickname: 'MC HS LV LG',
    description:
      'Pass through mountain climber, kick up, lever, landing lunge, clean. Graded after — not a gate.',
    previewSpeak:
      'This sequence is mountain climber, handstand, lever, landing lunge. MC. HS. LV. LG.',
    previewShapes: [
      { shapeId: 'mountain_climber', label: 'MC' },
      { shapeId: 'handstand', label: 'HS' },
      { shapeId: 'lever', label: 'LV' },
      { shapeId: 'lunge_land', label: 'LG' },
    ],
    beats: [
      {
        speak: 'Stand clean.',
        shapeId: 'stand_clean',
        profileOk: true,
        pauseMs: 500,
        snapshotAtMs: 400,
      },
      {
        speak:
          'Mountain climber. Two bent knees. Reach forward and out. Look at where the hands will go.',
        shapeId: 'mountain_climber',
        pauseMs: 400,
        snapshotAtMs: 1800,
      },
      {
        speak: 'Kick up. Best handstand you can hit.',
        shapeId: 'handstand',
        pauseMs: 2200,
        snapshotAtMs: 1600,
      },
      {
        speak: 'Lever.',
        shapeId: 'lever',
        pauseMs: 250,
      },
      { speak: 'Hold for 3.', pauseMs: 350 },
      { speak: '2.', pauseMs: 400, snapshotAtMs: 120 },
      {
        speak: 'Landing lunge. Back heel flat.',
        shapeId: 'lunge_land',
        pauseMs: 250,
      },
      { speak: 'Hold for 3.', pauseMs: 350 },
      { speak: '2.', pauseMs: 400, snapshotAtMs: 120 },
      {
        speak: 'And clean.',
        shapeId: 'stand_clean',
        profileOk: true,
        pauseMs: 900,
        snapshotAtMs: 500,
      },
    ],
  },
]

export const FLOW_BY_ID: Record<string, FlowSequence> = Object.fromEntries(
  FLOW_SEQUENCES.map((s) => [s.id, s]),
)

export function getFlowSequence(id: string): FlowSequence | undefined {
  return FLOW_BY_ID[id]
}
