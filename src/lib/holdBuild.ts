/** Visible hold-challenge stamp. Change this when you need to prove a new gym build. */
export const HOLD_BUILD = 'Lace'
export const HOLD_BUILD_SLUG = 'lace'
declare const __GYM_SHA__: string
const GYM_SHORT_SHA =
  typeof __GYM_SHA__ === 'string' && __GYM_SHA__.length >= 7
    ? __GYM_SHA__.slice(0, 7).toLowerCase()
    : 'dev'
/** Unique per build — the short git SHA proves you're on the latest. */
export const HOLD_BUILD_LABEL = `Gym build ${GYM_SHORT_SHA}`
/** Drawn on recap / saved clips — not the stamp name. */
export const HOLD_HUD_LABEL = 'shapelab'
export const HOLD_PINK = '#6ec8d6'
export const HOLD_PINK_BTN = 'bg-[#6ec8d6] font-black text-[#061418]'
export const HOLD_PINK_TEXT = 'text-[#6ec8d6]'
export const HOLD_PINK_BORDER = 'border-[#6ec8d6]'
export const HOLD_BUILD_CHIP =
  'inline-flex items-center rounded-full border border-[#6ec8d6] bg-[#6ec8d6] px-2.5 py-0.5 text-[11px] font-black uppercase tracking-wide text-[#061418]'
export const HOLD_BUILD_BANNER =
  'rounded-xl bg-[#6ec8d6] px-3 py-3 text-center text-[15px] font-black uppercase tracking-wide text-[#061418]'
