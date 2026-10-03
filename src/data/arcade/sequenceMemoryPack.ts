/**
 * Sequence Memory pools: each pool is 6 real shape names forming a
 * sensible floor/standing flow. Rounds use the first N shapes, so the
 * prefix of every pool must itself be a sensible order.
 */
export type SequenceMemoryPool = {
  id: string
  name: string
  shapes: string[]
}

export const SEQUENCE_MEMORY_POOLS: SequenceMemoryPool[] = [
  {
    id: 'handstand-entry',
    name: 'Handstand entry',
    shapes: [
      'Feet together, open shoulders',
      'Starting lunge with open shoulders',
      'Lever',
      'Handstand',
      'Landing lunge',
      'Stand clean',
    ],
  },
  {
    id: 'hollow-arch',
    name: 'Hollow to arch',
    shapes: [
      'Hollow (arms down)',
      'Hollow (arms up)',
      'Tight arch',
      'Superman',
      'Hollow (arms up)',
      'Hollow (arms down)',
    ],
  },
  {
    id: 'c-climber',
    name: 'C shape and climber',
    shapes: [
      'Feet together, open shoulders',
      'C shape',
      'Mountain climber',
      'Lunge',
      'Mountain climber',
      'C shape',
    ],
  },
  {
    id: 'pike-tuck',
    name: 'Pike to tuck',
    shapes: [
      'Pike (open shoulders)',
      'Pike (zombie arms)',
      'Tuck',
      'Tucked candle',
      'Tuck',
      'Pike (open shoulders)',
    ],
  },
  {
    id: 'bridge-flow',
    name: 'Bridge flow',
    shapes: [
      'Candlestick',
      'Tucked candle',
      'Candlestick',
      'Rainbow Bridge',
      'Long Bridge',
      'Candlestick',
    ],
  },
  {
    id: 'plank-flow',
    name: 'Plank flow',
    shapes: [
      'Front plank',
      'Side plank',
      'Front plank',
      'Superman',
      'Tight arch',
      'Front plank',
    ],
  },
  {
    id: 'lunge-arms',
    name: 'Lunge arm swing',
    shapes: [
      'Lunge · open shoulders',
      'Lunge · arms front middle',
      'Lunge · low V arms',
      'Lunge · arms front middle',
      'Lunge · open shoulders',
      'Landing lunge',
    ],
  },
  {
    id: 'wall-handstand',
    name: 'Wall handstand drill',
    shapes: [
      'Feet together, open shoulders',
      'Starting lunge with open shoulders',
      'Lever',
      'Wall handstand',
      'Landing lunge',
      'Stand clean',
    ],
  },
]
