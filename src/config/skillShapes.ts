/**
 * Key shapes per skill guide card.
 *
 * Ryan's ask: use the shape stills (and the shapes' own descriptions) inside
 * skill cards so athletes see the body positions a skill is built from.
 *
 * Keys match guide ids in GUIDE_ORDER (src/lib/skillRegistry.ts).
 * shapeId must be a scored shape in src/config/shapes.ts that has a shipped
 * still (src/lib/shippedRefs.ts SHIPPED_FILES) — the card resolves the still
 * image, the shape name, and the shape's own description at render time.
 * Captions reuse the shape's own description; no new coaching prose lives here.
 */

export interface SkillShapeRef {
  /** Scored shape id, e.g. 'hollow_arms_up'. */
  shapeId: string
}

export const SKILL_SHAPES: Record<string, SkillShapeRef[]> = {
  layout: [{ shapeId: 'hollow_arms_up' }, { shapeId: 'arch' }, { shapeId: 'candlestick' }],
  'back-tuck': [{ shapeId: 'tuck_open_shoulders' }, { shapeId: 'hollow_arms_up' }, { shapeId: 'candlestick' }],
  'round-off': [
    { shapeId: 'mountain_climber' },
    { shapeId: 'lunge_start' },
    { shapeId: 'lever' },
    { shapeId: 'hollow_arms_down' },
    { shapeId: 'zombie' },
  ],
  'ro-bhs': [
    { shapeId: 'handstand' },
    { shapeId: 'arch' },
    { shapeId: 'hollow_arms_up' },
    { shapeId: 'candlestick' },
  ],
  'ro-bhs-series': [
    { shapeId: 'handstand' },
    { shapeId: 'arch' },
    { shapeId: 'hollow_arms_up' },
    { shapeId: 'lunge_land' },
  ],
  'standing-bhs': [
    { shapeId: 'long_bridge' },
    { shapeId: 'handstand' },
    { shapeId: 'arch' },
    { shapeId: 'hollow_arms_up' },
    { shapeId: 'candlestick' },
  ],
  'standing-tuck': [
    { shapeId: 'tuck_open_shoulders' },
    { shapeId: 'hollow_arms_up' },
    { shapeId: 'candlestick' },
  ],
  'standing-full': [{ shapeId: 'hollow_arms_up' }, { shapeId: 'puck' }],
  'back-half': [{ shapeId: 'hollow_arms_up' }, { shapeId: 'arch' }],
  full: [{ shapeId: 'hollow_arms_up' }, { shapeId: 'arch' }],
  'double-full': [{ shapeId: 'hollow_arms_up' }, { shapeId: 'arch' }],
  'triple-full': [{ shapeId: 'hollow_arms_up' }, { shapeId: 'arch' }],
  'double-back': [
    { shapeId: 'tuck_open_shoulders' },
    { shapeId: 'hollow_arms_up' },
    { shapeId: 'candlestick' },
  ],
  'back-walkover': [{ shapeId: 'bridge' }, { shapeId: 'arch' }, { shapeId: 'handstand' }],
  'front-walkover': [{ shapeId: 'bridge' }, { shapeId: 'arch' }, { shapeId: 'handstand' }],
  barani: [{ shapeId: 'tuck_open_shoulders' }, { shapeId: 'hollow_arms_up' }],
  'cartwheel-handspring': [
    { shapeId: 'handstand' },
    { shapeId: 'c_shape' },
    { shapeId: 'hollow_arms_up' },
  ],
  'cart-tuck': [
    { shapeId: 'tuck_open_shoulders' },
    { shapeId: 'handstand' },
    { shapeId: 'hollow_arms_up' },
  ],
  'cart-full': [{ shapeId: 'hollow_arms_up' }, { shapeId: 'arch' }, { shapeId: 'handstand' }],
  'cart-dub': [{ shapeId: 'hollow_arms_up' }, { shapeId: 'arch' }, { shapeId: 'handstand' }],
  'skl_ro_bhs_tuck': [{ shapeId: 'arch' }, { shapeId: 'tucked_candle' }],
  basics: [
    { shapeId: 'superman' },
    { shapeId: 'side_plank' },
    { shapeId: 'front_plank' },
    { shapeId: 'gym_mad_cat' },
    { shapeId: 'gym_front_support' },
    { shapeId: 'gym_back_support' },
    { shapeId: 'handstand' },
    { shapeId: 'stand_clean' },
    { shapeId: 'feet_together_open_shoulders' },
    { shapeId: 'lunge' },
    { shapeId: 'lunge_start' },
    { shapeId: 'lunge_land' },
    { shapeId: 'lever' },
    { shapeId: 'mountain_climber' },
    { shapeId: 'seated_pike' },
    { shapeId: 'pike_open_shoulders' },
    { shapeId: 'tuck_open_shoulders' },
    { shapeId: 'puck' },
    { shapeId: 'hollow_arms_down' },
    { shapeId: 'arch' },
    { shapeId: 'rainbow_bridge' },
    { shapeId: 'long_bridge' },
    { shapeId: 'bridge' },
    { shapeId: 'candlestick' },
    { shapeId: 'tucked_candle' },
    { shapeId: 'passe' },
    { shapeId: 'tucked_handstand' },
    { shapeId: 'piked_handstand' },
    { shapeId: 'l_handstand' },
    { shapeId: 'wall_handstand' },
    { shapeId: 'c_shape' },
    { shapeId: 'zombie' },
    { shapeId: 'hands_push_through' },
    { shapeId: 'wall_sit' },
    { shapeId: 'arms_low_v_back' },
    { shapeId: 'arms_front_middle' },
    { shapeId: 'arms_open_shoulders' },
    { shapeId: 'arms_t' },
    { shapeId: 'arms_high_v_chest' },
    { shapeId: 'lunge_arms_low_v' },
    { shapeId: 'lunge_arms_front' },
    { shapeId: 'lunge_arms_open' },
    { shapeId: 'lunge_arms_t' },
    { shapeId: 'lunge_arms_high_v' },
  ],
}
