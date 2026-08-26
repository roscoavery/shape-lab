/**
 * ============================================================================
 * SEQUENCE DEFINITIONS — edit this file to add drill sequences
 * ============================================================================
 * Each step references a shape `id` from shapes.ts.
 * `holdSeconds` = how long the athlete must stay above that shape's
 * qualityThreshold before the sequence advances.
 *
 * Cartwheels are not scored yet. Usual start: starting lunge or mountain climber.
 * Usual cartwheel finish: landing lunge. Cartwheel step-ins (round-off prep)
 * finish in a zombie — train that before round-offs. All round-offs and
 * handsprings land in zombie until skills above a RO-BHS series.
 */

import type { SequenceDef } from '../types'

export const SEQUENCES: SequenceDef[] = [
  {
    id: 'lunge_lever_hs_lunge',
    name: 'Starting lunge → Lever → Handstand → Landing lunge',
    description:
      'Every lunge → lever → handstand → lunge finishes in a landing lunge (heel flat, closer stance).',
    steps: [
      { shapeId: 'lunge_start', holdSeconds: 1.5 },
      { shapeId: 'lever', holdSeconds: 1.5 },
      { shapeId: 'handstand', holdSeconds: 2 },
      { shapeId: 'lunge_land', holdSeconds: 1.5 },
    ],
  },
  {
    id: 'mc_hs_lever_lunge',
    name: 'Mountain Climber → Handstand → Lever → Landing lunge',
    description: 'Entry from mountain climber. Finish in a landing lunge.',
    steps: [
      { shapeId: 'mountain_climber', holdSeconds: 1.5 },
      { shapeId: 'handstand', holdSeconds: 2 },
      { shapeId: 'lever', holdSeconds: 1.5 },
      { shapeId: 'lunge_land', holdSeconds: 1.5 },
    ],
  },
  {
    id: 'lunge_cartwheel_land',
    name: 'Starting lunge → Cartwheel → Landing lunge',
    description:
      'Usual cartwheel: start from a starting lunge (or a mountain climber). Finish in a landing lunge. Cartwheel step-ins (round-off prep) finish in a zombie instead. Cartwheel itself is not scored yet.',
    steps: [
      { shapeId: 'lunge_start', holdSeconds: 1.5 },
      { shapeId: 'lunge_land', holdSeconds: 1.5 },
    ],
  },
  {
    id: 'mc_cartwheel_lever_lunge',
    name: 'Mountain Climber → Cartwheel → Landing lunge',
    description:
      'Other usual cartwheel start: mountain climber. Finish in a landing lunge. Cartwheel is not scored yet — the middle hold is the tumbling C.',
    steps: [
      { shapeId: 'mountain_climber', holdSeconds: 1.5 },
      { shapeId: 'c_shape', holdSeconds: 1.2 },
      { shapeId: 'lunge_land', holdSeconds: 1.5 },
    ],
  },
  {
    id: 'c_passe_cartwheel_zombie',
    name: 'C Shape → Passé → Cartwheel step-in → Zombie',
    description:
      'Train zombie on cartwheel step-ins before round-offs. Standing hollow, arms in front, shoulders shrugged to cover the ears, eyes forward/down. All round-offs and handsprings land here until skills above a RO-BHS series (then arms go up to block). Usual cartwheels still finish in a landing lunge.',
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
      { shapeId: 'hollow_arms_up', holdSeconds: 2 },
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
      { shapeId: 'hollow_arms_up', holdSeconds: 2 },
      { shapeId: 'arch', holdSeconds: 2 },
    ],
  },
]

export const SEQUENCES_BY_ID: Record<string, SequenceDef> = Object.fromEntries(
  SEQUENCES.map((s) => [s.id, s]),
)
