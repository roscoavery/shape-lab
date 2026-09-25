import type { GymLibraryShape } from '../types'

const STAMP = '2026-09-13T18:00:00.000Z'

function gym(
  id: string,
  name: string,
  bodyPosition: string,
  scoreShapeId?: string,
  description?: string,
): GymLibraryShape {
  return {
    id,
    name,
    description: description ?? '',
    bodyPosition,
    category: 'hold',
    ...(scoreShapeId ? { scoreShapeId } : {}),
    createdById: 'ath_ryan',
    createdByName: 'Ryan',
    createdAt: STAMP,
    updatedAt: STAMP,
  }
}

/**
 * Gym-added shapes that already exist on the Mac library.
 * Same ids so phones and this Preview fill the listed stills
 * instead of asking Ryan to retype the names.
 */
export const SHIPPED_GYM_SHAPES: GymLibraryShape[] = [
  gym('gym_mad_cat', 'Mad cat', 'Hands and knees, round the spine.'),
  gym('gym_front_support', 'Front support', 'Straight-body plank on the hands.'),
  gym('gym_side_support', 'Side support', 'Side plank on one hand or forearm.', 'side_plank'),
  gym('gym_back_support', 'Back support', 'Reverse plank, hips high, belly up.'),
  gym('gym_lightning_bolt', 'Lightning bolt', 'Start feet together open shoulders. Bend the knees and tilt the chest forward without breaking the line from the hips to the hands.', undefined, 'Useful for intro to back handspring deconstruction process. Not a good position to land a round off.'),
  gym('gym_tucked_handstand', 'Tucked handstand', 'Handstand with both knees tucked.', 'handstand'),
  gym('gym_piked_handstand', 'Piked handstand', 'Handstand with a pike fold.', 'handstand'),
  gym('gym_l_handstand', 'L handstand', 'Handstand with one leg vertical and one on a block or wall.', 'handstand'),
  gym('gym_curl_up', 'Curl up', 'On the back, one knee bent, ready to curl.'),
  gym('gym_cartwheel_head_placement', 'Cartwheel head placement', 'Head looks at the hands before the cartwheel.'),
  gym('gym_hands_turned_in_position', 'Hands turned in position', 'Squat with the hands turned in.'),
  gym('gym_kneeling_wall_hollow', 'Kneeling wall hollow', 'Kneeling at the wall, arms up in a hollow.', 'hollow_arms_up'),
]
