/**
 * ============================================================================
 * SEQUENCE DEFINITIONS — edit this file to add drill sequences
 * ============================================================================
 * Each step references a shape `id` from shapes.ts.
 * `holdSeconds` = how long the athlete must stay above that shape's
 * qualityThreshold before the sequence advances.
 *
 * Future skills (cartwheel, roundoff, rolls) can be added as shapes first,
 * then dropped into sequences here.
 */

import type { SequenceDef } from '../types'

export const SEQUENCES: SequenceDef[] = [
  {
    id: 'lunge_lever_hs_lunge',
    name: 'Lunge → Lever → Handstand → Lunge',
    description: 'Basic support-to-handstand pathway returning to lunge.',
    steps: [
      { shapeId: 'lunge', holdSeconds: 1.5 },
      { shapeId: 'lever', holdSeconds: 1.5 },
      { shapeId: 'handstand', holdSeconds: 2 },
      { shapeId: 'lunge', holdSeconds: 1.5 },
    ],
  },
  {
    id: 'mc_hs_lever_lunge',
    name: 'Mountain Climber → Handstand → Lever → Lunge',
    description: 'Entry from mountain climber into handstand and exit.',
    steps: [
      { shapeId: 'mountain_climber', holdSeconds: 1.5 },
      { shapeId: 'handstand', holdSeconds: 2 },
      { shapeId: 'lever', holdSeconds: 1.5 },
      { shapeId: 'lunge', holdSeconds: 1.5 },
    ],
  },
  {
    id: 'mc_cartwheel_lever_lunge',
    name: 'Mountain Climber → Cartwheel → Lever → Lunge',
    description:
      'Cartwheel is not scored yet. The middle hold is the tumbling C — the same connection used into a back handspring and round-off back handspring.',
    steps: [
      { shapeId: 'mountain_climber', holdSeconds: 1.5 },
      { shapeId: 'c_shape', holdSeconds: 1.2 },
      { shapeId: 'lever', holdSeconds: 1.5 },
      { shapeId: 'lunge', holdSeconds: 1.5 },
    ],
  },
  {
    id: 'c_passe_cartwheel_zombie',
    name: 'C Shape → Passé → Cartwheel cue',
    description:
      'Pull a passé from the tumbling C before a cartwheel or round-off. Cartwheel is not scored yet; the second C is the connection cue. Zombie is a related arms-forward hold.',
    steps: [
      { shapeId: 'c_shape', holdSeconds: 1.5 },
      { shapeId: 'passe', holdSeconds: 1.5 },
      { shapeId: 'c_shape', holdSeconds: 1.2 },
      { shapeId: 'zombie', holdSeconds: 1.5 },
    ],
  },
  {
    id: 'pike_hollow_arch',
    name: 'Pike → Hollow → Arch',
    description: 'Core shape chain on the floor.',
    steps: [
      { shapeId: 'seated_pike', holdSeconds: 2 },
      { shapeId: 'hollow', holdSeconds: 2 },
      { shapeId: 'arch', holdSeconds: 2 },
    ],
  },
  {
    id: 'pike_tuck_hollow_arch',
    name: 'Pike → Tuck → Hollow → Arch',
    description: 'Floor shape progression using tucked handstand as the tuck body cue.',
    steps: [
      { shapeId: 'seated_pike', holdSeconds: 1.5 },
      { shapeId: 'tucked_handstand', holdSeconds: 1.5 },
      { shapeId: 'hollow', holdSeconds: 2 },
      { shapeId: 'arch', holdSeconds: 2 },
    ],
  },
]

export const SEQUENCES_BY_ID: Record<string, SequenceDef> = Object.fromEntries(
  SEQUENCES.map((s) => [s.id, s]),
)
