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
import { useState } from 'react'
import { getRegistrySkill, type UnifiedSkill } from '../../lib/skillRegistry'

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
  skl_cart_full: 'cartwheel',
  skl_cart_double_full: 'cartwheel',
  // round off family (green)
  skl_cartwheel_step_in: 'roundoff',
  skl_strong_round_off: 'roundoff',
  skl_ro_bhs: 'roundoff',
  skl_ro_bhs_series: 'roundoff',
  skl_ro_bhs_tuck: 'roundoff',
  skl_layout: 'roundoff',
  skl_back_half: 'roundoff',
  skl_back_full: 'roundoff',
  skl_back_1_5: 'roundoff',
  skl_double_full: 'roundoff',
  skl_back_25: 'roundoff',
  skl_triple_full: 'roundoff',
  skl_ro_bhs_full: 'roundoff',
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

const ROLL_TILES: MapTile[] = [
  { skillId: 'skl_backward_roll', label: 'Backward roll', col: '' },
  { skillId: 'skl_back_roll_push_up', label: 'Back roll to push up', col: '' },
  { skillId: 'skl_back_extension_roll', label: 'Back extension roll', col: '' },
  { skillId: 'skl_forward_roll', label: 'Forward roll', col: '' },
  { skillId: 'skl_handstand_fwd_roll', label: 'Handstand fwd roll', col: '' },
  { skillId: 'skl_dive_roll', label: 'Dive roll', col: '' },
  { skillId: 'skl_360_dive_roll', label: '360 dive roll', col: '' },
  { skillId: 'skl_straddle_fwd_roll', label: 'Straddle fwd roll', col: '' },
  { skillId: 'skl_straddle_bwd_roll', label: 'Straddle bwd roll', col: '' },
  { skillId: 'skl_front_pike_roll', label: 'Front pike roll', col: '' },
  { skillId: 'skl_back_pike_roll', label: 'Back pike roll', col: '' },
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
    // R9 — 1.5 level (cart full moved up here)
    tiles: [
      { skillId: 'skl_front_15', label: 'Front 1.5', col: '2 / 4' },
      { skillId: 'skl_back_1_5', label: 'Back 1.5', col: '4 / 6' },
      { skillId: 'skl_cart_full', label: 'Cart full', col: '6 / 8' },
    ],
  },
  {
    // R8 — fulls level
    tiles: [
      { skillId: 'skl_standing_tuck', label: 'Standing tuck', col: '1 / 3' },
      { skillId: 'skl_front_full', label: 'Front full', col: '3 / 5' },
      { skillId: 'skl_back_full', label: 'Back full', col: '5 / 7' },
      { skillId: 'skl_ro_bhs_full', label: 'RO HS full', col: '7 / 9' },
    ],
  },
  {
    // R7 — halves level
    tiles: [
      { skillId: 'skl_standing_open_tuck', label: 'Standing open tuck', col: '1 / 3' },
      { skillId: 'skl_barani', label: 'Front half', col: '3 / 5' },
      { skillId: 'skl_back_half', label: 'Back half', col: '5 / 7' },
    ],
  },
  {
    // R6 — front layout and back layout switched
    tiles: [
      { skillId: 'skl_standing_one_to_tuck', label: 'Standing 1 to tuck', col: '1 / 3' },
      { skillId: 'skl_front_layout', label: 'Front layout', col: '3 / 5' },
      { skillId: 'skl_layout', label: 'Back layout', col: '5 / 7' },
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
  compact = false,
}: {
  tile: MapTile
  skill: UnifiedSkill
  onTap: (skill: UnifiedSkill) => void
  compact?: boolean
}) {
  const hasGuide = !!skill.guideId
  const family = FAMILY_BY_SKILL[tile.skillId] ?? 'foundations'
  const style = FAMILY_STYLES[family]
  return (
    <button
      type="button"
      onClick={() => onTap(skill)}
      style={
        tile.col
          ? { gridColumn: tile.col, background: style.bg, borderColor: style.border }
          : { background: style.bg, borderColor: style.border }
      }
      className={`relative flex items-center justify-center rounded-lg border px-1 text-center font-bold leading-tight text-white/90 transition-transform active:scale-95 ${
        compact ? 'min-h-[40px] flex-1 text-[9px] py-1' : 'min-h-[52px] text-[10px] py-1.5'
      }`}
    >
      {!hasGuide && (
        <span
          className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-amber-400"
          title="Guide coming"
          aria-hidden
        />
      )}
      <span className="break-words">{tile.label}</span>
    </button>
  )
}

function MapRows({ rows, onTap }: { rows: MapRow[]; onTap: (s: UnifiedSkill) => void }) {
  return (
    <>
      {rows.map((row, i) => (
        <div
          key={i}
          className="grid gap-1.5"
          style={{ gridTemplateColumns: `repeat(${row.cols ?? 8}, 1fr)` }}
        >
          {row.tiles.map((tile) => {
            const skill = getRegistrySkill(tile.skillId)
            if (!skill) return null
            return <Tile key={`${tile.skillId}-${tile.label}`} tile={tile} skill={skill} onTap={onTap} />
          })}
        </div>
      ))}
    </>
  )
}

function RollsRow({ onTap }: { onTap: (s: UnifiedSkill) => void }) {
  return (
    <div>
      <p className="pb-1 text-[10px] font-extrabold uppercase tracking-widest text-white/40">
        Rolls
      </p>
      <div className="flex flex-wrap gap-1.5">
        {ROLL_TILES.map((tile) => {
          const skill = getRegistrySkill(tile.skillId)
          if (!skill) return null
          return (
            <Tile
              key={tile.skillId}
              tile={tile}
              skill={skill}
              onTap={onTap}
              compact
            />
          )
        })}
      </div>
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

export function SkillMapView({ onTileTap }: { onTileTap: (skill: UnifiedSkill) => void }) {
  const [beyondOpen, setBeyondOpen] = useState(false)
  return (
    <div className="space-y-1.5">
      {/* Column headers */}
      <div className="grid gap-1.5" style={{ gridTemplateColumns: 'repeat(8, 1fr)' }}>
        {HEADERS.map((h) => (
          <div
            key={h.label}
            style={{ gridColumn: h.col }}
            className="pb-0.5 text-center text-[10px] font-extrabold uppercase tracking-widest text-white/40"
          >
            {h.label}
          </div>
        ))}
      </div>

      {/* Beyond — collapsed by default */}
      <div>
        <button
          type="button"
          onClick={() => setBeyondOpen((o) => !o)}
          aria-expanded={beyondOpen}
          className="flex w-full items-center justify-between gap-3 rounded-xl border border-[var(--panel-border)] bg-[var(--panel)] px-3 py-2 text-left"
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
          <div className="mt-1.5 space-y-1.5">
            <MapRows rows={BEYOND_ROWS} onTap={onTileTap} />
          </div>
        )}
      </div>

      <Legend />

      <MapRows rows={ROWS.slice(0, 12)} onTap={onTileTap} />
      <RollsRow onTap={onTileTap} />
      <MapRows rows={ROWS.slice(12)} onTap={onTileTap} />
    </div>
  )
}
