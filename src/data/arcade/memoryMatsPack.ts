/**
 * Memory Mats pack — shape name ↔ cue pairs, both verbatim from the
 * coach's shape tips. Draft content.
 */
export type MemoryMatsPair = {
  id: string
  shapeName: string
  cue: string
}

export const MEMORY_MATS_PAIRS: MemoryMatsPair[] = [
  {
    id: 'mm-01',
    shapeName: 'Hollow (arms down)',
    cue: 'Flatten the low back, then let the feet inch off the ground.',
  },
  {
    id: 'mm-02',
    shapeName: 'Tight arch',
    cue: 'On the back — this is a tight arch, not a Superman.',
  },
  {
    id: 'mm-03',
    shapeName: 'Superman',
    cue: 'Chin stays up with straight arms behind the ears.',
  },
  {
    id: 'mm-04',
    shapeName: 'Candlestick',
    cue: 'Open hips, ribs in — same stacked body as a good handstand, just on the shoulders.',
  },
  {
    id: 'mm-05',
    shapeName: 'C shape',
    cue: 'Hips under, chest hollow — round the back, do not arch.',
  },
  {
    id: 'mm-06',
    shapeName: 'Side plank',
    cue: 'Be a pencil. Straightest line you can squeeze.',
  },
  {
    id: 'mm-07',
    shapeName: 'Front plank',
    cue: 'Straight line head to heels — no sag, no pike.',
  },
  {
    id: 'mm-08',
    shapeName: 'Wall sit',
    cue: 'Thighs parallel to the floor.',
  },
  {
    id: 'mm-09',
    shapeName: 'Wall handstand',
    cue: 'Prefer stomach-to-wall for open shoulders.',
  },
  {
    id: 'mm-10',
    shapeName: 'Mountain climber',
    cue: 'C plus one medium step — not as big as a lunge.',
  },
  {
    id: 'mm-11',
    shapeName: 'Landing lunge',
    cue: 'Press the back heel flat — no rolling in on the arch.',
  },
  {
    id: 'mm-12',
    shapeName: 'Puck',
    cue: 'Keep the chest open. A full tuck kills the twist.',
  },
]
