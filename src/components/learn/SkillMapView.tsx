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
import { useCallback, useMemo, useState } from 'react'
import type { CSSProperties } from 'react'
import { getRegistrySkill, type UnifiedSkill } from '../../lib/skillRegistry'
import { canonicalSkillId, resolveGoalSkill } from '../../lib/skillPaths'
import {
  buildPathHighlight,
  needsForSkillConsolidated,
  searchMapSkills,
  usePathTick,
  type MapSearchResult,
  type PathHighlight,
} from '../../lib/skillPathHighlight'
import { isAthleteProfile } from '../../lib/profileRole'
import type { Athlete, AthleteSkillGoal } from '../../types'

/** Look + layout options for the skill map page. Persisted in localStorage. */
type MapTheme = 'neon' | 'midnight' | 'paper' | 'ember'
type MapViewMode = 'map' | 'list' | 'compact' | 'levels'
type InfoFilter = 'all' | 'info'

const MAP_THEME_KEY = 'shapelab.skillmap.theme.v1'
const MAP_VIEW_KEY = 'shapelab.skillmap.view.v1'
const INFO_FILTER_KEY = 'shapelab.skillmap.infofilter.v1'
const DIRECT_PATH_KEY = 'shapelab.skillmap.directpath.v1'

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
/** Direct-path mode: shine only the target + its key helpers. */
function loadDirectPath(): boolean {
  try {
    return localStorage.getItem(DIRECT_PATH_KEY) === '1'
  } catch {
    return false
  }
}
function saveDirectPath(on: boolean) {
  try {
    localStorage.setItem(DIRECT_PATH_KEY, on ? '1' : '0')
  } catch {
    /* ignore */
  }
}
/** A skill "has info" when its card has guide prose (same signal as the amber dot). */
function hasCardInfo(skillId: string): boolean {
  return !!getRegistrySkill(skillId)?.guideId
}

/** Exported for the card Path tab's chain colors. */
export type SkillFamily =
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
export const FAMILY_GLOW_RGB: Record<SkillFamily, string> = {
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
  return skillRowIndex.get(canonicalSkillId(skillId))
}

/**
 * Does this goal count as "at or above" the given tier?
 * Tier thresholds are row indices; the RO HS tier additionally requires the
 * roundoff family (or layout+, which implies RO HS in the progression).
 */
function goalReachesTier(skillId: string, tier: { minRow: number; name: string }): boolean {
  const canon = canonicalSkillId(skillId)
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

/** Prerequisite needs — canonicalized; see lib/skillPathHighlight. */

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
    const canon = canonicalSkillId(id)
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
    const id = canonicalSkillId(resolved?.id ?? raw)
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

/**
 * "Shine light" highlight roles, resolved per tile. While a highlight is
 * active the athlete-goal glow steps aside — the chosen path is the focus.
 */
export type HlRole = 'target' | 'required' | 'helpful' | 'dim' | null

export function hlFor(
  hl: PathHighlight | null | undefined,
  skillId: string,
): {
  role: HlRole
  dist: number
  /** True when this tile is one of the target's key helpers — it wiggles. */
  keyHelper: boolean
} {
  if (!hl) return { role: null, dist: 0, keyHelper: false }
  const canon = canonicalSkillId(skillId)
  const isKH = hl.keyHelpers.has(canon)
  if (canon === hl.target) return { role: 'target', dist: 0, keyHelper: false }
  const rd = hl.required.get(canon)
  if (rd !== undefined) {
    // Direct-path mode: only the target and its key helpers stay lit.
    if (hl.direct && !isKH) return { role: 'dim', dist: 0, keyHelper: false }
    return { role: 'required', dist: rd, keyHelper: isKH }
  }
  const hd = hl.helpful.get(canon)
  if (hd !== undefined) {
    if (hl.direct && !isKH) return { role: 'dim', dist: 0, keyHelper: false }
    return { role: 'helpful', dist: hd, keyHelper: isKH }
  }
  // A key helper outside the prerequisite closure still lights up (soft glow
  // + wiggle) so the most adjacent skills are never dimmed out.
  if (isKH) return { role: 'helpful', dist: 1, keyHelper: true }
  return { role: 'dim', dist: 0, keyHelper: false }
}

/**
 * The highlight's visual layer for a tile: a family-color ring + the
 * traveling bottom-to-top pulse. The pulse is staggered so the wave starts
 * at the deepest prerequisite and rises toward the target. Takes precedence
 * over the steady goal glow while a highlight is active.
 */
export function hlGlowStyle(
  hl: PathHighlight,
  role: HlRole,
  dist: number,
  family: SkillFamily,
  keyHelper = false,
): CSSProperties {
  const rgb = FAMILY_GLOW_RGB[family]
  const s: CSSProperties = {}
  if (role === 'target') {
    s.boxShadow = `0 0 0 2px rgba(${rgb},0.95), 0 0 26px 6px rgba(${rgb},0.45)`
    s.animation = 'path-travel 2.6s ease-in-out infinite'
  } else if (role === 'required') {
    s.boxShadow = `0 0 0 1px rgba(${rgb},0.9), 0 0 16px 3px rgba(${rgb},0.35)`
    s.animation = 'path-travel 2.6s ease-in-out infinite'
    s.animationDelay = `${(hl.maxDist - dist) * 0.45}s`
  } else if (role === 'helpful') {
    s.boxShadow = `0 0 0 1px rgba(${rgb},0.4), 0 0 9px 2px rgba(${rgb},0.16)`
  }
  // Key helpers wiggle boldly on top of their glow to draw the eye.
  if (keyHelper && role !== 'dim') {
    s.animation = (s.animation ? s.animation + ', ' : '') + 'keyhelper-wiggle 1.7s ease-in-out infinite'
  }
  return s
}

/** Small role marker for rows and chips: ◎ target · ✦ required · ✧ helpful. */
export function HlMarker({ role, className = '' }: { role: HlRole; className?: string }) {
  if (role === 'target')
    return (
      <span aria-label="highlight target" className={`shrink-0 text-amber-300 ${className}`}>
        ◎
      </span>
    )
  if (role === 'required')
    return (
      <span aria-label="required for the highlight target" className={`shrink-0 text-amber-300/90 ${className}`}>
        ✦
      </span>
    )
  if (role === 'helpful')
    return (
      <span aria-label="helpful for the highlight target" className={`shrink-0 opacity-60 ${className}`}>
        ✧
      </span>
    )
  return null
}

/** Neon-edge glow in the family color: a tight bright outline hugging the
 * tile edge plus one soft outer halo. No lit-from-within. Steep ramp: the
 * goal (0) is unmistakably the destination, and each step down the chain is
 * visibly dimmer so the lit trail reads at a glance. */
function glowShadow(rgb: string, distance: number): string {
  const specs = [
    { a1: 0.95, b1: 2, s1: 1, a2: 0.35, b2: 14, s2: 4 }, // 0, the destination, brightest
    { a1: 0.85, b1: 2, s1: 1, a2: 0.28, b2: 12, s2: 3 }, // 1, strong, on the trail
    { a1: 0.7, b1: 1, s1: 1, a2: 0.22, b2: 10, s2: 3 }, // 2, clearly lit
    { a1: 0.5, b1: 1, s1: 1, a2: 0.15, b2: 8, s2: 2 }, // 3
    { a1: 0.35, b1: 1, s1: 0, a2: 0.1, b2: 6, s2: 2 }, // 4
    { a1: 0.25, b1: 1, s1: 0, a2: 0.06, b2: 5, s2: 1 }, // 5, faint shimmer
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
          ? `rgba(${rgb},1)` // destination, full-strength border
          : d <= 2
            ? `rgba(${rgb},0.95)` // on the trail, near-full so the path reads continuous
            : `rgba(${rgb},0.7)`
        : state.highlighted
          ? `rgba(${rgb},0.55)` // relevant, not required, softer + dashed below
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
/** Skill family per tile, by registry skl_* id. Exported for the card Path tab. */
export const FAMILY_BY_SKILL: Record<string, SkillFamily> = {
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
  skl_double_layout: 'doubleback',
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
  {
    // double layout — backwards Beyond, just below the 3.5 line in the double-back column
    tiles: [
      { skillId: 'skl_double_layout', label: 'Double layout', col: '5 / 7' },
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
  hl,
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
  /** "Shine light" path highlight. While active it takes over the glow. */
  hl?: PathHighlight | null
}) {
  const hasGuide = !!skill.guideId
  const dimmed = !!infoOnly && !hasGuide
  const family = FAMILY_BY_SKILL[tile.skillId] ?? 'foundations'
  const isBanner = tile.skillId === 'skl_foundations'
  const { role: hlRole, dist: hlDist, keyHelper: hlKeyHelper } = hlFor(hl, tile.skillId)
  const hlActive = hlRole !== null
  // While a highlight is active, the athlete-goal glow steps aside.
  const glowing = !hlActive && glowDist !== undefined
  const highlighted = !hlActive && !!isHighlight && !glowing
  const featured = isFeaturedSkill(skill) && !isBanner
  const v = tileVisuals(theme, family, { isBanner, glowing, glowDist, highlighted, featured })
  const hlLayer = hl && hlRole ? hlGlowStyle(hl, hlRole, hlDist, family, hlKeyHelper) : null
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
        boxShadow: hlActive ? hlLayer?.boxShadow : v.boxShadow,
        ...(hlLayer?.animation
          ? { animation: hlLayer.animation, animationDelay: hlLayer.animationDelay }
          : v.pulse && glowDist === 0
            ? { animation: 'skill-glow-pulse 2.8s ease-in-out infinite' }
            : v.beam && isBanner
              ? { animation: 'foundations-beam 5s ease-in-out infinite' }
              : null),
        opacity: dimmed ? 0.25 : hlRole === 'dim' ? 0.35 : undefined,
      }}
      className={`relative flex items-center justify-center rounded-2xl border px-1 text-center font-bold leading-snug transition-transform active:scale-95 sm:px-2 ${v.textClass} ${
        v.dashed ? 'border-dashed' : ''
      } ${
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
      {hlRole && hlRole !== 'dim' && (
        <span className="absolute left-1.5 top-1.5">
          <HlMarker role={hlRole} className="text-[10px]" />
        </span>
      )}
      <span className={`break-words ${v.labelClass}`}>{tile.label}</span>
    </button>
  )
}

/** Parse the starting grid line from a "a / b" column value. */
function parseColStart(col: string): number | null {
  const m = /^\s*(\d+)\s*\//.exec(col)
  return m ? parseInt(m[1], 10) : null
}

/** Parse a "a / b" column value into integer grid lines. */
function parseColSpan(col: string): { start: number; end: number } | null {
  const m = /^\s*(\d+)\s*\/\s*(\d+)\s*$/.exec(col)
  if (!m) return null
  return { start: parseInt(m[1], 10), end: parseInt(m[2], 10) }
}

/**
 * Column values splitting the [start, end] span into n parts.
 * Cumulative rounding keeps every boundary on a real integer grid line.
 */
function splitSpan(start: number, end: number, n: number): string[] {
  const bounds: number[] = []
  for (let i = 0; i <= n; i++) bounds.push(Math.round(start + ((end - start) * i) / n))
  const out: string[] = []
  for (let i = 0; i < n; i++) out.push(`${bounds[i]} / ${bounds[i + 1]}`)
  return out
}

/**
 * Reflow a row's tiles to fill gaps left by deleted skills.
 * Tiles whose skill no longer resolves are dropped; the survivors expand to
 * fill the freed space. When nothing was deleted the original columns are
 * returned untouched, so the arranged layout never shifts otherwise.
 * With header spans (main map), survivors are grouped by the header span
 * their original column starts in, and each group divides its header span
 * evenly, so track alignment is preserved. Without headers (rolls, beyond),
 * the survivors divide the row's own total span evenly.
 */
function reflowRowTiles(row: MapRow, headers?: { label: string; col: string }[]): MapTile[] {
  const survivors = row.tiles.filter((t) => getRegistrySkill(t.skillId))
  if (survivors.length === row.tiles.length) return row.tiles
  if (survivors.length === 0) return []
  if (headers && headers.length > 0) {
    const spans = headers
      .map((h) => parseColSpan(h.col))
      .filter((s): s is { start: number; end: number } => s !== null)
    if (spans.length === 0) return survivors
    const groups: MapTile[][] = spans.map(() => [])
    for (const t of survivors) {
      const s = parseColStart(t.col)
      const gi = s === null ? -1 : spans.findIndex((sp) => s >= sp.start && s < sp.end)
      if (gi >= 0) groups[gi].push(t)
    }
    const cols = new Map<MapTile, string>()
    groups.forEach((g, gi) => {
      if (g.length === 0) return
      const parts = splitSpan(spans[gi].start, spans[gi].end, g.length)
      g.forEach((t, i) => cols.set(t, parts[i]))
    })
    // Tiles that matched no header keep their original column.
    return survivors.map((t) => {
      const col = cols.get(t)
      return col ? { ...t, col } : t
    })
  }
  // The total span comes from the row's original tiles (deleted ones included),
  // so survivors expand into the freed space.
  const parsed = row.tiles.map((t) => ({ tile: t, span: parseColSpan(t.col) }))
  if (parsed.some((p) => p.span === null)) return survivors
  const start = Math.min(...parsed.map((p) => p.span!.start))
  const end = Math.max(...parsed.map((p) => p.span!.end))
  const parts = splitSpan(start, end, survivors.length)
  const kept = new Set(survivors)
  return parsed
    .filter((p) => kept.has(p.tile))
    .map((p, i) => ({ ...p.tile, col: parts[i] }))
}

function MapRows({
  rows,
  onTap,
  glowMap,
  theme,
  infoOnly,
  hl,
  headers,
}: {
  rows: MapRow[]
  onTap: (s: UnifiedSkill) => void
  glowMap?: { dist: Map<string, number>; highlights: Set<string> } | null
  theme: MapTheme
  infoOnly?: boolean
  hl?: PathHighlight | null
  /** Track header spans for reflow (main map). Omit for rolls/beyond rows. */
  headers?: { label: string; col: string }[]
}) {
  return (
    <>
      {rows.map((row, i) => (
        <div
          key={i}
          className="grid gap-2"
          style={{ gridTemplateColumns: `repeat(${row.cols ?? 8}, 1fr)` }}
        >
          {reflowRowTiles(row, headers).map((tile) => {
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
                hl={hl}
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
  hl,
}: {
  onTap: (s: UnifiedSkill) => void
  glowMap?: { dist: Map<string, number>; highlights: Set<string> } | null
  theme: MapTheme
  infoOnly?: boolean
  hl?: PathHighlight | null
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
          <MapRows rows={ROLLS_ROWS} onTap={onTap} glowMap={glowMap} theme={theme} infoOnly={infoOnly} hl={hl} />
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
        {/* gradient strip, always visible, the closed tab */}
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
        {/* zone labels, fade in when open */}
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
  onSearch,
  hlTargetName,
  hlActive,
  onClearHighlight,
  hlCombos,
  hlComboIdx,
  onPickCombo,
  directPath,
  onToggleDirectPath,
}: {
  theme: MapTheme
  onTheme: (t: MapTheme) => void
  view: MapViewMode
  onView: (v: MapViewMode) => void
  infoFilter: InfoFilter
  onInfoFilter: (f: InfoFilter) => void
  onSearch: () => void
  hlTargetName: string | null
  hlActive: boolean
  onClearHighlight: () => void
  hlCombos: { ids: string[]; label: string }[]
  hlComboIdx: number
  onPickCombo: (i: number) => void
  directPath: boolean
  onToggleDirectPath: (on: boolean) => void
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
  const chipColor = theme === 'paper' ? '#44403c' : 'rgba(255,255,255,0.85)'
  const chipBorder = theme === 'paper' ? 'rgba(0,0,0,0.25)' : 'rgba(255,255,255,0.25)'
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
      <div className="mt-1.5 flex flex-wrap items-center gap-2">
        <span
          className="w-9 shrink-0 text-[10px] font-bold uppercase tracking-[0.14em]"
          style={{ color: labelColor }}
        >
          Shine
        </span>
        <button
          type="button"
          onClick={onSearch}
          aria-label="Search skills to shine light on a path"
          className="flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium"
          style={{ color: chipColor, borderColor: chipBorder }}
        >
          <span aria-hidden>🔍</span> Search skills…
        </button>
        {hlTargetName && (
          <button
            type="button"
            onClick={onClearHighlight}
            title="Clear the path highlight"
            className="flex items-center gap-1.5 rounded-full border border-amber-300/60 bg-amber-300/10 px-3 py-1 text-xs font-semibold text-amber-200"
          >
            <span aria-hidden>✦</span> {hlTargetName}{' '}
            <span aria-hidden className="opacity-70">
              ✕
            </span>
          </button>
        )}
        {hlActive && (
          <span className="text-[11px]" style={{ color: labelColor }}>
            tap the skill again to open its card
          </span>
        )}
        {hlCombos.length > 0 && (
          <button
            type="button"
            onClick={() => onToggleDirectPath(!directPath)}
            aria-pressed={directPath}
            title="Show only the target and its most adjacent helper skills"
            className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ${
              directPath
                ? 'border-amber-300/70 bg-amber-300/15 text-amber-200'
                : 'text-white/70 hover:text-white'
            }`}
            style={directPath ? undefined : { color: chipColor, borderColor: chipBorder }}
          >
            <span aria-hidden>{directPath ? '◉' : '◎'}</span> Direct path
          </button>
        )}
      </div>
      {hlCombos.length > 1 && (
        <div className="mt-1.5 flex flex-wrap items-center gap-2">
          <span
            className="w-9 shrink-0 text-[10px] font-bold uppercase tracking-[0.14em]"
            style={{ color: labelColor }}
          >
            Path
          </span>
          {hlCombos.map((c, i) => (
            <button
              key={c.label}
              type="button"
              onClick={() => onPickCombo(i)}
              aria-pressed={hlComboIdx === i}
              className={`rounded-full border px-3 py-1 text-xs font-medium ${
                hlComboIdx === i
                  ? 'border-amber-300/70 bg-amber-300/15 font-semibold text-amber-200'
                  : 'text-white/70 hover:text-white'
              }`}
              style={hlComboIdx === i ? undefined : { color: chipColor, borderColor: chipBorder }}
            >
              {c.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

/**
 * Search every skill on the map and pick one to shine light on: its
 * prerequisite path glows (brightest at the target, traveling up from the
 * deepest prerequisite) while unrelated skills fade out of focus.
 * First tap on a skill tile previews its shine; tapping the same skill again
 * opens its card, tapping another skill switches the preview, and tapping
 * anywhere off a tile clears the preview back to the original view.
 */
function SkillSearchOverlay({
  onClose,
  onPick,
  mapIds,
  labelOf,
}: {
  onClose: () => void
  onPick: (skillId: string) => void
  mapIds: Set<string>
  labelOf: (id: string) => string
}) {
  const [q, setQ] = useState('')
  const results: MapSearchResult[] = useMemo(
    () => searchMapSkills(q, mapIds, labelOf),
    [q, mapIds, labelOf],
  )
  return (
    <div
      className="fixed inset-0 z-[70] flex items-start justify-center p-4 pt-[12vh]"
      onClick={onClose}
      onKeyDown={(e) => {
        if (e.key === 'Escape') onClose()
      }}
    >
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <div
        role="dialog"
        aria-label="Search skills to shine light on"
        className="relative w-full max-w-md overflow-hidden rounded-2xl border border-white/15 bg-[#14141c] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 border-b border-white/10 p-3">
          <span aria-hidden>🔍</span>
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Type a skill name…"
            aria-label="Search skills"
            className="w-full bg-transparent text-sm text-white placeholder-white/40 outline-none"
          />
          <button
            type="button"
            onClick={onClose}
            aria-label="Close search"
            className="rounded-full px-2 py-1 text-white/60 hover:bg-white/10 hover:text-white"
          >
            ✕
          </button>
        </div>
        <div className="max-h-80 overflow-y-auto p-2">
          {q.trim() === '' ? (
            <p className="p-3 text-sm text-white/50">
              Start typing to search every skill on the map. Pick one and its path lights up.
            </p>
          ) : results.length === 0 ? (
            <p className="p-3 text-sm text-white/50">No skills match “{q.trim()}”.</p>
          ) : (
            <ul>
              {results.map((r) => (
                <li key={r.skillId}>
                  <button
                    type="button"
                    onClick={() => onPick(r.skillId)}
                    className="flex w-full items-center justify-between gap-2 rounded-xl px-3 py-2.5 text-left hover:bg-white/10"
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium text-white">{r.label}</span>
                      {r.name !== r.label && (
                        <span className="block truncate text-xs text-white/50">{r.name}</span>
                      )}
                    </span>
                    <span className="shrink-0 text-xs text-amber-200/70">shine ✦</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}

/** Column headers for the map view (Today section-label style). */
function ColumnHeaders({ theme }: { theme: MapTheme }) {  return (
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
        : 'Your goals light the way, follow the glow upward'}
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
  hl,
}: {
  open: boolean
  onToggle: () => void
  onTap: (s: UnifiedSkill) => void
  glowMap?: { dist: Map<string, number>; highlights: Set<string> } | null
  theme: MapTheme
  infoOnly?: boolean
  hl?: PathHighlight | null
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
          <MapRows rows={BEYOND_ROWS} onTap={onTap} glowMap={glowMap} theme={theme} infoOnly={infoOnly} hl={hl} />
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
  hl,
}: {
  entry: SkillEntry
  onTap: (s: UnifiedSkill) => void
  glowMap?: GlowMap
  theme: MapTheme
  hl?: PathHighlight | null
}) {
  const skill = getRegistrySkill(entry.skillId)
  if (!skill) return null
  const glowDist = glowMap?.dist.get(entry.skillId)
  const { role: hlRole, dist: hlDist, keyHelper: hlKeyHelper } = hlFor(hl, entry.skillId)
  const hlActive = hlRole !== null
  const highlighted =
    hlActive ? hlRole === 'helpful' : (glowMap?.highlights.has(entry.skillId) ?? false) && glowDist === undefined
  const glowing = hlActive ? hlRole === 'target' || hlRole === 'required' : glowDist !== undefined
  const v = itemVisuals(theme, entry.family, {
    glowing,
    glowDist: hlActive ? (hlRole === 'target' ? 0 : 1) : glowDist,
    highlighted,
  })
  const hlLayer = hl && hlRole ? hlGlowStyle(hl, hlRole, hlDist, entry.family, hlKeyHelper) : null
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
        boxShadow: hlActive ? hlLayer?.boxShadow : v.boxShadow,
        color: v.color,
        ...(hlLayer?.animation
          ? { animation: hlLayer.animation, animationDelay: hlLayer.animationDelay }
          : null),
        opacity: hlRole === 'dim' ? 0.35 : undefined,
      }}
    >
      <span
        className="h-2.5 w-2.5 shrink-0 rounded-full"
        style={{ background: `rgb(${rgb})` }}
        aria-hidden
      />
      <span className="flex-1 text-[13px] font-semibold">{entry.label}</span>
      {hlActive ? (
        <HlMarker role={hlRole} className="text-xs" />
      ) : (
        glowDist !== undefined && (
          <span className="shrink-0 text-[10px] font-bold" style={{ color: `rgb(${rgb})` }}>
            ✦ path
          </span>
        )
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
  hl,
}: {
  onTap: (s: UnifiedSkill) => void
  glowMap?: GlowMap
  theme: MapTheme
  infoOnly: boolean
  hl?: PathHighlight | null
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
              <ListRow key={e.skillId} entry={e} onTap={onTap} glowMap={glowMap} theme={theme} hl={hl} />
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
  hl,
}: {
  entry: SkillEntry
  onTap: (s: UnifiedSkill) => void
  glowMap?: GlowMap
  theme: MapTheme
  hl?: PathHighlight | null
}) {
  const skill = getRegistrySkill(entry.skillId)
  if (!skill) return null
  const glowDist = glowMap?.dist.get(entry.skillId)
  const { role: hlRole, dist: hlDist, keyHelper: hlKeyHelper } = hlFor(hl, entry.skillId)
  const hlActive = hlRole !== null
  const highlighted =
    hlActive ? hlRole === 'helpful' : (glowMap?.highlights.has(entry.skillId) ?? false) && glowDist === undefined
  const glowing = hlActive ? hlRole === 'target' || hlRole === 'required' : glowDist !== undefined
  const v = tileVisuals(theme, entry.family, {
    isBanner: false,
    glowing,
    glowDist: hlActive ? (hlRole === 'target' ? 0 : 1) : glowDist,
    highlighted,
    featured: !hlActive && isFeaturedSkill(skill),
  })
  const hlLayer = hl && hlRole ? hlGlowStyle(hl, hlRole, hlDist, entry.family, hlKeyHelper) : null
  return (
    <button
      type="button"
      onClick={() => onTap(skill)}
      className={`relative flex min-h-[46px] items-center justify-center rounded-lg border px-1 text-center text-[9px] font-bold leading-tight active:scale-95 ${v.textClass} ${
        v.dashed ? 'border-dashed' : ''
      }`}
      style={{
        background: v.background,
        borderColor: v.borderColor,
        ...(v.borderWidth ? { borderWidth: v.borderWidth } : null),
        ...(v.borderLeftWidth
          ? { borderLeftWidth: v.borderLeftWidth, borderLeftColor: v.borderLeftColor }
          : null),
        boxShadow: hlActive ? hlLayer?.boxShadow : v.boxShadow,
        ...(hlLayer?.animation
          ? { animation: hlLayer.animation, animationDelay: hlLayer.animationDelay }
          : v.pulse && glowDist === 0
            ? { animation: 'skill-glow-pulse 2.8s ease-in-out infinite' }
            : null),
        opacity: hlRole === 'dim' ? 0.35 : undefined,
      }}
    >
      {hlRole && hlRole !== 'dim' && (
        <span className="absolute left-1 top-0.5">
          <HlMarker role={hlRole} className="text-[8px]" />
        </span>
      )}
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
  hl,
}: {
  onTap: (s: UnifiedSkill) => void
  glowMap?: GlowMap
  theme: MapTheme
  infoOnly: boolean
  hl?: PathHighlight | null
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
              <CompactTile key={e.skillId} entry={e} onTap={onTap} glowMap={glowMap} theme={theme} hl={hl} />
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
  hl,
}: {
  entry: SkillEntry
  onTap: (s: UnifiedSkill) => void
  glowMap?: GlowMap
  theme: MapTheme
  hl?: PathHighlight | null
}) {
  const skill = getRegistrySkill(entry.skillId)
  if (!skill) return null
  const glowDist = glowMap?.dist.get(entry.skillId)
  const { role: hlRole, dist: hlDist, keyHelper: hlKeyHelper } = hlFor(hl, entry.skillId)
  const hlActive = hlRole !== null
  const highlighted =
    hlActive ? hlRole === 'helpful' : (glowMap?.highlights.has(entry.skillId) ?? false) && glowDist === undefined
  const glowing = hlActive ? hlRole === 'target' || hlRole === 'required' : glowDist !== undefined
  const v = itemVisuals(theme, entry.family, {
    glowing,
    glowDist: hlActive ? (hlRole === 'target' ? 0 : 1) : glowDist,
    highlighted,
  })
  const hlLayer = hl && hlRole ? hlGlowStyle(hl, hlRole, hlDist, entry.family, hlKeyHelper) : null
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
        boxShadow: hlActive ? hlLayer?.boxShadow : v.boxShadow,
        color: v.color,
        ...(hlLayer?.animation
          ? { animation: hlLayer.animation, animationDelay: hlLayer.animationDelay }
          : null),
        opacity: hlRole === 'dim' ? 0.35 : undefined,
      }}
    >
      <span
        className="h-2 w-2 shrink-0 rounded-full"
        style={{ background: `rgb(${rgb})` }}
        aria-hidden
      />
      {entry.label}
      {hlActive ? (
        <HlMarker role={hlRole} className="text-[10px]" />
      ) : (
        glowDist !== undefined && (
          <span style={{ color: `rgb(${rgb})` }} aria-hidden>
            ✦
          </span>
        )
      )}
    </button>
  )
}

/** Family order inside each Levels band — same order as the List view groups. */
const LEVEL_FAMILY_ORDER: SkillFamily[] = [
  'foundations',
  'standing',
  'forwards',
  'cartwheel',
  'roundoff',
  'doubleback',
  'kick',
]

/** Levels view: horizontal bands by difficulty zone, easiest first. Within each
 * band, skills are grouped by family (each family on its own row) so the
 * placement shows the progression, not just the color dot. Rolls stay in
 * their own section below the bands, separate from the skill path. */
function LevelsView({
  onTap,
  glowMap,
  theme,
  infoOnly,
  hl,
}: {
  onTap: (s: UnifiedSkill) => void
  glowMap?: GlowMap
  theme: MapTheme
  infoOnly: boolean
  hl?: PathHighlight | null
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
        const famGroups = LEVEL_FAMILY_ORDER.map((f) => ({
          family: f,
          entries: zs.filter((e) => e.family === f),
        })).filter((g) => g.entries.length > 0)
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
            <div className="space-y-2">
              {famGroups.map((g) => (
                <div key={g.family} className="flex items-start gap-2">
                  <span
                    className="w-20 shrink-0 pt-1 text-[9px] font-bold uppercase tracking-[0.08em]"
                    style={{ color: sectionColor }}
                  >
                    {FAMILY_STYLES[g.family].label}
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {g.entries.map((e) => (
                      <LevelChip
                        key={e.skillId}
                        entry={e}
                        onTap={onTap}
                        glowMap={glowMap}
                        theme={theme}
                      />
                    ))}
                  </div>
                </div>
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
              <LevelChip key={e.skillId} entry={e} onTap={onTap} glowMap={glowMap} theme={theme} hl={hl} />
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
  // "Shine light": pick a skill and its prerequisite path lights up while
  // everything else fades. Rebuilds live when Ryan edits needs in a card.
  const pathTick = usePathTick()
  const [hlTarget, setHlTarget] = useState<string | null>(null)
  const [searchOpen, setSearchOpen] = useState(false)
  const [directPath, setDirectPath] = useState(loadDirectPath)
  const [comboIdx, setComboIdx] = useState(0)
  const hl = useMemo(
    () => (hlTarget ? buildPathHighlight(hlTarget, { comboIdx, direct: directPath }) : null),
    [hlTarget, comboIdx, directPath, pathTick],
  )
  const hlTargetName = hlTarget ? getRegistrySkill(hlTarget)?.name ?? null : null
  const pickHlTarget = useCallback((id: string) => {
    setComboIdx(0)
    setHlTarget(canonicalSkillId(id) || null)
  }, [])
  // Tap-to-preview: first tap on a skill tile previews its shine (prereq path
  // glows, rest fades); a second tap on the same skill opens its card.
  // Tapping anywhere off a tile restores the original view.
  const handleTileTap = useCallback(
    (skill: UnifiedSkill) => {
      const id = canonicalSkillId(skill.id)
      if (hlTarget && hlTarget === id) {
        onTileTap(skill)
      } else {
        pickHlTarget(skill.id)
      }
    },
    [hlTarget, onTileTap, pickHlTarget],
  )
  const pickDirectPath = useCallback((on: boolean) => {
    setDirectPath(on)
    saveDirectPath(on)
  }, [])
  const mapIds = useMemo(() => new Set(getSkillEntries().map((e) => e.skillId)), [])
  const mapLabels = useMemo(
    () => new Map(getSkillEntries().map((e) => [e.skillId, e.label] as const)),
    [],
  )
  const labelOf = useCallback(
    (id: string) => mapLabels.get(id) ?? getRegistrySkill(id)?.name ?? id,
    [mapLabels],
  )
  /** Key-helper combos for the shine target, labeled for the picker. */
  const hlCombos = useMemo(
    () =>
      (hl?.combos ?? []).map((ids) => ({
        ids,
        label: ids.map((id) => labelOf(id)).join(' + '),
      })),
    [hl, labelOf],
  )
  return (
    <div
      className={`space-y-2.5 ${theme === 'paper' ? 'rounded-2xl bg-[#f3efe4] p-3' : ''}`}
      onClick={(e) => {
        // Tap-away clears a tap-previewed shine. Every tile and every control
        // is a <button> with its own handler; taps on background, gaps, and
        // headers (non-button areas) restore the original view.
        if (hlTarget && !(e.target as HTMLElement).closest('button')) setHlTarget(null)
      }}
    >
      {/* Pulse keyframes for the goal tile (distance 0). Pulses the neon edge
          (brightness + saturation), no halo bloom; the static box-shadow
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
        onSearch={() => setSearchOpen(true)}
        hlTargetName={hlTargetName}
        hlActive={!!hlTarget}
        onClearHighlight={() => setHlTarget(null)}
        hlCombos={hlCombos}
        hlComboIdx={comboIdx}
        onPickCombo={setComboIdx}
        directPath={directPath}
        onToggleDirectPath={pickDirectPath}
      />
      {searchOpen && (
        <SkillSearchOverlay
          onClose={() => setSearchOpen(false)}
          onPick={(id) => {
            pickHlTarget(id)
            setSearchOpen(false)
          }}
          mapIds={mapIds}
          labelOf={labelOf}
        />
      )}

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
              onTap={handleTileTap}
              glowMap={glowMap}
              theme={theme}
              infoOnly={infoOnly}
              hl={hl}
            />

            <Legend theme={theme} />

            {/* Skill tree */}
            <div className="space-y-2.5">
              <MapRows rows={ROWS.slice(0, 13)} headers={HEADERS} onTap={handleTileTap} glowMap={glowMap} theme={theme} infoOnly={infoOnly} hl={hl} />
              <div className="pt-1">
                <RollsSection onTap={handleTileTap} glowMap={glowMap} theme={theme} infoOnly={infoOnly} hl={hl} />
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
              <MapRows rows={ROWS.slice(13)} headers={HEADERS} onTap={handleTileTap} glowMap={glowMap} theme={theme} infoOnly={infoOnly} hl={hl} />
              <div className="pt-2" />
            </div>
          </div>
          <LevelBar beyondOpen={beyondOpen} theme={theme} />
        </div>
      ) : (
        <>
          <Legend theme={theme} />
          {view === 'list' && <ListView onTap={handleTileTap} glowMap={glowMap} theme={theme} infoOnly={infoOnly} hl={hl} />}
          {view === 'compact' && <CompactView onTap={handleTileTap} glowMap={glowMap} theme={theme} infoOnly={infoOnly} hl={hl} />}
          {view === 'levels' && <LevelsView onTap={handleTileTap} glowMap={glowMap} theme={theme} infoOnly={infoOnly} hl={hl} />}
        </>
      )}
    </div>
  )
}
