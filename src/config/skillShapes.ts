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
  basics: [
    { shapeId: 'hollow_arms_up' },
    { shapeId: 'hollow_arms_down' },
    { shapeId: 'arch' },
    { shapeId: 'handstand' },
    { shapeId: 'tuck_open_shoulders' },
    { shapeId: 'candlestick' },
  ],
}
