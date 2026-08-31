import type { DrillClip } from '../types'

/** Drills that ship with the app. Ryan can attach a video in Drill library. */
export const SHIPPED_DRILLS: DrillClip[] = [
  {
    id: 'drl_candlestick',
    title: 'Candlestick drill',
    notes:
      'Do not pause — the shape should not sit for long. Start FTOS, bend to a C, sit and fall back to a tuck, then roll back and arch for the candle. Toes stay above you; they should not pass over the face. Try to hit an arch for the candle. If a coach picks the feet up while they hold an arch, they are in a good candle.',
    src: '',
    shapeId: 'candlestick',
    createdAt: '2026-08-31T00:00:00.000Z',
    updatedAt: '2026-08-31T00:00:00.000Z',
  },
]

export const SHIPPED_DRILL_IDS = new Set(SHIPPED_DRILLS.map((d) => d.id))
