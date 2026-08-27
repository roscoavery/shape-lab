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
  /** Hunt this many ms for the highest-scoring frame (handstand / FTOS). */
  snapshotBestMs?: number
  /** Ignore the first part of a best-window (kick-up, walking in). */
  snapshotMinMs?: number
  /**
   * Hunt the best-matching frame as a replay playhead (accuracy), not a
   * class-count snapshot. Same hunt as snapshotBestMs.
   */
  playheadBestMs?: number
  /** Restart the saved replay here (drop get-set / standing around). */
  replayStart?: boolean
}

export type FlowSequence = {
  id: string
  name: string
  nickname: string
  description: string
  previewSpeak: string
  /**
   * Spoken and shown right before the first beat — get set (side view, clean).
   * Not a graded snapshot.
   */
  setupSpeak?: string
  /** Extra coaching after the side-view get-set, still on the setup still. */
  setupExtraSpeak?: string
  /** Coach still while they get set (usually stand clean). */
  setupShapeId?: string
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
  const cartwheel = side === 'right' ? 'cartwheel' : 'non cartwheel'
  return [
    {
      speak:
        'Start feet together, fully open shoulders, arms in close by the ears.',
      shapeId: 'feet_together_open_shoulders',
      profileOk: true,
      pauseMs: 300,
      snapshotBestMs: 2800,
      snapshotMinMs: 700,
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
      replayStart: true,
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
      pauseMs: 250,
      snapshotBestMs: 2600,
      snapshotMinMs: 700,
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
      pauseMs: 700,
      snapshotBestMs: 2200,
      snapshotMinMs: 1100,
    },
  ]
}

/** Same HS class flow on the non-cartwheel side, with extra open-shoulder coaching. */
function hsNonCartwheel(): FlowBeat[] {
  return [
    {
      speak:
        'Start feet together, fully open shoulders, arms in close by the ears.',
      shapeId: 'feet_together_open_shoulders',
      profileOk: true,
      pauseMs: 300,
      snapshotBestMs: 2800,
      snapshotMinMs: 700,
    },
    {
      speak: 'Take your non cartwheel leg to a passé and hold for 3.',
      shapeId: 'passe',
      stance: 'left',
      pauseMs: 350,
    },
    { speak: '2.', pauseMs: 400, snapshotAtMs: 120 },
    {
      speak: 'Fall to lunge.',
      shapeId: 'lunge_start',
      stance: 'left',
      pauseMs: 250,
      replayStart: true,
    },
    { speak: 'Hold for 3.', pauseMs: 350 },
    { speak: '2.', pauseMs: 400, snapshotAtMs: 120 },
    {
      speak: 'Lever.',
      shapeId: 'lever',
      stance: 'left',
      pauseMs: 250,
    },
    { speak: 'Hold for 3.', pauseMs: 350 },
    { speak: '2.', pauseMs: 400, snapshotAtMs: 120 },
    {
      speak: 'Handstand.',
      shapeId: 'handstand',
      pauseMs: 250,
      snapshotBestMs: 2600,
      snapshotMinMs: 700,
    },
    {
      speak: 'Back to your non cartwheel lunge.',
      shapeId: 'lunge_land',
      stance: 'left',
      pauseMs: 250,
    },
    { speak: 'Hold for 5. With your back foot flat.', pauseMs: 200 },
    { speak: '4. Arms tight behind the ears.', pauseMs: 200 },
    { speak: '3. Chest stays tilted forward.', pauseMs: 200 },
    { speak: '2. Chin stays up.', pauseMs: 400, snapshotAtMs: 120 },
    {
      speak: 'And clean.',
      shapeId: 'stand_clean',
      profileOk: true,
      pauseMs: 700,
      snapshotBestMs: 2200,
      snapshotMinMs: 1100,
    },
  ]
}

function mcHsLeverLunge(): FlowBeat[] {
  return [
    {
      speak: 'Ready.',
      shapeId: 'stand_clean',
      profileOk: true,
      pauseMs: 350,
    },
    {
      speak: 'Start clean.',
      pauseMs: 400,
    },
    {
      speak: 'Step to mountain climber and hold for 3.',
      shapeId: 'mountain_climber',
      pauseMs: 350,
      replayStart: true,
    },
    { speak: '2.', pauseMs: 400, snapshotAtMs: 120 },
    {
      speak: 'Kick to handstand.',
      shapeId: 'handstand',
      pauseMs: 250,
      snapshotBestMs: 2600,
      snapshotMinMs: 700,
    },
    {
      speak: 'Lever.',
      shapeId: 'lever',
      stance: 'right',
      pauseMs: 250,
      playheadBestMs: 2200,
      snapshotMinMs: 200,
    },
    {
      speak: 'Back to lunge.',
      shapeId: 'lunge_land',
      stance: 'right',
      pauseMs: 250,
    },
    { speak: 'Hold for 5. With the back foot flat.', pauseMs: 200 },
    { speak: '4. Arms tight behind the ears.', pauseMs: 200 },
    { speak: '3. Chest stays tilted forward.', pauseMs: 200 },
    { speak: '2. Chin stays up.', pauseMs: 400, snapshotAtMs: 120 },
    {
      speak: 'And clean.',
      shapeId: 'stand_clean',
      profileOk: true,
      pauseMs: 700,
      snapshotBestMs: 2200,
      snapshotMinMs: 1100,
    },
  ]
}

export const FLOW_SEQUENCES: FlowSequence[] = [
  {
    id: 'flow_hs_right',
    name: 'LG LV HS LG (Cartwheel side)',
    nickname: 'LG LV HS LG',
    description:
      'Cartwheel side. Lunge, lever, handstand, lunge. Side view. Stand clean before we start. After clean you get a fullscreen replay. Not a gate.',
    previewSpeak: 'This sequence is lunge, lever, handstand, lunge. Cartwheel side.',
    setupSpeak: 'Side view. Stand clean. Stay clean until we start.',
    setupShapeId: 'stand_clean',
    previewShapes: HS_PREVIEW,
    beats: hsProgression('right'),
  },
  {
    id: 'flow_hs_left',
    name: 'LG LV HS LG (NON Cartwheel side)',
    nickname: 'LG LV HS LG',
    description:
      'Same sequence on the non-cartwheel side. Open shoulders often get harder here — extra effort. Side view. Stand clean before we start. After clean you get a fullscreen replay. Not a gate.',
    previewSpeak: 'This sequence is lunge, lever, handstand, lunge. Non cartwheel side.',
    setupSpeak: 'Side view. Stand clean. Stay clean until we start.',
    setupExtraSpeak:
      'Now that we are doing the non cartwheel side, open shoulders often become harder for athletes. Remember, extra effort on open shoulders. Here we go.',
    setupShapeId: 'stand_clean',
    previewShapes: HS_PREVIEW,
    beats: hsNonCartwheel(),
  },
  {
    id: 'flow_mc_hs',
    name: 'MC HS LV LG',
    nickname: 'MC HS LV LG',
    description:
      'Cartwheel side. Ready in clean, mountain climber 3-2, kick to handstand, pass through lever, landing lunge 5-count, clean. Lever is a replay marker from your best match, not a timed snapshot. After clean you get a fullscreen replay. Not a gate.',
    previewSpeak: 'This sequence is mountain climber, handstand, lever, landing lunge.',
    setupShapeId: 'stand_clean',
    previewShapes: [
      { shapeId: 'mountain_climber', label: 'MC' },
      { shapeId: 'handstand', label: 'HS' },
      { shapeId: 'lever', label: 'LV' },
      { shapeId: 'lunge_land', label: 'LG' },
    ],
    beats: mcHsLeverLunge(),
  },
]

export const FLOW_BY_ID: Record<string, FlowSequence> = Object.fromEntries(
  FLOW_SEQUENCES.map((s) => [s.id, s]),
)

export function getFlowSequence(id: string): FlowSequence | undefined {
  return FLOW_BY_ID[id]
}
