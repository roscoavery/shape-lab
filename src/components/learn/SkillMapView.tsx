/**
 * The skill map: a spatial, bottom-up view of the skill path.
 *
 * Foundations at the bottom, harder skills higher up. Each tile opens the
 * full guide card in a modal (handled by SkillPathCards — this component
 * only reports taps). Tiles without guide prose get a subtle amber dot.
 * Tiles are color-coded by skill family (see FAMILY_STYLES + legend).
 *
 * Layout follows Ryan's spec: an 8-column grid, rows numbered from the
 * bottom (R0 = foundations). The "Beyond" rows stay collapsed by default.
 *
 * The page has a sticky control bar with two segmented pickers:
 * - Look: Neon | Midnight | Paper | Ember (persisted in localStorage)
 * - View: Map | List | Compact | Levels (persisted in localStorage)
 * The guiding-light data (glowMap) is theme/view-independent — only the
 * rendering changes. The LevelBar only renders in Map view.
 */
import { useMemo, useState } from 'react'
import type { CSSProperties } from 'react'
import { getRegistrySkill, type UnifiedSkill } from '../../lib/skillRegistry'
import { needsForSkill, resolveGoalSkill } from '../../lib/skillPaths'
import { isAthleteProfile } from '../../lib/profileRole'
import type { Athlete, AthleteSkillGoal } from '../../types'

/** Look + layout options for the skill map page. Persisted in localStorage. */
type MapTheme = 'neon' | 'midnight' | 'paper' | 'ember'
type MapViewMode = 'map' | 'list' | 'compact' | 'levels'
type InfoFilter = 'all' | 'info'

const MAP_THEME_KEY = 'shapelab.skillmap.theme.v1'
const MAP_VIEW_KEY = 'shapelab.skillmap.view.v1'
const INFO_FILTER_KEY = 'shapelab.skillmap.infofilter.v1'

const THEME_OPTIONS: { id: MapTheme; label: string }[] = [
  { id: 'neon', label: 'Neon' },
  { id: 'midnight', label: 'Midnight' },
  { id: 'paper', label: 'Paper' },
  { id: 'ember', label: 'Ember' },
]
const VIEW_OPTIONS: { id: MapViewMode; label: string }[] = [
  { id: 'map', label: 'Map' },
  { id: 'list', label: 'List' },
  { id: 'compact', label: 'Compact' },
  { id: 'levels', label: 'Levels' },
]

function loadMapTheme(): MapTheme {
  try {
    const v = localStorage.getItem(MAP_THEME_KEY)
    if (v === 'neon' || v === 'midnight' || v === 'paper' || v === 'ember') return v
  } catch {
    /* storage unavailable — fall through to default */
  }
  return 'ember'
}
function loadMapView(): MapViewMode {
  try {
    const v = localStorage.getItem(MAP_VIEW_KEY)
    if (v === 'list' || v === 'compact' || v === 'levels') return v
  } catch {
    /* storage unavailable — fall through to default */
  }
  return 'map'
}
function saveMapTheme(t: MapTheme) {
  try {
    localStorage.setItem(MAP_THEME_KEY, t)
  } catch {
    /* ignore */
  }
}
function saveMapView(v: MapViewMode) {
  try {
    localStorage.setItem(MAP_VIEW_KEY, v)
  } catch {
    /* ignore */
  }
}
const INFO_FILTER_OPTIONS: { id: InfoFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'info', label: 'With info' },
]
function loadInfoFilter(): InfoFilter {
  try {
    const v = localStorage.getItem(INFO_FILTER_KEY)
    if (v === 'info') return v
  } catch {
    /* storage unavailable — fall through to default */
  }
  return 'all'
}
function saveInfoFilter(f: InfoFilter) {
  try {
    localStorage.setItem(INFO_FILTER_KEY, f)
  } catch {
    /* ignore */
  }
}
/** A skill "has info" when its card has guide prose (same signal as the amber dot). */
function hasCardInfo(skillId: string): boolean {
  return !!getRegistrySkill(skillId)?.guideId
}

type SkillFamily =
  | 'foundations'
  | 'rolls'
  | 'cartwheel'
  | 'roundoff'
  | 'standing'
  | 'forwards'
  | 'killer'
  | 'doubleback'
  | 'kick'

const FAMILY_STYLES: Record<SkillFamily, { bg: string; border: string; label: string }> = {
  foundations: { bg: 'rgba(255,255,255,0.04)', border: 'rgba(255,255,255,0.20)', label: 'Foundations' },
  rolls: { bg: 'rgba(45,212,191,0.07)', border: 'rgba(45,212,191,0.45)', label: 'Rolls' },
  cartwheel: { bg: 'rgba(96,165,250,0.07)', border: 'rgba(96,165,250,0.50)', label: 'Cartwheel' },
  roundoff: { bg: 'rgba(74,222,128,0.07)', border: 'rgba(74,222,128,0.45)', label: 'Round off' },
  standing: { bg: 'rgba(192,132,252,0.07)', border: 'rgba(192,132,252,0.50)', label: 'Standing' },
  forwards: { bg: 'rgba(251,146,60,0.07)', border: 'rgba(251,146,60,0.50)', label: 'Forwards' },
  killer: { bg: 'rgba(251,191,36,0.10)', border: 'rgba(251,191,36,0.75)', label: 'Killer' },
  // Double back: green like the round-off family, trimmed in yellow.
  doubleback: { bg: 'rgba(74,222,128,0.08)', border: 'rgba(251,191,36,0.70)', label: 'Double back' },
  // Kicks: blue fading to green, trimmed in yellow.
  kick: { bg: 'linear-gradient(135deg, rgba(96,165,250,0.09), rgba(74,222,128,0.06))', border: 'rgba(251,191,36,0.60)', label: 'Kick' },
}

/** Solid RGB triplet per family, used for the guiding-light glow. */
const FAMILY_GLOW_RGB: Record<SkillFamily, string> = {
  foundations: '255,255,255',
  rolls: '45,212,191',
  cartwheel: '96,165,250',
  roundoff: '74,222,128',
  standing: '192,132,252',
  forwards: '251,146,60',
  killer: '251,191,36',
  doubleback: '190,242,100',
  kick: '130,210,170',
}

/** Deepest prerequisite level that still glows (fades to a faint shimmer). */
const MAX_GLOW_DISTANCE = 5

/**
 * Roll highlight tiers by goal difficulty. Rolls are NOT prerequisites —
 * they span a huge difficulty range, so they never light up as part of the
 * chain. Instead, specific rolls highlight when the goal reaches their level:
 * - Cartwheel level or above → backward roll
 * - Handspring level or above → back roll to push up
 * - RO HS level or above → handstand forward roll
 * - Layout level or above → back extension roll
 * 360 dive roll is never highlighted; it's beyond-level, not a stepping stone.
 *
 * Level is determined from the goal's row in the map (ROWS is top-down).
 * The shipped prerequisite data is too sparse to rely on chain-walking for
 * level detection, so row position is the primary signal.
 */
const ROLL_HIGHLIGHT_TIERS: { minRow: number; rolls: string[]; name: string }[] = [
  // Row indices in ROWS (0 = R12 top). Lower index = harder.
  { minRow: 11, rolls: ['skl_backward_roll'], name: 'cartwheel' }, // R1 and up
  { minRow: 9, rolls: ['skl_back_roll_push_up'], name: 'handspring' }, // R3 and up
  { minRow: 9, rolls: ['skl_handstand_fwd_roll'], name: 'roHs' }, // R3 and up, RO progression only
  { minRow: 6, rolls: ['skl_back_extension_roll'], name: 'layout' }, // R6 and up
]

/** Skills at R1 that are below cartwheel difficulty — never trigger highlights. */
const BELOW_CARTWHEEL = new Set(['skl_back_bend', 'skl_handstand', 'skl_foundations'])

/** Lazily built map: skillId -> row index in ROWS (0 = top). Beyond rows = -1. */
let skillRowIndex: Map<string, number> | null = null
function getSkillRow(skillId: string): number | undefined {
  if (!skillRowIndex) {
    skillRowIndex = new Map()
    ROWS.forEach((row, idx) => {
      for (const t of row.tiles) skillRowIndex!.set(t.skillId, idx)
    })
    BEYOND_ROWS.forEach((row) => {
      for (const t of row.tiles) skillRowIndex!.set(t.skillId, -1)
    })
  }
  return skillRowIndex.get(CANONICAL_SKILL_ID[skillId] ?? skillId)
}

/**
 * Does this goal count as "at or above" the given tier?
 * Tier thresholds are row indices; the RO HS tier additionally requires the
 * roundoff family (or layout+, which implies RO HS in the progression).
 */
function goalReachesTier(skillId: string, tier: { minRow: number; name: string }): boolean {
  const canon = CANONICAL_SKILL_ID[skillId] ?? skillId
  const row = getSkillRow(canon)
  if (row === undefined) return false
  if (tier.name === 'cartwheel' && BELOW_CARTWHEEL.has(canon)) return false
  if (row > tier.minRow) return false
  if (tier.name === 'roHs') {
    // RO HS tier: the skill itself, the roundoff family at R3+, or layout+
    // (layouts and above imply RO HS in the progression).
    if (canon === 'skl_ro_bhs') return true
    const family = FAMILY_BY_SKILL[canon]
    if (family === 'roundoff' && row <= 9) return true
    if (row <= 6) return true // layout level and above
    return false
  }
  return true
}

/**
 * Skills consolidated into a canonical tile. Goals and shipped needs may
 * still reference the old id — map them so the glow lands on the tile.
 */
const CANONICAL_SKILL_ID: Record<string, string> = {
  skl_ro_bhs_full: 'skl_back_full',
}

/** Prerequisite needs for a skill, including needs keyed to consolidated ids. */
function needsForSkillConsolidated(skillId: string) {
  const ids = new Set([skillId])
  for (const [oldId, canon] of Object.entries(CANONICAL_SKILL_ID)) {
    if (canon === skillId) ids.add(oldId)
  }
  return [...ids].flatMap((id) => needsForSkill(id))
}

/**
 * Guiding light: for each goal skill, walk the prerequisite chain and record
 * the shortest distance from any goal. Distance 0 = the goal itself (the
 * "hope", brightest). Follows required + helpful needs that resolve to
 * registry skills; skips alt paths and non-skill needs. Cycle-safe: a skill
 * is only re-queued when a strictly shorter path is found.
 *
 * Also returns `highlights`: rolls relevant at the goal's level (handspring
 * → back rolls, RO HS → handstand fwd roll, layout → back extension roll).
 * Rolls are never chain prerequisites — these glow dimmer as "relevant, not
 * required". 360 dive roll is never highlighted.
 */
function buildGlowMap(goals: AthleteSkillGoal[]): {
  dist: Map<string, number>
  highlights: Set<string>
} {
  const dist = new Map<string, number>()
  const queue: Array<[string, number]> = []
  const enqueue = (id: string, d: number) => {
    const canon = CANONICAL_SKILL_ID[id] ?? id
    if (!getRegistrySkill(canon)) return
    const prev = dist.get(canon)
    if (prev === undefined || d < prev) {
      dist.set(canon, d)
      queue.push([canon, d])
    }
  }
  for (const goal of goals) {
    const raw = goal.skillId?.trim()
    if (!raw) continue
    const resolved = resolveGoalSkill(goal)
    enqueue(resolved?.id ?? raw, 0)
  }
  while (queue.length > 0) {
    const [id, d] = queue.shift()!
    if (d >= MAX_GLOW_DISTANCE) continue
    for (const need of needsForSkillConsolidated(id)) {
      if (need.kind !== 'required' && need.kind !== 'helpful') continue
      if (need.needSkillId) enqueue(need.needSkillId, d + 1)
    }
  }
  // Level-based roll highlights: check each GOAL's tier (not the walked chain —
  // the shipped prerequisite data is too sparse for chain-based detection).
  // Additive — a layout goal gets all four tiers. Skipped when already lit.
  const highlights = new Set<string>()
  const goalIds: string[] = []
  for (const goal of goals) {
    const raw = goal.skillId?.trim()
    if (!raw) continue
    const resolved = resolveGoalSkill(goal)
    const id = CANONICAL_SKILL_ID[resolved?.id ?? raw] ?? (resolved?.id ?? raw)
    if (getRegistrySkill(id)) goalIds.push(id)
  }
  for (const tier of ROLL_HIGHLIGHT_TIERS) {
    if (!goalIds.some((id) => goalReachesTier(id, tier))) continue
    for (const rollId of tier.rolls) {
      if (!getRegistrySkill(rollId)) continue
      if (!dist.has(rollId)) highlights.add(rollId)
    }
  }
  return { dist, highlights }
}

/** Neon-edge glow in the family color: a tight bright outline hugging the
 * tile edge plus one soft outer halo. No lit-from-within. Steep ramp: the
 * goal (0) is unmistakably the destination, and each step down the chain is
 * visibly dimmer so the lit trail reads at a glance. */
function glowShadow(rgb: string, distance: number): string {
  const specs = [
    { a1: 0.95, b1: 2, s1: 1, a2: 0.35, b2: 14, s2: 4 }, // 0 — the destination, brightest
    { a1: 0.85, b1: 2, s1: 1, a2: 0.28, b2: 12, s2: 3 }, // 1 — strong, on the trail
    { a1: 0.7, b1: 1, s1: 1, a2: 0.22, b2: 10, s2: 3 }, // 2 — clearly lit
    { a1: 0.5, b1: 1, s1: 1, a2: 0.15, b2: 8, s2: 2 }, // 3
    { a1: 0.35, b1: 1, s1: 0, a2: 0.1, b2: 6, s2: 2 }, // 4
    { a1: 0.25, b1: 1, s1: 0, a2: 0.06, b2: 5, s2: 1 }, // 5 — faint shimmer
  ]
  const s = specs[Math.min(distance, MAX_GLOW_DISTANCE)]
  return (
    `0 0 ${s.b1}px ${s.s1}px rgba(${rgb},${s.a1}), ` +
    `0 0 ${s.b2}px ${s.s2}px rgba(${rgb},${s.a2})`
  )
}

/** Featured neon edge: for skills Ryan put real thought into (rich guide prose +
 * his notes). A thin bright outline plus a soft halo — no lit-from-within.
 * Separate from the athlete guiding-light glow; the two compose when a
 * featured skill is also on the athlete's path. */
function isFeaturedSkill(skill: UnifiedSkill): boolean {
  if (!skill.guideId) return false
  return (skill.guideNeeds?.length ?? 0) > 0 || !!skill.ryanNote?.trim()
}

/** Neon edge: thin bright outline hugging the tile plus a soft outer halo. */
function featuredShadow(rgb: string): string {
  return (
    `0 0 1px 1px rgba(${rgb},0.8), ` + `0 0 12px 3px rgba(${rgb},0.35)`
  )
}

/* ------------------------------------------------------------------ */
/* Themes                                                              */
/*                                                                     */
/* The guiding-light data (glowMap distances) is theme-independent —   */
/* these resolvers only change how each state renders per theme. The   */
/* neon path is pixel-identical to the original hard-coded Tile style. */
/* ------------------------------------------------------------------ */

interface TileVisuals {
  background: string
  borderColor: string
  borderWidth?: string
  borderLeftWidth?: string
  borderLeftColor?: string
  boxShadow: string
  textClass: string
  labelClass: string
  /** Dashed border for "relevant, not required" highlights. */
  dashed: boolean
  /** Apply the goal pulse animation (neon only). */
  pulse: boolean
  /** Apply the foundations beam animation (neon only). */
  beam: boolean
}

interface TileState {
  isBanner: boolean
  glowing: boolean
  glowDist?: number
  highlighted: boolean
  featured: boolean
}

function tileVisuals(theme: MapTheme, family: SkillFamily, state: TileState): TileVisuals {
  const rgb = FAMILY_GLOW_RGB[family]
  const style = FAMILY_STYLES[family]
  const d = state.glowDist ?? 99
  // Gold edge for the foundations banner on light themes (white is invisible on cream).
  const edge = state.isBanner ? '180,130,20' : rgb
  if (theme === 'midnight') {
    // Deep near-black tiles, whisper-thin family borders, almost no glow.
    return {
      background: `linear-gradient(180deg, rgba(${rgb},0.07), rgba(${rgb},0.02)), #0b0d12`,
      borderColor: state.isBanner
        ? 'rgba(251,191,36,0.45)'
        : state.glowing
          ? `rgba(${rgb},${d === 0 ? 0.9 : d <= 2 ? 0.6 : 0.38})`
          : state.highlighted
            ? `rgba(${rgb},0.35)`
            : state.featured
              ? `rgba(${rgb},0.5)`
              : `rgba(${rgb},0.22)`,
      boxShadow:
        `0 1px 3px rgba(0,0,0,0.6)` +
        (state.glowing && d <= 2
          ? `, 0 0 1px 1px rgba(${rgb},${Math.max(0.12, 0.55 - d * 0.15).toFixed(2)})`
          : '') +
        (state.highlighted ? `, 0 0 1px 1px rgba(${rgb},0.22)` : ''),
      textClass: 'text-white/70',
      labelClass: '',
      dashed: state.highlighted,
      pulse: false,
      beam: false,
    }
  }
  if (theme === 'paper') {
    // Warm cream tiles, dark ink text, family color as a thick left border.
    // The guiding light becomes a tinted background + colored border. Cheap
    // single-layer shadows only.
    return {
      background: state.glowing ? `rgba(${rgb},0.16)` : 'linear-gradient(180deg,#fffdf9,#f6f1e5)',
      borderColor: state.isBanner
        ? 'rgba(180,130,20,0.6)'
        : state.glowing
          ? `rgba(${rgb},0.85)`
          : state.highlighted
            ? `rgba(${rgb},0.55)`
            : state.featured
              ? `rgba(${rgb},0.5)`
              : 'rgba(28,25,23,0.14)',
      borderLeftWidth: '4px',
      borderLeftColor: `rgba(${edge},${state.glowing ? 1 : 0.8})`,
      boxShadow:
        `0 1px 2px rgba(60,50,30,0.14)` +
        (state.glowing ? `, 0 0 0 1px rgba(${rgb},0.45)` : ''),
      textClass: 'text-stone-800',
      labelClass: '',
      dashed: state.highlighted,
      pulse: false,
      beam: false,
    }
  }
  if (theme === 'ember') {
    // High contrast: pure black tiles, thick bright family borders, bold
    // white text. Glow is replaced by a solid bright outline.
    return {
      background: '#000000',
      borderColor: state.isBanner
        ? 'rgba(251,191,36,1)'
        : state.highlighted
          ? `rgba(${rgb},0.55)`
          : `rgba(${rgb},1)`,
      borderWidth: '2px',
      boxShadow: state.glowing
        ? d === 0
          ? `0 0 0 2px #ffffff, 0 0 0 5px rgba(${rgb},1)`
          : `0 0 0 3px rgba(${rgb},0.85)`
        : 'none',
      textClass: 'text-white',
      labelClass: '',
      dashed: state.highlighted,
      pulse: false,
      beam: false,
    }
  }
  // neon — the original look, unchanged
  return {
    background: `linear-gradient(180deg, rgba(255,255,255,0.03), rgba(255,255,255,0) 55%), ${style.bg}`,
    borderColor: state.isBanner
      ? 'rgba(251,191,36,0.55)'
      : state.glowing
        ? d === 0
          ? `rgba(${rgb},1)` // destination — full-strength border
          : d <= 2
            ? `rgba(${rgb},0.95)` // on the trail — near-full so the path reads continuous
            : `rgba(${rgb},0.7)`
        : state.highlighted
          ? `rgba(${rgb},0.55)` // relevant, not required — softer + dashed below
          : state.featured
            ? `rgba(${rgb},0.75)`
            : style.border,
    boxShadow:
      `0 2px 10px rgba(0,0,0,0.35), 0 8px 24px rgba(0,0,0,0.22)` +
      (state.featured ? `, ${featuredShadow(rgb)}` : '') +
      (state.glowing ? `, ${glowShadow(rgb, d)}` : '') +
      (state.highlighted ? `, 0 0 1px 1px rgba(${rgb},0.5), 0 0 8px 2px rgba(${rgb},0.16)` : ''),
    textClass: 'text-white/90',
    labelClass: 'drop-shadow-[0_1px_3px_rgba(0,0,0,0.7)]',
    dashed: state.highlighted,
    pulse: true,
    beam: true,
  }
}

/** Resolved chrome for list rows and level chips — simpler than tiles. */
interface ItemVisuals {
  background: string
  borderColor: string
  borderWidth?: string
  borderLeftWidth?: string
  borderLeftColor?: string
  boxShadow: string
  color: string
}

function itemVisuals(
  theme: MapTheme,
  family: SkillFamily,
  opts: { glowing: boolean; glowDist?: number; highlighted: boolean },
): ItemVisuals {
  const rgb = FAMILY_GLOW_RGB[family]
  const d = opts.glowDist ?? 99
  const lit = opts.glowing || opts.highlighted
  if (theme === 'paper') {
    return {
      background: opts.glowing
        ? `rgba(${rgb},0.16)`
        : opts.highlighted
          ? `rgba(${rgb},0.07)`
          : '#fffdf8',
      borderColor: lit ? `rgba(${rgb},0.8)` : 'rgba(28,25,23,0.12)',
      borderLeftWidth: '3px',
      borderLeftColor: `rgba(${rgb},0.85)`,
      boxShadow: '0 1px 2px rgba(60,50,30,0.12)',
      color: '#292524',
    }
  }
  if (theme === 'ember') {
    return {
      background: '#000000',
      borderColor: `rgba(${rgb},${lit ? 1 : 0.55})`,
      borderWidth: lit ? '2px' : '1px',
      boxShadow: opts.glowing ? `0 0 0 2px rgba(${rgb},0.7)` : 'none',
      color: '#ffffff',
    }
  }
  if (theme === 'midnight') {
    return {
      background: lit ? `rgba(${rgb},0.08)` : '#0c0e13',
      borderColor: `rgba(${rgb},${lit ? (d === 0 ? 0.9 : 0.5) : 0.2})`,
      boxShadow:
        opts.glowing && d <= 2 ? `0 0 1px 1px rgba(${rgb},0.5)` : '0 1px 3px rgba(0,0,0,0.6)',
      color: 'rgba(255,255,255,0.8)',
    }
  }
  // neon
  return {
    background: opts.glowing ? `rgba(${rgb},0.10)` : 'rgba(255,255,255,0.03)',
    borderColor: opts.glowing
      ? `rgba(${rgb},${d === 0 ? 1 : 0.8})`
      : opts.highlighted
        ? `rgba(${rgb},0.5)`
        : 'rgba(255,255,255,0.08)',
    boxShadow: opts.glowing ? glowShadow(rgb, d) : 'none',
    color: 'rgba(255,255,255,0.92)',
  }
}

/**
 * Panel-style overrides for the collapsible section buttons (Beyond, Rolls).
 * Neon keeps the app's var(--panel) classes, so its spec is undefined.
 */
const PANEL_STYLE: Record<MapTheme, CSSProperties | undefined> = {
  neon: undefined,
  midnight: {
    background: '#0c0e13',
    borderColor: 'rgba(255,255,255,0.09)',
    color: 'rgba(255,255,255,0.85)',
  },
  paper: { background: '#fffdf8', borderColor: 'rgba(28,25,23,0.16)', color: '#292524' },
  ember: { background: '#000000', borderColor: 'rgba(255,255,255,0.28)', color: '#ffffff' },
}

/** LevelBar gradient per theme — Paper gets a darker/muted version that reads on cream. */
function levelBarGradient(theme: MapTheme): string {
  if (theme === 'paper')
    return 'linear-gradient(to top, #0369a1 0%, #15803d 18%, #a16207 38%, #c2410c 55%, #a21caf 72%, #b45309 92%, #b45309 100%)'
  return 'linear-gradient(to top, #7dd3fc 0%, #4ade80 18%, #facc15 38%, #fb923c 55%, #e879f9 72%, #fbbf24 92%, #fbbf24 100%)'
}

/** Legend (color key) chip style per theme. */
function legendChipStyle(theme: MapTheme, family: SkillFamily): CSSProperties {
  const rgb = FAMILY_GLOW_RGB[family]
  if (theme === 'paper')
    return { background: `rgba(${rgb},0.10)`, borderColor: `rgba(${rgb},0.45)`, color: '#44403c' }
  if (theme === 'ember')
    return { background: '#000000', borderColor: `rgba(${rgb},0.9)`, color: '#ffffff' }
  if (theme === 'midnight')
    return {
      background: `rgba(${rgb},0.06)`,
      borderColor: `rgba(${rgb},0.28)`,
      color: 'rgba(255,255,255,0.75)',
    }
  return { background: FAMILY_STYLES[family].bg, borderColor: FAMILY_STYLES[family].border }
}
/** Skill family per tile, by registry skl_* id. */
const FAMILY_BY_SKILL: Record<string, SkillFamily> = {
  skl_foundations: 'foundations',
  // rolls
  skl_backward_roll: 'rolls',
  skl_back_roll_push_up: 'rolls',
  skl_back_extension_roll: 'rolls',
  skl_forward_roll: 'rolls',
  skl_handstand_fwd_roll: 'rolls',
  skl_dive_roll: 'rolls',
  skl_360_dive_roll: 'rolls',
  skl_straddle_fwd_roll: 'rolls',
  skl_straddle_bwd_roll: 'rolls',
  skl_front_pike_roll: 'rolls',
  skl_back_pike_roll: 'rolls',
  // cartwheel family (blue)
  skl_cartwheel: 'cartwheel',
  skl_one_arm_cartwheel: 'cartwheel',
  skl_backbend_kick_over: 'standing',
  skl_front_limber: 'forwards',
  skl_round_off_to_knees: 'roundoff',
  skl_fhs_front_tuck: 'forwards',
  skl_side_aerial: 'cartwheel',
  skl_cartwheel_handspring: 'cartwheel',
  skl_cart_hs_step_out: 'cartwheel',
  skl_cart_tuck: 'cartwheel',
  skl_cartwheel_open_tuck: 'cartwheel',
  skl_cart_full: 'cartwheel',
  skl_cart_double_full: 'cartwheel',
  // round off family (green)
  skl_cartwheel_step_in: 'roundoff',
  skl_strong_round_off: 'roundoff',
  skl_ro_bhs: 'roundoff',
  skl_ro_bhs_series: 'roundoff',
  skl_ro_bhs_tuck: 'roundoff',
  skl_layout: 'roundoff',
  skl_arabian: 'roundoff',
  skl_whips: 'roundoff',
  skl_back_half: 'roundoff',
  skl_back_full: 'roundoff',
  skl_back_1_5: 'roundoff',
  skl_double_full: 'roundoff',
  skl_back_25: 'roundoff',
  skl_triple_full: 'roundoff',
  skl_full_in: 'roundoff',
  skl_full_full: 'roundoff',
  skl_back_35: 'roundoff',
  skl_back_quad: 'roundoff',
  skl_miller: 'roundoff',
  // standing family (purple)
  skl_back_bend: 'standing',
  skl_back_walkover: 'standing',
  skl_standing_bhs: 'standing',
  skl_standing_bhs_series: 'standing',
  skl_standing_two_to_tuck: 'standing',
  skl_standing_one_to_tuck: 'standing',
  skl_standing_tuck: 'standing',
  skl_standing_open_tuck: 'standing',
  skl_standing_full: 'standing',
  skl_standing_tuck_up_8: 'standing',
  skl_standing_tuck_up_16: 'standing',
  skl_jumps_to_full: 'standing',
  skl_standing_double: 'standing',
  skl_standing_straight_leg_full: 'standing',
  skl_double_back: 'doubleback',
  // forwards family (orange)
  skl_handstand: 'forwards',
  skl_front_walkover: 'forwards',
  skl_front_handspring: 'forwards',
  skl_front_aerial: 'forwards',
  skl_front_hs_step_out: 'forwards',
  skl_bounders: 'forwards',
  skl_bounder_step_out: 'forwards',
  skl_front_tuck: 'forwards',
  skl_front_layout: 'forwards',
  skl_barani: 'forwards',
  skl_front_full: 'forwards',
  skl_front_15: 'forwards',
  skl_front_2: 'forwards',
  skl_front_25: 'forwards',
  skl_front_triple: 'forwards',
  skl_kick_full: 'kick',
  skl_kick_15: 'kick',
  skl_kick_2: 'kick',
  skl_front_35: 'forwards',
  // killer gets its own accent
  skl_killer: 'killer',
  skl_full_twisting_triple_back: 'killer',
}

type MapTile = {
  /** Registry skl_* id. */
  skillId: string
  /** Short display label (registry names are too long for tiles). */
  label: string
  /** CSS grid-column value, e.g. "1 / 3". */
  col: string
}

type MapRow = {
  tiles: MapTile[]
  /** Column count for this row's sub-grid (default 8). */
  cols?: number
}

const HEADERS: { label: string; col: string }[] = [
  { label: 'Standing', col: '1 / 3' },
  { label: 'Front', col: '3 / 5' },
  { label: 'Cartwheel', col: '5 / 7' },
  { label: 'Round off', col: '7 / 9' },
]

/**
 * Rolls as a mini-tree, ordered by difficulty bottom-up (easiest at the
 * bottom, hardest at the top). Rendered top-down; collapsed by default.
 */
const ROLLS_ROWS: MapRow[] = [
  { tiles: [{ skillId: 'skl_360_dive_roll', label: '360 dive roll', col: '4 / 6' }] },
  {
    tiles: [
      { skillId: 'skl_handstand_fwd_roll', label: 'Handstand fwd roll', col: '3 / 5' },
      { skillId: 'skl_back_extension_roll', label: 'Back extension roll', col: '5 / 7' },
    ],
  },
  { tiles: [{ skillId: 'skl_dive_roll', label: 'Dive roll', col: '4 / 6' }] },
  { tiles: [{ skillId: 'skl_back_roll_push_up', label: 'Back roll to push up', col: '3 / 7' }] },
  { tiles: [{ skillId: 'skl_straddle_bwd_roll', label: 'Straddle bwd roll', col: '4 / 6' }] },
  {
    tiles: [
      { skillId: 'skl_front_pike_roll', label: 'Front pike roll', col: '3 / 5' },
      { skillId: 'skl_back_pike_roll', label: 'Back pike roll', col: '5 / 7' },
    ],
  },
  {
    tiles: [
      { skillId: 'skl_forward_roll', label: 'Forward roll', col: '3 / 5' },
      { skillId: 'skl_backward_roll', label: 'Backward roll', col: '5 / 7' },
    ],
  },
  { tiles: [{ skillId: 'skl_straddle_fwd_roll', label: 'Straddle fwd roll', col: '4 / 6' }] },
]

/** Rows top-down (render order). Ryan's rows are numbered bottom-up. */
const ROWS: MapRow[] = [
  {
    // R12 — front triple above front 2.5, double back above kick dub,
    // back triple above back 2.5; standing straight leg full tops the standing column
    tiles: [
      { skillId: 'skl_standing_straight_leg_full', label: 'Standing straight leg full', col: '1 / 3' },
      { skillId: 'skl_front_triple', label: 'Front triple', col: '3 / 5' },
      { skillId: 'skl_double_back', label: 'Double back', col: '5 / 7' },
      { skillId: 'skl_triple_full', label: 'Back triple', col: '7 / 9' },
    ],
  },
  {
    // R11 — 2.5 level: each stacks above its double full
    tiles: [
      { skillId: 'skl_jumps_to_full', label: 'Jumps to full', col: '1 / 3' },
      { skillId: 'skl_front_25', label: 'Front 2.5', col: '3 / 5' },
      { skillId: 'skl_kick_2', label: 'Kick double full', col: '5 / 7' },
      { skillId: 'skl_back_25', label: 'Back 2.5', col: '7 / 9' },
    ],
  },
  {
    // R10 — doubles level (back double full stacks above back 1.5;
    // tuck up knee high splits the standing column, left of standing full)
    tiles: [
      { skillId: 'skl_standing_tuck_up_16', label: 'Tuck up knee high', col: '1 / 2' },
      { skillId: 'skl_standing_full', label: 'Standing full', col: '2 / 3' },
      { skillId: 'skl_front_2', label: 'Front double full', col: '3 / 5' },
      { skillId: 'skl_kick_15', label: 'Kick 1.5', col: '5 / 7' },
      { skillId: 'skl_double_full', label: 'Back double full', col: '7 / 9' },
    ],
  },
  {
    // R9 — 1.5 level (back 1.5 stacks above back full; kick full between the 1.5s;
    // tuck up 8" sits above standing open tuck)
    tiles: [
      { skillId: 'skl_standing_tuck_up_8', label: 'Tuck up 8"', col: '1 / 3' },
      { skillId: 'skl_front_15', label: 'Front 1.5', col: '3 / 5' },
      { skillId: 'skl_kick_full', label: 'Kick full', col: '5 / 7' },
      { skillId: 'skl_back_1_5', label: 'Back 1.5', col: '7 / 9' },
    ],
  },
  {
    // R8 — fulls level: cart full sits between front and back full;
    // back full is the consolidated full-twisting-layout tile.
    tiles: [
      { skillId: 'skl_standing_open_tuck', label: 'Standing open tuck', col: '1 / 3' },
      { skillId: 'skl_front_full', label: 'Front full', col: '3 / 5' },
      { skillId: 'skl_cart_full', label: 'Cart full', col: '5 / 7' },
      { skillId: 'skl_back_full', label: 'Back full', col: '7 / 9' },
    ],
  },
  {
    // R7 — halves level: whips nearer back half, arabian nearer front half
    tiles: [
      { skillId: 'skl_standing_tuck', label: 'Standing tuck', col: '1 / 3' },
      { skillId: 'skl_barani', label: 'Front half', col: '3 / 5' },
      { skillId: 'skl_arabian', label: 'Arabian', col: '5 / 6' },
      { skillId: 'skl_whips', label: 'Whips', col: '6 / 7' },
      { skillId: 'skl_back_half', label: 'Back half', col: '7 / 9' },
    ],
  },
  {
    // R6 — back layout sits directly above RO HS tuck (green stack);
    // cartwheel open tuck sits above cart tuck
    tiles: [
      { skillId: 'skl_standing_one_to_tuck', label: 'Standing 1 to tuck', col: '1 / 3' },
      { skillId: 'skl_front_layout', label: 'Front layout', col: '3 / 5' },
      { skillId: 'skl_cartwheel_open_tuck', label: 'Cartwheel open tuck', col: '5 / 7' },
      { skillId: 'skl_layout', label: 'Back layout', col: '7 / 9' },
    ],
  },
  {
    // R5
    tiles: [
      { skillId: 'skl_standing_two_to_tuck', label: 'Standing 2 to tuck', col: '1 / 3' },
      { skillId: 'skl_fhs_front_tuck', label: 'Front HS front tuck', col: '3 / 4' },
      { skillId: 'skl_bounder_step_out', label: 'Bounder step out', col: '4 / 5' },
      { skillId: 'skl_cart_tuck', label: 'Cart tuck', col: '5 / 7' },
      { skillId: 'skl_ro_bhs_tuck', label: 'RO HS tuck', col: '7 / 9' },
    ],
  },
  {
    // R4
    tiles: [
      { skillId: 'skl_standing_bhs_series', label: 'Standing series', col: '1 / 3' },
      { skillId: 'skl_front_tuck', label: 'Front tuck', col: '3 / 4' },
      { skillId: 'skl_bounders', label: 'Bounders', col: '4 / 5' },
      { skillId: 'skl_cart_hs_step_out', label: 'Cartwheel 2 BHS', col: '5 / 7' },
      { skillId: 'skl_ro_bhs_series', label: 'RO series', col: '7 / 9' },
    ],
  },
  {
    // R3
    tiles: [
      { skillId: 'skl_standing_bhs', label: 'Standing HS', col: '1 / 3' },
      { skillId: 'skl_front_handspring', label: 'Front HS', col: '3 / 4' },
      { skillId: 'skl_front_aerial', label: 'Front aerial', col: '4 / 5' },
      { skillId: 'skl_cartwheel_handspring', label: 'Cartwheel HS', col: '5 / 7' },
      { skillId: 'skl_ro_bhs', label: 'RO HS', col: '7 / 9' },
    ],
  },
  {
    // R2
    tiles: [
      { skillId: 'skl_back_walkover', label: 'Back walkover', col: '1 / 3' },
      { skillId: 'skl_front_walkover', label: 'Front walkover', col: '3 / 5' },
      { skillId: 'skl_side_aerial', label: 'Side aerial', col: '5 / 7' },
      { skillId: 'skl_strong_round_off', label: 'Round off', col: '7 / 9' },
    ],
  },
  {
    // R1.5 — jammed in above R1: the next step up from each foundation
    tiles: [
      { skillId: 'skl_backbend_kick_over', label: 'Backbend kick over', col: '1 / 3' },
      { skillId: 'skl_front_limber', label: 'Front limber', col: '3 / 5' },
      { skillId: 'skl_one_arm_cartwheel', label: 'One-arm cartwheel', col: '5 / 7' },
      { skillId: 'skl_round_off_to_knees', label: 'Round off to knees', col: '7 / 9' },
    ],
  },
  {
    // R1 — four across
    tiles: [
      { skillId: 'skl_back_bend', label: 'Back bend', col: '1 / 3' },
      { skillId: 'skl_handstand', label: 'Handstand', col: '3 / 5' },
      { skillId: 'skl_cartwheel', label: 'Cartwheel', col: '5 / 7' },
      { skillId: 'skl_cartwheel_step_in', label: 'Cartwheel step-in', col: '7 / 9' },
    ],
  },
  {
    // R0 — foundations banner
    tiles: [{ skillId: 'skl_foundations', label: 'Foundations', col: '1 / 9' }],
  },
]

/** Collapsed by default: everything above the triple-full line. Killer sits alone at the very top. */
const BEYOND_ROWS: MapRow[] = [
  {
    // killer — top top top
    tiles: [
      { skillId: 'skl_killer', label: 'Killer', col: '3 / 5' },
      { skillId: 'skl_full_twisting_triple_back', label: 'Full twisting triple back', col: '5 / 7' },
    ],
  },
  {
    // quad row
    tiles: [
      { skillId: 'skl_standing_double', label: 'Standing double', col: '2 / 4' },
      { skillId: 'skl_back_quad', label: 'Back quad', col: '4 / 6' },
      { skillId: 'skl_miller', label: 'Miller', col: '6 / 8' },
    ],
  },
  {
    // 3.5 row (full in lives here now)
    tiles: [
      { skillId: 'skl_front_35', label: 'Front 3.5', col: '2 / 4' },
      { skillId: 'skl_back_35', label: 'Back 3.5', col: '4 / 6' },
      { skillId: 'skl_full_in', label: 'Full in', col: '6 / 7' },
      { skillId: 'skl_full_full', label: 'Full full', col: '7 / 8' },
    ],
  },
]

/* ------------------------------------------------------------------ */
/* Zones + flat entries for the List / Compact / Levels views          */
/*                                                                     */
/* Zone boundaries follow the LevelBar calibration: rows split          */
/* proportionally top-down across Expert → Light, Beyond = Legend.     */
/* ------------------------------------------------------------------ */

const ZONE_ORDER = ['Legend', 'Expert', 'Heavy', 'Hard', 'Intermediate', 'Light'] as const
type ZoneName = (typeof ZONE_ORDER)[number]
const ZONE_RANK: Record<ZoneName, number> = {
  Legend: 0,
  Expert: 1,
  Heavy: 2,
  Hard: 3,
  Intermediate: 4,
  Light: 5,
}
/** Zone accent colors — same calibration as the LevelBar gradient. */
const ZONE_ACCENT: Record<ZoneName, string> = {
  Legend: '#fbbf24',
  Expert: '#e879f9',
  Heavy: '#fb923c',
  Hard: '#facc15',
  Intermediate: '#4ade80',
  Light: '#7dd3fc',
}
/** Darker accents for the Paper theme. */
const ZONE_ACCENT_DARK: Record<ZoneName, string> = {
  Legend: '#b45309',
  Expert: '#a21caf',
  Heavy: '#c2410c',
  Hard: '#a16207',
  Intermediate: '#15803d',
  Light: '#0369a1',
}
const ZONES_TOP_DOWN: ZoneName[] = ['Expert', 'Heavy', 'Hard', 'Intermediate', 'Light']
/** Per-skill zone overrides — Ryan's calibration calls these Light. */
const ZONE_OVERRIDE: Record<string, ZoneName> = {
  skl_straddle_bwd_roll: 'Light',
  skl_forward_roll: 'Light',
  skl_backward_roll: 'Light',
  skl_round_off_to_knees: 'Light',
  skl_front_pike_roll: 'Hard',
  skl_front_limber: 'Light',
  skl_backbend_kick_over: 'Light',
}
/** Band order for the Levels view — easiest first. */
const BAND_ORDER: ZoneName[] = ['Light', 'Intermediate', 'Hard', 'Heavy', 'Expert', 'Legend']

type SkillEntry = {
  skillId: string
  label: string
  family: SkillFamily
  zone: ZoneName
  kind: 'beyond' | 'main' | 'roll'
}

/** Flat skill list with zone + family metadata, for the List/Compact/Levels views. */
let skillEntries: SkillEntry[] | null = null
function getSkillEntries(): SkillEntry[] {
  if (!skillEntries) {
    const out: SkillEntry[] = []
    for (const row of BEYOND_ROWS)
      for (const t of row.tiles)
        out.push({
          skillId: t.skillId,
          label: t.label,
          family: FAMILY_BY_SKILL[t.skillId] ?? 'foundations',
          zone: 'Legend',
          kind: 'beyond',
        })
    ROWS.forEach((row, ri) => {
      const zone = ZONES_TOP_DOWN[Math.min(4, Math.floor((ri / ROWS.length) * 5))]
      for (const t of row.tiles)
        out.push({
          skillId: t.skillId,
          label: t.label,
          family: FAMILY_BY_SKILL[t.skillId] ?? 'foundations',
          zone: ZONE_OVERRIDE[t.skillId] ?? zone,
          kind: 'main',
        })
    })
    ROLLS_ROWS.forEach((row, ri) => {
      const zone = ZONES_TOP_DOWN[Math.min(4, Math.floor((ri / ROLLS_ROWS.length) * 5))]
      for (const t of row.tiles)
        out.push({ skillId: t.skillId, label: t.label, family: 'rolls', zone: ZONE_OVERRIDE[t.skillId] ?? zone, kind: 'roll' })
    })
    skillEntries = out.filter((e) => getRegistrySkill(e.skillId))
  }
  return skillEntries
}

/** Family group order for the List view. */
const LIST_FAMILY_ORDER: SkillFamily[] = [
  'foundations',
  'standing',
  'forwards',
  'cartwheel',
  'roundoff',
  'doubleback',
  'kick',
  'rolls',
]

function Tile({
  tile,
  skill,
  onTap,
  glowDist,
  isHighlight,
  theme,
  infoOnly,
}: {
  tile: MapTile
  skill: UnifiedSkill
  onTap: (skill: UnifiedSkill) => void
  /** Guiding-light distance (0 = goal). Undefined = no glow. */
  glowDist?: number
  /** Roll highlighted as relevant-at-level ("relevant, not required"). */
  isHighlight?: boolean
  theme: MapTheme
  /** Dim tiles whose cards have no guide prose yet. */
  infoOnly?: boolean
}) {
  const hasGuide = !!skill.guideId
  const dimmed = !!infoOnly && !hasGuide
  const family = FAMILY_BY_SKILL[tile.skillId] ?? 'foundations'
  const isBanner = tile.skillId === 'skl_foundations'
  const glowing = glowDist !== undefined
  const highlighted = !!isHighlight && !glowing
  const featured = isFeaturedSkill(skill) && !isBanner
  const v = tileVisuals(theme, family, { isBanner, glowing, glowDist, highlighted, featured })
  return (
    <button
      type="button"
      onClick={() => onTap(skill)}
      style={{
        ...(tile.col ? { gridColumn: tile.col } : null),
        background: v.background,
        borderColor: v.borderColor,
        ...(v.borderWidth ? { borderWidth: v.borderWidth } : null),
        ...(v.borderLeftWidth
          ? { borderLeftWidth: v.borderLeftWidth, borderLeftColor: v.borderLeftColor }
          : null),
        boxShadow: v.boxShadow,
        ...(v.pulse && glowDist === 0
          ? { animation: 'skill-glow-pulse 2.8s ease-in-out infinite' }
          : null),
        ...(v.beam && isBanner
          ? { animation: 'foundations-beam 5s ease-in-out infinite' }
          : null),
      }}
      className={`relative flex items-center justify-center rounded-2xl border px-1 text-center font-bold leading-snug transition-transform active:scale-95 sm:px-2 ${v.textClass} ${
        v.dashed ? 'border-dashed' : ''
      } ${dimmed ? 'opacity-25' : ''} ${
        isBanner
          ? 'min-h-[64px] py-3 text-[12px] uppercase tracking-[0.18em] sm:text-[13px] sm:tracking-[0.28em]'
          : 'min-h-[60px] py-2 text-[10px] tracking-[0.02em] sm:text-[11px]'
      }`}
    >
      {!hasGuide && !isBanner && (
        <span
          className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-amber-400"
          title="Guide coming"
          aria-hidden
        />
      )}
      <span className={`break-words ${v.labelClass}`}>{tile.label}</span>
    </button>
  )
}

function MapRows({
  rows,
  onTap,
  glowMap,
  theme,
  infoOnly,
}: {
  rows: MapRow[]
  onTap: (s: UnifiedSkill) => void
  glowMap?: { dist: Map<string, number>; highlights: Set<string> } | null
  theme: MapTheme
  infoOnly?: boolean
}) {
  return (
    <>
      {rows.map((row, i) => (
        <div
          key={i}
          className="grid gap-2"
          style={{ gridTemplateColumns: `repeat(${row.cols ?? 8}, 1fr)` }}
        >
          {row.tiles.map((tile) => {
            const skill = getRegistrySkill(tile.skillId)
            if (!skill) return null
            return (
              <Tile
                key={`${tile.skillId}-${tile.label}`}
                tile={tile}
                skill={skill}
                onTap={onTap}
                glowDist={glowMap?.dist.get(tile.skillId)}
                isHighlight={glowMap?.highlights.has(tile.skillId) ?? false}
                theme={theme}
                infoOnly={infoOnly}
              />
            )
          })}
        </div>
      ))}
    </>
  )
}

function RollsSection({
  onTap,
  glowMap,
  theme,
  infoOnly,
}: {
  onTap: (s: UnifiedSkill) => void
  glowMap?: { dist: Map<string, number>; highlights: Set<string> } | null
  theme: MapTheme
  infoOnly?: boolean
}) {
  const [open, setOpen] = useState(false)
  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-left"
        style={
          PANEL_STYLE[theme] ?? {
            borderColor: 'rgba(45,212,191,0.45)',
            background: 'rgba(45,212,191,0.08)',
          }
        }
      >
        <span>
          <span className="block text-sm font-extrabold">Rolls</span>
          <span className="block text-[11px] opacity-60">
            Easiest at the bottom, hardest at the top
          </span>
        </span>
        <span className="text-base opacity-60" aria-hidden>
          {open ? '▾' : '▸'}
        </span>
      </button>
      {open && (
        <div className="mt-2 space-y-2">
          <MapRows rows={ROLLS_ROWS} onTap={onTap} glowMap={glowMap} theme={theme} infoOnly={infoOnly} />
        </div>
      )}
    </div>
  )
}

/**
 * Difficulty level bar — a collapsible slide-out pinned to the right edge of
 * the skill tree, fading smoothly from Light (bottom) to Legend (top) with
 * no hard boundaries. Closed it shows just a thin gradient tab; tapping it
 * slides the bar open to reveal the zone labels.
 */
function LevelBar({ beyondOpen, theme }: { beyondOpen: boolean; theme: MapTheme }) {
  const [open, setOpen] = useState(false)
  // When Beyond is open the bar spans the Legend zone too, so Legend gets
  // its label back at the top. (It was removed in b0173f1 because Beyond
  // sat above the bar — now the bar reaches up there.)
  const labels = beyondOpen
    ? [
        { text: 'Legend', top: '1%' },
        { text: 'Expert', top: '15%' },
        { text: 'Heavy', top: '37%' },
        { text: 'Hard', top: '58%' },
        { text: 'Intermediate', top: '77%' },
        { text: 'Light', top: '90%' },
      ]
    : [
        { text: 'Expert', top: '8%' },
        { text: 'Heavy', top: '30%' },
        { text: 'Hard', top: '52%' },
        { text: 'Intermediate', top: '73%' },
        { text: 'Light', top: '90%' },
      ]
  const labelColor = theme === 'paper' ? 'text-stone-600' : 'text-white/85'
  const chevronColor = theme === 'paper' ? 'text-stone-500' : 'text-white/80'
  return (
    <div className="pointer-events-none absolute inset-y-0 right-0">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-label={open ? 'Collapse difficulty levels' : 'Show difficulty levels'}
        className={`pointer-events-auto absolute bottom-0 right-0 top-0 overflow-hidden transition-[width] duration-300 ease-out ${
          open ? 'w-20' : 'w-4'
        }`}
      >
        {/* gradient strip — always visible, the closed tab */}
        <div
          aria-hidden
          className="absolute bottom-0 right-1 top-0 w-2 rounded-full opacity-70"
          style={{ background: levelBarGradient(theme) }}
        />
        {/* open/close chevron */}
        <span
          aria-hidden
          className={`absolute right-1 top-1/2 -translate-y-1/2 text-[9px] leading-none transition-transform duration-300 ${chevronColor} ${
            open ? 'rotate-180' : ''
          }`}
        >
          ‹
        </span>
        {/* zone labels — fade in when open */}
        <div
          aria-hidden
          className={`absolute inset-0 transition-opacity duration-300 ${
            open ? 'opacity-100' : 'opacity-0'
          }`}
        >
          {labels.map((l) => (
            <span
              key={l.text}
              className={`absolute right-4 -translate-y-1/2 whitespace-nowrap text-right text-[10px] font-semibold ${labelColor}`}
              style={{ top: l.top }}
            >
              {l.text}
            </span>
          ))}
        </div>
      </button>
    </div>
  )
}

function Legend({ theme }: { theme: MapTheme }) {
  const [open, setOpen] = useState(false)
  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="text-[11px] font-semibold text-white/50 underline decoration-dotted underline-offset-2"
        style={theme === 'paper' ? { color: '#78716c' } : undefined}
      >
        {open ? 'Hide color key' : 'Color key'}
      </button>
      {open && (
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {(Object.keys(FAMILY_STYLES) as SkillFamily[]).map((f) => (
            <span
              key={f}
              className="inline-flex items-center gap-1.5 rounded-full border px-2 py-1 text-[10px] font-semibold text-white/80"
              style={legendChipStyle(theme, f)}
            >
              {FAMILY_STYLES[f].label}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Controls + alternate views                                          */
/* ------------------------------------------------------------------ */

/** One segmented picker row inside the control bar. */
function SegPicker({
  options,
  current,
  onPick,
  theme,
}: {
  options: { id: string; label: string }[]
  current: string
  onPick: (id: string) => void
  theme: MapTheme
}) {
  return (
    <div
      className="flex gap-0.5 overflow-x-auto rounded-full border p-0.5"
      style={{ borderColor: theme === 'paper' ? 'rgba(28,25,23,0.18)' : 'rgba(255,255,255,0.12)' }}
    >
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          onClick={() => onPick(o.id)}
          className="shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold transition-colors"
          style={
            o.id === current
              ? { background: theme === 'paper' ? '#292524' : 'rgba(45,212,191,0.28)', color: '#ffffff' }
              : { color: theme === 'paper' ? '#57534e' : 'rgba(255,255,255,0.6)' }
          }
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

/** Compact sticky control bar: theme + view + info-filter segmented pickers. */
function ViewControls({
  theme,
  onTheme,
  view,
  onView,
  infoFilter,
  onInfoFilter,
}: {
  theme: MapTheme
  onTheme: (t: MapTheme) => void
  view: MapViewMode
  onView: (v: MapViewMode) => void
  infoFilter: InfoFilter
  onInfoFilter: (f: InfoFilter) => void
}) {
  const barBg =
    theme === 'paper'
      ? '#f3efe4'
      : theme === 'ember'
        ? '#000000'
        : theme === 'midnight'
          ? '#0b0d12'
          : 'rgba(8,10,14,0.94)'
  const labelColor = theme === 'paper' ? '#78716c' : 'rgba(255,255,255,0.55)'
  return (
    <div className="sticky top-0 z-10 py-1.5" style={{ background: barBg }}>
      <div className="flex items-center gap-2">
        <span
          className="w-9 shrink-0 text-[10px] font-bold uppercase tracking-[0.14em]"
          style={{ color: labelColor }}
        >
          Look
        </span>
        <SegPicker
          options={THEME_OPTIONS}
          current={theme}
          onPick={(id) => onTheme(id as MapTheme)}
          theme={theme}
        />
      </div>
      <div className="mt-1.5 flex items-center gap-2">
        <span
          className="w-9 shrink-0 text-[10px] font-bold uppercase tracking-[0.14em]"
          style={{ color: labelColor }}
        >
          View
        </span>
        <SegPicker
          options={VIEW_OPTIONS}
          current={view}
          onPick={(id) => onView(id as MapViewMode)}
          theme={theme}
        />
      </div>
      <div className="mt-1.5 flex items-center gap-2">
        <span
          className="w-9 shrink-0 text-[10px] font-bold uppercase tracking-[0.14em]"
          style={{ color: labelColor }}
        >
          Cards
        </span>
        <SegPicker
          options={INFO_FILTER_OPTIONS}
          current={infoFilter}
          onPick={(id) => onInfoFilter(id as InfoFilter)}
          theme={theme}
        />
      </div>
    </div>
  )
}

/** Column headers for the map view (Today section-label style). */
function ColumnHeaders({ theme }: { theme: MapTheme }) {
  return (
    <div className="grid gap-2" style={{ gridTemplateColumns: 'repeat(8, 1fr)' }}>
      {HEADERS.map((h) => (
        <div
          key={h.label}
          style={{ gridColumn: h.col, ...(theme === 'paper' ? { color: '#57534e' } : null) }}
          className="pb-1 text-center text-[9px] font-semibold uppercase tracking-[0.12em] text-[var(--accent)] sm:text-[11px] sm:tracking-[0.2em]"
        >
          {h.label}
        </div>
      ))}
    </div>
  )
}

/** "Your goals light the way" note, shown when the guiding light is active. */
function GlowNote({
  theme,
  classGlow,
  glowNames,
}: {
  theme: MapTheme
  classGlow: boolean
  glowNames: string[]
}) {
  return (
    <p
      className={`text-center text-[11px] font-semibold ${theme === 'paper' ? 'text-stone-500' : 'text-white/55'}`}
    >
      <span aria-hidden>✦ </span>
      {classGlow
        ? `Lighting the way for ${glowNames.slice(0, 3).join(', ')}${glowNames.length > 3 ? ' and others' : ''}`
        : 'Your goals light the way — follow the glow upward'}
      <span aria-hidden> ✦</span>
    </p>
  )
}

/** Beyond — collapsed by default (map view only; other views integrate Beyond). */
function BeyondSection({
  open,
  onToggle,
  onTap,
  glowMap,
  theme,
  infoOnly,
}: {
  open: boolean
  onToggle: () => void
  onTap: (s: UnifiedSkill) => void
  glowMap?: { dist: Map<string, number>; highlights: Set<string> } | null
  theme: MapTheme
  infoOnly?: boolean
}) {
  return (
    <div>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-3 rounded-2xl border border-[var(--panel-border)] bg-[var(--panel)] px-4 py-3 text-left"
        style={PANEL_STYLE[theme]}
      >
        <span>
          <span className="block text-sm font-extrabold">
            Beyond <span className="text-[11px] font-semibold opacity-60">· Legend level</span>
          </span>
          <span className="block text-[11px] opacity-60">Most people never cross this line</span>
        </span>
        <span className="text-base opacity-60" aria-hidden>
          {open ? '▾' : '▸'}
        </span>
      </button>
      {open && (
        <div className="mt-2 space-y-2">
          <MapRows rows={BEYOND_ROWS} onTap={onTap} glowMap={glowMap} theme={theme} infoOnly={infoOnly} />
        </div>
      )}
    </div>
  )
}

type GlowMap = { dist: Map<string, number>; highlights: Set<string> } | null

/** One full-width row in the List view. */
function ListRow({
  entry,
  onTap,
  glowMap,
  theme,
}: {
  entry: SkillEntry
  onTap: (s: UnifiedSkill) => void
  glowMap?: GlowMap
  theme: MapTheme
}) {
  const skill = getRegistrySkill(entry.skillId)
  if (!skill) return null
  const glowDist = glowMap?.dist.get(entry.skillId)
  const highlighted = (glowMap?.highlights.has(entry.skillId) ?? false) && glowDist === undefined
  const v = itemVisuals(theme, entry.family, {
    glowing: glowDist !== undefined,
    glowDist,
    highlighted,
  })
  const rgb = FAMILY_GLOW_RGB[entry.family]
  const zoneAccent = (theme === 'paper' ? ZONE_ACCENT_DARK : ZONE_ACCENT)[entry.zone]
  return (
    <button
      type="button"
      onClick={() => onTap(skill)}
      className="flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left active:scale-[0.99]"
      style={{
        background: v.background,
        borderColor: v.borderColor,
        ...(v.borderWidth ? { borderWidth: v.borderWidth } : null),
        ...(v.borderLeftWidth
          ? { borderLeftWidth: v.borderLeftWidth, borderLeftColor: v.borderLeftColor }
          : null),
        boxShadow: v.boxShadow,
        color: v.color,
      }}
    >
      <span
        className="h-2.5 w-2.5 shrink-0 rounded-full"
        style={{ background: `rgb(${rgb})` }}
        aria-hidden
      />
      <span className="flex-1 text-[13px] font-semibold">{entry.label}</span>
      {glowDist !== undefined && (
        <span className="shrink-0 text-[10px] font-bold" style={{ color: `rgb(${rgb})` }}>
          ✦ path
        </span>
      )}
      <span
        className="shrink-0 text-[10px] font-bold uppercase tracking-[0.1em]"
        style={{ color: zoneAccent }}
      >
        {entry.zone}
      </span>
      {!skill.guideId && (
        <span
          className="h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400"
          title="Guide coming"
          aria-hidden
        />
      )}
      <span className="shrink-0 opacity-50" aria-hidden>
        ›
      </span>
    </button>
  )
}

/** List view: full-width rows grouped by family, Beyond · Legend last. */
function ListView({
  onTap,
  glowMap,
  theme,
  infoOnly,
}: {
  onTap: (s: UnifiedSkill) => void
  glowMap?: GlowMap
  theme: MapTheme
  infoOnly: boolean
}) {
  const entries = getSkillEntries().filter((e) => !infoOnly || hasCardInfo(e.skillId))
  const groups: { key: string; label: string; entries: SkillEntry[] }[] = LIST_FAMILY_ORDER.map(
    (f) => ({
      key: f,
      label: FAMILY_STYLES[f].label,
      entries: entries
        .filter((e) => e.family === f && e.kind !== 'beyond')
        .sort((a, b) => ZONE_RANK[a.zone] - ZONE_RANK[b.zone]),
    }),
  ).filter((g) => g.entries.length > 0)
  const beyond = entries
    .filter((e) => e.kind === 'beyond')
    .sort((a, b) => ZONE_RANK[a.zone] - ZONE_RANK[b.zone])
  if (beyond.length > 0) groups.push({ key: 'beyond', label: 'Beyond · Legend', entries: beyond })
  const headerColor = theme === 'paper' ? '#57534e' : 'rgba(255,255,255,0.55)'
  return (
    <div className="space-y-4">
      {groups.map((g) => (
        <div key={g.key}>
          <p
            className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.18em]"
            style={{ color: headerColor }}
          >
            {g.label} <span className="opacity-60">· {g.entries.length}</span>
          </p>
          <div className="space-y-1.5">
            {g.entries.map((e) => (
              <ListRow key={e.skillId} entry={e} onTap={onTap} glowMap={glowMap} theme={theme} />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

/** One dense tile in the Compact view. */
function CompactTile({
  entry,
  onTap,
  glowMap,
  theme,
}: {
  entry: SkillEntry
  onTap: (s: UnifiedSkill) => void
  glowMap?: GlowMap
  theme: MapTheme
}) {
  const skill = getRegistrySkill(entry.skillId)
  if (!skill) return null
  const glowDist = glowMap?.dist.get(entry.skillId)
  const highlighted = (glowMap?.highlights.has(entry.skillId) ?? false) && glowDist === undefined
  const v = tileVisuals(theme, entry.family, {
    isBanner: false,
    glowing: glowDist !== undefined,
    glowDist,
    highlighted,
    featured: isFeaturedSkill(skill),
  })
  return (
    <button
      type="button"
      onClick={() => onTap(skill)}
      className={`flex min-h-[46px] items-center justify-center rounded-lg border px-1 text-center text-[9px] font-bold leading-tight active:scale-95 ${v.textClass} ${
        v.dashed ? 'border-dashed' : ''
      }`}
      style={{
        background: v.background,
        borderColor: v.borderColor,
        ...(v.borderWidth ? { borderWidth: v.borderWidth } : null),
        ...(v.borderLeftWidth
          ? { borderLeftWidth: v.borderLeftWidth, borderLeftColor: v.borderLeftColor }
          : null),
        boxShadow: v.boxShadow,
        ...(v.pulse && glowDist === 0
          ? { animation: 'skill-glow-pulse 2.8s ease-in-out infinite' }
          : null),
      }}
    >
      <span className={`break-words ${v.labelClass}`}>{entry.label}</span>
    </button>
  )
}

/** Compact view: dense grids — the whole map on screen at once. */
function CompactView({
  onTap,
  glowMap,
  theme,
  infoOnly,
}: {
  onTap: (s: UnifiedSkill) => void
  glowMap?: GlowMap
  theme: MapTheme
  infoOnly: boolean
}) {
  const entries = getSkillEntries().filter((e) => !infoOnly || hasCardInfo(e.skillId))
  const sections = [
    { key: 'beyond', label: 'Beyond · Legend', entries: entries.filter((e) => e.kind === 'beyond') },
    { key: 'path', label: 'Skill path', entries: entries.filter((e) => e.kind === 'main') },
    { key: 'rolls', label: 'Rolls', entries: entries.filter((e) => e.kind === 'roll') },
  ].filter((s) => s.entries.length > 0)
  const headerColor = theme === 'paper' ? '#57534e' : 'rgba(255,255,255,0.55)'
  return (
    <div className="space-y-4">
      {sections.map((s) => (
        <div key={s.key}>
          <p
            className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.18em]"
            style={{ color: headerColor }}
          >
            {s.label} <span className="opacity-60">· {s.entries.length}</span>
          </p>
          <div className="grid grid-cols-4 gap-1.5 sm:grid-cols-6 lg:grid-cols-8">
            {s.entries.map((e) => (
              <CompactTile key={e.skillId} entry={e} onTap={onTap} glowMap={glowMap} theme={theme} />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

/** One skill chip in the Levels view. */
function LevelChip({
  entry,
  onTap,
  glowMap,
  theme,
}: {
  entry: SkillEntry
  onTap: (s: UnifiedSkill) => void
  glowMap?: GlowMap
  theme: MapTheme
}) {
  const skill = getRegistrySkill(entry.skillId)
  if (!skill) return null
  const glowDist = glowMap?.dist.get(entry.skillId)
  const highlighted = (glowMap?.highlights.has(entry.skillId) ?? false) && glowDist === undefined
  const v = itemVisuals(theme, entry.family, {
    glowing: glowDist !== undefined,
    glowDist,
    highlighted,
  })
  const rgb = FAMILY_GLOW_RGB[entry.family]
  return (
    <button
      type="button"
      onClick={() => onTap(skill)}
      className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold active:scale-95"
      style={{
        background: v.background,
        borderColor: v.borderColor,
        ...(v.borderWidth ? { borderWidth: v.borderWidth } : null),
        boxShadow: v.boxShadow,
        color: v.color,
      }}
    >
      <span
        className="h-2 w-2 shrink-0 rounded-full"
        style={{ background: `rgb(${rgb})` }}
        aria-hidden
      />
      {entry.label}
      {glowDist !== undefined && (
        <span style={{ color: `rgb(${rgb})` }} aria-hidden>
          ✦
        </span>
      )}
    </button>
  )
}

/** Levels view: horizontal bands by difficulty zone, easiest first. Rolls stay
 * in their own section below the bands, separate from the skill path. */
function LevelsView({
  onTap,
  glowMap,
  theme,
  infoOnly,
}: {
  onTap: (s: UnifiedSkill) => void
  glowMap?: GlowMap
  theme: MapTheme
  infoOnly: boolean
}) {
  const entries = getSkillEntries().filter((e) => !infoOnly || hasCardInfo(e.skillId))
  const main = entries.filter((e) => e.kind !== 'roll')
  const rolls = entries.filter((e) => e.kind === 'roll')
  const accents = theme === 'paper' ? ZONE_ACCENT_DARK : ZONE_ACCENT
  const headerColor = theme === 'paper' ? '#44403c' : 'rgba(255,255,255,0.75)'
  const sectionColor = theme === 'paper' ? '#57534e' : 'rgba(255,255,255,0.55)'
  return (
    <div className="space-y-4">
      {BAND_ORDER.map((zone) => {
        const zs = main.filter((e) => e.zone === zone)
        if (zs.length === 0) return null
        return (
          <div key={zone}>
            <div className="mb-1.5 flex items-center gap-2">
              <span
                className="h-4 w-1 shrink-0 rounded-full"
                style={{ background: accents[zone] }}
                aria-hidden
              />
              <p
                className="text-[11px] font-bold uppercase tracking-[0.18em]"
                style={{ color: headerColor }}
              >
                {zone} <span className="opacity-60">· {zs.length}</span>
              </p>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {zs.map((e) => (
                <LevelChip key={e.skillId} entry={e} onTap={onTap} glowMap={glowMap} theme={theme} />
              ))}
            </div>
          </div>
        )
      })}
      {rolls.length > 0 && (
        <div>
          <p
            className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.18em]"
            style={{ color: sectionColor }}
          >
            Rolls <span className="opacity-60">· {rolls.length}</span>
          </p>
          <div className="flex flex-wrap gap-1.5">
            {rolls.map((e) => (
              <LevelChip key={e.skillId} entry={e} onTap={onTap} glowMap={glowMap} theme={theme} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export function SkillMapView({
  onTileTap,
  viewer = null,
  classAthletes = [],
  activeAthlete = null,
}: {
  onTileTap: (skill: UnifiedSkill) => void
  /** Signed-in viewer. Glow only renders for athlete-role viewers with goals. */
  viewer?: Athlete | null
  /** Athletes on the live class roster — their goal paths light up too. */
  classAthletes?: Athlete[]
  /** Active athlete (from athleteId) — their goal path lights up too. */
  activeAthlete?: Athlete | null
}) {
  const [beyondOpen, setBeyondOpen] = useState(false)
  const [theme, setTheme] = useState<MapTheme>(loadMapTheme)
  const [view, setView] = useState<MapViewMode>(loadMapView)
  const [infoFilter, setInfoFilter] = useState<InfoFilter>(loadInfoFilter)
  const pickTheme = (t: MapTheme) => {
    setTheme(t)
    saveMapTheme(t)
  }
  const pickView = (v: MapViewMode) => {
    setView(v)
    saveMapView(v)
  }
  const pickInfoFilter = (f: InfoFilter) => {
    setInfoFilter(f)
    saveInfoFilter(f)
  }
  const infoOnly = infoFilter === 'info'
  // Guiding light: null when no athlete is signed in, no active athlete, and
  // no class roster — the map renders exactly as before. Otherwise the union
  // of everyone's goals lights up (shortest distance wins across athletes).
  const glowAthletes = useMemo(() => {
    const seen = new Set<string>()
    const out: Athlete[] = []
    const add = (a: Athlete | null | undefined) => {
      if (a && isAthleteProfile(a) && !seen.has(a.id)) {
        seen.add(a.id)
        out.push(a)
      }
    }
    add(viewer)
    add(activeAthlete)
    for (const a of classAthletes) add(a)
    return out
  }, [viewer, activeAthlete, classAthletes])
  const glowNames = useMemo(
    () =>
      glowAthletes
        .filter((a) => (a.skillGoals ?? []).some((g) => g.skillId?.trim()))
        .map((a) => a.name.trim().split(/\s+/)[0])
        .filter(Boolean),
    [glowAthletes],
  )
  // Class case: roster athletes with goals are lighting the path (not just the viewer).
  const classGlow = useMemo(
    () =>
      classAthletes.some(
        (a) =>
          isAthleteProfile(a) &&
          (a.skillGoals ?? []).some((g) => g.skillId?.trim()),
      ),
    [classAthletes],
  )
  const glowMap = useMemo(() => {
    const goals = glowAthletes.flatMap((a) => a.skillGoals ?? []).filter((g) => g.skillId?.trim())
    if (!goals.length) return null
    return buildGlowMap(goals)
  }, [glowAthletes])
  return (
    <div className={`space-y-2.5 ${theme === 'paper' ? 'rounded-2xl bg-[#f3efe4] p-3' : ''}`}>
      {/* Pulse keyframes for the goal tile (distance 0). Pulses the neon edge
          (brightness + saturation) — no halo bloom; the static box-shadow
          carries the glow. Cheap on phones. */}
      <style>{`@keyframes skill-glow-pulse { 0%,100% { filter: brightness(1) saturate(1); } 50% { filter: brightness(1.18) saturate(1.35); } }
@keyframes foundations-beam { 0%,100% { box-shadow: 0 2px 10px rgba(0,0,0,0.35), 0 8px 24px rgba(0,0,0,0.22), 0 0 2px 1px rgba(251,191,36,0.8), 0 0 18px 4px rgba(251,191,36,0.25); } 50% { box-shadow: 0 2px 10px rgba(0,0,0,0.35), 0 8px 24px rgba(0,0,0,0.22), 0 0 2px 1px rgba(251,191,36,1), 0 0 26px 6px rgba(251,191,36,0.35); } }`}</style>
      {/* Compact control bar: Look + View + Cards pickers, sticky at the top */}
      <ViewControls
        theme={theme}
        view={view}
        onTheme={pickTheme}
        onView={pickView}
        infoFilter={infoFilter}
        onInfoFilter={pickInfoFilter}
      />

      {view === 'map' && <ColumnHeaders theme={theme} />}

      {glowMap && <GlowNote theme={theme} classGlow={classGlow} glowNames={glowNames} />}

      {view === 'map' ? (
        /* Beyond + tree share one relative context so the level bar spans both —
            when Beyond is open the bar reaches up into the Legend zone */
        <div className="relative">
          <div className="space-y-2.5 pr-6 sm:pr-20">
            <BeyondSection
              open={beyondOpen}
              onToggle={() => setBeyondOpen((o) => !o)}
              onTap={onTileTap}
              glowMap={glowMap}
              theme={theme}
              infoOnly={infoOnly}
            />

            <Legend theme={theme} />

            {/* Skill tree */}
            <div className="space-y-2.5">
              <MapRows rows={ROWS.slice(0, 13)} onTap={onTileTap} glowMap={glowMap} theme={theme} infoOnly={infoOnly} />
              <div className="pt-1">
                <RollsSection onTap={onTileTap} glowMap={glowMap} theme={theme} infoOnly={infoOnly} />
              </div>
              {/* Light beaming upward from Foundations into the tree */}
              <div
                aria-hidden
                className="pointer-events-none mx-auto h-10 w-3/4"
                style={{
                  background:
                    'radial-gradient(ellipse at 50% 100%, rgba(251,191,36,0.28), rgba(251,191,36,0.08) 55%, transparent 75%)',
                }}
              />
              <MapRows rows={ROWS.slice(13)} onTap={onTileTap} glowMap={glowMap} theme={theme} infoOnly={infoOnly} />
              <div className="pt-2" />
            </div>
          </div>
          <LevelBar beyondOpen={beyondOpen} theme={theme} />
        </div>
      ) : (
        <>
          <Legend theme={theme} />
          {view === 'list' && <ListView onTap={onTileTap} glowMap={glowMap} theme={theme} infoOnly={infoOnly} />}
          {view === 'compact' && <CompactView onTap={onTileTap} glowMap={glowMap} theme={theme} infoOnly={infoOnly} />}
          {view === 'levels' && <LevelsView onTap={onTileTap} glowMap={glowMap} theme={theme} infoOnly={infoOnly} />}
        </>
      )}
    </div>
  )
}
