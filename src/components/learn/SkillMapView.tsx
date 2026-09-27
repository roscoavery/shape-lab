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
 */
import { useMemo, useState } from 'react'
import { getRegistrySkill, type UnifiedSkill } from '../../lib/skillRegistry'
import { needsForSkill, resolveGoalSkill } from '../../lib/skillPaths'
import { isAthleteProfile } from '../../lib/profileRole'
import type { Athlete, AthleteSkillGoal } from '../../types'

type SkillFamily =
  | 'foundations'
  | 'rolls'
  | 'cartwheel'
  | 'roundoff'
  | 'standing'
  | 'forwards'
  | 'killer'

const FAMILY_STYLES: Record<SkillFamily, { bg: string; border: string; label: string }> = {
  foundations: { bg: 'rgba(255,255,255,0.06)', border: 'rgba(255,255,255,0.20)', label: 'Foundations' },
  rolls: { bg: 'rgba(45,212,191,0.12)', border: 'rgba(45,212,191,0.45)', label: 'Rolls' },
  cartwheel: { bg: 'rgba(96,165,250,0.13)', border: 'rgba(96,165,250,0.50)', label: 'Cartwheel' },
  roundoff: { bg: 'rgba(74,222,128,0.12)', border: 'rgba(74,222,128,0.45)', label: 'Round off' },
  standing: { bg: 'rgba(192,132,252,0.13)', border: 'rgba(192,132,252,0.50)', label: 'Standing' },
  forwards: { bg: 'rgba(251,146,60,0.13)', border: 'rgba(251,146,60,0.50)', label: 'Forwards' },
  killer: { bg: 'rgba(251,191,36,0.20)', border: 'rgba(251,191,36,0.75)', label: 'Killer' },
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
}

/** Deepest prerequisite level that still glows (fades to a faint shimmer). */
const MAX_GLOW_DISTANCE = 5

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
 */
function buildGlowMap(goals: AthleteSkillGoal[]): Map<string, number> {
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
  return dist
}

/** Layered luminous box-shadow in the family color, fading with distance.
 * Steep ramp: the goal (0) is unmistakably the destination, and each step
 * down the chain is visibly dimmer so the lit trail reads at a glance. */
function glowShadow(rgb: string, distance: number): string {
  const specs = [
    { a1: 1.0, b1: 20, s1: 5, a2: 0.7, b2: 48, s2: 12 }, // 0 — the destination, brightest
    { a1: 0.9, b1: 15, s1: 4, a2: 0.5, b2: 34, s2: 8 }, // 1 — strong, on the trail
    { a1: 0.68, b1: 12, s1: 3, a2: 0.34, b2: 26, s2: 6 }, // 2 — clearly lit
    { a1: 0.42, b1: 9, s1: 2, a2: 0.2, b2: 18, s2: 4 }, // 3
    { a1: 0.24, b1: 6, s1: 1, a2: 0.11, b2: 12, s2: 3 }, // 4
    { a1: 0.12, b1: 4, s1: 0, a2: 0.05, b2: 8, s2: 2 }, // 5 — faint shimmer
  ]
  const s = specs[Math.min(distance, MAX_GLOW_DISTANCE)]
  return (
    `0 0 ${s.b1}px ${s.s1}px rgba(${rgb},${s.a1}), ` +
    `0 0 ${s.b2}px ${s.s2}px rgba(${rgb},${s.a2})`
  )
}

/**
 * Featured glow: for skills Ryan put real thought into (rich guide prose +
 * his notes). Luminous and lit-from-within — brighter and more saturated
 * than the base family tint. Separate from the athlete guiding-light glow;
 * the two compose when a featured skill is also on the athlete's path.
 */
function isFeaturedSkill(skill: UnifiedSkill): boolean {
  if (!skill.guideId) return false
  return (skill.guideNeeds?.length ?? 0) > 0 || !!skill.ryanNote?.trim()
}

/** Lit-from-within glow: inner radiance plus a bright outer halo. */
function featuredShadow(rgb: string): string {
  return (
    `inset 0 0 20px rgba(${rgb},0.30), ` +
    `inset 0 1px 0 rgba(255,255,255,0.12), ` +
    `0 0 16px 3px rgba(${rgb},0.70), ` +
    `0 0 44px 8px rgba(${rgb},0.38)`
  )
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
  skl_double_back: 'standing',
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
  skl_front_35: 'forwards',
  // killer gets its own accent
  skl_killer: 'killer',
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
    // R12 — triples
    tiles: [
      { skillId: 'skl_front_triple', label: 'Front triple', col: '2 / 4' },
      { skillId: 'skl_triple_full', label: 'Back triple', col: '4 / 6' },
    ],
  },
  {
    // R11 — 2.5 level (double back lives here now)
    tiles: [
      { skillId: 'skl_front_25', label: 'Front 2.5', col: '2 / 4' },
      { skillId: 'skl_back_25', label: 'Back 2.5', col: '4 / 6' },
      { skillId: 'skl_double_back', label: 'Double back', col: '6 / 8' },
    ],
  },
  {
    // R10 — doubles level
    tiles: [
      { skillId: 'skl_standing_full', label: 'Standing full', col: '1 / 3' },
      { skillId: 'skl_front_2', label: 'Front double full', col: '3 / 5' },
      { skillId: 'skl_double_full', label: 'Back double full', col: '5 / 7' },
    ],
  },
  {
    // R9 — 1.5 level
    tiles: [
      { skillId: 'skl_front_15', label: 'Front 1.5', col: '3 / 5' },
      { skillId: 'skl_back_1_5', label: 'Back 1.5', col: '5 / 7' },
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
      { skillId: 'skl_front_tuck', label: 'Front tuck', col: '3 / 4' },
      { skillId: 'skl_bounder_step_out', label: 'Bounder step out', col: '4 / 5' },
      { skillId: 'skl_cart_tuck', label: 'Cart tuck', col: '5 / 7' },
      { skillId: 'skl_ro_bhs_tuck', label: 'RO HS tuck', col: '7 / 9' },
    ],
  },
  {
    // R4
    tiles: [
      { skillId: 'skl_standing_bhs_series', label: 'Standing series', col: '1 / 3' },
      { skillId: 'skl_front_hs_step_out', label: 'Front HS step out', col: '3 / 4' },
      { skillId: 'skl_bounders', label: 'Bounders', col: '4 / 5' },
      { skillId: 'skl_cart_hs_step_out', label: 'Cart HS step out', col: '5 / 7' },
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
    tiles: [{ skillId: 'skl_killer', label: 'Killer', col: '4 / 6' }],
  },
  {
    // quad row
    tiles: [
      { skillId: 'skl_back_quad', label: 'Back quad', col: '3 / 5' },
      { skillId: 'skl_miller', label: 'Miller', col: '5 / 7' },
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

function Tile({
  tile,
  skill,
  onTap,
  glowDist,
}: {
  tile: MapTile
  skill: UnifiedSkill
  onTap: (skill: UnifiedSkill) => void
  /** Guiding-light distance (0 = goal). Undefined = no glow. */
  glowDist?: number
}) {
  const hasGuide = !!skill.guideId
  const family = FAMILY_BY_SKILL[tile.skillId] ?? 'foundations'
  const style = FAMILY_STYLES[family]
  const rgb = FAMILY_GLOW_RGB[family]
  const isBanner = tile.skillId === 'skl_foundations'
  const glowing = glowDist !== undefined
  const featured = isFeaturedSkill(skill) && !isBanner
  // Base shadow: soft layered elevation like the Today cards.
  // Featured glow sits underneath; the guiding-light glow adds on top.
  const boxShadow =
    `0 2px 10px rgba(0,0,0,0.35), 0 8px 24px rgba(0,0,0,0.22)` +
    (featured ? `, ${featuredShadow(rgb)}` : '') +
    (glowing ? `, ${glowShadow(rgb, glowDist)}` : '')
  const borderColor = isBanner
    ? 'rgba(251,191,36,0.55)'
    : glowing
      ? glowDist === 0
        ? `rgba(${rgb},1)` // destination — full-strength border
        : glowDist <= 2
          ? `rgba(${rgb},0.95)` // on the trail — near-full so the path reads continuous
          : `rgba(${rgb},0.7)`
      : featured
        ? `rgba(${rgb},0.75)`
        : style.border
  return (
    <button
      type="button"
      onClick={() => onTap(skill)}
      style={
        tile.col
          ? {
              gridColumn: tile.col,
              background: `linear-gradient(180deg, rgba(255,255,255,0.10), rgba(255,255,255,0) 55%), ${style.bg}`,
              borderColor,
              boxShadow,
              ...(glowDist === 0
                ? { animation: 'skill-glow-pulse 2.8s ease-in-out infinite' }
                : null),
              ...(isBanner
                ? { animation: 'foundations-beam 5s ease-in-out infinite' }
                : null),
            }
          : {
              background: `linear-gradient(180deg, rgba(255,255,255,0.10), rgba(255,255,255,0) 55%), ${style.bg}`,
              borderColor,
              boxShadow,
              ...(glowDist === 0
                ? { animation: 'skill-glow-pulse 2.8s ease-in-out infinite' }
                : null),
              ...(isBanner
                ? { animation: 'foundations-beam 5s ease-in-out infinite' }
                : null),
            }
      }
      className={`relative flex items-center justify-center rounded-2xl border px-2 text-center font-bold leading-tight text-white/90 transition-transform active:scale-95 ${
        isBanner
          ? 'min-h-[64px] text-[13px] py-3 tracking-[0.28em] uppercase'
          : 'min-h-[56px] text-[11px] py-2 tracking-[0.02em]'
      }`}
    >
      {!hasGuide && !isBanner && (
        <span
          className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-amber-400"
          title="Guide coming"
          aria-hidden
        />
      )}
      <span className="break-words drop-shadow-[0_1px_3px_rgba(0,0,0,0.7)]">
        {tile.label}
      </span>
    </button>
  )
}

function MapRows({
  rows,
  onTap,
  glowMap,
}: {
  rows: MapRow[]
  onTap: (s: UnifiedSkill) => void
  glowMap?: Map<string, number> | null
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
                glowDist={glowMap?.get(tile.skillId)}
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
}: {
  onTap: (s: UnifiedSkill) => void
  glowMap?: Map<string, number> | null
}) {
  const [open, setOpen] = useState(false)
  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-left"
        style={{
          borderColor: 'rgba(45,212,191,0.45)',
          background: 'rgba(45,212,191,0.08)',
        }}
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
          <MapRows rows={ROLLS_ROWS} onTap={onTap} glowMap={glowMap} />
        </div>
      )}
    </div>
  )
}

function Legend() {
  const [open, setOpen] = useState(false)
  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="text-[11px] font-semibold text-white/50 underline decoration-dotted underline-offset-2"
      >
        {open ? 'Hide color key' : 'Color key'}
      </button>
      {open && (
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {(Object.keys(FAMILY_STYLES) as SkillFamily[]).map((f) => (
            <span
              key={f}
              className="inline-flex items-center gap-1.5 rounded-full border px-2 py-1 text-[10px] font-semibold text-white/80"
              style={{
                background: FAMILY_STYLES[f].bg,
                borderColor: FAMILY_STYLES[f].border,
              }}
            >
              {FAMILY_STYLES[f].label}
            </span>
          ))}
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
    <div className="space-y-2.5">
      {/* Pulse keyframes for the goal tile (distance 0). Brightness-only so it
          stays cheap on phones; the static box-shadow carries the glow. */}
      <style>{`@keyframes skill-glow-pulse { 0%,100% { filter: brightness(1); } 50% { filter: brightness(1.3); } }
@keyframes foundations-beam { 0%,100% { box-shadow: 0 2px 10px rgba(0,0,0,0.35), 0 8px 24px rgba(0,0,0,0.22), 0 0 22px 4px rgba(251,191,36,0.35), 0 0 60px 12px rgba(251,191,36,0.14); } 50% { box-shadow: 0 2px 10px rgba(0,0,0,0.35), 0 8px 24px rgba(0,0,0,0.22), 0 0 34px 7px rgba(251,191,36,0.55), 0 0 90px 20px rgba(251,191,36,0.22); } }`}</style>
      {/* Column headers — Today section-label style */}
      <div className="grid gap-2" style={{ gridTemplateColumns: 'repeat(8, 1fr)' }}>
        {HEADERS.map((h) => (
          <div
            key={h.label}
            style={{ gridColumn: h.col }}
            className="pb-1 text-center text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--accent)]"
          >
            {h.label}
          </div>
        ))}
      </div>

      {glowMap && (
        <p className="text-center text-[11px] font-semibold text-white/55">
          <span aria-hidden>✦ </span>
          {classGlow
            ? `Lighting the way for ${glowNames.slice(0, 3).join(', ')}${glowNames.length > 3 ? ' and others' : ''}`
            : 'Your goals light the way — follow the glow upward'}
          <span aria-hidden> ✦</span>
        </p>
      )}

      {/* Beyond — collapsed by default */}
      <div>
        <button
          type="button"
          onClick={() => setBeyondOpen((o) => !o)}
          aria-expanded={beyondOpen}
          className="flex w-full items-center justify-between gap-3 rounded-2xl border border-[var(--panel-border)] bg-[var(--panel)] px-4 py-3 text-left"
        >
          <span>
            <span className="block text-sm font-extrabold">Beyond</span>
            <span className="block text-[11px] opacity-60">
              Most people never cross this line
            </span>
          </span>
          <span className="text-base opacity-60" aria-hidden>
            {beyondOpen ? '▾' : '▸'}
          </span>
        </button>
        {beyondOpen && (
          <div className="mt-2 space-y-2">
            <MapRows rows={BEYOND_ROWS} onTap={onTileTap} glowMap={glowMap} />
          </div>
        )}
      </div>

      <Legend />

      <MapRows rows={ROWS.slice(0, 12)} onTap={onTileTap} glowMap={glowMap} />
      <div className="pt-1">
        <RollsSection onTap={onTileTap} glowMap={glowMap} />
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
      <MapRows rows={ROWS.slice(12)} onTap={onTileTap} glowMap={glowMap} />
      <div className="pt-2" />
    </div>
  )
}
